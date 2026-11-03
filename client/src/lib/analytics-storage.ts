// Storage teardown for vendor SDKs that outlive their own opt-out. Shared by
// the withdraw path (Decline / Cookie settings → Save) so a visitor who takes
// consent back leaves no vendor identifier behind in cookies, localStorage or
// sessionStorage. Pure browser-storage code, safe to import pre-consent.

const hostDomainAttributes = (): string[] => {
  // SDKs write cookies on the highest settable parent domain (cross-subdomain
  // cookie, e.g. `.awesome.video`), so expire each name on the host-only scope
  // and on every parent domain; the browser ignores a public-suffix domain.
  const labels = window.location.hostname.split('.');
  const scopes = [''];
  for (let i = 0; i < labels.length - 1; i += 1) {
    scopes.push(`; Domain=.${labels.slice(i).join('.')}`);
  }
  return scopes;
};

/** Expire every cookie whose name matches, on the host and all parent domains. */
export const expireCookiesMatching = (pattern: RegExp): void => {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter((name) => name && pattern.test(name));
  if (names.length === 0) return;
  const scopes = hostDomainAttributes();
  for (const name of names) {
    for (const scope of scopes) {
      document.cookie = `${name}=; Path=/; Max-Age=0${scope}`;
    }
  }
};

/** Remove every web-storage key matching the pattern from one storage area. */
const removeKeysMatching = (area: Storage, pattern: RegExp): void => {
  const keys: string[] = [];
  for (let i = 0; i < area.length; i += 1) {
    const key = area.key(i);
    if (key && pattern.test(key)) keys.push(key);
  }
  keys.forEach((key) => area.removeItem(key));
};

export const clearStorageMatching = (pattern: RegExp): void => {
  if (typeof window === 'undefined') return;
  for (const read of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      removeKeysMatching(read(), pattern);
    } catch {
      // Storage blocked (private mode / site data blocked): nothing to clear.
    }
  }
};
