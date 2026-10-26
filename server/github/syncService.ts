/**
 * ============================================================================
 * SYNC SERVICE - GitHub Bidirectional Synchronization
 * ============================================================================
 * 
 * This service handles bidirectional synchronization between the database
 * and GitHub awesome-list repositories. It supports importing resources from
 * existing awesome lists and exporting curated resources back to GitHub.
 * 
 * IMPORT FLOW:
 * 1. Fetch raw markdown from GitHub (README.md or specified file)
 * 2. Parse markdown into structured resources using parser.ts
 * 3. Validate against awesome-lint rules
 * 4. Resolve conflicts with existing database entries
 * 5. Insert/update resources with proper category hierarchy
 * 6. Record operation in sync history for audit trail
 * 
 * EXPORT FLOW:
 * 1. Fetch all approved resources from database
 * 2. Format as awesome-lint compliant markdown using formatter.ts
 * 3. Validate output against awesome-lint before commit
 * 4. Create GitHub commit or pull request via Replit OAuth
 * 5. Update sync status on exported resources
 * 
 * CONFLICT RESOLUTION:
 * - URL-based matching for duplicate detection
 * - Configurable skip/update/create actions per conflict
 * - Preserves local edits when importing updates
 * 
 * QUEUE PROCESSING:
 * - Async queue for long-running sync operations
 * - Status tracking: pending → processing → completed/failed
 * - Automatic retry with exponential backoff
 * 
 * See /docs/ADMIN-GUIDE.md for import/export workflow documentation.
 * ============================================================================
 */

import { GitHubClient } from "./client";
import { parseAwesomeList, convertToDbResources } from "./parser";
import { normalizeUrlForDedup, normalizeTitleForDedup, domainOf, ensureMinDescription } from "./importHygiene";
import { AwesomeListFormatter, generateContributingMd } from "./formatter";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { ResourceRepository } from "../repositories/ResourceRepository";
import { AuditRepository } from "../repositories/AuditRepository";
import { GithubSyncRepository } from "../repositories/GithubSyncRepository";
import { Resource, InsertResource, GithubSyncQueue } from "@shared/schema";
import { getGitHubClient } from "./replitConnection";
import { validateAwesomeList } from "../validation/awesomeLint";
import { createLogger } from "../lib/logger";

const logger = createLogger("github-sync");

interface SyncOptions {
  dryRun?: boolean;
  forceOverwrite?: boolean;
  createPullRequest?: boolean;
  branchName?: string;
  /** Skip the pre-push broken-link gate (export link check). Default: run it. */
  skipLinkCheck?: boolean;
  /**
   * Queue row that owns this run. Stamped into the export's history row so
   * the admin panel can tie a commit to exactly one run (never by timestamp).
   */
  queueId?: number;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  validationPassed: boolean;
  validationErrors: Array<{
    line: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  validationStats: {
    totalLines: number;
    totalResources: number;
    totalCategories: number;
  };
  resources: Resource[];
  /** Taxonomy nodes a dry run would create; always empty for a real import. */
  wouldCreateTaxonomy: PlannedTaxonomyNode[];
  /** Branch the README was read from; unset if the fetch never succeeded. */
  branch?: string;
}

interface ExportResult {
  exported: number;
  commitSha?: string;
  commitUrl?: string;
  pullRequestUrl?: string;
  errors: string[];
  /** Branch the export committed to; unset if it never got that far. */
  branch?: string;
}

interface ConflictResolution {
  action: 'skip' | 'update' | 'create';
  resource: Partial<Resource>;
  reason: string;
}

interface CatalogEntry {
  resource: Resource;
  urlKey: string;
  /** Empty when the title or domain normalizes to nothing (never matches). */
  titleDomainKey: string;
}

function toCatalogEntry(resource: Resource): CatalogEntry {
  const titleKey = normalizeTitleForDedup(resource.title);
  const domainKey = domainOf(resource.url);
  return {
    resource,
    urlKey: normalizeUrlForDedup(resource.url),
    titleDomainKey: titleKey && domainKey ? `${titleKey}|${domainKey}` : '',
  };
}

/**
 * The whole catalog loaded once per import (any status, so a pending copy
 * also blocks re-import), keyed the way
 * checkConflict matches. Entries keep listResources' newest-first order and
 * each key maps to its first entry, the row a linear `.find` would return.
 */
class ImportCatalog {
  private entries: CatalogEntry[];
  private byUrl = new Map<string, Resource>();
  private byTitleDomain = new Map<string, Resource>();

  constructor(resources: Resource[]) {
    this.entries = resources.map(toCatalogEntry);
    for (const entry of this.entries) {
      if (!this.byUrl.has(entry.urlKey)) this.byUrl.set(entry.urlKey, entry.resource);
      if (entry.titleDomainKey && !this.byTitleDomain.has(entry.titleDomainKey)) {
        this.byTitleDomain.set(entry.titleDomainKey, entry.resource);
      }
    }
  }

  findByUrl(url: string): Resource | undefined {
    return this.byUrl.get(normalizeUrlForDedup(url));
  }

  findByTitleDomain(title: string, url: string): Resource | undefined {
    const titleKey = normalizeTitleForDedup(title);
    const domainKey = domainOf(url);
    return titleKey && domainKey ? this.byTitleDomain.get(`${titleKey}|${domainKey}`) : undefined;
  }

  /**
   * A row this run wrote, so later items see it as they did when each one
   * re-read the table. A new row sorts first (newest); an updated row keeps
   * its place, and every key it left or joined resolves again.
   */
  record(row: Resource): void {
    const next = toCatalogEntry(row);
    const index = this.entries.findIndex(e => e.resource.id === row.id);
    const previous = index >= 0 ? this.entries[index] : undefined;
    if (previous) this.entries[index] = next;
    else this.entries.unshift(next);
    for (const key of new Set([previous?.urlKey, next.urlKey])) {
      if (key !== undefined) this.resolve(this.byUrl, key, e => e.urlKey);
    }
    for (const key of new Set([previous?.titleDomainKey, next.titleDomainKey])) {
      if (key) this.resolve(this.byTitleDomain, key, e => e.titleDomainKey);
    }
  }

