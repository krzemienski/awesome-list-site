import * as React from "react";

type FocusSafeProps = Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "aria-disabled" | "onFocus" | "onBlur" | "onClick"
> & { "data-focus-held"?: "" };

/**
 * A focused button that becomes natively `disabled` (a confirm, Retry or
 * submit that disables itself while its own request runs) drops keyboard
 * focus to <body>, and nothing brings it back when the request fails.
 * While the button holds focus it is rendered `aria-disabled` and swallows
 * activation instead, so focus stays on it; once focus leaves, it is
 * natively disabled again, so the tab order of idle disabled buttons is
 * unchanged. `data-focus-held` lets styles treat that state as disabled
 * (`.btn:hover` and pointer events otherwise key off `:disabled`).
 */
export function useFocusSafeDisabled({
  disabled,
  "aria-disabled": ariaDisabled,
  onFocus,
  onBlur,
  onClick,
}: Pick<FocusSafeProps, "disabled" | "aria-disabled" | "onFocus" | "onBlur" | "onClick">): FocusSafeProps {
  const [focused, setFocused] = React.useState(false);
  // A focused node removed from the DOM fires no blur; once the button is
  // enabled again, a stale flag must not keep it aria-disabled later on.
  React.useEffect(() => {
    if (!disabled) setFocused(false);
  }, [disabled]);
  const holdFocus = Boolean(disabled) && focused;
  return {
    disabled: disabled && !holdFocus,
    "aria-disabled": holdFocus ? true : ariaDisabled,
    "data-focus-held": holdFocus ? "" : undefined,
    onFocus: (event) => {
      setFocused(true);
      onFocus?.(event);
    },
    onBlur: (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    onClick: (event) => {
      if (holdFocus) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    },
  };
}
