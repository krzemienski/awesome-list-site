import { GitHubClient } from "./client";
import { parseAwesomeList, convertToDbResources } from "./parser";
import { AwesomeListFormatter, generateContributingMd } from "./formatter";
import { storage } from "../storage";
import { Resource, InsertResource, GithubSyncQueue } from "@shared/schema";
import { createSystemAuditContext } from "../middleware/requestContext";

/**
 * Service for synchronizing awesome lists with GitHub
 * Handles import, export, conflict resolution, and queue processing
 */

interface SyncOptions {
  dryRun?: boolean;
  forceOverwrite?: boolean;
  createPullRequest?: boolean;
  branchName?: string;
  githubToken?: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
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
    options: SyncOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      resources: []
    };

    try {
      // Fetch README content
      console.log(`Fetching README from ${repoUrl}...`);
      const readmeContent = await this.client.fetchFile(repoUrl, 'README.md');
      
      // Parse the awesome list
      console.log('Parsing awesome list content...');
      const parser = new (await import('./parser')).AwesomeListParser(readmeContent);
      const parsedList = parser.parse();

      // Extract and create hierarchy structure BEFORE creating resources
      console.log('Extracting hierarchy structure...');
      const hierarchy = parser.extractHierarchy();

      console.log(`Found hierarchy: ${hierarchy.categories.size} categories, ${hierarchy.subcategories.size} subcategories, ${hierarchy.subSubcategories.size} sub-subcategories`);

      // Create categories
      for (const categoryName of Array.from(hierarchy.categories)) {
        const slug = categoryName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
        const existing = await storage.listCategories();

        if (!existing.find(c => c.name === categoryName)) {
          await storage.createCategory({ name: categoryName, slug });
          console.log(`  ✅ Created category: "${categoryName}"`);
        }
      }

      // Create subcategories with parent FKs
      for (const [subcategoryName, parentCategoryName] of Array.from(hierarchy.subcategories)) {
        const parentCategory = (await storage.listCategories()).find(c => c.name === parentCategoryName);
        if (!parentCategory) {
          console.warn(`  ⚠️  Parent category not found: "${parentCategoryName}"`);
          continue;
        }

        const slug = subcategoryName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
        const existing = await storage.listSubcategories(parentCategory.id);

        if (!existing.find(s => s.name === subcategoryName)) {
          await storage.createSubcategory({
            name: subcategoryName,
            slug,
            categoryId: parentCategory.id
          });
          console.log(`  ✅ Created subcategory: "${subcategoryName}" → "${parentCategoryName}"`);
        }
      }

      // Create sub-subcategories with parent FKs
      for (const [subSubcategoryName, { parent: parentSubcategoryName, category: grandparentCategoryName }] of Array.from(hierarchy.subSubcategories)) {
        const grandparentCategory = (await storage.listCategories()).find(c => c.name === grandparentCategoryName);
        if (!grandparentCategory) continue;

        const parentSubcategory = (await storage.listSubcategories(grandparentCategory.id)).find(s => s.name === parentSubcategoryName);
        if (!parentSubcategory) {
          console.warn(`  ⚠️  Parent subcategory not found: "${parentSubcategoryName}"`);
          continue;
        }

        const slug = subSubcategoryName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
        const existing = await storage.listSubSubcategories(parentSubcategory.id);

        if (!existing.find(ss => ss.name === subSubcategoryName)) {
          await storage.createSubSubcategory({
            name: subSubcategoryName,
            slug,
            subcategoryId: parentSubcategory.id
          });
          console.log(`  ✅ Created sub-subcategory: "${subSubcategoryName}" → "${parentSubcategoryName}" → "${grandparentCategoryName}"`);
        }
      }

      console.log('✅ Hierarchy tables populated from markdown structure');

      const dbResources = convertToDbResources(parsedList);
      console.log(`Found ${dbResources.length} resources in the awesome list`);

      // Process each resource
      for (const resource of dbResources) {
        try {
          const conflict = await this.checkConflict(resource);
          
          switch (conflict.action) {
            case 'create':
              if (!options.dryRun) {
                const created = await storage.createResource({
                  ...conflict.resource,
                  status: 'approved',
                  githubSynced: true
                } as InsertResource);
                result.resources.push(created);
                
                // Log the import with system audit context
                await storage.logResourceAudit(
                  created.id,
                  'imported',
                  undefined,
                  { source: repoUrl },
                  `Imported from GitHub: ${repoUrl}`,
                  createSystemAuditContext('github-sync-import')
                );
              }
              result.imported++;
              console.log(`✓ Imported: ${resource.title}`);
              break;
              
            case 'update':
              if (!options.dryRun && conflict.resource.id) {
                const updated = await storage.updateResource(
                  conflict.resource.id,
                  conflict.resource as Partial<InsertResource>
                );
                result.resources.push(updated);
                
                // Log the update with system audit context
                await storage.logResourceAudit(
                  updated.id,
                  'updated',
                  undefined,
                  { source: repoUrl },
                  `Updated from GitHub: ${conflict.reason}`,
                  createSystemAuditContext('github-sync-update')
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
      // Get GitHub client with direct token
      const githubClient = new GitHubClient(options?.githubToken || process.env.GITHUB_TOKEN);
      const octokit = (githubClient as any).octokit;
      
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

      if (options.dryRun) {
        console.log('Dry run - would update:');
        console.log('- README.md');
        console.log('- CONTRIBUTING.md');
        console.log(`Commit message: ${commitMessage}`);
        result.exported = currentResources.length;
        return result;
      }

      // Get current commit SHA for main branch
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: 'heads/main'
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

      // Update the reference to point to the new commit (commit directly to main)
      await octokit.git.updateRef({
        owner,
        repo,
        ref: 'heads/main',
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

      // Log the export with system audit context
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
        commitMessage,
        createSystemAuditContext('github-sync-export')
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
      const errorMsg = `Export failed: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);

      // Log failed export via updateGithubSyncStatus if queue item exists
      // Or log in metadata if creating new queue item
      await storage.addToGithubSyncQueue({
        repositoryUrl: repoUrl,
        action: 'export',
        status: 'failed',
        resourceIds: [] as any,
        metadata: { 
          error: error.message 
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