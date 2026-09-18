import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card emits the design system's `.card` class (docs/10-components.md).
 * Interactive cards opt into `.hoverable` (and `.glow`) through props or by
 * passing the classes; paint, radius, hover lift and per-system skins come
 * from design-system.css.
 */
const Card = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { hoverable?: boolean; glow?: boolean; "data-ds"?: string }
>(({ className, hoverable, glow, "data-ds": dataDs, ...props }, ref) => {
  const interactive = Boolean(hoverable) || dataDs === "card-hover"
  return (
    <article
      ref={ref}
      className={cn("card", interactive && "hoverable", glow && "glow", className)}
      data-ds={dataDs}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-[var(--profile-panel-padding)]", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-[var(--profile-panel-padding)] pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-[var(--profile-panel-padding)] pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
