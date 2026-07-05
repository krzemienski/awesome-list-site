/**
 * Test Database URL helpers
 *
 * Provides a SINGLE, deterministic way to figure out which database the test
 * suite is allowed to touch. The rule is intentionally strict: tests must never
 * connect to the dev/prod database. We derive a dedicated, separate test
 * database from DATABASE_URL (by suffixing the database name with `_test`) so a
 * test run can never wipe live data.
 */

/**
 * Returns true when a database name looks like a dedicated test database.
 */
export function isTestDatabaseName(name: string): boolean {
  return /test/i.test(name);
}

/**
 * Extract the database name from a postgres connection string.
 */
export function getDatabaseName(connectionString: string): string {
  const url = new URL(connectionString);
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

/**
 * Derive the dedicated test database URL from the raw DATABASE_URL.
 *
 * - If TEST_DATABASE_URL is explicitly set, it wins (must itself be a test DB).
 * - If DATABASE_URL already points at a database whose name contains "test",
 *   it is used as-is.
 * - Otherwise we append `_test` to the database name so we get a separate
 *   database on the same server (e.g. `heliumdb` -> `heliumdb_test`).
 *
 * Throws a hard error if there is no usable DATABASE_URL, so the suite refuses
 * to run rather than silently connecting somewhere dangerous.
 */
export function deriveTestDatabaseUrl(rawUrl = process.env.DATABASE_URL): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) {
    const name = getDatabaseName(explicit);
    if (!isTestDatabaseName(name)) {
      throw new Error(
        `TEST_DATABASE_URL points at database "${name}", which is not a dedicated ` +
          `test database (its name must contain "test"). Refusing to run tests.`,
      );
    }
    return explicit;
  }

  if (!rawUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Cannot derive a test database.',
    );
  }

  const name = getDatabaseName(rawUrl);
  if (!name) {
    throw new Error(`Could not determine the database name from DATABASE_URL. Refusing to run tests.`);
  }

  if (isTestDatabaseName(name)) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  url.pathname = `/${name}_test`;
  return url.toString();
}

/**
 * Derive the maintenance connection URL (points at the `postgres` database on
 * the same server) used to CREATE the test database.
 */
export function deriveMaintenanceUrl(rawUrl = process.env.DATABASE_URL): string {
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }
  const url = new URL(rawUrl);
  url.pathname = '/postgres';
  return url.toString();
}
