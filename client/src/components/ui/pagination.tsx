import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Show ellipsis after first page if current page is far from start
      if (currentPage > 4) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      // Show ellipsis before last page if current page is far from end
      if (currentPage < totalPages - 3) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1 && !pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of {totalItems.toLocaleString()} resources
        </span>
        
        <div className="flex items-center gap-2">
          <span>Show:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>per page</span>
        </div>
      </div>

      <ShadcnPagination>
        <ShadcnPaginationContent>
          <ShadcnPaginationItem>
            <ShadcnPaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            />
          </ShadcnPaginationItem>

          {getPageNumbers().map((page, index) => (
            page === 'ellipsis' ? (
              <ShadcnPaginationItem key={`ellipsis-${index}`}>
                <ShadcnPaginationEllipsis />
              </ShadcnPaginationItem>
            ) : (
              <ShadcnPaginationItem key={page}>
                <ShadcnPaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={currentPage === page}
                >
                  {page}
                </ShadcnPaginationLink>
              </ShadcnPaginationItem>
            )
          ))}

          <ShadcnPaginationItem>
            <ShadcnPaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            />
          </ShadcnPaginationItem>
        </ShadcnPaginationContent>
      </ShadcnPagination>
    </div>
  );
}

// Shadcn Pagination Components
function ShadcnPagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function ShadcnPaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function ShadcnPaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type ShadcnPaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<"button">, "size"> &
  React.ComponentProps<"button">

function ShadcnPaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: ShadcnPaginationLinkProps) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

function ShadcnPaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnPaginationLink>) {
  return (
    <ShadcnPaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon className="h-4 w-4" />
      <span className="hidden sm:block">Previous</span>
    </ShadcnPaginationLink>
  )
}

function ShadcnPaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnPaginationLink>) {
  return (
    <ShadcnPaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon className="h-4 w-4" />
    </ShadcnPaginationLink>
  )
}

function ShadcnPaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}