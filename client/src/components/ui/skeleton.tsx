import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn("animate-pulse bg-[var(--surface-3)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
