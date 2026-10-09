/**
 * Clerk-first account deletion (admin DELETE /api/admin/users/:id).
 *
 * The local users row is keyed by the bridge id: either the legacy subject id
 * (carried on the Clerk user as externalId) or, for first-time Clerk users,
 * the Clerk-native `user_...` id itself. Deleting the Clerk user revokes every
 * session and blocks sign-in; outstanding short-lived JWTs are handled by the
 * deleted_user_tombstones check in JIT provisioning.
 *
 * Order matters (see the JIT teardown note): the Clerk identity is removed
 * BEFORE the local row, otherwise a live session re-provisions the row.
 */
import { clerkClient } from "@clerk/express";

export type ClerkIdentityOutcome =
  /** A Clerk user existed and was deleted. */
  | "deleted"
  /** No Clerk user maps to this bridge id (legacy/local-only account). */
  | "none";

export interface ClerkDeletionResult {
  outcome: ClerkIdentityOutcome;
  clerkUserId: string | null;
}

function clerkStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" ? status : undefined;
}

async function resolveClerkUserId(bridgeUserId: string): Promise<string | null> {
  if (bridgeUserId.startsWith("user_")) {
    try {
      const user = await clerkClient.users.getUser(bridgeUserId);
      return user.id;
    } catch (error) {
      if (clerkStatus(error) === 404) return null;
      throw error;
    }
  }
  const { data } = await clerkClient.users.getUserList({
    externalId: [bridgeUserId],
    limit: 2,
  });
  if (data.length > 1) {
    throw new Error(
      `Multiple Clerk users carry externalId ${bridgeUserId}; refusing to guess which to delete`,
    );
  }
  return data[0]?.id ?? null;
}

/**
 * Delete the Clerk identity behind a local bridge id. Throws when Clerk can't
 * be reached or refuses the deletion so the caller can abort BEFORE touching
 * local data (a half-deleted account would be re-created by the next request).
 */
export async function deleteClerkIdentity(bridgeUserId: string): Promise<ClerkDeletionResult> {
  const clerkUserId = await resolveClerkUserId(bridgeUserId);
  if (!clerkUserId) return { outcome: "none", clerkUserId: null };
  try {
    await clerkClient.users.deleteUser(clerkUserId);
  } catch (error) {
    // Raced with another deletion: the identity is gone either way.
    if (clerkStatus(error) !== 404) throw error;
  }
  return { outcome: "deleted", clerkUserId };
}
