// Programmatic scrolls animate only for visitors who haven't asked for reduced
// motion. "instant", not "auto": auto defers to html's CSS scroll-behavior.
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}
