import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 max-lg:relative max-lg:after:absolute max-lg:after:left-1/2 max-lg:after:top-1/2 max-lg:after:h-11 max-lg:after:w-11 max-lg:after:-translate-x-1/2 max-lg:after:-translate-y-1/2 max-lg:after:content-[''] border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    {/* C4-V5A-02: Radix shows the Indicator for "indeterminate" too; a partial
        selection draws a dash so it never reads as "all selected". */}
    <CheckboxPrimitive.Indicator
      className={cn("group flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4 group-data-[state=indeterminate]:hidden" />
      <Minus className="hidden h-4 w-4 group-data-[state=indeterminate]:block" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
