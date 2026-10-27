import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full border p-4 [&>svg~*]:pl-7 [&>svg+div:not([data-slot=alert-title])]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * When assistive tech reads the box. "assertive" interrupts, for an error the
 * user just caused. "polite" waits for a pause, for a result that lands while
 * the page is open. "off" is never announced, for text that is simply part of
 * the page when it renders. Left unset, a destructive alert is assertive and
 * every other alert is "off", so a static notice is never read out; an alert
 * that appears after an action passes "polite".
 */
export type AlertLive = "assertive" | "polite" | "off"

const roleFor: Record<AlertLive, string> = {
  assertive: "alert",
  polite: "status",
  off: "note",
}

const Alert = React.forwardRef<
  HTMLDivElement,
  Omit<React.HTMLAttributes<HTMLDivElement>, "role"> &
    VariantProps<typeof alertVariants> & { live?: AlertLive }
>(({ className, variant, live, ...props }, ref) => (
  <div
    ref={ref}
    role={roleFor[live ?? (variant === "destructive" ? "assertive" : "off")]}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

// A callout title, not a section heading: as an <h5> it broke the outline of
// every page that shows an alert under its h1 or h2.
const AlertTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-title"
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
