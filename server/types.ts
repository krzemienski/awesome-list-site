/**
 * Type augmentations for Express.
 *
 * Task #307 (Clerk migration): the Passport-era `Express.User` augmentation is
 * gone — request identity now lives on `req.dbUser` / `req.clerkIdentity`,
 * declared in server/clerkAuth.ts.
 */
export {};
