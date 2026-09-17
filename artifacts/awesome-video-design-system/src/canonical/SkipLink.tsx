import type { MouseEvent } from "react";

interface SkipLinkProps {
  targetId: string;
}

/**
 * Move keyboard focus to the page landmark without giving the hash router a
 * navigation event. The href remains useful to assistive technology and as a
 * graceful fallback if scripting is unavailable.
 */
export function SkipLink({ targetId }: SkipLinkProps) {
  const focusTarget = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
  };

  return (
    <a className="skip-link" href={`#${targetId}`} onClick={focusTarget}>
      Skip to content
    </a>
  );
}