import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, MoreHorizontal, Eye, Archive, Pencil } from 'lucide-react';
import ResourceFilters, { type ResourceFilters as ResourceFiltersType } from './ResourceFilters';
import { BulkActionsToolbar, type BulkAction } from './BulkActionsToolbar';
import ResourceEditModal from './ResourceEditModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { Resource } from '@shared/schema';

interface ResourceResponse {
  resources: Resource[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
}


export function ResourceBrowser() {
  const [filters, setFilters] = useState<ResourceFiltersType>({});
  const [page, setPage] = useState(1);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch resources
  const { data, isLoading, error } = useQuery<ResourceResponse>({
    queryKey: ['/api/admin/resources', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      // Get Supabase session for JWT token
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/resources?${params}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }

      return response.json();
    },
  });

  // Update resource mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Resource> }) => {
      // Get Supabase session for JWT token
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/admin/resources/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update resource');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      toast({
        title: 'Success',
        description: 'Resource updated successfully',
      });
      setEditingResource(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk action mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ action, ids, data }: { action: string; ids: string[]; data?: any }) => {
      // Get Supabase session for JWT token
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/resources/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, resourceIds: ids, data }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      setRowSelection({});
      toast({
        title: 'Success',
        description: 'Bulk action completed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = async (resourceId: string, updates: Partial<Resource>) => {
    updateMutation.mutate({ id: resourceId, updates });
  };

  const handleBulkAction = async (action: BulkAction, ids: string[]) => {
    if (ids.length === 0) {
      toast({
        title: 'No resources selected',
        description: 'Please select resources to perform bulk actions',
        variant: 'destructive',
      });
      return;
    }

    bulkMutation.mutate({ action, ids });
  };

  const handleArchive = (resourceId: string) => {
    updateMutation.mutate({
      id: resourceId,
      updates: { status: 'archived' },
    });
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Column definitions
  const columns: ColumnDef<Resource>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-md" title={row.original.title}>
            {row.original.title}
          </span>
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3 text-blue-500 hover:text-blue-700" />
          </a>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="outline" className="whitespace-nowrap">
          {row.original.category}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          approved: 'default',
          pending: 'secondary',
          rejected: 'destructive',
          archived: 'outline',
        };
        const status = row.original.status || 'pending';
        return (
          <Badge variant={statusColors[status] || 'outline'}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Modified',
      cell: ({ row }) => {
        try {
          const date = row.original.updatedAt;
          if (!date) return <span className="text-sm text-muted-foreground">Never</span>;
          return (
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(date), { addSuffix: true })}
            </span>
          );
        } catch {
          return <span className="text-sm text-muted-foreground">Unknown</span>;
        }
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingResource(row.original)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open(row.original.url, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleArchive(row.original.id)}
              className="text-destructive"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: data?.resources || [],
    columns,
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,  // Use resource ID for stable selection across renders
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Resource Browser</h2>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.totalCount} total resources
          </p>
        )}
      </div>

      <ResourceFilters filters={filters} onFilterChange={setFilters} />

      {selectedIds.length > 0 && (
        <BulkActionsToolbar
          selectedIds={selectedIds}
          onAction={handleBulkAction}
          onClearSelection={() => setRowSelection({})}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="text-destructive">
                    Error loading resources: {error.message}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No resources found</p>
                    {(filters.category || filters.status || filters.search) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                      >
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Page {data.currentPage} of {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ResourceEditModal
        resource={editingResource}
        isOpen={!!editingResource}
        onClose={() => setEditingResource(null)}
        onSave={handleSave}
      />
    </div>
  );
}
