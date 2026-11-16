import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

// The canonical sheet styles the selected tab as `.tab.active`, so the root
// shares its current value with the triggers and each trigger adds `active`
// itself. Works for both controlled (`value`) and uncontrolled (`defaultValue`) use.
// The root also shares its change handler so a trigger can select itself on a
// pointer press (see TabsTrigger).
interface TabsState {
  value: string | undefined
  select: ((next: string) => void) | undefined
}
const TabsValueContext = React.createContext<TabsState>({ value: undefined, select: undefined })

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = value ?? uncontrolledValue
  // A pointer press focuses the trigger before selecting it (TabsTrigger), and
  // in automatic mode that focus already selects it, so one click reports the
  // same value twice within a single task. Drop the repeat.
  const pendingValueRef = React.useRef<string | null>(null)

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (pendingValueRef.current === next) return
      pendingValueRef.current = next
      queueMicrotask(() => {
        pendingValueRef.current = null
      })
      if (value === undefined) setUncontrolledValue(next)
      onValueChange?.(next)
    },
    [value, onValueChange]
  )

  const state = React.useMemo(
    () => ({ value: currentValue, select: handleValueChange }),
    [currentValue, handleValueChange]
  )

  return (
    <TabsValueContext.Provider value={state}>
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
>(({ className, value, onMouseDown, ...props }, ref) => {
  const { value: selected, select } = React.useContext(TabsValueContext)
  const isActive = selected === value
  // G02: Radix focuses the trigger from script on mousedown, and Chrome marks
  // script focus :focus-visible, so a mouse click drew the keyboard ring. A
  // primary-button press is handled here instead: focus without the ring, then
  // select (manual-activation lists do not select on focus). Preventing the
  // default skips Radix's own mousedown handler and the native focus.
  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMouseDown?.(event)
    if (event.defaultPrevented || props.disabled || event.button !== 0 || event.ctrlKey) return
    event.preventDefault()
    event.currentTarget.focus({ focusVisible: false } as FocusOptions)
    select?.(value)
  }
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      onMouseDown={handleMouseDown}
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
