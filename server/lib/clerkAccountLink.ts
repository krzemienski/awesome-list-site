/**
 * Admin reconciliation for the JIT email collision in ensureDbUser
 * (server/clerkAuth.ts). A Clerk user without an externalId bridges under its
 * own `user_...` id; when an existing row already owns its email, provisioning
 * fails closed and the visitor stays signed out of app data. Linking sets the
 * Clerk user's externalId to the existing row id, so its next session token
 * carries that row's id as `userId` and resolves to the existing account.
 *
 * Email ownership is proven by Clerk's VERIFIED primary email (read from the
 * Backend API, not from session claims), and an admin must request the link.
 */
import { clerkClient } from "@clerk/express";
import type { User } from "@shared/schema";

export type ClerkLinkRefusal =
  | "clerk_user_not_found"
  | "email_not_verified"
  | "email_mismatch"
  | "already_linked_elsewhere"
  | "external_id_taken";

export type ClerkLinkResult =
  | { ok: true; clerkUserId: string; externalId: string; changed: boolean }
  | { ok: false; reason: ClerkLinkRefusal };

function clerkStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : undefined;
}

export async function linkClerkUserToRow(target: User, clerkUserId: string): Promise<ClerkLinkResult> {
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(clerkUserId);
  } catch (error) {
    if (clerkStatus(error) === 404) return { ok: false, reason: "clerk_user_not_found" };
    throw error;
  }

  const primary = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== "verified") {
    return { ok: false, reason: "email_not_verified" };
  }
  if (primary.emailAddress.toLowerCase() !== target.email?.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }

  if (clerkUser.externalId === target.id) {
    return { ok: true, clerkUserId, externalId: target.id, changed: false };
  }
  if (clerkUser.externalId) return { ok: false, reason: "already_linked_elsewhere" };

  const { data: holders } = await clerkClient.users.getUserList({ externalId: [target.id], limit: 2 });
  if (holders.some((holder) => holder.id !== clerkUserId)) {
    return { ok: false, reason: "external_id_taken" };
  }

  await clerkClient.users.updateUser(clerkUserId, { externalId: target.id });
  return { ok: true, clerkUserId, externalId: target.id, changed: true };
}
