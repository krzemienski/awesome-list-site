import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button emits the design system's `.btn` class API (styles.css / HANDOFF.md
 * Phase 5): `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.danger`, `.btn.icon`.
 * Paint, radius, border width, hover and per-system skins all come from
 * client/src/styles/design-system.css; the utilities kept here only set the
 * 44px accessible target (docs/17-accessibility.md) and icon sizing.
 */
const buttonVariants = cva(
  "btn [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "primary",
        destructive: "danger",
        outline: "",
        secondary: "",
        ghost: "ghost",
        link: "btn-link",
      },
      size: {
        default: "min-h-[max(44px,var(--profile-control-height))] min-w-[44px] px-4 py-2",
        sm: "min-h-[max(44px,var(--profile-control-height))] min-w-[44px] px-3",
        lg: "min-h-[48px] px-8",
        icon: "icon min-h-[max(44px,var(--profile-control-height))] min-w-[max(44px,var(--profile-control-height))]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        data-ds-variant={variant ?? "default"}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