  private resolve(index: Map<string, Resource>, key: string, keyOf: (e: CatalogEntry) => string): void {
    const first = this.entries.find(e => keyOf(e) === key);
    if (first) index.set(key, first.resource);
    else index.delete(key);
  }
}

/**
 * Helper function to generate URL-safe slugs from names
 */
function generateSlug(name: string): string {
  // BUG-055 (run25): transliterate diacritics instead of deleting them so
  // "Vídeo" slugs to "video", matching the client-side slugify.
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Pick the taxonomy node an imported heading belongs to.
 *
 * Imported headings pass through normalizeCategory(), which keeps only
 * letters, digits, spaces, "&", "/" and "-". Two headings whose slugs collide
 * therefore differ only in case or punctuation ("Audio & Video" vs
 * "Audio-Video", or an exported "__qa_ Cat A" re-imported as "qa Cat A"), so
 * they name the SAME node. Resolution order is deterministic:
 *   1. exact name, 2. same slug, 3. case-insensitive name.
 * The slug step matches what the per-parent unique constraint would reject,
 * so a colliding heading merges into the existing node instead of failing.
 */
function pickNode<T extends { name: string; slug: string }>(
  rows: T[],
  name: string,
  slug: string,
): T | undefined {
  const lower = name.toLowerCase();
  return rows.find(r => r.name === name)
    ?? (slug ? rows.find(r => r.slug === slug) : undefined)
    ?? rows.find(r => r.name.toLowerCase() === lower);
}

type HierarchyLevel = 'category' | 'subcategory' | 'sub-subcategory';

/**
 * A hierarchy level that was merged into an existing node with a different
 * spelling. Reported as an import warning so the rename is visible.
 */
interface HierarchyMerge {
  level: HierarchyLevel;
  imported: string;
  existing: string;
}

/** A taxonomy node a dry-run import would create; `parent` is its path ("Cat > Sub"). */
interface PlannedTaxonomyNode {
  level: HierarchyLevel;
  name: string;
  slug: string;
  parent?: string;
}

/**
 * IDs (unset for nodes a dry run would create) and canonical names for each
 * level of one imported heading path.
 */
interface HierarchyResolution {
  categoryId?: number;
  subcategoryId?: number;
  subSubcategoryId?: number;
  category: string;
  subcategory?: string;
  subSubcategory?: string;
  merges: HierarchyMerge[];
}

// Existing-node lookups shared by the writing and the dry-run resolvers.
async function findCategoryNode(categoryRepo: CategoryRepository, name: string) {
  const slug = generateSlug(name);
  return (await categoryRepo.getCategoryByName(name))
    ?? (slug ? await categoryRepo.getCategoryBySlug(slug) : undefined)
    ?? pickNode(await categoryRepo.listCategories(), name, slug);
}

async function findSubcategoryNode(categoryRepo: CategoryRepository, name: string, parentId: number) {
  const slug = generateSlug(name);
  return (await categoryRepo.getSubcategoryByName(name, parentId))
    ?? (slug ? await categoryRepo.getSubcategoryBySlug(slug, parentId) : undefined)
    ?? pickNode(await categoryRepo.listSubcategories(parentId), name, slug);
}

async function findSubSubcategoryNode(categoryRepo: CategoryRepository, name: string, parentId: number) {
  const slug = generateSlug(name);
  return (await categoryRepo.getSubSubcategoryByName(name, parentId))
    ?? (slug ? await categoryRepo.getSubSubcategoryBySlug(slug, parentId) : undefined)
    ?? pickNode(await categoryRepo.listSubSubcategories(parentId), name, slug);
}

/**
 * Ensure category hierarchy exists in database, creating entries as needed.
 * Returns the IDs AND the canonical names for each level. When an imported
 * heading collides (same slug / case-insensitive name) with an existing node,
 * the existing node is reused and its name is returned, so callers must write
 * the canonical names onto resources (never the imported spelling, which
 * would name no taxonomy row and orphan the resource).
 */
async function ensureCategoryHierarchy(
  categoryRepo: CategoryRepository,
  categoryName: string,
  subcategoryName?: string,
  subSubcategoryName?: string
): Promise<HierarchyResolution> {
  const merges: HierarchyMerge[] = [];
  const noteMerge = (level: HierarchyMerge['level'], imported: string, existing: string) => {
    if (imported !== existing) merges.push({ level, imported, existing });
  };

  // 1. Ensure category exists
  const categorySlug = generateSlug(categoryName);
  const findCategory = () => findCategoryNode(categoryRepo, categoryName);
  let category = await findCategory();
  if (!category) {
    try {
      category = await categoryRepo.createCategory({
        name: categoryName,
        slug: categorySlug,
      });
      logger.info(`  Created category: ${categoryName}`);
    } catch (e: any) {
      // May already exist due to race condition, try to fetch again
      category = await findCategory();
      if (!category) {
        throw new Error(`Failed to create or find category: ${categoryName} - ${e.message}`);
      }
    }
  }
  noteMerge('category', categoryName, category.name);

  // 2. Ensure subcategory exists (if provided)
  let subcategory;
  if (subcategoryName) {
    const parentId = category.id;
    const subSlug = generateSlug(subcategoryName);
    const findSubcategory = () => findSubcategoryNode(categoryRepo, subcategoryName, parentId);
    subcategory = await findSubcategory();
    if (!subcategory) {
      try {
        subcategory = await categoryRepo.createSubcategory({
          name: subcategoryName,
          slug: subSlug,
          categoryId: parentId,
        });
        logger.info(`  Created subcategory: ${subcategoryName} under ${category.name}`);
      } catch (e: any) {
        // May already exist due to race condition
        subcategory = await findSubcategory();
        if (!subcategory) {
          throw new Error(`Failed to create or find subcategory: ${subcategoryName} - ${e.message}`);
        }
      }
    }
    noteMerge('subcategory', subcategoryName, subcategory.name);
  }

  // 3. Ensure sub-subcategory exists (if provided)
  let subSubcategory;
  if (subSubcategoryName && subcategory) {
    const parentId = subcategory.id;
    const subSubSlug = generateSlug(subSubcategoryName);
    const findSubSubcategory = () => findSubSubcategoryNode(categoryRepo, subSubcategoryName, parentId);
    subSubcategory = await findSubSubcategory();
    if (!subSubcategory) {
      try {
        subSubcategory = await categoryRepo.createSubSubcategory({
          name: subSubcategoryName,
          slug: subSubSlug,
          subcategoryId: parentId,
        });
        logger.info(`  Created sub-subcategory: ${subSubcategoryName} under ${subcategory.name}`);
      } catch (e: any) {
        // May already exist due to race condition
        subSubcategory = await findSubSubcategory();
        if (!subSubcategory) {
          throw new Error(`Failed to create or find sub-subcategory: ${subSubcategoryName} - ${e.message}`);
        }
      }
    }
    noteMerge('sub-subcategory', subSubcategoryName, subSubcategory.name);
  }

  return {
    categoryId: category.id,
    subcategoryId: subcategory?.id,
    subSubcategoryId: subSubcategory?.id,
    category: category.name,
    subcategory: subcategory?.name,
    subSubcategory: subSubcategory?.name,
    merges,
  };
}

/**
 * Dry-run counterpart of ensureCategoryHierarchy: resolves each level against
 * existing rows read-only and never writes. A missing level (and every level
 * under it) is appended to `plan`, and later headings resolve against those
 * planned nodes the way a real import resolves against rows it just inserted,
 * so a dry run reports the same canonical names, merges and creations.
 */
async function planCategoryHierarchy(
  categoryRepo: CategoryRepository,
  plan: PlannedTaxonomyNode[],
  categoryName: string,
  subcategoryName?: string,
  subSubcategoryName?: string
): Promise<HierarchyResolution> {
  if (!categoryName?.trim()) throw new Error('Empty category heading');
  const steps: {
    level: HierarchyLevel;
    name: string | undefined;
    find: (name: string, parentId?: number) => Promise<{ id: number; name: string } | undefined>;
  }[] = [
    { level: 'category', name: categoryName, find: (name) => findCategoryNode(categoryRepo, name) },
    { level: 'subcategory', name: subcategoryName, find: (name, parentId) => findSubcategoryNode(categoryRepo, name, parentId!) },
    { level: 'sub-subcategory', name: subSubcategoryName, find: (name, parentId) => findSubSubcategoryNode(categoryRepo, name, parentId!) },
  ];
  const merges: HierarchyMerge[] = [];
  const resolved: { id?: number; name: string }[] = [];
  for (const [depth, step] of steps.entries()) {
    if (!step.name) break;
    const parent = resolved[depth - 1];
    const parentPath = resolved.map(n => n.name).join(' > ') || undefined;
    // A planned parent has no row yet, so nothing can exist under it.
    const existing = depth > 0 && parent.id === undefined ? undefined : await step.find(step.name, parent?.id);
    const slug = generateSlug(step.name);
    let node: { name: string } | undefined = existing
      ?? pickNode(plan.filter(p => p.level === step.level && p.parent === parentPath), step.name, slug);
    if (!node) {
      const planned: PlannedTaxonomyNode = { level: step.level, name: step.name, slug, parent: parentPath };
      plan.push(planned);
      node = planned;
    }
    if (node.name !== step.name) merges.push({ level: step.level, imported: step.name, existing: node.name });
    resolved.push({ id: existing?.id, name: node.name });
  }
  const [category, subcategory, subSubcategory] = resolved;
  return {
    categoryId: category.id,
    subcategoryId: subcategory?.id,
    subSubcategoryId: subSubcategory?.id,
    category: category.name,
    subcategory: subcategory?.name,
    subSubcategory: subSubcategory?.name,
    merges,
  };
}

export class GitHubSyncService {
  private client: GitHubClient;
  private websiteUrl: string;
  private categoryRepo: CategoryRepository;
  private resourceRepo: ResourceRepository;
  private auditRepo: AuditRepository;
  private syncRepo: GithubSyncRepository;
  // Run15 BUG-011 (architect review): queue rows currently owned by a live
  // in-process worker. The periodic orphan sweep excludes these ids so a
  // long-running import/export is never falsely flipped to failed mid-flight.
  private activeQueueIds: Set<number> = new Set();

  constructor(githubToken?: string) {
    this.client = new GitHubClient(githubToken);
    this.websiteUrl = process.env.WEBSITE_URL || 'https://awesome.video';
    this.categoryRepo = new CategoryRepository();
    this.resourceRepo = new ResourceRepository();
    this.auditRepo = new AuditRepository();
    this.syncRepo = new GithubSyncRepository();
  }

  /**
   * Import resources from a GitHub awesome list repository
   */
  async importFromGitHub(
    repoUrl: string, 
    options: SyncOptions & { strictMode?: boolean } = {},
    // F13: the queued route already owns a queue row for this run; recording
    // another here showed every queued import twice in Recent Sync Jobs.
    tracking: { queueRowOwnedByCaller?: boolean } = {}
  ): Promise<ImportResult> {
    const recordQueueRow = !options.dryRun && !tracking.queueRowOwnedByCaller;
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      validationPassed: false,
      validationErrors: [],
      validationStats: {
        totalLines: 0,
        totalResources: 0,
        totalCategories: 0
      },
      resources: [],
      wouldCreateTaxonomy: []
    };
    logger.info('Import started', { repo: repoUrl, dryRun: !!options.dryRun });

    try {
      // Fetch README content
      logger.info(`Fetching README from ${repoUrl}...`);
      const { content: readmeContent, branch: readmeBranch } = await this.client.fetchFile(repoUrl, 'README.md');
      result.branch = readmeBranch;
      
      // STEP 1: Validate with awesome-lint BEFORE importing
      logger.info('Validating awesome list with awesome-lint...');
      const validationResult = validateAwesomeList(readmeContent);
      
      // Store validation results
      result.validationPassed = validationResult.valid;
      result.validationStats = validationResult.stats;
      result.validationErrors = [
        ...validationResult.errors.map(e => ({
          line: e.line,
          rule: e.rule,
          message: e.message,
          severity: 'error' as const
        })),
        ...validationResult.warnings.map(w => ({
          line: w.line,
          rule: w.rule,
          message: w.message,
          severity: 'warning' as const
        }))
      ];
      
      // Add warnings to result
      result.warnings = validationResult.warnings.map(w => 
        `Line ${w.line}: [${w.rule}] ${w.message}`
      );
      
      // Log validation results
      logger.info(`Validation: ${validationResult.valid ? '✓ PASSED' : '✗ FAILED'}`);
      logger.info(`  - Lines: ${validationResult.stats.totalLines}`);
      logger.info(`  - Resources detected: ${validationResult.stats.totalResources}`);
      logger.info(`  - Categories detected: ${validationResult.stats.totalCategories}`);
      logger.info(`  - Errors: ${validationResult.errors.length}`);
      logger.info(`  - Warnings: ${validationResult.warnings.length}`);
      
      // Validation is informational during import - do NOT block
      // External repos may not conform to our strict formatting rules
      if (!validationResult.valid) {
        logger.info(`⚠ Validation found ${validationResult.errors.length} formatting issues - proceeding with import anyway`);
        logger.info(`  (Validation is enforced on export, not import)`);
      }
      
      if (validationResult.warnings.length > 0) {
        logger.info(`⚠ Proceeding with ${validationResult.warnings.length} warnings`);
      }
      
      // STEP 2: Parse the awesome list
      logger.info('Parsing awesome list content...');
      const parsedList = await parseAwesomeList(readmeContent);
      const dbResources = convertToDbResources(parsedList);
      
      logger.info(`Found ${dbResources.length} resources in the awesome list`);
      
      // Run21 R4-036: identical boilerplate descriptions on different
      // resources ("Defines the file format and structure" x3) read as
      // copy-paste errors. Within an import batch, only the first resource
      // keeps a repeated description; later ones fall back to the generated
      // title+domain description so each entry is distinct.
      {
        const seenDescriptions = new Map<string, number>();
        for (const r of dbResources) {
          const key = (r.description || "").trim().toLowerCase();
          if (key.length === 0) continue;
          const count = seenDescriptions.get(key) || 0;
          seenDescriptions.set(key, count + 1);
          if (count > 0) {
            r.description = ensureMinDescription("", r.title as string, r.url as string);
          }
        }
      }
      
      // STEP 3: Build and ensure category hierarchy exists in database
      logger.info('Ensuring category hierarchy exists in database...');
      const uniqueHierarchies = new Map<string, { category: string; subcategory?: string; subSubcategory?: string }>();
      
      for (const resource of dbResources) {
        const key = `${resource.category}|${resource.subcategory || ''}|${resource.subSubcategory || ''}`;
        if (!uniqueHierarchies.has(key)) {
          uniqueHierarchies.set(key, {
            category: resource.category as string,
            subcategory: resource.subcategory as string | undefined,
            subSubcategory: resource.subSubcategory as string | undefined,
          });
        }
      }
      
      logger.info(`Found ${uniqueHierarchies.size} unique category hierarchies`);
      
      // Create all category hierarchies (a dry run only plans them)
      const hierarchyIds = new Map<string, HierarchyResolution>();
      const plannedTaxonomy: PlannedTaxonomyNode[] = [];
      // Hierarchies that could not be resolved. Items under them are refused
      // in STEP 4 (one item error each) instead of being written with
      // category text that names no taxonomy row (orphan resources desync
      // sidebar counts and browse pages).
      const failedHierarchies = new Map<string, string>();
      for (const [key, hierarchy] of Array.from(uniqueHierarchies.entries())) {
        try {
          const ids = options.dryRun
            ? await planCategoryHierarchy(
              this.categoryRepo,
              plannedTaxonomy,
              hierarchy.category,
              hierarchy.subcategory,
              hierarchy.subSubcategory
            )
            : await ensureCategoryHierarchy(
              this.categoryRepo,
              hierarchy.category,
              hierarchy.subcategory,
              hierarchy.subSubcategory
            );
          hierarchyIds.set(key, ids);
          for (const m of ids.merges) {
            const note = `Imported ${m.level} "${m.imported}" merged into existing ${m.level} "${m.existing}" (same slug or name)`;
            if (result.warnings.includes(note)) continue;
            logger.info(`  ${note}`);
            result.warnings.push(note);
          }
        } catch (error: any) {
          logger.error(`Error creating hierarchy for ${key}: ${error.message}`);
          failedHierarchies.set(key, error instanceof Error ? error.message : String(error));
        }
      }
      
      result.wouldCreateTaxonomy = plannedTaxonomy;
      for (const node of result.wouldCreateTaxonomy) {
        result.warnings.push(`Would create ${node.level} "${node.name}"${node.parent ? ` under "${node.parent}"` : ''}`);
      }

      logger.info('Category hierarchy setup complete');
      
      // STEP 4: Process each resource. The catalog is read once: reading every
      // row per item timed the request out on a catalog of a few thousand.
      const catalog = new ImportCatalog(
        (await this.resourceRepo.listResources({ limit: 100000 })).resources
      );
      for (const resource of dbResources) {
        try {
          // Get hierarchy IDs for this resource
          const hierarchyKey = `${resource.category}|${resource.subcategory || ''}|${resource.subSubcategory || ''}`;
          const hierarchyId = hierarchyIds.get(hierarchyKey);
          const hierarchyFailure = failedHierarchies.get(hierarchyKey);
          if (hierarchyFailure !== undefined) {
            const errorMsg = `Error processing ${resource.title}: Category hierarchy error: ${hierarchyFailure}`;
            logger.error(errorMsg);
            result.errors.push(errorMsg);
            continue;
          }
          // Write the canonical taxonomy names: a heading merged into an
          // existing node must not keep its imported spelling, or the
          // resource's category text names no taxonomy row (orphan).
          if (hierarchyId) {
            resource.category = hierarchyId.category;
            resource.subcategory = hierarchyId.subcategory ?? resource.subcategory;
            resource.subSubcategory = hierarchyId.subSubcategory ?? resource.subSubcategory;
          }
          
          const conflict = this.checkConflict(resource, catalog);
          
          switch (conflict.action) {
            case 'create':
              if (!options.dryRun) {
                // Add hierarchy IDs to metadata for fast lookups
                const metadata = {
                  ...(conflict.resource.metadata as Record<string, any> || {}),
                  categoryId: hierarchyId?.categoryId,
                  subcategoryId: hierarchyId?.subcategoryId,
                  subSubcategoryId: hierarchyId?.subSubcategoryId,
                  importedFrom: repoUrl,
                  importedAt: new Date().toISOString(),
                };
                
                const created = await this.resourceRepo.createResource({
                  ...conflict.resource,
                  metadata,
                  status: 'approved',
                  githubSynced: true
                } as InsertResource);
                catalog.record(created);
                result.resources.push(created);
                
                // Log the import
                await this.auditRepo.logResourceAudit(
                  created.id,
                  'imported',
                  undefined,
                  { source: repoUrl },
                  `Imported from GitHub: ${repoUrl}`
                );
              }
              result.imported++;
              logger.info(`✓ Imported: ${resource.title}`);
              break;
              
            case 'update':
              if (!options.dryRun && conflict.resource.id) {
                // Update hierarchy IDs in metadata for consistency
                const existingMetadata = (conflict.resource.metadata as Record<string, any>) || {};
                const updatedMetadata = {
                  ...existingMetadata,
                  categoryId: hierarchyId?.categoryId,
                  subcategoryId: hierarchyId?.subcategoryId,
                  subSubcategoryId: hierarchyId?.subSubcategoryId,
                  lastUpdatedFrom: repoUrl,
                  lastUpdatedAt: new Date().toISOString(),
                };
                
                const updated = await this.resourceRepo.updateResource(
                  conflict.resource.id,
                  {
                    ...conflict.resource,
                    metadata: updatedMetadata
                  } as Partial<InsertResource>,
                  false
                );
                catalog.record(updated);
                result.resources.push(updated);
                
                // Log the update
                await this.auditRepo.logResourceAudit(
                  updated.id,
                  'updated',
                  undefined,
                  { source: repoUrl },
                  `Updated from GitHub: ${conflict.reason}`
                );
              }
              result.updated++;
              logger.info(`↻ Updated: ${resource.title} - ${conflict.reason}`);
              break;
              
            case 'skip':
              result.skipped++;
              logger.info(`- Skipped: ${resource.title} - ${conflict.reason}`);
              break;
          }
        } catch (error: any) {
          const errorMsg = `Error processing ${resource.title}: ${error.message}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
      
      // F13: one outcome for every record of this run — a run with item
      // errors is 'partial' when something landed, otherwise 'failed', and
      // every item error is kept (not just the first few).
      const importOutcome = result.errors.length === 0
        ? 'completed'
        : result.imported > 0 || result.updated > 0 ? 'partial' : 'failed';
      logger[importOutcome === 'failed' ? 'error' : importOutcome === 'partial' ? 'warn' : 'info'](
        'Import finished',
        {
          repo: repoUrl,
          outcome: importOutcome,
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors.length,
          ...(result.errors[0] ? { firstError: result.errors[0] } : {}),
        },
      );

      // Add to sync queue for tracking
      if (!options.dryRun) {
        if (recordQueueRow) await this.syncRepo.addToGithubSyncQueue({
          repositoryUrl: repoUrl,
          branch: result.branch ?? null,
          action: 'import',
          status: importOutcome === 'failed' ? 'failed' : 'completed',
          resourceIds: result.resources.map(r => r.id),
          metadata: {
            imported: [result.imported] as [any, ...any[]],
            updated: [result.updated] as [any, ...any[]],
            skipped: [result.skipped] as [any, ...any[]],
            errors: result.errors.length,
            outcome: importOutcome,
            errorMessages: result.errors,
          }
        });

        // Persist canonical sync history row (Task #53 step 6)
        try {
          await this.syncRepo.saveSyncHistory({
            repositoryUrl: repoUrl,
            direction: 'import',
            resourcesAdded: result.imported,
            resourcesUpdated: result.updated,
            resourcesRemoved: 0,
            totalResources: result.imported + result.updated + result.skipped,
            snapshot: {
              imported: result.imported,
              updated: result.updated,
              skipped: result.skipped,
              errors: result.errors.length,
              warnings: result.warnings.length,
              validationPassed: result.validationPassed,
              resources: result.resources.map(r => ({ id: r.id, title: r.title, url: r.url })),
            },
            metadata: {
              outcome: importOutcome,
              errorMessages: result.errors,
            },
          });
        } catch (historyErr: any) {
          logger.error('Failed to write github_sync_history row (non-fatal):', historyErr);
        }
      }

    } catch (error: any) {
      const errorMsg = `Import failed: ${error.message}`;
      result.errors.push(errorMsg);
      logger.error('Import failed', { repo: repoUrl, reason: error.message }, error);
      
      // Log failed import
      if (!options.dryRun) {
        if (recordQueueRow) await this.syncRepo.addToGithubSyncQueue({
          repositoryUrl: repoUrl,
          branch: result.branch ?? null,
          action: 'import',
          status: 'failed',
          resourceIds: [],
          metadata: { error: error.message }
        });
        try {
          await this.syncRepo.saveSyncHistory({
            repositoryUrl: repoUrl,
            direction: 'import',
            resourcesAdded: 0,
            resourcesUpdated: 0,
            resourcesRemoved: 0,
            totalResources: 0,
            snapshot: { error: error.message },
            metadata: { outcome: 'failed' },
          });
        } catch (historyErr: any) {
          logger.error('Failed to write github_sync_history failed row (non-fatal):', historyErr);
        }
      }
    }
    
    return result;
  }

  /**
   * Detect the default branch for a repository
   * Robustly tries repository's actual default branch with retry logic
   */
  private async detectDefaultBranch(
    octokit: any,
    owner: string,
    repo: string
  ): Promise<string> {
    let defaultBranch: string | null = null;
    let repoFetchError: any = null;

    // Step 1: Get repository info to find the actual default branch
    try {
      const { data: repoInfo } = await octokit.repos.get({ owner, repo });
      defaultBranch = repoInfo.default_branch;
      logger.info(`Repository default branch: ${defaultBranch}`);
    } catch (error: any) {
      logger.warn(`Could not fetch repository info: ${error.message} (HTTP ${error.status || 'unknown'})`);
      repoFetchError = error;
    }

    // Step 2: Build list of branches to try
    // Priority: [defaultBranch, fallbacks, retry defaultBranch]
    const branchesToTry: string[] = [];
    const defaultLower = defaultBranch?.toLowerCase();
    
    // First attempt: actual default branch
    if (defaultBranch) {
      branchesToTry.push(defaultBranch);
    }
    
    // Fallbacks: common branch names (case-insensitive check to avoid duplicates)
    if (defaultLower !== 'main') branchesToTry.push('main');
    if (defaultLower !== 'master') branchesToTry.push('master');
    
    // Retry: default branch again (handles transient errors)
    if (defaultBranch && branchesToTry.length > 1) {
      branchesToTry.push(defaultBranch);
    }

    // Step 3: Try each branch with retry logic for transient errors
    const errors: { branch: string; error: any; attempt: number }[] = [];
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;
    
    for (const branch of branchesToTry) {
      const isDefaultBranch = branch === defaultBranch;
      const maxAttempts = isDefaultBranch ? MAX_RETRIES : 1; // Only retry the actual default branch
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`
          });
          logger.info(`✓ Using branch: ${branch}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
          return branch;
        } catch (error: any) {
          const status = error.status || 'unknown';
          const isTransient = status === 503 || status === 500 || status === 'unknown';
          const shouldRetry = isDefaultBranch && attempt < maxAttempts && isTransient;
          
          logger.warn(
            `Branch '${branch}' not accessible (attempt ${attempt}/${maxAttempts}): ` +
            `${error.message} (HTTP ${status})${shouldRetry ? ' - retrying...' : ''}`
          );
          
          errors.push({ branch, error, attempt });
          
          if (shouldRetry) {
            // Wait before retry with simple linear backoff
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            continue;
          }
          
          // Fatal error or no more retries - move to next branch
          break;
        }
      }
    }

    // Step 4: All branches failed - provide detailed diagnostic error
    const triedBranches = Array.from(new Set(branchesToTry)).join(', '); // Remove duplicates for display
    const errorDetails = errors
      .filter((e, i, arr) => 
        // Keep last attempt for each branch
        i === arr.findIndex(x => x.branch === e.branch && x.attempt >= e.attempt)
      )
      .map(({ branch, error, attempt }) => 
        `${branch}: ${error.message} (HTTP ${error.status || 'unknown'})${attempt > 1 ? ` after ${attempt} attempts` : ''}`
      )
      .join('; ');
    
    // Build comprehensive error message
    let errorMsg = `Could not find an accessible branch in ${owner}/${repo}. ` +
      `Tried: ${triedBranches}. ` +
      `Errors: ${errorDetails}.`;
    
    if (repoFetchError) {
      const repoStatus = repoFetchError.status || 'unknown';
      const repoDetails = repoFetchError.response?.headers 
        ? ` (request-id: ${repoFetchError.response.headers['x-github-request-id'] || 'unavailable'})` 
        : '';
      errorMsg += ` Repository fetch error: ${repoFetchError.message} (HTTP ${repoStatus})${repoDetails}.`;
    }
    
    errorMsg += ` The repository may be empty, private, or you may not have the required permissions.`;
    
    throw new Error(errorMsg);
  }

  /**
   * Export approved resources to a GitHub awesome list repository
   */
  async exportToGitHub(
    repoUrl: string,
    options: SyncOptions = {}
  ): Promise<ExportResult> {
    const result: ExportResult = {
      exported: 0,
      errors: []
    };
    logger.info('Export started', {
      repo: repoUrl,
      dryRun: !!options.dryRun,
      ...(typeof options.queueId === 'number' ? { queueId: options.queueId } : {}),
    });

    try {
      // Get fresh Octokit client with Replit GitHub connection
      const octokit = await getGitHubClient();
      
      // Parse repo info from URL (supports both full URLs and owner/repo shorthand)
      let repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (!repoMatch) {
        repoMatch = repoUrl.match(/^([^\/]+)\/([^\/]+)$/);
      }
      if (!repoMatch) {
        throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
      }
      const [, owner, repoName] = repoMatch;
      const repo = repoName.replace(/\.git$/, '');

      // Get repository info
      const { data: repoInfo } = await octokit.repos.get({ owner, repo });
      const repoTitle = repoInfo.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      // Fetch all approved resources using storage method
      const currentResources = await this.resourceRepo.getAllApprovedResources();

      if (currentResources.length === 0) {
        throw new Error('No approved resources to export');
      }

      logger.info(`Exporting ${currentResources.length} approved resources...`);

      // Get last sync history to calculate diff
      const lastSync = await this.syncRepo.getLastSyncHistory(repoUrl, 'export');
      const lastSnapshot = lastSync?.snapshot?.resources as Resource[] || [];

      // Calculate diff: added, updated, removed
      const { added, updated, removed } = this.calculateDiff(lastSnapshot, currentResources);

      logger.info(`Diff: ${added} added, ${updated} updated, ${removed} removed`);

      // Generate smart commit message
      const commitMessage = lastSync 
        ? `Added ${added} resources, updated ${updated}, removed ${removed}`
        : 'Initial awesome list export';

      // Generate README and CONTRIBUTING content
      const formatter = new AwesomeListFormatter(currentResources, {
        title: repoTitle,
        description: repoInfo.description || `A curated list of ${repoTitle.toLowerCase()} resources`,
        includeContributing: true,
        includeLicense: true,
        websiteUrl: this.websiteUrl,
        repoUrl
      });

      const readmeContent = formatter.generate();
      const contributingContent = generateContributingMd(this.websiteUrl, repoUrl);

      // Validate with awesome-lint BEFORE pushing to GitHub
      logger.info('Validating generated markdown with awesome-lint...');
      const validationResult = validateAwesomeList(readmeContent);
      
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => 
          `Line ${e.line}: ${e.rule} - ${e.message}`
        ).join('\n');
        
        throw new Error(
          `GitHub export blocked: awesome-lint validation failed with ${validationResult.errors.length} error(s):\n${errorMessages}`
        );
      }
      
      logger.info(`✓ awesome-lint validation passed (${validationResult.warnings.length} warnings)`);

      // Export link gate: check the EXACT README we are about to push for
      // confirmed-broken links, BEFORE any GitHub write. Repository/export
      // scope only — findings are logged here, never written to the Link
      // Health dashboard. Strict dead-link policy: bot-blocks/timeouts pass;
      // only DNS/refused/browser-confirmed 404-410/SSL failures block.
      // Opt out via options.skipLinkCheck or EXPORT_LINK_CHECK=off.
      if (!options.skipLinkCheck && process.env.EXPORT_LINK_CHECK !== 'off') {
        const { runExportLinkGate } = await import('../validation/exportLinkGate');
        logger.info('[export-link-check] scanning generated README for confirmed-broken links...');
        const gate = await runExportLinkGate(readmeContent, {
          onProgress: (checked, total) => {
            if (checked % 200 === 0 || checked === total) {
              logger.info(`[export-link-check] first pass ${checked}/${total}`);
            }
          },
        });
        if (!gate.passed) {
          const details = gate.confirmedBroken
            .map((b) => `  - ${b.url} (${b.verdict})`)
            .join('\n');
          throw new Error(
            `GitHub export blocked: export link check found ${gate.confirmedBroken.length} confirmed-broken link(s) in the generated README ` +
            `(checked ${gate.checked}, allowlisted ${gate.skipped}; bot-blocks/timeouts do not count):\n${details}\n` +
            `Fix or remove these resources (or add documented false positives to scripts/awesome-bot-allowlist.txt) and re-export. ` +
            `This check is separate from the Link Health dashboard.`
          );
        }
        logger.info(`[export-link-check] ✓ passed — ${gate.checked} links checked, ${gate.skipped} allowlisted, 0 confirmed broken`);
      } else {
        logger.info('[export-link-check] skipped (disabled by option or EXPORT_LINK_CHECK=off)');
      }

      if (options.dryRun) {
        logger.info('Dry run - would update:');
        logger.info('- README.md');
        logger.info('- CONTRIBUTING.md');
        logger.info(`Commit message: ${commitMessage}`);
        result.exported = currentResources.length;
        return result;
      }

      // Detect the default branch (main, master, or repository default)
      const defaultBranch = await this.detectDefaultBranch(octokit, owner, repo);
      result.branch = defaultBranch;

      // Get current commit SHA for the default branch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`
      });
      const currentCommitSha = refData.object.sha;

      // Get the tree SHA of the current commit
      const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      });
      const currentTreeSha = commitData.tree.sha;

