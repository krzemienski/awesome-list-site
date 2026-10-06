import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Every variant is a design-system `.chip`: paint, mono caps and the
// per-system skins (Terminal brackets, Geist sentence case…) come from the
// canonical sheet. Accent stays reserved for the explicit `accent` variant.
const badgeVariants = cva(
  "chip focus:outline-none",
  {
    variants: {
      variant: {
        default: "",
        secondary: "",
        destructive: "bad",
        outline: "",
        chip: "",
        accent: "accent",
        ok: "ok",
        warn: "warn",
        bad: "bad",
        muted: "muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
