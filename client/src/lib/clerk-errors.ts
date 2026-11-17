import { OFFLINE_MESSAGE } from "@/lib/apiError";

/** Where an auth error is shown: under one field, or in the form's alert. */
export type AuthErrorTarget = "email" | "password" | "code" | "global";

export interface AuthErrorView {
  target: AuthErrorTarget;
  message: string;
}

/** The slice of Clerk's error object the mapping reads. */
export interface ClerkErrorLike {
  code: string;
  message: string;
  longMessage?: string;
}

/** Clerk codes that mean the visitor is already signed in: not a failure. */
const ALREADY_SIGNED_IN = new Set(["session_exists", "identifier_already_signed_in"]);

export function isAlreadySignedIn(error: ClerkErrorLike): boolean {
  return ALREADY_SIGNED_IN.has(error.code);
}

/**
 * Sign-in error code to the field that owns it and the copy shown there.
 * An unmapped code falls through to Clerk's own message in the form alert.
 */
export function describeSignInError(error: ClerkErrorLike): AuthErrorView {
  switch (error.code) {
    case "form_identifier_not_found":
      return { target: "email", message: "No account uses this email. Check it, or create an account." };
    case "form_param_format_invalid":
      return { target: "email", message: "Enter an email address like name@example.com." };
    case "form_password_incorrect":
      return { target: "password", message: "That password is incorrect. Try again, or reset it." };
    case "form_password_pwned":
      return {
        target: "password",
        message: "This password appeared in a data breach. Reset it to sign in.",
      };
    case "strategy_for_user_invalid":
      return {
        target: "password",
        message: "This account has no password. Use the button you signed up with, or email yourself a code.",
      };
    case "form_code_incorrect":
      return { target: "code", message: "That code is incorrect. Check the email and try again." };
    case "verification_expired":
      return { target: "code", message: "That code expired. Send a new one." };
    case "verification_failed":
      return { target: "code", message: "Too many tries. Send a new code." };
    case "too_many_requests":
      return { target: "global", message: "Too many attempts. Wait a minute and try again." };
    case "network_error":
      return { target: "global", message: OFFLINE_MESSAGE };
    default:
      return { target: "global", message: error.longMessage ?? error.message };
  }
}
