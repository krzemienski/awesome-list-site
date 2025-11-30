import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ResourceFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'archived' | 'all';
  category?: string;
  subcategory?: string;
  search?: string;
  dateRange?: { start: Date; end: Date };
}

export interface ResourceFiltersProps {
  filters: ResourceFilters;
  onFilterChange: (filters: ResourceFilters) => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ResourceFilters({ filters, onFilterChange }: ResourceFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFilterChange({ ...filters, search: searchValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Sync search value with external filter changes
  useEffect(() => {
    if (filters.search !== searchValue) {
      setSearchValue(filters.search || '');
    }
  }, [filters.search]);

  const handleStatusChange = (value: string) => {
    const newFilters = { ...filters };
    if (value === 'all') {
      delete newFilters.status;
    } else {
      newFilters.status = value as ResourceFilters['status'];
    }
    onFilterChange(newFilters);
  };

  const handleCategoryChange = (value: string) => {
    const newFilters = { ...filters };
    if (value === 'all') {
      delete newFilters.category;
    } else {
      newFilters.category = value;
    }
    onFilterChange(newFilters);
  };

  const removeFilter = (key: keyof ResourceFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const activeFilterBadges = [];

  if (filters.status) {
    activeFilterBadges.push(
      <Badge key="status" variant="secondary" className="gap-1" role="button">
        <span>Status: {filters.status}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={() => removeFilter('status')}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove status filter</span>
        </Button>
      </Badge>
    );
  }

  if (filters.category) {
    activeFilterBadges.push(
      <Badge key="category" variant="secondary" className="gap-1" role="button">
        <span>Category: {filters.category}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={() => removeFilter('category')}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove category filter</span>
        </Button>
      </Badge>
    );
  }

  if (filters.search) {
    activeFilterBadges.push(
      <Badge key="search" variant="secondary" className="gap-1" role="button">
        <span>Search: {filters.search}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={() => removeFilter('search')}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Remove search filter</span>
        </Button>
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div>
          <Input
            placeholder="Search resources..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Status Select */}
        <div>
          <Select
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Select */}
        <div>
          <Select
            value={filters.category || 'all'}
            onValueChange={handleCategoryChange}
            disabled={categoriesLoading}
          >
            <SelectTrigger aria-label="Category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters & Clear Button */}
      <div className="flex flex-wrap gap-2 items-center">
        {activeFilterBadges.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeFilterBadges}
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );
}
