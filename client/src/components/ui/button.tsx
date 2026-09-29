import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Paint (surface, border, radius, ink, weight, hover) comes from the design
// system's `.btn` classes so every per-system skin applies; the utilities here
// only size the control to the 44px touch target.
const buttonVariants = cva(
  "btn focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "primary",
        destructive: "danger",
        outline: "",
        secondary: "",
        ghost: "ghost",
        link: "link",
      },
      size: {
        default: "min-h-[max(44px,var(--profile-control-height))] min-w-[44px]",
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
