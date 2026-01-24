import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, mockUseAuth, mockUseAnalytics, mockUseSessionAnalytics } from './utils';

// Mock the hooks used in App
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/use-analytics', () => ({
  useAnalytics: vi.fn(),
}));

vi.mock('../hooks/use-session-analytics', () => ({
  useSessionAnalytics: vi.fn(),
}));

// Mock the analytics library
vi.mock('../lib/analytics', () => ({
  initGA: vi.fn(),
  trackKeyboardShortcut: vi.fn(),
}));

// Mock the static data fetcher
vi.mock('../lib/static-data', () => ({
  fetchStaticAwesomeList: vi.fn().mockResolvedValue({
    title: 'Awesome List',
    description: 'Test awesome list',
    categories: [],
    resources: [],
  }),
}));

// Mock all page components to avoid complex dependencies
vi.mock('../pages/Home', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../pages/Category', () => ({
  default: () => <div data-testid="category-page">Category Page</div>,
}));

vi.mock('../pages/Subcategory', () => ({
  default: () => <div data-testid="subcategory-page">Subcategory Page</div>,
}));

vi.mock('../pages/SubSubcategory', () => ({
  default: () => <div data-testid="sub-subcategory-page">SubSubcategory Page</div>,
}));

vi.mock('../pages/ResourceDetail', () => ({
  default: () => <div data-testid="resource-detail-page">Resource Detail Page</div>,
}));

vi.mock('../pages/About', () => ({
  default: () => <div data-testid="about-page">About Page</div>,
}));

vi.mock('../pages/Advanced', () => ({
  default: () => <div data-testid="advanced-page">Advanced Page</div>,
}));

vi.mock('../pages/Profile', () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>,
}));

vi.mock('../pages/Bookmarks', () => ({
  default: () => <div data-testid="bookmarks-page">Bookmarks Page</div>,
}));

vi.mock('../pages/AdminDashboard', () => ({
  default: () => <div data-testid="admin-dashboard-page">Admin Dashboard Page</div>,
}));

vi.mock('../pages/SubmitResource', () => ({
  default: () => <div data-testid="submit-resource-page">Submit Resource Page</div>,
}));

vi.mock('../pages/Journeys', () => ({
  default: () => <div data-testid="journeys-page">Journeys Page</div>,
}));

vi.mock('../pages/JourneyDetail', () => ({
  default: () => <div data-testid="journey-detail-page">Journey Detail Page</div>,
}));

vi.mock('../pages/ErrorPage', () => ({
  default: () => <div data-testid="error-page">Error Page</div>,
}));

vi.mock('../pages/not-found', () => ({
  default: () => <div data-testid="not-found-page">Not Found Page</div>,
}));

// Mock MainLayout to simplify testing
vi.mock('../components/layout/new/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

// Mock AuthGuard and AdminGuard
vi.mock('../components/auth/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/auth/AdminGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Import App and mocked modules after all mocks are defined
import App from '../App';
import { useAuth } from '../hooks/useAuth';
import { useAnalytics } from '../hooks/use-analytics';
import { useSessionAnalytics } from '../hooks/use-session-analytics';
import { initGA, trackKeyboardShortcut } from '../lib/analytics';

describe('App', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock hooks with default values
    vi.mocked(useAuth).mockReturnValue(mockUseAuth(false, null));
    vi.mocked(useAnalytics).mockReturnValue(mockUseAnalytics());
    vi.mocked(useSessionAnalytics).mockReturnValue(mockUseSessionAnalytics());
  });

  afterEach(() => {
    // Clean up dark mode class
    document.documentElement.classList.remove('dark');
  });

  describe('App initialization', () => {
    it('renders without crashing', () => {
      const { container } = renderWithProviders(<App />);
      expect(container).toBeTruthy();
    });

    it('applies dark mode to document root', () => {
      renderWithProviders(<App />);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('initializes Google Analytics when VITE_GA_MEASUREMENT_ID is present', () => {
      renderWithProviders(<App />);
      expect(initGA).toHaveBeenCalled();
    });
  });

  describe('Router', () => {
    it('renders MainLayout', () => {
      const { getByTestId } = renderWithProviders(<App />);
      expect(getByTestId('main-layout')).toBeInTheDocument();
    });

    it('renders default route (Home page)', () => {
      const { getByTestId } = renderWithProviders(<App />);
      expect(getByTestId('home-page')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('shows loading state when auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth(false, null),
        isLoading: true,
      });

      const { getByText } = renderWithProviders(<App />);
      expect(getByText('Loading...')).toBeInTheDocument();
    });

    it('renders main app when authentication is complete', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth(true, { id: 1, username: 'test', email: 'test@test.com' }),
        isLoading: false,
      });

      const { getByTestId } = renderWithProviders(<App />);
      expect(getByTestId('main-layout')).toBeInTheDocument();
    });

    it('renders main app for guest users', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth(false, null),
        isLoading: false,
      });

      const { getByTestId } = renderWithProviders(<App />);
      expect(getByTestId('main-layout')).toBeInTheDocument();
    });
  });

  describe('Analytics hooks', () => {
    it('calls useAnalytics hook', () => {
      renderWithProviders(<App />);
      expect(useAnalytics).toHaveBeenCalled();
    });

    it('calls useSessionAnalytics hook', () => {
      renderWithProviders(<App />);
      expect(useSessionAnalytics).toHaveBeenCalled();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('handles "/" key for search', () => {
      renderWithProviders(<App />);
      const event = new KeyboardEvent('keydown', { key: '/' });
      document.dispatchEvent(event);

      expect(trackKeyboardShortcut).toHaveBeenCalledWith('/', 'open_search');
    });

    it('increments searches performed when "/" key is pressed', () => {
      const mockSessionAnalytics = mockUseSessionAnalytics();
      vi.mocked(useSessionAnalytics).mockReturnValue(mockSessionAnalytics);

      renderWithProviders(<App />);
      const event = new KeyboardEvent('keydown', { key: '/' });
      document.dispatchEvent(event);

      expect(mockSessionAnalytics.incrementSearchesPerformed).toHaveBeenCalled();
    });

    it('handles Ctrl+K for search', () => {
      renderWithProviders(<App />);
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      document.dispatchEvent(event);

      expect(trackKeyboardShortcut).toHaveBeenCalledWith('Ctrl+K', 'open_search');
    });

    it('handles Cmd+K for search on Mac', () => {
      renderWithProviders(<App />);
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(event);

      expect(trackKeyboardShortcut).toHaveBeenCalledWith('Ctrl+K', 'open_search');
    });

    it('does not trigger search when typing in input field', () => {
      renderWithProviders(<App />);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', { key: '/', bubbles: true });
      Object.defineProperty(event, 'target', { value: input, enumerable: true });
      document.dispatchEvent(event);

      expect(trackKeyboardShortcut).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });
});