      // Create blobs for README and CONTRIBUTING files
      const readmeBlob = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(readmeContent).toString('base64'),
        encoding: 'base64'
      });

      const contributingBlob = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(contributingContent).toString('base64'),
        encoding: 'base64'
      });

      // Create a new tree with both files
      const { data: treeData } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: [
          {
            path: 'README.md',
            mode: '100644' as const,
            type: 'blob' as const,
            sha: readmeBlob.data.sha
          },
          {
            path: 'CONTRIBUTING.md',
            mode: '100644' as const,
            type: 'blob' as const,
            sha: contributingBlob.data.sha
          }
        ]
      });

      // Create a commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeData.sha,
        parents: [currentCommitSha]
      });

      // Update the reference to point to the new commit (commit directly to default branch)
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
        sha: newCommit.sha
      });

      result.commitSha = newCommit.sha;
      result.commitUrl = newCommit.html_url;
      result.exported = currentResources.length;

      logger.info('Export committed', {
        repo: repoUrl,
        commit: newCommit.sha,
        resources: currentResources.length,
        added,
        updated,
        removed,
        ...(typeof options.queueId === 'number' ? { queueId: options.queueId } : {}),
      });

      // Update resources as synced (single bulk UPDATE — a per-resource
      // Promise.all here exhausted the pg pool on large exports)
      const resourceIds = currentResources.map(r => r.id);
      await this.resourceRepo.markResourcesSynced(resourceIds);

      // Store sync history with snapshot and diff counts
      await this.syncRepo.saveSyncHistory({
        repositoryUrl: repoUrl,
        direction: 'export',
        commitSha: newCommit.sha,
        commitMessage,
        commitUrl: newCommit.html_url,
        resourcesAdded: added,
        resourcesUpdated: updated,
        resourcesRemoved: removed,
        totalResources: currentResources.length,
        snapshot: {
          resources: currentResources.map(r => ({
            id: r.id,
            url: r.url,
            title: r.title,
            description: r.description,
            category: r.category,
            subcategory: r.subcategory,
            subSubcategory: r.subSubcategory
          }))
        } as any,
        metadata: {
          diff: { added, updated, removed },
          ...(typeof options.queueId === 'number' ? { queueId: options.queueId } : {}),
        } as any
      });

      // Log the export
      await this.auditRepo.logResourceAudit(
        null,
        'exported',
        undefined,
        { 
          repository: repoUrl,
          count: currentResources.length,
          commitSha: result.commitSha,
          added,
          updated,
          removed
        },
        commitMessage
      );

      // Note: queue-row status is owned by the caller (route or queue processor),
      // which updates the row it created — no extra terminal row is inserted here.

    } catch (error: any) {
      // Provide user-friendly error messages for common GitHub issues
      let errorMsg = error.message;
      
      if (error.status === 404) {
        errorMsg = `Repository not found or you don't have access. Please check the repository URL and your permissions.`;
      } else if (error.status === 403) {
        errorMsg = `Permission denied. You need write access to this repository. Check your GitHub authentication.`;
      } else if (error.message.includes('branch')) {
        errorMsg = `Branch error: ${error.message}. The repository may be empty or you may need to create an initial commit.`;
      } else if (error.message.includes('awesome-lint')) {
        // awesome-lint errors are already detailed, keep them as-is
        errorMsg = error.message;
      } else {
        errorMsg = `Export failed: ${error.message}`;
      }
      
      result.errors.push(errorMsg);
      logger.error('Export failed', {
        repo: repoUrl,
        reason: errorMsg,
        ...(typeof options.queueId === 'number' ? { queueId: options.queueId } : {}),
      });
      // Queue-row failure status is recorded by the caller (route or queue
      // processor) via updateGithubSyncStatus on the row it created — no
      // duplicate terminal row is inserted here.
    }

    return result;
  }

  /**
   * Calculate diff between last snapshot and current resources
   */
  private calculateDiff(
    lastSnapshot: Resource[],
    currentResources: Resource[]
  ): { added: number; updated: number; removed: number } {
    // Create maps using URL as unique identifier
    const lastMap = new Map(lastSnapshot.map(r => [r.url, r]));
    const currentMap = new Map(currentResources.map(r => [r.url, r]));

    let added = 0;
    let updated = 0;
    let removed = 0;

    // Check for added and updated resources
    for (const [url, current] of Array.from(currentMap.entries())) {
      const last = lastMap.get(url);
      if (!last) {
        // Resource is in current but not in snapshot -> added
        added++;
      } else {
        // Resource exists in both, check if updated
        if (
          last.title !== current.title ||
          last.description !== current.description ||
          last.category !== current.category ||
          last.subcategory !== current.subcategory ||
          last.subSubcategory !== current.subSubcategory
        ) {
          updated++;
        }
      }
    }

    // Check for removed resources (in snapshot but not in current)
    for (const url of Array.from(lastMap.keys())) {
      if (!currentMap.has(url)) {
        removed++;
      }
    }

    return { added, updated, removed };
  }

  /**
   * Process the GitHub sync queue
   */
  async processQueue(): Promise<void> {
    logger.info('Processing GitHub sync queue...');
    
    const queueItems = await this.syncRepo.getGithubSyncQueue('pending');
    
    if (queueItems.length === 0) {
      logger.info('No pending items in sync queue');
      return;
    }

    logger.info(`Found ${queueItems.length} pending items in queue`);

    for (const item of queueItems) {
      this.activeQueueIds.add(item.id);
      try {
        // Update status to processing
        await this.syncRepo.updateGithubSyncStatus(item.id, 'processing');

        if (item.action === 'import') {
          // This queue row is the import's tracking row; don't let
          // importFromGitHub insert a second one.
          const result = await this.importFromGitHub(
            item.repositoryUrl,
            { dryRun: false },
            { queueRowOwnedByCaller: true },
          );

          // F13: queued imports record the same outcome shape as direct ones —
          // a partial import keeps its 'partial' outcome and EVERY item error.
          const succeededSome = result.imported > 0 || result.updated > 0;
          const metadata = {
            imported: [result.imported],
            updated: [result.updated],
            skipped: [result.skipped],
            errors: result.errors.length,
            outcome: result.errors.length === 0 ? 'completed' : succeededSome ? 'partial' : 'failed',
            errorMessages: result.errors,
          };

          if (result.errors.length === 0) {
            await this.syncRepo.updateGithubSyncStatus(item.id, 'completed', undefined, metadata, result.branch);
          } else {
            await this.syncRepo.updateGithubSyncStatus(
              item.id,
              succeededSome ? 'completed' : 'failed',
              result.errors.join('; '),
              metadata,
              result.branch
            );
          }
        } else if (item.action === 'export') {
          const result = await this.exportToGitHub(item.repositoryUrl, {
            dryRun: false,
            createPullRequest: true,
            queueId: item.id,
          });

          // commitSha is set as soon as the commit lands, so a failure in the
          // bookkeeping after it still records which commit this run made.
          const metadata = {
            exported: result.exported,
            errors: result.errors.length,
            ...(result.commitSha ? { commitSha: result.commitSha, commitUrl: result.commitUrl } : {}),
          };

          if (result.errors.length === 0) {
            await this.syncRepo.updateGithubSyncStatus(item.id, 'completed', undefined, metadata, result.branch);
          } else {
            await this.syncRepo.updateGithubSyncStatus(
              item.id,
              'failed',
              result.errors.join('; '),
              metadata,
              result.branch
            );
          }
        }
      } catch (error: any) {
        logger.error(`Error processing queue item ${item.id}:`, error);
        await this.syncRepo.updateGithubSyncStatus(
          item.id,
          'failed',
          error.message
        );
      } finally {
        this.activeQueueIds.delete(item.id);
      }
    }

    logger.info('Queue processing completed');
  }

  // Run15 BUG-011 (architect review): expose live-owned queue row ids for the
  // periodic orphan sweep's exclusion list.
  getActiveQueueIds(): number[] {
    return Array.from(this.activeQueueIds);
  }

  /**
   * Mark a queue row as owned by this process while `work` runs, so the
   * periodic orphan sweep never fails a live sync. The admin routes run
   * imports and exports directly (not via processQueue); an export's
   * pre-push link check alone outlasts the sweep's 5-minute age threshold.
   */
  async runOwnedQueueItem<T>(queueId: number, work: () => Promise<T>): Promise<T> {
    this.activeQueueIds.add(queueId);
    try {
      return await work();
    } finally {
      this.activeQueueIds.delete(queueId);
    }
  }

  /**
   * Check for conflicts with existing resources
   */
  private checkConflict(resource: Partial<Resource>, catalog: ImportCatalog): ConflictResolution {
    // Run3 audit R3-24: the old check compared EXACT URLs over only the first
    // 1,000 approved rows — short-links (link.medium.com) and rows past the
    // cap slipped through and were re-imported as duplicates. Now we compare
    // normalized URLs over the whole catalog and fall back to a title+domain
    // match.
    const existing = catalog.findByUrl(resource.url ?? '');

    if (!existing) {
      // Same normalized title + same root domain = same item behind a
      // different URL shape (tracking params, short-links, mirrors).
      const duplicate = catalog.findByTitleDomain(resource.title ?? '', resource.url ?? '');
      if (duplicate) {
        return {
          action: 'skip',
          resource: duplicate,
          reason: `Duplicate of #${duplicate.id} (same title + domain, different URL form)`
        };
      }
    }

    if (!existing) {
      return {
        action: 'create',
        resource,
        reason: 'New resource'
      };
    }

    // Check if there are differences
    // The parser leaves absent levels undefined while stored rows hold null;
    // compare nullishly or every unchanged re-import is miscounted as an
    // update (and rewrites updated_at plus an audit row per resource).
    const differs = (a: unknown, b: unknown) => (a ?? null) !== (b ?? null);
    const hasChanges =
      differs(existing.title, resource.title) ||
      differs(existing.description, resource.description) ||
      differs(existing.category, resource.category) ||
      differs(existing.subcategory, resource.subcategory) ||
      differs(existing.subSubcategory, resource.subSubcategory);

    if (hasChanges) {
      // Merge descriptions if different
      let mergedDescription = existing.description;
      if (resource.description && resource.description !== existing.description) {
        // Use the longer description or combine them
        if ((resource.description?.length || 0) > (existing.description?.length || 0)) {
          mergedDescription = resource.description;
        }
      }

      return {
        action: 'update',
        resource: {
          ...resource,
          id: existing.id,
          description: mergedDescription
        },
        reason: 'Updated content'
      };
    }

    return {
      action: 'skip',
      resource: existing,
      reason: 'No changes detected'
    };
  }

  /**
   * Get sync history for a repository
   */
  async getSyncHistory(repoUrl: string): Promise<GithubSyncQueue[]> {
    const allItems = await this.syncRepo.getGithubSyncQueue();
    return allItems.filter(item => item.repositoryUrl === repoUrl);
  }

  /**
   * Configure GitHub integration for a repository
   */
  async configureRepository(repoUrl: string, token?: string): Promise<{
    success: boolean;
    message: string;
    hasAccess: boolean;
  }> {
    try {
      // Create a client with the provided token if given
      const testClient = token ? new GitHubClient(token) : this.client;
      
      // Verify repository exists and user has access
      const hasAccess = await testClient.hasWriteAccess(repoUrl);
      
      if (!hasAccess) {
        return {
          success: false,
          message: 'No write access to repository. Please check your GitHub token permissions.',
          hasAccess: false
        };
      }

      // Store configuration (token would be stored securely in production)
      // For now, we assume it's in environment variables
      
      return {
        success: true,
        message: 'Repository configured successfully',
        hasAccess: true
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Configuration failed: ${error.message}`,
        hasAccess: false
      };
    }
  }
}

// Export singleton instance
export const syncService = new GitHubSyncService();