import * as React from "react";
import { cn } from "@/lib/utils";

/** Interactive chip: keep its system skin hook owned by the primitive. */
export const ChipButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    {...props}
    ref={ref}
    type={type}
    className={cn("chip", className)}
    data-ds="chip"
  />
));
ChipButton.displayName = "ChipButton";