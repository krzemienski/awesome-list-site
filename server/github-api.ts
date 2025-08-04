/**
 * GitHub API integration for fetching awesome lists
 */

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  topics: string[];
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface AwesomeListMeta {
  id: string;
  name: string;
  title: string;
  description: string;
  url: string;
  rawUrl: string;
  stars: number;
  language: string;
  category: string;
  owner: string;
  ownerAvatar: string;
  lastUpdated: string;
  topics: string[];
}

/**
 * Fetch awesome lists from GitHub's awesome-list topic
 */
export async function fetchAwesomeLists(page = 1, perPage = 30): Promise<{
  lists: AwesomeListMeta[];
  totalCount: number;
  hasMore: boolean;
}> {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=topic:awesome-list&sort=stars&order=desc&page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Awesome-List-Static-Site',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    const lists: AwesomeListMeta[] = data.items.map((repo: GitHubRepo) => ({
      id: repo.full_name,
      name: repo.name,
      title: formatTitle(repo.name),
      description: repo.description || 'A curated list of awesome resources',
      url: repo.html_url,
      rawUrl: `https://raw.githubusercontent.com/${repo.full_name}/main/README.md`,
      stars: repo.stargazers_count,
      language: repo.language || 'Various',
      category: extractCategory(repo.name, repo.topics),
      owner: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      lastUpdated: repo.updated_at,
      topics: repo.topics,
    }));

    return {
      lists,
      totalCount: data.total_count,
      hasMore: page * perPage < data.total_count,
    };
  } catch (error) {
    console.error('Error fetching awesome lists:', error);
    throw error;
  }
}

/**
 * Search awesome lists by query
 */
export async function searchAwesomeLists(query: string, page = 1): Promise<{
  lists: AwesomeListMeta[];
  totalCount: number;
  hasMore: boolean;
}> {
  try {
    const searchQuery = `${query} topic:awesome-list`;
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&sort=stars&order=desc&page=${page}&per_page=20`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Awesome-List-Static-Site',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    const lists: AwesomeListMeta[] = data.items.map((repo: GitHubRepo) => ({
      id: repo.full_name,
      name: repo.name,
      title: formatTitle(repo.name),
      description: repo.description || 'A curated list of awesome resources',
      url: repo.html_url,
      rawUrl: `https://raw.githubusercontent.com/${repo.full_name}/main/README.md`,
      stars: repo.stargazers_count,
      language: repo.language || 'Various',
      category: extractCategory(repo.name, repo.topics),
      owner: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      lastUpdated: repo.updated_at,
      topics: repo.topics,
    }));

    return {
      lists,
      totalCount: data.total_count,
      hasMore: page * 20 < data.total_count,
    };
  } catch (error) {
    console.error('Error searching awesome lists:', error);
    throw error;
  }
}

/**
 * Format repository name into a readable title
 */
function formatTitle(name: string): string {
  return name
    .replace(/^awesome-?/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim() || name;
}

/**
 * Extract category from repository name and topics
 */
function extractCategory(name: string, topics: string[]): string {
  // Check topics first for more accurate categorization
  const categoryTopics = [
    'programming', 'web-development', 'devops', 'data-science', 
    'machine-learning', 'security', 'self-hosted', 'javascript',
    'python', 'go', 'rust', 'java', 'react', 'vue', 'angular'
  ];
  
  for (const topic of topics) {
    if (categoryTopics.includes(topic)) {
      return topic.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }
  
  // Fallback to name-based categorization
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('self-hosted') || nameLower.includes('selfhosted')) {
    return 'Self-Hosted';
  }
  if (nameLower.includes('devops') || nameLower.includes('sysadmin')) {
    return 'DevOps';
  }
  if (nameLower.includes('javascript') || nameLower.includes('js')) {
    return 'JavaScript';
  }
  if (nameLower.includes('python')) {
    return 'Python';
  }
  if (nameLower.includes('go') || nameLower.includes('golang')) {
    return 'Go';
  }
  if (nameLower.includes('react')) {
    return 'React';
  }
  if (nameLower.includes('vue')) {
    return 'Vue';
  }
  if (nameLower.includes('security') || nameLower.includes('pentest')) {
    return 'Security';
  }
  if (nameLower.includes('data') || nameLower.includes('ml') || nameLower.includes('ai')) {
    return 'Data Science';
  }
  if (nameLower.includes('web')) {
    return 'Web Development';
  }
  
  return 'Programming';
}