// BUG-013 (run14): window.history.length is useless for "did the user
// navigate inside the app?" — a fresh tab already has about:blank (and the
// browser new-tab page) in its history, so length > 1 sends deep-linked
// visitors to a blank page when they press the in-app Back button.
// Instead, App counts wouter location changes here; only when at least one
// in-app navigation has happened is history.back() guaranteed to land on an
// in-app page.
let locationChanges = 0;

export function noteLocationChange(): void {
  locationChanges += 1;
}

export function hasInAppHistory(): boolean {
  // The first "change" is the initial mount, not a navigation.
  return locationChanges > 1;
}
