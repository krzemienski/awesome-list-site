import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../__tests__/utils';
import ResourceCard from '../resource/ResourceCard';
import type { Resource } from '@shared/schema';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock FavoriteButton component
vi.mock('../resource/FavoriteButton', () => ({
  default: ({ resourceId, isFavorited, favoriteCount, size, showCount }: any) => (
    <button
      data-testid={`favorite-button-${resourceId}`}
      data-favorited={isFavorited}
      data-count={favoriteCount}
      data-size={size}
      data-show-count={showCount}
    >
      Favorite
    </button>
  ),
}));

// Mock BookmarkButton component
vi.mock('../resource/BookmarkButton', () => ({
  default: ({ resourceId, isBookmarked, notes, size }: any) => (
    <button
      data-testid={`bookmark-button-${resourceId}`}
      data-bookmarked={isBookmarked}
      data-notes={notes}
      data-size={size}
    >
      Bookmark
    </button>
  ),
}));

// Mock SuggestEditDialog component
vi.mock('@/components/ui/suggest-edit-dialog', () => ({
  SuggestEditDialog: ({ resource, open, onOpenChange }: any) => (
    open ? (
      <div data-testid="suggest-edit-dialog" data-resource-id={resource.id}>
        Suggest Edit Dialog
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null
  ),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick, 'data-testid': testId }: any) => (
    <div data-testid={testId} className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'data-testid': testId, variant, size, className }: any) => (
    <button
      data-testid={testId}
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ExternalLink: ({ className }: any) => <span className={className}>ExternalLink</span>,
  Edit: ({ className }: any) => <span className={className}>Edit</span>,
}));

import { useAuth } from '@/hooks/useAuth';

