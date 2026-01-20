import { GitHubClient } from "./client";
import { parseAwesomeList, convertToDbResources } from "./parser";
import { AwesomeListFormatter, generateContributingMd } from "./formatter";
import { storage } from "../storage";
import { Resource, InsertResource, GithubSyncQueue } from "@shared/schema";
import { getGitHubClient } from "./replitConnection";
import { validateAwesomeList } from "../validation/awesomeLint";

/**
 * Service for synchronizing awesome lists with GitHub
 * Handles import, export, conflict resolution, and queue processing
 */

interface SyncOptions {
  dryRun?: boolean;
  forceOverwrite?: boolean;
  createPullRequest?: boolean;
  branchName?: string;
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
}

interface ExportResult {
  exported: number;
  commitSha?: string;
  commitUrl?: string;
  pullRequestUrl?: string;
  errors: string[];
}

interface ConflictResolution {
  action: 'skip' | 'update' | 'create';
  resource: Partial<Resource>;
  reason: string;
}

/**
 * Helper function to generate URL-safe slugs from names
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Ensure category hierarchy exists in database, creating entries as needed
 * Returns the IDs for the category, subcategory, and sub-subcategory
 */
async function ensureCategoryHierarchy(
  categoryName: string,
  subcategoryName?: string,
  subSubcategoryName?: string
): Promise<{
  categoryId: number;
  subcategoryId?: number;
  subSubcategoryId?: number;
}> {
  // 1. Ensure category exists
  let category = await storage.getCategoryByName(categoryName);
  if (!category) {
    try {
      category = await storage.createCategory({
        name: categoryName,
        slug: generateSlug(categoryName),
      });
      console.log(`  Created category: ${categoryName}`);
    } catch (e: any) {
      // May already exist due to race condition, try to fetch again
      category = await storage.getCategoryByName(categoryName);
      if (!category) {
        throw new Error(`Failed to create or find category: ${categoryName} - ${e.message}`);
      }
    }
  }

  // 2. Ensure subcategory exists (if provided)
  let subcategory;
  if (subcategoryName) {
    subcategory = await storage.getSubcategoryByName(subcategoryName, category.id);
    if (!subcategory) {
      try {
        subcategory = await storage.createSubcategory({
          name: subcategoryName,
          slug: generateSlug(subcategoryName),
          categoryId: category.id,
        });
        console.log(`  Created subcategory: ${subcategoryName} under ${categoryName}`);
      } catch (e: any) {
        // May already exist due to race condition
        subcategory = await storage.getSubcategoryByName(subcategoryName, category.id);
        if (!subcategory) {
          throw new Error(`Failed to create or find subcategory: ${subcategoryName} - ${e.message}`);
        }
      }
    }
  }

  // 3. Ensure sub-subcategory exists (if provided)
  let subSubcategory;
  if (subSubcategoryName && subcategory) {
    subSubcategory = await storage.getSubSubcategoryByName(subSubcategoryName, subcategory.id);
    if (!subSubcategory) {
      try {
        subSubcategory = await storage.createSubSubcategory({
          name: subSubcategoryName,
          slug: generateSlug(subSubcategoryName),
          subcategoryId: subcategory.id,
        });
        console.log(`  Created sub-subcategory: ${subSubcategoryName} under ${subcategoryName}`);
      } catch (e: any) {
        // May already exist due to race condition
        subSubcategory = await storage.getSubSubcategoryByName(subSubcategoryName, subcategory.id);
        if (!subSubcategory) {
          throw new Error(`Failed to create or find sub-subcategory: ${subSubcategoryName} - ${e.message}`);
        }
      }
    }
  }

  return {
    categoryId: category.id,
    subcategoryId: subcategory?.id,
    subSubcategoryId: subSubcategory?.id,
  };
}

export class GitHubSyncService {
  private client: GitHubClient;
  private websiteUrl: string;

  constructor(githubToken?: string) {
    this.client = new GitHubClient(githubToken);
    this.websiteUrl = process.env.WEBSITE_URL || 'https://awesome-list.com';
  }

