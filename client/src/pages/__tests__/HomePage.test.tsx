import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../__tests__/utils';
import Home from '../Home';
import type { AwesomeList } from '@/types/awesome-list';

// Mock the useQuery hook from react-query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

// Mock SEOHead component
vi.mock('@/components/layout/SEOHead', () => ({
  default: ({ title }: { title: string }) => <div data-testid="seo-head">{title}</div>,
}));

// Mock Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, 'data-testid': testId }: any) => (
    <div data-testid={testId} className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

// Mock Badge component
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, 'data-testid': testId }: any) => (
    <span data-testid={testId}>{children}</span>
  ),
}));

// Mock wouter Link and Router
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    Link: ({ children, href, 'data-testid': testId }: any) => (
      <a href={href} data-testid={testId}>{children}</a>
    ),
  };
});

import { useQuery } from '@tanstack/react-query';

describe('Home Page', () => {
  const mockAwesomeList: AwesomeList = {
    title: 'Awesome Video Resources',
    description: 'Test description',
    categories: [
      {
        id: 1,
        name: 'Intro & Learning',
        slug: 'intro-learning',
        description: 'Learning resources',
        resources: [
          {
            id: 1,
            title: 'FFmpeg Tutorial',
            url: 'https://example.com/ffmpeg',
            description: 'Learn FFmpeg basics and advanced techniques for video processing',
            categoryId: 1,
          },
          {
            id: 2,
            title: 'Video Encoding Guide',
            url: 'https://example.com/encoding',
            description: 'Complete guide to video encoding',
            categoryId: 1,
          },
        ],
      },
      {
        id: 2,
        name: 'Table of contents',
        slug: 'table-of-contents',
        description: 'TOC',
        resources: [
          {
            id: 3,
            title: 'TOC Item',
            url: 'https://example.com/toc',
            description: 'Should be filtered out',
            categoryId: 2,
          },
        ],
      },
      {
        id: 3,
        name: 'Players & Clients',
        slug: 'players-clients',
        description: 'Video players',
        resources: [
          {
            id: 4,
            title: 'VLC Player',
            url: 'https://example.com/vlc',
            description: 'Popular media player',
            categoryId: 3,
          },
        ],
      },
      {
        id: 4,
        name: 'Contributing',
        slug: 'contributing',
        description: 'Contribution guidelines',
        resources: [
          {
            id: 5,
            title: 'How to contribute',
            url: 'https://example.com/contribute',
            description: 'Should be filtered out',
            categoryId: 4,
          },
        ],
      },
    ],
    resources: [
      {
        id: 1,
        title: 'FFmpeg Tutorial',
        url: 'https://example.com/ffmpeg',
        description: 'Learn FFmpeg basics',
        categoryId: 1,
      },
      {
        id: 2,
        title: 'Video Encoding Guide',
        url: 'https://example.com/encoding',
        description: 'Complete guide to video encoding',
        categoryId: 1,
      },
      {
        id: 4,
        title: 'VLC Player',
        url: 'https://example.com/vlc',
        description: 'Popular media player',
        categoryId: 3,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useQuery
    vi.mocked(useQuery).mockReturnValue({
      data: { resources: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  describe('Loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      renderWithProviders(<Home awesomeList={undefined} isLoading={true} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.getByTestId('seo-head')).toHaveTextContent('Loading - Awesome Video Resources');
    });

    it('renders correct number of skeleton cards', () => {
      renderWithProviders(<Home awesomeList={undefined} isLoading={true} />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Should have title skeleton, description skeleton, and 9 card skeletons
      expect(skeletons.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('Error State', () => {
    it('renders error message when awesomeList is undefined', () => {
      renderWithProviders(<Home awesomeList={undefined} isLoading={false} />);

      expect(screen.getByText('Error Loading Resources')).toBeInTheDocument();
      expect(screen.getByText('Please try refreshing the page.')).toBeInTheDocument();
      expect(screen.getByTestId('seo-head')).toHaveTextContent('Error - Awesome Video Resources');
    });
  });

  describe('Success State', () => {
    it('renders page title and description', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      expect(screen.getByText('Awesome Video Resources')).toBeInTheDocument();
      expect(screen.getByText(/Explore .* categories with .* curated resources/)).toBeInTheDocument();
    });

    it('renders SEO head with correct title', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      const seoHead = screen.getByTestId('seo-head');
      expect(seoHead).toHaveTextContent('Awesome Video Resources - 2,000+ Curated Development Tools');
    });

    it('filters out unwanted categories', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      // Should show these categories
      expect(screen.getByText('Intro & Learning')).toBeInTheDocument();
      expect(screen.getByText('Players & Clients')).toBeInTheDocument();

      // Should NOT show these categories
      expect(screen.queryByText('Table of contents')).not.toBeInTheDocument();
      expect(screen.queryByText('Contributing')).not.toBeInTheDocument();
    });

    it('renders category cards with correct data', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      const introCard = screen.getByTestId('card-category-intro-learning');
      expect(introCard).toBeInTheDocument();

      const playersCard = screen.getByTestId('card-category-players-clients');
      expect(playersCard).toBeInTheDocument();
    });

    it('renders resource counts for each category', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      const introBadge = screen.getByTestId('badge-count-intro-learning');
      expect(introBadge).toHaveTextContent('2');

      const playersBadge = screen.getByTestId('badge-count-players-clients');
      expect(playersBadge).toHaveTextContent('1');
    });

    it('renders category links with correct hrefs', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      const introLink = screen.getByTestId('link-category-intro-learning');
      expect(introLink).toHaveAttribute('href', '/category/intro-learning');

      const playersLink = screen.getByTestId('link-category-players-clients');
      expect(playersLink).toHaveAttribute('href', '/category/players-clients');
    });

    it('truncates long descriptions', () => {
      const longDescriptionList = {
        ...mockAwesomeList,
        categories: [
          {
            id: 1,
            name: 'Test Category',
            slug: 'test-category',
            description: 'Test',
            resources: [
              {
                id: 1,
                title: 'Test',
                url: 'https://example.com',
                description: 'a'.repeat(150), // 150 character description
                categoryId: 1,
              },
            ],
          },
        ],
      };

      renderWithProviders(<Home awesomeList={longDescriptionList} isLoading={false} />);

      const description = screen.getByText(/a+\.\.\./);
      expect(description.textContent?.length).toBeLessThan(110);
      expect(description.textContent).toContain('...');
    });
  });

  describe('Resource Count Calculation', () => {
    it('calculates total resource count from static list only when no DB resources', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { resources: [], total: 0 },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      // Should show count from static resources only (3 resources)
      expect(screen.getByText(/Explore .* categories with 3 curated resources/)).toBeInTheDocument();
    });

    it('calculates total resource count including DB resources', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: { resources: [{ id: 100, title: 'DB Resource' }], total: 5 },
        isLoading: false,
        isError: false,
        error: null,
      } as any);

      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      // Should show count from static (3) + DB (5) = 8 resources
      expect(screen.getByText(/Explore .* categories with 8 curated resources/)).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('filters out empty categories', () => {
      const listWithEmptyCategory = {
        ...mockAwesomeList,
        categories: [
          ...mockAwesomeList.categories,
          {
            id: 99,
            name: 'Empty Category',
            slug: 'empty-category',
            description: 'No resources',
            resources: [],
          },
        ],
      };

      renderWithProviders(<Home awesomeList={listWithEmptyCategory} isLoading={false} />);

      expect(screen.queryByText('Empty Category')).not.toBeInTheDocument();
    });

    it('filters out categories starting with "List of"', () => {
      const listWithListOfCategory = {
        ...mockAwesomeList,
        categories: [
          ...mockAwesomeList.categories,
          {
            id: 98,
            name: 'List of Resources',
            slug: 'list-of-resources',
            description: 'Should be filtered',
            resources: [
              {
                id: 99,
                title: 'Test',
                url: 'https://example.com',
                description: 'Test',
                categoryId: 98,
              },
            ],
          },
        ],
      };

      renderWithProviders(<Home awesomeList={listWithListOfCategory} isLoading={false} />);

      expect(screen.queryByText('List of Resources')).not.toBeInTheDocument();
    });

    it('filters out License and External Links categories', () => {
      const listWithExcludedCategories = {
        ...mockAwesomeList,
        categories: [
          ...mockAwesomeList.categories,
          {
            id: 97,
            name: 'License',
            slug: 'license',
            description: 'License info',
            resources: [
              {
                id: 97,
                title: 'MIT License',
                url: 'https://example.com/license',
                description: 'Should be filtered',
                categoryId: 97,
              },
            ],
          },
          {
            id: 96,
            name: 'External Links',
            slug: 'external-links',
            description: 'External links',
            resources: [
              {
                id: 96,
                title: 'External',
                url: 'https://example.com/external',
                description: 'Should be filtered',
                categoryId: 96,
              },
            ],
          },
        ],
      };

      renderWithProviders(<Home awesomeList={listWithExcludedCategories} isLoading={false} />);

      expect(screen.queryByText('License')).not.toBeInTheDocument();
      expect(screen.queryByText('External Links')).not.toBeInTheDocument();
    });
  });

  describe('Category Display', () => {
    it('displays correct number of filtered categories', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      // Should display 2 categories (Intro & Learning, Players & Clients)
      // Table of contents and Contributing should be filtered out
      expect(screen.getByText(/Explore 2 categories/)).toBeInTheDocument();
    });

    it('renders category description from first resource if available', () => {
      renderWithProviders(<Home awesomeList={mockAwesomeList} isLoading={false} />);

      // First resource description should be shown
      expect(screen.getByText(/Learn FFmpeg basics and advanced techniques/)).toBeInTheDocument();
    });
  });
});
