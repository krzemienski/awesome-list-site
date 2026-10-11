// Sign a validation user in through the real <SignIn> component with a
// backend-minted Clerk sign-in ticket instead of typing a password.
//
// Clerk's Client Trust feature treats repeated password sign-ins from this
// container as new devices and escalates them at random: sometimes straight
// to the OTP field, sometimes to an email-code factor chooser at
// /sign-in/factor-one. Password-driven harnesses therefore stalled
// intermittently ("Clerk UI sign-in did not produce an authenticated
// session"), which tests Clerk's risk engine rather than the app. A
// `__clerk_ticket` on the /sign-in URL is completed by Clerk's own component,
// keeps any app-built redirect_url intact, and never triggers Client Trust.
//
// Harnesses that exercise the password or verification screens themselves
// must keep driving those screens directly; this helper is for every caller
// that only needs a signed-in session.
export async function signInWithClerkTicket(page, { clerkApi, clerkUserId, navigate }) {
  const signInUrl = new URL(page.url());
  if (!signInUrl.pathname.startsWith("/sign-in")) {
    throw new Error(`ticket sign-in must start on /sign-in; path=${signInUrl.pathname}`);
  }
  const ticket = await clerkApi("POST", "/sign_in_tokens", {
    user_id: clerkUserId,
    expires_in_seconds: 600,
  });
  signInUrl.searchParams.set("__clerk_ticket", ticket.token);
  await navigate(signInUrl.pathname + signInUrl.search);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const signedIn = await page
      .evaluate(() => Boolean(window.Clerk?.user))
      .catch(() => false);
    if (signedIn || !new URL(page.url()).pathname.startsWith("/sign-in")) return;
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Clerk ticket sign-in did not reach an authenticated session; ` +
      `path=${new URL(page.url()).pathname}`,
  );
}
