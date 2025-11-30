import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResourceFilters from './ResourceFilters';
import type { ResourceFilters as FilterState } from './ResourceFilters';

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

describe('ResourceFilters - Simple Tests', () => {
  beforeEach(() => {
    // Mock successful category fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockCategories
    });
  });

  it('renders all required filter controls', () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Check all controls are present
    expect(screen.getByPlaceholderText(/search resources/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('shows active filter badges when filters are applied', () => {
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

    // All filter badges should be visible
    expect(screen.getByText('Status: pending')).toBeInTheDocument();
    expect(screen.getByText('Category: Encoding & Codecs')).toBeInTheDocument();
    expect(screen.getByText('Search: h264')).toBeInTheDocument();
  });

  it('disables Clear All button when no filters are active', () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    expect(clearButton).toBeDisabled();
  });

  it('enables Clear All button when filters are active', () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = { status: 'pending' };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    expect(clearButton).not.toBeDisabled();
  });

  it('displays categories after loading', async () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = {};

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    // Wait for categories to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories');
    });

    // Category select should no longer be disabled after loading
    await waitFor(() => {
      const categorySelect = screen.getByRole('combobox', { name: /category/i });
      expect(categorySelect).not.toBeDisabled();
    });
  });

  it('syncs search input value with filters prop', () => {
    const onFilterChange = vi.fn();
    const filters: FilterState = { search: 'test-search' };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const searchInput = screen.getByPlaceholderText(/search resources/i);
    expect(searchInput).toHaveValue('test-search');
  });

  it('calls onFilterChange when Clear All is clicked', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const filters: FilterState = {
      status: 'pending',
      search: 'test'
    };

    render(
      <ResourceFilters filters={filters} onFilterChange={onFilterChange} />,
      { wrapper: createWrapper() }
    );

    const clearButton = screen.getByRole('button', { name: /clear all filters/i });
    await user.click(clearButton);

    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});
