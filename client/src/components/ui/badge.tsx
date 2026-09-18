import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge emits the design system's `.chip` class API (docs/10-components.md):
 * `.chip`, `.chip.accent`, `.chip.ok`, `.chip.warn`, `.chip.bad`, `.chip.muted`.
 * The shadcn variant names are kept for existing call sites and mapped onto
 * the chip variants; paint and per-system skins come from design-system.css.
 */
const badgeVariants = cva("chip", {
  variants: {
    variant: {
      default: "accent",
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
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      data-ds="chip"
      {...props}
    />
  )
}

export { Badge, badgeVariants }
