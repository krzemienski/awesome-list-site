import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// The canonical sheet styles the selected tab as `.tab.active`, so the root
// shares its current value with the triggers and each trigger adds `active`
// itself. Works for both controlled (`value`) and uncontrolled (`defaultValue`) use.
const TabsValueContext = React.createContext<string | undefined>(undefined)

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = value ?? uncontrolledValue

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolledValue(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )

  return (
    <TabsValueContext.Provider value={currentValue}>
      <TabsPrimitive.Root
        ref={ref}
        value={currentValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsValueContext.Provider>
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("tabs", className)} {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, ...props }, ref) => {
  const isActive = React.useContext(TabsValueContext) === value
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        // `.tab` keeps the UA button leading; min-h-11 is the 44px touch floor.
        // justify-center only shows when a consumer stretches tabs into a grid.
        "tab min-h-11 shrink-0 justify-center [line-height:normal] disabled:pointer-events-none disabled:opacity-50",
        isActive && "active",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
