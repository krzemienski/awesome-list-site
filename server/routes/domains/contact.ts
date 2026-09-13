/**
 * ============================================================================
 * ROUTES/DOMAINS/CONTACT.TS - Default-off contact endpoints
 * ============================================================================
 *
 * Backend for the five build-time contact variants (docs/CONTACT-VARIANTS.md):
 *
 *   GET  /api/config                    public destinations derived ONLY from
 *                                       server config/env (no secret leaves the
 *                                       server); every destination is
 *                                       unavailable until configured
 *   POST /api/contact                   persisted in-app form; 404 unless
 *                                       CONTACT_ENABLED=true, 503 while enabled
 *                                       but missing CONTACT_IP_HASH_SECRET
 *   GET  /api/admin/contact-submissions admin-only inbox listing
 *
 * Submission chain: enabled/ready gate → same-origin check → 5/hour/IP
 * limiter (shared PostgreSQL store, own `contact:` prefix) → Zod validation →
 * honeypot short-circuit → persistence. The raw sender IP is never written;
 * only a keyed HMAC of it is.
 * ============================================================================
 */
import { createHmac, randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import type { Express, Request, RequestHandler } from "express";
import {
  contactSubmissionSchema,
  isHoneypotTriggered,
  type ContactSubmissionInput,
} from "@shared/contact";
import { parseIntInRange } from "@shared/validation";
import type { ContactRepository } from "../../repositories";
import { config } from "../../config";
import { validateBody } from "../../validation/inputs";
import { negotiated429Handler } from "../../middleware/rateLimit";
import { PgRateLimitStore } from "../../middleware/pgRateLimitStore";
import { isDatabaseUnavailableError } from "../../db/errors";

export interface ContactRoutesContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
  contactRepo: ContactRepository;
}

/** Limits documented in docs/CONTACT-VARIANTS.md ("Backend"). */
export const CONTACT_RATE_LIMIT = { windowMs: 60 * 60 * 1000, limit: 5 } as const;
export const CONTACT_LIST_MAX_LIMIT = 500;
const CONTACT_LIST_DEFAULT_LIMIT = 50;

interface ContactLinkEntry {
  available: boolean;
  href?: string;
  unavailableReason?: string;
}

interface ContactFormEntry {
  available: boolean;
  persistence?: "database";
  unavailableReason?: string;
}

function unavailable(reason: string): ContactLinkEntry {
  return { available: false, unavailableReason: reason };
}

function validatedHref(value: string | undefined, protocol: "https:" | "mailto:"): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === protocol ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function configuredEmail(): ContactLinkEntry {
  const href = validatedHref(config.contact.email, "mailto:");
  return href ? { available: true, href } : unavailable("No contact email is configured");
}

/**
 * Issues are offered only when an issue tracker is configured explicitly
 * (CONTACT_ISSUES_URL or the YAML `issues_url`). Deriving one from
 * `source.url` would advertise a tracker nobody opted into — with the built-in
 * awesome-go default it would even point at a stranger's repository.
 */
function configuredIssues(): ContactLinkEntry {
  const href = validatedHref(config.contact.issues_url, "https:");
  return href ? { available: true, href } : unavailable("No issue tracker is configured");
}

/** Discussions need both a URL and the explicit "verified enabled" flag. */
function configuredDiscussions(): ContactLinkEntry {
  const href = config.contact.discussions_verified
    ? validatedHref(config.contact.discussions_url, "https:")
    : undefined;
  return href
    ? { available: true, href }
    : unavailable("No verified discussions destination is configured");
}

function configuredSourceRepository(): { repoUrl: string; repoBranch: string } {
  const parsed = new URL(config.source.url);
  if (parsed.hostname !== "raw.githubusercontent.com") {
    throw new Error("The configured source URL is not a raw GitHub repository URL");
  }
  const [owner, repo, branch] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !repo || !branch) {
    throw new Error("The configured source URL is missing its GitHub owner, repository, or branch");
  }
  return {
    repoUrl: `https://github.com/${owner}/${repo}`,
    repoBranch: branch,
  };
}

function isFormReady(): boolean {
  return config.contact.enabled && config.contact.ip_hash_secret.length > 0;
}

function configuredForm(): ContactFormEntry {
  if (!config.contact.enabled) {
    return { available: false, unavailableReason: "The contact form is disabled" };
  }
  if (!isFormReady()) {
    return { available: false, unavailableReason: "The contact form is not fully configured" };
  }
  return { available: true, persistence: "database" };
}

/**
 * Gate order matters: a disabled deployment must look exactly like a
 * deployment without the feature (404, before any Origin or limiter work),
 * while an enabled-but-misconfigured one is an explicit server-side failure.
 */
const contactAvailable: RequestHandler = (_req, res, next) => {
  if (!config.contact.enabled) {
    return res.status(404).json({ message: "Not found" });
  }
  if (!isFormReady()) {
    return res.status(503).json({ message: "Contact form is not fully configured" });
  }
  next();
};

/**
 * Route-level same-origin check (mirrors the global mutating-request guard in
 * server/index.ts so the rule also holds for in-process test apps): reject a
 * declared cross-site fetch, require an Origin, and compare complete origins
 * (scheme + host + effective port) against the request origin or the
 * canonical PUBLIC_SITE_URL.
 */
