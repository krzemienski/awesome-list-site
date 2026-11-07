import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Pressable filter. The design system has no interactive chip — `.chip` is a
 * static tag and every control is a `.btn` — so an idle filter is a ghost
 * button and a pressed one drops `ghost` to read as the selected state.
 */
export const ChipButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => {
  const pressed = props["aria-pressed"] === true || props["aria-pressed"] === "true";
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      // Below desktop (touch widths) a filter chip must keep a 44px target;
      // desktop keeps the compact chip height.
      className={cn("btn", !pressed && "ghost", "max-lg:min-h-11", className)}
    />
  );
});
ChipButton.displayName = "ChipButton";
