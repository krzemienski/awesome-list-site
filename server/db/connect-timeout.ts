// Bound on opening a NEW Neon connection. Production failures (2026-11-10..12)
// were never a full pool (poolTotal <= 4 of 8, waiting 0): the pool shrinks to
// min after 30 s idle, and the next burst needs fresh Neon connections, which
// an Autoscale instance short of CPU can take longer than 3 s to open. The app
// pool and the backup connections (lock and dump client) use it. Kept apart
// from ./index so the backup CLI can import it without building the app pool.
export const DB_CONNECT_TIMEOUT_MS = 8000;