const contactSameOrigin: RequestHandler = (req, res, next) => {
  if (req.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    return res.status(403).json({ message: "Cross-origin request rejected" });
  }
  const origin = req.headers.origin;
  if (!origin) return res.status(403).json({ message: "A same-origin request is required" });
  try {
    const requestProtocol =
      req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim().toLowerCase() ||
      req.protocol;
    const requestHost = req.get("host");
    if (!requestHost) throw new Error("Missing host");
    const supplied = new URL(origin);
    const requestOrigin = new URL(`${requestProtocol}://${requestHost}`);
    const publicOrigin = new URL(process.env.PUBLIC_SITE_URL || "https://awesome.video");
    if (
      (supplied.protocol === "http:" || supplied.protocol === "https:") &&
      (supplied.origin === requestOrigin.origin || supplied.origin === publicOrigin.origin)
    ) return next();
  } catch {
    // Malformed and opaque origins are rejected without reflecting input.
  }
  return res.status(403).json({ message: "Cross-origin request rejected" });
};

// Own store prefix (`contact:`) so the shared rate_limit_hits table never
// double-counts these hits against the /api backstop or any tier limiter.
const contactLimiter = rateLimit({
  windowMs: CONTACT_RATE_LIMIT.windowMs,
  limit: CONTACT_RATE_LIMIT.limit,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PgRateLimitStore("contact"),
  handler: negotiated429Handler("Too many contact requests. Please try again later."),
});

/** Express reports IPv4 clients on a dual-stack socket as ::ffff:a.b.c.d. */
function clientIp(req: Request): string {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "";
  return ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
}

/** Keyed hash: stable per deployment for abuse correlation, useless without the key. */
export function hashContactIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

function sendDatabaseFailure(
  res: import("express").Response,
  error: unknown,
  logLabel: string,
  fallbackMessage: string,
): void {
  const databaseUnavailable = isDatabaseUnavailableError(error);
  console.error(`[contact] ${logLabel}`, { databaseUnavailable });
  if (databaseUnavailable) {
    res.status(503).set("Retry-After", "1")
      .json({ message: "Contact service is temporarily unavailable" });
    return;
  }
  res.status(500).json({ message: fallbackMessage });
}

export function registerContactRoutes(app: Express, ctx: ContactRoutesContext): void {
  const { isAuthenticated, isAdmin, contactRepo } = ctx;

  if (config.contact.enabled && !isFormReady()) {
    console.error(
      "[contact] CONTACT_ENABLED=true but CONTACT_IP_HASH_SECRET is missing or shorter than 16 characters; " +
        "POST /api/contact answers 503 and /api/config reports the form unavailable until it is set.",
    );
  }

  app.get("/api/config", (_req, res) => {
    // Pure function of process config: safe to cache briefly at the edge and
    // in the browser; a redeploy is the only thing that changes it.
    res.set("Cache-Control", "public, max-age=300");
    const sourceRepository = configuredSourceRepository();
    res.json({
      site: {
        title: config.site.title,
        description: config.site.description,
        url: config.site.url,
        author: config.site.author,
        ...sourceRepository,
      },
      contact: {
        email: configuredEmail(),
        issues: configuredIssues(),
        discussions: configuredDiscussions(),
        form: configuredForm(),
      },
    });
  });

  app.post(
    "/api/contact",
    contactAvailable,
    contactSameOrigin,
    contactLimiter,
    validateBody(contactSubmissionSchema),
    async (req, res) => {
      // validateBody(contactSubmissionSchema) already parsed + replaced req.body.
      const input = req.body as ContactSubmissionInput;
      const ipHash = hashContactIp(clientIp(req), config.contact.ip_hash_secret);

      // Bots that fill the hidden field get an indistinguishable receipt and
      // nothing is stored. The limiter above has already counted the hit, so
      // a flood of trapped submissions still throttles.
      if (isHoneypotTriggered(input)) {
        console.warn("[contact] honeypot triggered; submission discarded", {
          ipHashPrefix: ipHash.slice(0, 12),
        });
        return res.json({ id: randomUUID(), status: "received" });
      }

      try {
        const created = await contactRepo.createSubmission({
          name: input.name,
          replyTo: input.replyTo,
          subject: input.subject,
          message: input.message,
          ipHash,
          userId: req.dbUser?.id ?? null,
        });
        return res.json({ id: created.id, status: "received" });
      } catch (error) {
        return sendDatabaseFailure(res, error, "persistence failed", "Could not save contact request");
      }
    },
  );

  // Admin inbox. Same pagination contract as GET /api/admin/audit-logs:
  // invalid limit/offset is a client error, the response carries the real total.
  app.get("/api/admin/contact-submissions", isAuthenticated, isAdmin, async (req, res) => {
    const rawLimit = req.query.limit as string | undefined;
    const rawOffset = req.query.offset as string | undefined;

    let limit = CONTACT_LIST_DEFAULT_LIMIT;
    if (rawLimit !== undefined) {
      const n = parseIntInRange(rawLimit, { min: 1, max: CONTACT_LIST_MAX_LIMIT });
      if (n === null) {
        return res.status(400).json({ message: `limit must be an integer between 1 and ${CONTACT_LIST_MAX_LIMIT}` });
      }
      limit = n;
    }
    let offset = 0;
    if (rawOffset !== undefined) {
      const n = parseIntInRange(rawOffset, { min: 0 });
      if (n === null) {
        return res.status(400).json({ message: "offset must be a non-negative integer" });
      }
      offset = n;
    }

    try {
      const [submissions, total] = await Promise.all([
        contactRepo.listSubmissions(limit, offset),
        contactRepo.countSubmissions(),
      ]);
      res.set("Cache-Control", "no-store");
      return res.json({ submissions, total, limit, offset });
    } catch (error) {
      return sendDatabaseFailure(res, error, "inbox listing failed", "Could not list contact submissions");
    }
  });
}
