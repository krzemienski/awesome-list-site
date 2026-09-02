/** Static guards for the current Clerk sign-in surface and shared form a11y. */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_SRC = readFileSync(
  resolve(__dirname, '../../client/src/App.tsx'),
  'utf8'
);

describe('Clerk sign-in static-source invariants', () => {
  it('renders Clerk SignIn on the canonical sign-in path', () => {
    expect(APP_SRC).toMatch(/<SignIn[\s\S]*?path=\{`\$\{basePath\}\/sign-in`\}/);
    expect(APP_SRC).toMatch(/<Route path="\/sign-in\/\*\?" component=\{SignInPage\}/);
  });

  it('cross-links sign-in and sign-up using Clerk routes', () => {
    expect(APP_SRC).toMatch(/<SignIn[\s\S]*?signUpUrl=\{`\$\{basePath\}\/sign-up`\}/);
    expect(APP_SRC).toMatch(/<SignUp[\s\S]*?signInUrl=\{`\$\{basePath\}\/sign-in`\}/);
  });

  it('keeps legacy login and recovery URLs on the Clerk sign-in surface', () => {
    for (const path of ['/login', '/forgot-password', '/reset-password']) {
      expect(APP_SRC).toContain(
        `<Route path="${path}" component={() => <LegacyAuthRedirect to="/sign-in" />} />`,
      );
    }
  });
});

describe('Phase 4 — Form primitive (form.tsx) emits a11y error markup', () => {
  // BUG-048: empty submit must surface inline screen-reader-accessible errors.
  // The contract lives in client/src/components/ui/form.tsx (FormMessage).
  const FORM_SRC = readFileSync(
    resolve(__dirname, '../../client/src/components/ui/form.tsx'),
    'utf8'
  );

  it('FormMessage renders role="alert" when there is an error', () => {
    expect(FORM_SRC).toMatch(/role=\{error\s*\?\s*"alert"\s*:\s*undefined\}/);
  });

  it('FormControl wires aria-describedby to the form message id', () => {
    expect(FORM_SRC).toMatch(/aria-describedby=/);
    expect(FORM_SRC).toMatch(/formMessageId/);
  });

  it('FormControl sets aria-invalid when the field has an error', () => {
    expect(FORM_SRC).toMatch(/aria-invalid=\{!!error\}/);
  });
});
