import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, useSignIn } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authPageHeadings } from "@shared/seo-templates";
import { humanizeApiError, OFFLINE_MESSAGE } from "@/lib/apiError";
import { navigateAfterAuth, ssoCallbackUrl, ssoRedirectUrl, standardFormHref } from "@/lib/auth-navigation";
import { describeSignInError, isAlreadySignedIn, type ClerkErrorLike } from "@/lib/clerk-errors";
import { requestedReturnPath } from "@/lib/returnUrl";
import { AuthField } from "./forms/AuthField";
import { CodeStep } from "./forms/CodeStep";
import { OAuthButtons, type OAuthProvider } from "./forms/OAuthButtons";
import { PasswordField } from "./forms/PasswordField";

type Step = "credentials" | "email-code" | "client-trust";

/** One failed attempt; a new object each time so repeating an error re-focuses. */
interface Problem {
  email: string | null;
  password: string | null;
  code: string | null;
  global: string | null;
}

const NO_PROBLEM: Problem = { email: null, password: null, code: null, global: null };
const UNSUPPORTED_STEP =
  "This account needs a sign-in step this form does not support yet. Use the standard sign-in form below.";

/**
 * App-owned sign-in on Clerk's useSignIn: email + password, email code,
 * device trust, invitation tickets and the OAuth providers. Served at
 * /sign-in?form=custom; the prebuilt <SignIn> stays the default.
 */
