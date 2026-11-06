import * as React from "react";

type FocusSafeProps = Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "aria-disabled" | "onFocus" | "onBlur" | "onClick"
>;

/**
 * A focused button that becomes natively `disabled` (a confirm, Retry or
 * submit that disables itself while its own request runs) drops keyboard
 * focus to <body>, and nothing brings it back when the request fails.
 * While the button holds focus it is rendered `aria-disabled` and swallows
 * activation instead, so focus stays on it; once focus leaves, it is
 * natively disabled again, so the tab order of idle disabled buttons is
 * unchanged.
 */
export function useFocusSafeDisabled({
  disabled,
  "aria-disabled": ariaDisabled,
  onFocus,
  onBlur,
  onClick,
}: FocusSafeProps): FocusSafeProps {
  const [focused, setFocused] = React.useState(false);
  const holdFocus = Boolean(disabled) && focused;
  return {
    disabled: disabled && !holdFocus,
    "aria-disabled": holdFocus ? true : ariaDisabled,
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
