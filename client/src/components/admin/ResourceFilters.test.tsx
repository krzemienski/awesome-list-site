import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResourceFilters from './ResourceFilters';
import type { ResourceFiltersProps, ResourceFilters as FilterState } from './ResourceFilters';

// Mock fetch for category API
const mockCategories = [
  { id: '1', name: 'Encoding & Codecs', slug: 'encoding-codecs' },
  { id: '2', name: 'Streaming', slug: 'streaming' },
  { id: '3', name: 'Players', slug: 'players' }
];

global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ResourceFilters', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.useFakeTimers();

    // Mock successful category fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockCategories
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders all filter controls', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Search input
    expect(screen.getByPlaceholderText(/search resources/i)).toBeInTheDocument();

    // Status dropdown
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();

    // Category dropdown (should be present even while loading)
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();

    // Clear all button (should be disabled when no filters)
    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toBeDisabled();
  });

  it('calls onFilterChange when search input changes (debounced 300ms)', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const searchInput = screen.getByPlaceholderText(/search resources/i);

    // Type in search
    await user.type(searchInput, 'ffmpeg');

    // Should not call immediately
    expect(onFilterChange).not.toHaveBeenCalled();

    // Fast-forward 300ms
    vi.advanceTimersByTime(300);

    // Should call with search value
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({ search: 'ffmpeg' });
    });
  });

  it('calls onFilterChange when status is selected', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const statusSelect = screen.getByRole('combobox', { name: /status/i });

    // Open dropdown and select "Pending"
    await user.click(statusSelect);
    const pendingOption = await screen.findByText('Pending', {}, { timeout: 3000 });
    await user.click(pendingOption);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({ status: 'pending' });
    }, { timeout: 3000 });
  });

  it('calls onFilterChange when category is selected', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Wait for categories to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories');
    }, { timeout: 3000 });

    const categorySelect = screen.getByRole('combobox', { name: /category/i });

    // Open dropdown and select a category
    await user.click(categorySelect);
    const streamingOption = await screen.findByText('Streaming', {}, { timeout: 3000 });
    await user.click(streamingOption);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({ category: 'Streaming' });
    }, { timeout: 3000 });
  });

  it('shows active filter badges for applied filters', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {
      status: 'pending',
      category: 'Encoding & Codecs',
      search: 'h264'
    };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Should show badges for each active filter
    expect(screen.getByText('Status: pending')).toBeInTheDocument();
    expect(screen.getByText('Category: Encoding & Codecs')).toBeInTheDocument();
    expect(screen.getByText('Search: h264')).toBeInTheDocument();
  });

  it('removes filter when badge X button is clicked', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {
      status: 'pending',
      category: 'Encoding & Codecs',
      search: 'h264'
    };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Find the status badge and click its remove button
    const statusBadge = await screen.findByText('Status: pending', {}, { timeout: 3000 });
    const parentBadge = statusBadge.closest('[role="button"]');
    expect(parentBadge).toBeInTheDocument();

    // Click the X button within the badge
    const removeButton = within(parentBadge!).getByRole('button');
    await user.click(removeButton);

    // Should call onFilterChange with status removed
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        category: 'Encoding & Codecs',
        search: 'h264'
      });
    }, { timeout: 3000 });
  });

  it('clears all filters when Clear All Filters button is clicked', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {
      status: 'pending',
      category: 'Encoding & Codecs',
      search: 'h264'
    };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const clearButton = await screen.findByRole('button', { name: /clear all filters/i }, { timeout: 3000 });

    // Button should be enabled when filters are active
    expect(clearButton).not.toBeDisabled();

    await user.click(clearButton);

    // Should call with empty filters
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({});
    }, { timeout: 3000 });
  });

  it('debounces rapid search input changes', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const searchInput = screen.getByPlaceholderText(/search resources/i);

    // Type multiple characters rapidly
    await user.type(searchInput, 'f');
    vi.advanceTimersByTime(100);

    await user.type(searchInput, 'f');
    vi.advanceTimersByTime(100);

    await user.type(searchInput, 'mpeg');
    vi.advanceTimersByTime(100);

    // Should not have called yet (total 300ms not elapsed)
    expect(onFilterChange).not.toHaveBeenCalled();

    // Fast-forward to complete debounce
    vi.advanceTimersByTime(300);

    // Should only call once with final value
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledTimes(1);
      expect(onFilterChange).toHaveBeenCalledWith({ search: 'ffmpeg' });
    });
  });

  it('handles category API loading state', () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const categorySelect = screen.getByRole('combobox', { name: /category/i });

    // Should show loading state (disabled while fetching)
    expect(categorySelect).toBeDisabled();
  });

  it('handles category API error state', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Wait for error state
    await waitFor(() => {
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      expect(categorySelect).toBeDisabled();
    }, { timeout: 3000 });
  });

  it('preserves filter state when search is cleared via backspace', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = { search: 'h264' };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const searchInput = await screen.findByPlaceholderText(/search resources/i, {}, { timeout: 3000 });
    expect(searchInput).toHaveValue('h264');

    // Clear the search
    await user.clear(searchInput);
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({ search: '' });
    }, { timeout: 3000 });
  });
});
