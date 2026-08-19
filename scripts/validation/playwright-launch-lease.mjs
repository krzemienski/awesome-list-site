// Coordinates Chromium-heavy validation scripts that the release runner starts
// in separate processes. A single browser is deliberate: this environment can
// exhaust its thread limit before four simultaneous Chromium launches succeed.
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const LEASE_ROOT = "/tmp/validation/playwright-launch-leases";
const DEFAULT_MAX_BROWSERS = 1;
const WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_LEASE_MS = 15 * 60 * 1000;
const INCOMPLETE_LEASE_GRACE_MS = 5 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function configuredLimit() {
  const value = Number.parseInt(process.env.PLAYWRIGHT_AUDIT_CONCURRENCY ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_BROWSERS;
}

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

async function acquireLease(label) {
  fs.mkdirSync(LEASE_ROOT, { recursive: true });
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  const slots = configuredLimit();

  while (Date.now() < deadline) {
    for (let slot = 0; slot < slots; slot++) {
      const leasePath = path.join(LEASE_ROOT, `slot-${slot}.json`);
      const token = randomUUID();
      let leaseFile;
      try {
        leaseFile = fs.openSync(leasePath, "wx");
        fs.writeFileSync(
          leaseFile,
          JSON.stringify({ pid: process.pid, token, label, acquiredAt: new Date().toISOString() }),
        );
        fs.closeSync(leaseFile);
        console.log(`Playwright lease acquired (${label}, slot ${slot + 1}/${slots})`);
        return () => removeLease(leasePath, token);
      } catch (error) {
        if (leaseFile !== undefined) {
          try { fs.closeSync(leaseFile); } catch {}
        }
        if (error?.code !== "EEXIST") throw error;
        if (leaseIsStale(leasePath)) removeLease(leasePath);
      }
    }
    await sleep(500);
  }

  throw new Error(
    `Timed out waiting for a Playwright browser lease after ${WAIT_TIMEOUT_MS / 60000} minutes. ` +
      "Another browser audit may be stalled.",
  );
}

export async function launchBrowserWithLease(chromium, launchOptions, label) {
  const release = await acquireLease(label);
  try {
    const browser = await chromium.launch(launchOptions);
    const close = browser.close.bind(browser);
    let released = false;
    const releaseOnce = () => {
      if (!released) {
        released = true;
        release();
        console.log(`Playwright lease released (${label})`);
      }
    };
    browser.close = async (...args) => {
      try {
        return await close(...args);
      } finally {
        releaseOnce();
      }
    };
    return browser;
  } catch (error) {
    release();
    throw error;
  }
}