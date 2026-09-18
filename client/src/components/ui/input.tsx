import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  /**
   * `input` is the design system's `.input` text field; `search` is its
   * icon-led `.search-input` (36px left padding for a leading icon).
   */
  variant?: "input" | "search"
}

/**
 * Input emits the design system's `.input` / `.search-input` class
 * (docs/10-components.md). Paint, radius, focus and per-system skins come
 * from design-system.css; `aria-invalid` styling is a design-system state
 * rule there as well.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "input", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(variant === "search" ? "search-input" : "input", className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
