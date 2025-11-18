import { Octokit } from "@octokit/rest";

/**
 * GitHub client for interacting with repositories
 * Handles authentication, rate limiting, and common operations
 */

interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

interface FileContent {
  path: string;
  content: string;
  message: string;
}

interface CommitResult {
  sha: string;
  url: string;
  message: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private rateLimitRemaining: number = 5000;
  private rateLimitReset: Date = new Date();

  constructor(token?: string) {
    if (!token) {
      token = process.env.GITHUB_TOKEN;
    }

    if (!token) {
      console.warn('GitHub token not provided. Limited functionality available.');
      // Create a basic client without authentication for read-only operations
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'awesome-list-sync v1.0.0',
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
          if (options.request.retryCount === 0) {
            console.log(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Abuse detected for request ${options.method} ${options.url}`);
        },
      },
    });
  }

  /**
   * Parse repository URL to extract owner and repo
   */
  parseRepoUrl(url: string): RepoInfo {
    // Support various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\?#]+)/,
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          branch: 'main'
        };
      }
    }

    throw new Error(`Invalid GitHub repository URL: ${url}`);
  }

  /**
   * Get repository information
   */
  async getRepository(repoUrl: string): Promise<any> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      await this.updateRateLimits();
      return data;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Repository not found: ${repoUrl}`);
      }
      throw error;
    }
  }

  /**
   * Fetch file content from repository
   */
  async fetchFile(repoUrl: string, path: string, branch?: string): Promise<string> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch || 'main'
      });

      await this.updateRateLimits();

      if ('content' in data && typeof data.content === 'string') {
        // Decode base64 content
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      throw new Error('File content not found');
    } catch (error: any) {
      if (error.status === 404) {
        // Try 'master' branch if 'main' fails
        if (!branch || branch === 'main') {
          return this.fetchFile(repoUrl, path, 'master');
        }
        throw new Error(`File not found: ${path} in ${repoUrl}`);
      }
      throw error;
    }
  }

  /**
   * Get the SHA of a file (needed for updates)
   */
  async getFileSha(repoUrl: string, path: string, branch?: string): Promise<string | null> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch || 'main'
      });

      if ('sha' in data) {
        return data.sha;
      }
      return null;
    } catch (error: any) {
      if (error.status === 404) {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Create or update a single file
   */
  async updateFile(
    repoUrl: string, 
    path: string, 
    content: string, 
    message: string, 
    branch?: string
  ): Promise<CommitResult> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const targetBranch = branch || 'main';

    // Get current file SHA if it exists
    const sha = await this.getFileSha(repoUrl, path, targetBranch);

    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch: targetBranch,
        ...(sha && { sha }) // Include SHA if file exists
      });

      await this.updateRateLimits();

      return {
        sha: data.commit.sha!,
        url: data.commit.html_url!,
        message: data.commit.message!
      };
    } catch (error: any) {
      if (error.status === 409) {
        throw new Error('Conflict: File has been modified. Please sync and try again.');
      }
      throw error;
    }
  }

  /**
   * Commit multiple files in a single commit
   */
  async commitMultipleFiles(
    repoUrl: string, 
    files: FileContent[], 
    branch?: string
  ): Promise<CommitResult> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const targetBranch = branch || 'main';

    try {
      // Get the current commit SHA
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`
      });
      const currentCommitSha = refData.object.sha;

      // Get the tree SHA of the current commit
      const { data: commitData } = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha
      });
      const currentTreeSha = commitData.tree.sha;

      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const { data } = await this.octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64'
          });
          return {
            path: file.path,
            sha: data.sha,
            mode: '100644' as const,
            type: 'blob' as const
          };
        })
      );

      // Create a new tree
      const { data: treeData } = await this.octokit.git.createTree({
        owner,
        repo,
        base_tree: currentTreeSha,
        tree: blobs
      });

      // Create a new commit
      const commitMessage = files.length === 1 
        ? files[0].message 
        : `Update ${files.length} files\n\n${files.map(f => `- ${f.path}: ${f.message}`).join('\n')}`;

      const { data: newCommit } = await this.octokit.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeData.sha,
        parents: [currentCommitSha]
      });

      // Update the reference
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
        sha: newCommit.sha
      });

      await this.updateRateLimits();

      return {
        sha: newCommit.sha,
        url: newCommit.html_url,
        message: commitMessage
      };
    } catch (error: any) {
      console.error('Error committing files:', error);
      throw error;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(repoUrl: string, branchName: string, fromBranch: string = 'main'): Promise<void> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);

    try {
      // Get the SHA of the base branch
      const { data: refData } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`
      });

      // Create new branch
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: refData.object.sha
      });

      await this.updateRateLimits();
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error(`Branch ${branchName} already exists`);
      }
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    repoUrl: string,
    fromBranch: string,
    toBranch: string,
    title: string,
    body: string
  ): Promise<{ number: number; url: string }> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);

    try {
      const { data } = await this.octokit.pulls.create({
        owner,
        repo,
        title,
        body,
        head: fromBranch,
        base: toBranch
      });

      await this.updateRateLimits();

      return {
        number: data.number,
        url: data.html_url
      };
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error('Pull request already exists or invalid branches');
      }
      throw error;
    }
  }

  /**
   * Check if user has write access to repository
   */
  async hasWriteAccess(repoUrl: string): Promise<boolean> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);

    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo
      });

      await this.updateRateLimits();

      // Check if the authenticated user has push access
      return data.permissions?.push || false;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<{ remaining: number; reset: Date; limit: number }> {
    const { data } = await this.octokit.rateLimit.get();
    
    return {
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      limit: data.rate.limit
    };
  }

  /**
   * Update rate limit information after each request
   */
  private async updateRateLimits(): Promise<void> {
    try {
      const rateLimit = await this.getRateLimit();
      this.rateLimitRemaining = rateLimit.remaining;
      this.rateLimitReset = rateLimit.reset;

      if (this.rateLimitRemaining < 100) {
        console.warn(`Low GitHub API rate limit: ${this.rateLimitRemaining} remaining`);
      }
    } catch (error) {
      console.error('Failed to update rate limits:', error);
    }
  }

  /**
   * Wait if rate limit is exceeded
   */
  private async waitForRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      const waitTime = this.rateLimitReset.getTime() - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}