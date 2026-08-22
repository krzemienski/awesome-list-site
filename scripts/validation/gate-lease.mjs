// Cross-process serialization for DB-sensitive validation gates, mirroring
// playwright-launch-lease.mjs. The completion runner starts every gate in
// parallel; the catalog-database-resilience gate takes a REAL ACCESS EXCLUSIVE
// table lock mid-run, which 503s any crawl-style gate in flight (seo-snapshot,
// search-typos) and their queued backlog then breaks resilience's own recovery
// assertion. Gates that either cause or cannot tolerate a DB outage acquire an
// exclusive lease in the same group so the outage never overlaps a crawl.
// Crashed holders are reclaimed via pid-liveness, same as the browser lease.
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const LEASE_ROOT = "/tmp/validation/gate-leases";
const WAIT_TIMEOUT_MS = 20 * 60 * 1000;
const STALE_LEASE_MS = 15 * 60 * 1000;
const INCOMPLETE_LEASE_GRACE_MS = 5 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function leaseIsStale(leasePath) {
  try {
    const metadata = JSON.parse(fs.readFileSync(leasePath, "utf8"));
    if (Number.isInteger(metadata.pid)) {
      try {
        process.kill(metadata.pid, 0);
        return false;
      } catch (error) {
        if (error?.code === "EPERM") return false;
        if (error?.code === "ESRCH") return true;
      }
    }
    return Date.now() - fs.statSync(leasePath).mtimeMs > STALE_LEASE_MS;
  } catch {
    try {
      return Date.now() - fs.statSync(leasePath).mtimeMs > INCOMPLETE_LEASE_GRACE_MS;
    } catch (error) {
      return error?.code !== "ENOENT";
    }
  }
}

function removeLease(leasePath, token) {
  try {
    const metadata = JSON.parse(fs.readFileSync(leasePath, "utf8"));
    if (token && metadata.token !== token) return;
  } catch (error) {
    if (error?.code === "ENOENT") return;
    if (token) return;
  }
  fs.rmSync(leasePath, { force: true });
}

/**
 * Acquire the exclusive lease for `group` (e.g. "db-heavy"). Returns a
 * release() function. Blocks up to 20 minutes; stale/crashed holders are
 * reclaimed automatically.
 */
export async function acquireGateLease(group, label) {
  const groupDir = path.join(LEASE_ROOT, group);
  fs.mkdirSync(groupDir, { recursive: true });
  const leasePath = path.join(groupDir, "slot-0.json");
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const token = randomUUID();
    let leaseFile;
    try {
      leaseFile = fs.openSync(leasePath, "wx");
      fs.writeFileSync(
        leaseFile,
        JSON.stringify({ pid: process.pid, token, label, acquiredAt: new Date().toISOString() }),
      );
      fs.closeSync(leaseFile);
      console.log(`Gate lease acquired (${group}: ${label})`);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        removeLease(leasePath, token);
        console.log(`Gate lease released (${group}: ${label})`);
      };
    } catch (error) {
      if (leaseFile !== undefined) {
        try { fs.closeSync(leaseFile); } catch {}
      }
      if (error?.code !== "EEXIST") throw error;
      if (leaseIsStale(leasePath)) removeLease(leasePath);
    }
    await sleep(1000);
  }

  throw new Error(
    `Timed out waiting for the "${group}" gate lease after ${WAIT_TIMEOUT_MS / 60000} minutes. ` +
      "Another DB-sensitive gate may be stalled.",
  );
}
