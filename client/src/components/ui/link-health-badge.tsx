import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const linkHealthBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        verified:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        broken:
          "border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
        unknown:
          "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
      },
    },
    defaultVariants: {
      status: "unknown",
    },
  }
)

const iconMap = {
  verified: CheckCircle,
  warning: AlertTriangle,
  broken: XCircle,
  unknown: HelpCircle,
}

const labelMap = {
  verified: "Verified",
  warning: "Warning",
  broken: "Broken",
  unknown: "Unknown",
}

export interface LinkHealthBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof linkHealthBadgeVariants> {
  status: "verified" | "warning" | "broken" | "unknown"
  lastChecked?: Date | string | null
  showIcon?: boolean
  showLabel?: boolean
}

function LinkHealthBadge({
  className,
  status,
  lastChecked,
  showIcon = true,
  showLabel = true,
  title: propTitle,
  ...props
}: LinkHealthBadgeProps) {
  const Icon = iconMap[status]
  const label = labelMap[status]

  // Generate tooltip text
  const generateTitle = () => {
    if (propTitle) return propTitle

    let title = `Link status: ${label}`
    if (lastChecked) {
      const date = typeof lastChecked === 'string' ? new Date(lastChecked) : lastChecked
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        title += " (checked today)"
      } else if (diffDays === 1) {
        title += " (checked yesterday)"
      } else if (diffDays < 30) {
        title += ` (checked ${diffDays} days ago)`
      } else {
        title += ` (checked ${date.toLocaleDateString()})`
      }
    }
    return title
  }

  return (
    <div
      className={cn(linkHealthBadgeVariants({ status }), className)}
      title={generateTitle()}
      {...props}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {showLabel && <span>{label}</span>}
    </div>
  )
}

export { LinkHealthBadge, linkHealthBadgeVariants }