describe('ResourceCard', () => {
  const mockResource = {
    id: '1',
    name: 'Test Resource',
    url: 'https://example.com/resource',
    description: 'This is a test resource description',
    category: 'Test Category',
    tags: ['tag1', 'tag2', 'tag3'],
    isFavorited: false,
    isBookmarked: false,
    favoriteCount: 0,
  };

  const mockFullResource: Resource = {
    id: 1,
    title: 'Test Resource',
    url: 'https://example.com/resource',
    description: 'This is a test resource description',
    category: 'Test Category',
    subcategory: null,
    subSubcategory: null,
    status: 'approved',
    submittedBy: null,
    approvedBy: null,
    approvedAt: null,
    githubSynced: false,
    lastSyncedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock - unauthenticated user
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
    });

    // Mock window.open
    global.window.open = vi.fn();
  });

  describe('Basic Rendering', () => {
    it('renders resource card with minimal props', () => {
      const minimalResource = {
        id: '1',
        name: 'Minimal Resource',
        url: 'https://example.com',
      };

      renderWithProviders(<ResourceCard resource={minimalResource} />);

      expect(screen.getByText('Minimal Resource')).toBeInTheDocument();
      expect(screen.getByTestId('card-resource-1')).toBeInTheDocument();
      expect(screen.getByTestId('button-visit-1')).toBeInTheDocument();
    });

    it('renders resource name in card title', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.getByText('Test Resource')).toBeInTheDocument();
    });

    it('renders resource description when provided', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.getByText('This is a test resource description')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const resourceWithoutDescription = { ...mockResource, description: undefined };

      renderWithProviders(<ResourceCard resource={resourceWithoutDescription} />);

      expect(screen.queryByText('This is a test resource description')).not.toBeInTheDocument();
    });

    it('renders Visit Resource button', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      const visitButton = screen.getByTestId('button-visit-1');
      expect(visitButton).toBeInTheDocument();
      expect(visitButton).toHaveTextContent('Visit Resource');
    });
  });

  describe('Category and Tags', () => {
    it('renders category badge when provided', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      const badges = screen.getAllByTestId('badge');
      const categoryBadge = badges.find(badge => badge.textContent === 'Test Category');
      expect(categoryBadge).toBeInTheDocument();
    });

    it('does not render category badge when not provided', () => {
      const resourceWithoutCategory = { ...mockResource, category: undefined };

      renderWithProviders(<ResourceCard resource={resourceWithoutCategory} />);

      const badges = screen.queryAllByTestId('badge');
      const categoryBadge = badges.find(badge => badge.textContent === 'Test Category');
      expect(categoryBadge).toBeUndefined();
    });

    it('renders tags when provided', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.getByText('#tag1')).toBeInTheDocument();
      expect(screen.getByText('#tag2')).toBeInTheDocument();
      expect(screen.getByText('#tag3')).toBeInTheDocument();
    });

    it('renders only first 3 tags when more than 3 tags exist', () => {
      const resourceWithManyTags = {
        ...mockResource,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };

      renderWithProviders(<ResourceCard resource={resourceWithManyTags} />);

      expect(screen.getByText('#tag1')).toBeInTheDocument();
      expect(screen.getByText('#tag2')).toBeInTheDocument();
      expect(screen.getByText('#tag3')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      expect(screen.queryByText('#tag4')).not.toBeInTheDocument();
      expect(screen.queryByText('#tag5')).not.toBeInTheDocument();
    });

    it('does not render tags when empty array provided', () => {
      const resourceWithNoTags = { ...mockResource, tags: [] };

      renderWithProviders(<ResourceCard resource={resourceWithNoTags} />);

      expect(screen.queryByText('#tag1')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('does not render favorite and bookmark buttons when not authenticated', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.queryByTestId('favorite-button-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bookmark-button-1')).not.toBeInTheDocument();
    });

    it('does not render suggest edit button when not authenticated', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.queryByTestId('button-suggest-edit-1')).not.toBeInTheDocument();
    });

    it('renders favorite and bookmark buttons when authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.getByTestId('favorite-button-1')).toBeInTheDocument();
      expect(screen.getByTestId('bookmark-button-1')).toBeInTheDocument();
    });

    it('renders suggest edit button when authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      renderWithProviders(<ResourceCard resource={mockResource} />);

      expect(screen.getByTestId('button-suggest-edit-1')).toBeInTheDocument();
    });

    it('passes correct props to FavoriteButton when authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      const favoritedResource = {
        ...mockResource,
        isFavorited: true,
        favoriteCount: 5,
      };

      renderWithProviders(<ResourceCard resource={favoritedResource} />);

      const favoriteButton = screen.getByTestId('favorite-button-1');
      expect(favoriteButton).toHaveAttribute('data-favorited', 'true');
      expect(favoriteButton).toHaveAttribute('data-count', '5');
      expect(favoriteButton).toHaveAttribute('data-size', 'sm');
      expect(favoriteButton).toHaveAttribute('data-show-count', 'false');
    });

    it('passes correct props to BookmarkButton when authenticated', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      const bookmarkedResource = {
        ...mockResource,
        isBookmarked: true,
        bookmarkNotes: 'My notes',
      };

      renderWithProviders(<ResourceCard resource={bookmarkedResource} />);

      const bookmarkButton = screen.getByTestId('bookmark-button-1');
      expect(bookmarkButton).toHaveAttribute('data-bookmarked', 'true');
      expect(bookmarkButton).toHaveAttribute('data-notes', 'My notes');
      expect(bookmarkButton).toHaveAttribute('data-size', 'sm');
    });
  });

  describe('Interaction Handlers', () => {
    it('calls onClick handler when card is clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(<ResourceCard resource={mockResource} onClick={handleClick} />);

      const card = screen.getByTestId('card-resource-1');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when onClick is not provided', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ResourceCard resource={mockResource} />);

      const card = screen.getByTestId('card-resource-1');
      await user.click(card);

      // Should not throw error
    });

    it('opens resource URL in new tab when Visit Resource button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ResourceCard resource={mockResource} />);

      const visitButton = screen.getByTestId('button-visit-1');
      await user.click(visitButton);

      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/resource',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('opens suggest edit dialog when suggest edit button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      renderWithProviders(<ResourceCard resource={mockResource} />);

      const suggestEditButton = screen.getByTestId('button-suggest-edit-1');
      await user.click(suggestEditButton);

      expect(screen.getByTestId('suggest-edit-dialog')).toBeInTheDocument();
    });

    it('closes suggest edit dialog when close button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      renderWithProviders(<ResourceCard resource={mockResource} />);

      const suggestEditButton = screen.getByTestId('button-suggest-edit-1');
      await user.click(suggestEditButton);

      expect(screen.getByTestId('suggest-edit-dialog')).toBeInTheDocument();

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByTestId('suggest-edit-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('renders OG image when metadata is available', () => {
      const fullResourceWithMetadata: Resource = {
        ...mockFullResource,
        metadata: {
          urlScraped: true,
          ogImage: 'https://example.com/image.jpg',
          ogTitle: 'OG Title',
        },
      };

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={fullResourceWithMetadata} />
      );

      const image = screen.getByAltText('OG Title');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders scraped title when different from resource name', () => {
      const fullResourceWithMetadata: Resource = {
        ...mockFullResource,
        metadata: {
          urlScraped: true,
          scrapedTitle: 'Different Scraped Title',
        },
      };

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={fullResourceWithMetadata} />
      );

      expect(screen.getByText('Page Title:')).toBeInTheDocument();
      expect(screen.getByText('Different Scraped Title')).toBeInTheDocument();
    });

    it('does not render scraped title when same as resource name', () => {
      const fullResourceWithMetadata: Resource = {
        ...mockFullResource,
        metadata: {
          urlScraped: true,
          scrapedTitle: 'Test Resource',
        },
      };

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={fullResourceWithMetadata} />
      );

      expect(screen.queryByText('Page Title:')).not.toBeInTheDocument();
    });

    it('renders scraped description when different from resource description', () => {
      const fullResourceWithMetadata: Resource = {
        ...mockFullResource,
        metadata: {
          urlScraped: true,
          scrapedDescription: 'Different scraped description from the website',
        },
      };

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={fullResourceWithMetadata} />
      );

      expect(screen.getByText('Page Description:')).toBeInTheDocument();
      expect(screen.getByText('Different scraped description from the website')).toBeInTheDocument();
    });

    it('does not render scraped description when same as resource description', () => {
      const fullResourceWithMetadata: Resource = {
        ...mockFullResource,
        metadata: {
          urlScraped: true,
          scrapedDescription: 'This is a test resource description',
        },
      };

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={fullResourceWithMetadata} />
      );

      expect(screen.queryByText('Page Description:')).not.toBeInTheDocument();
    });

    it('does not render metadata section when urlScraped is false', () => {
      const fullResourceWithMetadata: Resource = {
        ...mockFullResource,
        metadata: {
          urlScraped: false,
          ogImage: 'https://example.com/image.jpg',
          scrapedTitle: 'Scraped Title',
        },
      };

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={fullResourceWithMetadata} />
      );

      expect(screen.queryByAltText('Scraped Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Page Title:')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to card', () => {
      renderWithProviders(
        <ResourceCard resource={mockResource} className="custom-class" />
      );

      const card = screen.getByTestId('card-resource-1');
      expect(card.className).toContain('custom-class');
    });

    it('applies hover border class to card', () => {
      renderWithProviders(<ResourceCard resource={mockResource} />);

      const card = screen.getByTestId('card-resource-1');
      expect(card.className).toContain('hover:border-pink-500/50');
    });
  });

  describe('Resource Dialog Data', () => {
    it('uses fullResource when provided to suggest edit dialog', async () => {
      const user = userEvent.setup();

      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      renderWithProviders(
        <ResourceCard resource={mockResource} fullResource={mockFullResource} />
      );

      const suggestEditButton = screen.getByTestId('button-suggest-edit-1');
      await user.click(suggestEditButton);

      const dialog = screen.getByTestId('suggest-edit-dialog');
      expect(dialog).toHaveAttribute('data-resource-id', '1');
    });

    it('creates resource object from basic resource when fullResource not provided', async () => {
      const user = userEvent.setup();

      vi.mocked(useAuth).mockReturnValue({
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'user' } as any,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        signup: vi.fn(),
      });

      renderWithProviders(<ResourceCard resource={mockResource} />);

      const suggestEditButton = screen.getByTestId('button-suggest-edit-1');
      await user.click(suggestEditButton);

      const dialog = screen.getByTestId('suggest-edit-dialog');
      expect(dialog).toBeInTheDocument();
    });
  });
});