  /**
   * Import resources from a GitHub awesome list repository
   */
  async importFromGitHub(
    repoUrl: string, 
    options: SyncOptions & { strictMode?: boolean } = {}
  ): Promise<ImportResult> {
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
      resources: []
    };

    try {
      // Fetch README content
      console.log(`Fetching README from ${repoUrl}...`);
      const readmeContent = await this.client.fetchFile(repoUrl, 'README.md');
      
      // STEP 1: Validate with awesome-lint BEFORE importing
      console.log('Validating awesome list with awesome-lint...');
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
      console.log(`Validation: ${validationResult.valid ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`  - Lines: ${validationResult.stats.totalLines}`);
      console.log(`  - Resources detected: ${validationResult.stats.totalResources}`);
      console.log(`  - Categories detected: ${validationResult.stats.totalCategories}`);
      console.log(`  - Errors: ${validationResult.errors.length}`);
      console.log(`  - Warnings: ${validationResult.warnings.length}`);
      
      // REJECT if validation failed (has errors)
      if (!validationResult.valid) {
        const errorSummary = validationResult.errors.slice(0, 5).map(e => 
          `Line ${e.line}: [${e.rule}] ${e.message}`
        ).join('\n');
        
        const errorMessage = `Import rejected: awesome-lint validation failed with ${validationResult.errors.length} error(s).\n\nFirst ${Math.min(5, validationResult.errors.length)} errors:\n${errorSummary}`;
        
        result.errors.push(errorMessage);
        console.error('Import rejected due to validation errors');
        
        // Log failed import attempt
        if (!options.dryRun) {
          await storage.addToGithubSyncQueue({
            repositoryUrl: repoUrl,
            action: 'import',
            status: 'failed',
            resourceIds: [],
            metadata: { 
              error: 'Validation failed',
              validationErrors: validationResult.errors.length,
              validationWarnings: validationResult.warnings.length
            } as any
          });
        }
        
        return result;
      }
      
      // In strict mode, also reject if there are warnings
      if (options.strictMode && validationResult.warnings.length > 0) {
        const warningMessage = `Import rejected (strict mode): ${validationResult.warnings.length} warning(s) found. Disable strict mode to import with warnings.`;
        result.errors.push(warningMessage);
        console.error('Import rejected due to warnings in strict mode');
        return result;
      }
      
      if (validationResult.warnings.length > 0) {
        console.log(`⚠ Proceeding with ${validationResult.warnings.length} warnings`);
      }
      
      // STEP 2: Parse the awesome list
      console.log('Parsing awesome list content...');
      const parsedList = await parseAwesomeList(readmeContent);
      const dbResources = convertToDbResources(parsedList);
      
      console.log(`Found ${dbResources.length} resources in the awesome list`);
      
      // STEP 3: Build and ensure category hierarchy exists in database
      console.log('Ensuring category hierarchy exists in database...');
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
      
      console.log(`Found ${uniqueHierarchies.size} unique category hierarchies`);
      
      // Create all category hierarchies
      const hierarchyIds = new Map<string, { categoryId: number; subcategoryId?: number; subSubcategoryId?: number }>();
      for (const [key, hierarchy] of uniqueHierarchies) {
        try {
          const ids = await ensureCategoryHierarchy(
            hierarchy.category,
            hierarchy.subcategory,
            hierarchy.subSubcategory
          );
          hierarchyIds.set(key, ids);
        } catch (error: any) {
          console.error(`Error creating hierarchy for ${key}: ${error.message}`);
          result.errors.push(`Category hierarchy error: ${error.message}`);
        }
      }
      
      console.log('Category hierarchy setup complete');
      
      // STEP 4: Process each resource
      for (const resource of dbResources) {
        try {
          // Get hierarchy IDs for this resource
          const hierarchyKey = `${resource.category}|${resource.subcategory || ''}|${resource.subSubcategory || ''}`;
          const hierarchyId = hierarchyIds.get(hierarchyKey);
          
          const conflict = await this.checkConflict(resource);
          
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
                
                const created = await storage.createResource({
                  ...conflict.resource,
                  metadata,
                  status: 'approved',
                  githubSynced: true
                } as InsertResource);
                result.resources.push(created);
                
                // Log the import
                await storage.logResourceAudit(
                  created.id,
                  'imported',
                  undefined,
                  { source: repoUrl },
                  `Imported from GitHub: ${repoUrl}`
                );
              }
              result.imported++;
              console.log(`✓ Imported: ${resource.title}`);
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
                
                const updated = await storage.updateResource(
                  conflict.resource.id,
                  {
                    ...conflict.resource,
                    metadata: updatedMetadata
                  } as Partial<InsertResource>
                );
                result.resources.push(updated);
                
                // Log the update
                await storage.logResourceAudit(
                  updated.id,
                  'updated',
                  undefined,
                  { source: repoUrl },
                  `Updated from GitHub: ${conflict.reason}`
                );
              }
              result.updated++;
              console.log(`↻ Updated: ${resource.title} - ${conflict.reason}`);
              break;
              
            case 'skip':
              result.skipped++;
              console.log(`- Skipped: ${resource.title} - ${conflict.reason}`);
              break;
          }
        } catch (error: any) {
          const errorMsg = `Error processing ${resource.title}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      // Add to sync queue for tracking
      if (!options.dryRun) {
        await storage.addToGithubSyncQueue({
          repositoryUrl: repoUrl,
          action: 'import',
          status: 'completed',
          resourceIds: result.resources.map(r => r.id),
          metadata: {
            imported: [result.imported] as [any, ...any[]],
            updated: [result.updated] as [any, ...any[]],
            skipped: [result.skipped] as [any, ...any[]]
          }
        });
      }
      
    } catch (error: any) {
      const errorMsg = `Import failed: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
      
      // Log failed import
      if (!options.dryRun) {
        await storage.addToGithubSyncQueue({
          repositoryUrl: repoUrl,
          action: 'import',
          status: 'failed',
          resourceIds: [],
          metadata: { error: error.message }
        });
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
      console.log(`Repository default branch: ${defaultBranch}`);
    } catch (error: any) {
      console.warn(`Could not fetch repository info: ${error.message} (HTTP ${error.status || 'unknown'})`);
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
          console.log(`✓ Using branch: ${branch}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
          return branch;
        } catch (error: any) {
          const status = error.status || 'unknown';
          const isTransient = status === 503 || status === 500 || status === 'unknown';
          const shouldRetry = isDefaultBranch && attempt < maxAttempts && isTransient;
          
          console.warn(
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

    try {
      // Get fresh Octokit client with Replit GitHub connection
      const octokit = await getGitHubClient();
      
      // Parse repo info from URL
      const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (!repoMatch) {
        throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
      }
      const [, owner, repoName] = repoMatch;
      const repo = repoName.replace(/\.git$/, '');

      // Get repository info
      const { data: repoInfo } = await octokit.repos.get({ owner, repo });
      const repoTitle = repoInfo.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      // Fetch all approved resources using storage method
      const currentResources = await storage.getAllApprovedResources();

      if (currentResources.length === 0) {
        throw new Error('No approved resources to export');
      }

      console.log(`Exporting ${currentResources.length} approved resources...`);

      // Get last sync history to calculate diff
      const lastSync = await storage.getLastSyncHistory(repoUrl, 'export');
      const lastSnapshot = lastSync?.snapshot?.resources as Resource[] || [];

      // Calculate diff: added, updated, removed
      const { added, updated, removed } = this.calculateDiff(lastSnapshot, currentResources);

      console.log(`Diff: ${added} added, ${updated} updated, ${removed} removed`);

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
      console.log('Validating generated markdown with awesome-lint...');
      const validationResult = validateAwesomeList(readmeContent);
      
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map(e => 
          `Line ${e.line}: ${e.rule} - ${e.message}`
        ).join('\n');
        
        throw new Error(
          `GitHub export blocked: awesome-lint validation failed with ${validationResult.errors.length} error(s):\n${errorMessages}`
        );
      }
      
      console.log(`✓ awesome-lint validation passed (${validationResult.warnings.length} warnings)`);

      if (options.dryRun) {
        console.log('Dry run - would update:');
        console.log('- README.md');
        console.log('- CONTRIBUTING.md');
        console.log(`Commit message: ${commitMessage}`);
        result.exported = currentResources.length;
        return result;
      }

      // Detect the default branch (main, master, or repository default)
      const defaultBranch = await this.detectDefaultBranch(octokit, owner, repo);

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

      console.log(`✓ Committed changes: ${newCommit.sha}`);

      // Update resources as synced
      const resourceIds = currentResources.map(r => r.id);
      await Promise.all(
        resourceIds.map(id => 
          storage.updateResource(id, { 
            githubSynced: true, 
            lastSyncedAt: new Date() 
          } as Partial<InsertResource>)
        )
      );

      // Store sync history with snapshot and diff counts
      await storage.saveSyncHistory({
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
          diff: { added, updated, removed }
        } as any
      });

      // Log the export
      await storage.logResourceAudit(
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

      // Add to sync queue
      await storage.addToGithubSyncQueue({
        repositoryUrl: repoUrl,
        action: 'export',
        status: 'completed',
        resourceIds: resourceIds as any,
        metadata: {
          exported: result.exported,
          commitSha: result.commitSha,
          commitMessage,
          diff: { added, updated, removed }
        } as any
      });

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
      console.error('GitHub export error:', errorMsg);

      // Log failed export via updateGithubSyncStatus if queue item exists
      // Or log in metadata if creating new queue item
      await storage.addToGithubSyncQueue({
        repositoryUrl: repoUrl,
        action: 'export',
        status: 'failed',
        resourceIds: [] as any,
        metadata: { 
          error: errorMsg
        } as any
      });
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
    console.log('Processing GitHub sync queue...');
    
    const queueItems = await storage.getGithubSyncQueue('pending');
    
    if (queueItems.length === 0) {
      console.log('No pending items in sync queue');
      return;
    }

    console.log(`Found ${queueItems.length} pending items in queue`);

    for (const item of queueItems) {
      try {
        // Update status to processing
        await storage.updateGithubSyncStatus(item.id, 'processing');

        if (item.action === 'import') {
          const result = await this.importFromGitHub(item.repositoryUrl, {
            dryRun: false
          });

          if (result.errors.length === 0) {
            await storage.updateGithubSyncStatus(item.id, 'completed');
          } else {
            await storage.updateGithubSyncStatus(
              item.id, 
              'failed',
              result.errors.join('; ')
            );
          }
        } else if (item.action === 'export') {
          const result = await this.exportToGitHub(item.repositoryUrl, {
            dryRun: false,
            createPullRequest: true
          });

          if (result.errors.length === 0) {
            await storage.updateGithubSyncStatus(item.id, 'completed');
          } else {
            await storage.updateGithubSyncStatus(
              item.id,
              'failed',
              result.errors.join('; ')
            );
          }
        }
      } catch (error: any) {
        console.error(`Error processing queue item ${item.id}:`, error);
        await storage.updateGithubSyncStatus(
          item.id,
          'failed',
          error.message
        );
      }
    }

    console.log('Queue processing completed');
  }

  /**
   * Check for conflicts with existing resources
   */
  private async checkConflict(resource: Partial<Resource>): Promise<ConflictResolution> {
    // Check if resource with same URL exists
    const existingResources = await storage.listResources({
      limit: 1000,
      status: 'approved'
    });

    const existing = existingResources.resources.find(r => r.url === resource.url);

    if (!existing) {
      return {
        action: 'create',
        resource,
        reason: 'New resource'
      };
    }

    // Check if there are differences
    const hasChanges = 
      existing.title !== resource.title ||
      existing.description !== resource.description ||
      existing.category !== resource.category ||
      existing.subcategory !== resource.subcategory ||
      existing.subSubcategory !== resource.subSubcategory;

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
    const allItems = await storage.getGithubSyncQueue();
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