export default function CustomSignIn() {
  const { signIn } = useSignIn();
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<Problem>(NO_PROBLEM);
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef(step);
  stepRef.current = step;
  const finishing = useRef(false);
  const ticketTried = useRef(false);

  const finish = useCallback(async () => {
    finishing.current = true;
    const { error } = await signIn.finalize({
      navigate: (args) => navigateAfterAuth(args, setLocation),
    });
    if (error) {
      finishing.current = false;
      setProblem({ ...NO_PROBLEM, global: describeSignInError(error).message });
    }
  }, [signIn, setLocation]);

  // A visitor who is already signed in has nothing to do here (the prebuilt
  // form redirects them itself). Skipped while this form completes a sign-in.
  useEffect(() => {
    if (isSignedIn && !finishing.current) setLocation(requestedReturnPath() ?? "/");
  }, [isSignedIn, setLocation]);

  // The one live region for field errors. Each failed attempt bumps the key so
  // the text is a new node and is read again, even when the message repeats and
  // the failing field already had focus (focus() alone announces nothing then).
  const fieldMessage = problem.email ?? problem.password ?? problem.code;
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (fieldMessage) setAttempt((n) => n + 1);
  }, [problem, fieldMessage]);

  // Focus the first invalid field after a failed attempt.
  useEffect(() => {
    if (step !== "credentials") return;
    if (problem.email) emailRef.current?.focus();
    else if (problem.password) passwordRef.current?.focus();
  }, [problem, step]);

  const fail = useCallback(
    (error: ClerkErrorLike) => {
      if (isAlreadySignedIn(error)) {
        setLocation(requestedReturnPath() ?? "/");
        return;
      }
      const view = describeSignInError(error);
      // Only the code field is on screen after the credentials step.
      const target = stepRef.current !== "credentials" && view.target !== "code" ? "global" : view.target;
      setProblem({ ...NO_PROBLEM, [target]: view.message });
    },
    [setLocation],
  );

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setProblem(NO_PROBLEM);
      try {
        await action();
      } catch (reason) {
        setProblem({ ...NO_PROBLEM, global: humanizeApiError(reason, OFFLINE_MESSAGE) });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const sendTrustCode = useCallback(async () => {
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) return fail(error);
    setStep("client-trust");
  }, [signIn, fail]);

  // After a password or code attempt: finish, ask for the device-trust code, or
  // say the account needs something this form cannot do.
  const advance = useCallback(async () => {
    if (signIn.status === "complete") return finish();
    const canEmailTrust = signIn.supportedSecondFactors?.some((factor) => factor.strategy === "email_code");
    if (signIn.status === "needs_client_trust" && canEmailTrust) return sendTrustCode();
    setProblem({ ...NO_PROBLEM, global: UNSUPPORTED_STEP });
  }, [signIn, finish, sendTrustCode]);

  // Invitation link: __clerk_ticket signs an existing account in directly. A
  // link for a new account (__clerk_status=sign_up) belongs to the sign-up page.
  useEffect(() => {
    if (ticketTried.current) return;
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("__clerk_ticket");
    if (!ticket) return;
    ticketTried.current = true;
    if (params.get("__clerk_status") === "sign_up") {
      setLocation(standardFormHref("/sign-up"));
      return;
    }
    void run(async () => {
      const { error } = await signIn.ticket({ ticket });
      if (error) return fail(error);
      await advance();
    });
  }, [signIn, run, fail, advance, setLocation]);

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setProblem({
        ...NO_PROBLEM,
        email: trimmed ? null : "Enter your email address.",
        password: password ? null : "Enter your password.",
      });
      return;
    }
    void run(async () => {
      const { error } = await signIn.password({ identifier: trimmed, password });
      if (error) return fail(error);
      await advance();
    });
  };

  const startEmailCode = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setProblem({ ...NO_PROBLEM, email: "Enter your email address." });
      return;
    }
    void run(async () => {
      const created = await signIn.create({ identifier: trimmed });
      if (created.error) return fail(created.error);
      const sent = await signIn.emailCode.sendCode();
      if (sent.error) return fail(sent.error);
      setStep("email-code");
    });
  };

  const verifyCode = (code: string) =>
    void run(async () => {
      const { error } =
        step === "client-trust"
          ? await signIn.mfa.verifyEmailCode({ code })
          : await signIn.emailCode.verifyCode({ code });
      if (error) return fail(error);
      await advance();
    });

  const resendCode = () =>
    void run(async () => {
      const { error } = step === "client-trust" ? await signIn.mfa.sendEmailCode() : await signIn.emailCode.sendCode();
      if (error) fail(error);
    });

  const startOver = () =>
    void run(async () => {
      await signIn.reset();
      setStep("credentials");
      setPassword("");
      requestAnimationFrame(() => emailRef.current?.focus());
    });

  const startOAuth = (strategy: OAuthProvider) => {
    setRedirecting(strategy);
    void run(async () => {
      const { error } = await signIn.sso({
        strategy,
        redirectUrl: ssoRedirectUrl(),
        redirectCallbackUrl: ssoCallbackUrl(),
      });
      if (error) {
        setRedirecting(null);
        fail(error);
      }
    });
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 px-4" data-testid="custom-sign-in">
      <h1 className="page-title text-xl">{authPageHeadings.signIn}</h1>
      <p className="text-sm text-muted-foreground">Sign in to continue to Awesome Video</p>
      <p role="status" aria-live="polite" className="sr-only" data-testid="auth-field-announcer">
        <span key={attempt}>{fieldMessage}</span>
      </p>
      {problem.global && (
        <Alert variant="destructive" live="assertive" data-testid="text-sign-in-error">
          {problem.global}
        </Alert>
      )}
      {step === "credentials" ? (
        <>
          <OAuthButtons redirecting={redirecting} disabled={busy} onSelect={startOAuth} />
          <p className="text-center text-sm text-muted-foreground" aria-hidden="true">
            or
          </p>
          <form onSubmit={submitPassword} noValidate className="flex flex-col gap-4" aria-busy={busy}>
            <AuthField
              ref={emailRef}
              label="Email address"
              error={problem.email}
              testId="input-sign-in-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PasswordField
              ref={passwordRef}
              label="Password"
              error={problem.password}
              testId="input-sign-in-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={busy} data-testid="button-sign-in-submit">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="auth-edge"
              disabled={busy}
              onClick={startEmailCode}
              data-testid="button-sign-in-email-code"
            >
              Email me a sign-in code
            </Button>
          </form>
        </>
      ) : (
        <CodeStep
          key={step}
          email={email.trim()}
          busy={busy}
          error={problem.code}
          onSubmit={verifyCode}
          onResend={resendCode}
          onStartOver={startOver}
          submitLabel={step === "client-trust" ? "Verify this device" : "Sign in"}
        />
      )}
      <p className="text-center text-sm">
        <Link href={standardFormHref("/sign-up")} data-testid="link-sign-in-create-account">
          Create an account
        </Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Having trouble?{" "}
        <Link href={standardFormHref("/sign-in")} data-testid="link-sign-in-standard-form">
          Use the standard sign-in form
        </Link>
      </p>
    </div>
  );
}
