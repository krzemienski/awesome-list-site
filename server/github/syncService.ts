import { GitHubClient } from "./client";
import { parseAwesomeList, convertToDbResources } from "./parser";
import { AwesomeListFormatter, generateContributingMd } from "./formatter";
import { storage } from "../storage";
import { Resource, InsertResource, GithubSyncQueue } from "@shared/schema";

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
      const parsedList = await parseAwesomeList(readmeContent);
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
                const updated = await storage.updateResource(
                  conflict.resource.id,
                  conflict.resource as Partial<InsertResource>
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
            imported: result.imported,
            updated: result.updated,
            skipped: result.skipped
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
          errorMessage: error.message,
          resourceIds: []
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
      // Check write access
      const hasAccess = await this.client.hasWriteAccess(repoUrl);
      if (!hasAccess) {
        throw new Error('No write access to repository. Please check your GitHub token permissions.');
      }

      // Get repository info
      const repoInfo = await this.client.getRepository(repoUrl);
      const repoTitle = repoInfo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Fetch approved resources
      const { resources } = await storage.listResources({
        status: 'approved',
        limit: 10000 // Get all approved resources
      });

      if (resources.length === 0) {
        throw new Error('No approved resources to export');
      }

      console.log(`Exporting ${resources.length} approved resources...`);

      // Generate README content
      const formatter = new AwesomeListFormatter(resources, {
        title: repoTitle,
        description: repoInfo.description || `A curated list of ${repoTitle.toLowerCase()} resources`,
        includeContributing: true,
        includeLicense: true,
        websiteUrl: this.websiteUrl,
        repoUrl
      });

      const readmeContent = formatter.generate();
      const contributingContent = generateContributingMd(this.websiteUrl, repoUrl);

      // Prepare files to commit
      const files = [
        {
          path: 'README.md',
          content: readmeContent,
          message: 'Update README with approved resources'
        },
        {
          path: 'CONTRIBUTING.md',
          content: contributingContent,
          message: 'Update contributing guidelines'
        }
      ];

      if (options.dryRun) {
        console.log('Dry run - would update:');
        console.log('- README.md');
        console.log('- CONTRIBUTING.md');
        result.exported = resources.length;
        return result;
      }

      // Create a branch if requested
      const targetBranch = options.branchName || (options.createPullRequest ? `sync-${Date.now()}` : undefined);
      
      if (targetBranch && options.createPullRequest) {
        await this.client.createBranch(repoUrl, targetBranch);
        console.log(`Created branch: ${targetBranch}`);
      }

      // Commit the files
      const commitResult = await this.client.commitMultipleFiles(
        repoUrl,
        files,
        targetBranch
      );

      result.commitSha = commitResult.sha;
      result.commitUrl = commitResult.url;
      result.exported = resources.length;

      console.log(`✓ Committed changes: ${commitResult.sha}`);

      // Create pull request if requested
      if (options.createPullRequest && targetBranch) {
        const pr = await this.client.createPullRequest(
          repoUrl,
          targetBranch,
          'main',
          `Sync approved resources from ${this.websiteUrl}`,
          `This PR updates the awesome list with ${resources.length} approved resources from the website.\n\n` +
          `- Resources have been reviewed and approved\n` +
          `- Format follows awesome-list guidelines\n` +
          `- Contributing guidelines updated\n\n` +
          `Generated by automatic sync from ${this.websiteUrl}`
        );

        result.pullRequestUrl = pr.url;
        console.log(`✓ Created pull request: ${pr.url}`);
      }

      // Update resources as synced
      const resourceIds = resources.map(r => r.id);
      await Promise.all(
        resourceIds.map(id => 
          storage.updateResource(id, { 
            githubSynced: true, 
            lastSyncedAt: new Date() 
          } as Partial<InsertResource>)
        )
      );

      // Log the export
      await storage.logResourceAudit(
        null,
        'exported',
        undefined,
        { 
          repository: repoUrl,
          count: resources.length,
          commitSha: result.commitSha
        },
        `Exported ${resources.length} resources to GitHub`
      );

      // Add to sync queue
      await storage.addToGithubSyncQueue({
        repositoryUrl: repoUrl,
        action: 'export',
        status: 'completed',
        resourceIds,
        metadata: {
          exported: result.exported,
          commitSha: result.commitSha,
          pullRequestUrl: result.pullRequestUrl
        }
      });

    } catch (error: any) {
      const errorMsg = `Export failed: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);

      // Log failed export
      await storage.addToGithubSyncQueue({
        repositoryUrl: repoUrl,
        action: 'export',
        status: 'failed',
        errorMessage: error.message,
        resourceIds: []
      });
    }

    return result;
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