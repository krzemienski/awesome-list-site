import rateLimit from "express-rate-limit";
import type { Express, RequestHandler } from "express";
import { contactSubmissionSchema, type ContactSubmissionInput } from "@shared/contact";
import type { ContactRepository } from "../../repositories";
import { config } from "../../config";
import { validateBody } from "../../validation/inputs";
import { negotiated429Handler } from "../../middleware/rateLimit";
import { PgRateLimitStore } from "../../middleware/pgRateLimitStore";
import { isDatabaseUnavailableError } from "../../db/errors";

export interface ContactRoutesContext {
  contactRepo: ContactRepository;
}

interface ContactLinkEntry {
  available: boolean;
  href?: string;
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

function derivedIssuesUrl(): string | undefined {
  const explicit = validatedHref(config.contact.issues_url, "https:");
  if (explicit) return explicit;
  try {
    const source = new URL(config.source.url);
    if (source.protocol !== "https:" || source.hostname !== "raw.githubusercontent.com") return undefined;
    const [owner, repository] = source.pathname.split("/").filter(Boolean);
    if (!owner || !repository) return undefined;
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`;
  } catch {
    return undefined;
  }
}

function configuredIssues(): ContactLinkEntry {
  const href = derivedIssuesUrl();
  return href ? { available: true, href } : unavailable("No issue tracker is configured");
}

function configuredDiscussions(): ContactLinkEntry {
  const href = config.contact.discussions_verified
    ? validatedHref(config.contact.discussions_url, "https:")
    : undefined;
  return href
    ? { available: true, href }
    : unavailable("No verified discussions destination is configured");
}

const contactEnabled: RequestHandler = (_req, res, next) => {
  if (!config.contact.enabled) {
    return res.status(404).json({ message: "Not found" });
  }
  next();
};

const contactSameOrigin: RequestHandler = (req, res, next) => {
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

const contactJsonBody: RequestHandler = (req, res, next) => {
  if (!req.is("application/json")) {
    return res.status(415).json({ message: "Content-Type must be application/json" });
  }
  const declaredLength = Number(req.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 16 * 1024) {
    return res.status(413).json({ message: "Contact request is too large" });
  }
  if (Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8") > 16 * 1024) {
    return res.status(413).json({ message: "Contact request is too large" });
  }
  next();
};

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new PgRateLimitStore("contact-submit"),
  handler: negotiated429Handler("Too many contact requests. Please try again later."),
});

export function registerContactRoutes(app: Express, ctx: ContactRoutesContext): void {
  app.get("/api/config", (_req, res) => {
    res.json({
      site: {
        title: config.site.title,
        description: config.site.description,
        url: config.site.url,
        author: config.site.author,
      },
      contact: {
        email: configuredEmail(),
        issues: configuredIssues(),
        discussions: configuredDiscussions(),
        form: config.contact.enabled
          ? { available: true, persistence: "database" as const }
          : { available: false, unavailableReason: "The contact form is disabled" },
      },
    });
  });

  app.post(
    "/api/contact",
    contactEnabled,
    contactSameOrigin,
    contactLimiter,
    contactJsonBody,
    validateBody(contactSubmissionSchema),
    async (req, res) => {
      try {
        // validateBody(contactSubmissionSchema) already parsed + replaced req.body.
        const input = req.body as ContactSubmissionInput;
        const created = await ctx.contactRepo.createSubmission({
          name: input.name,
          replyTo: input.replyTo,
          subject: input.subject,
          message: input.message,
        });
        return res.json({ id: created.id, status: "received" });
      } catch (error) {
        console.error("[contact] persistence failed", {
          databaseUnavailable: isDatabaseUnavailableError(error),
        });
        if (isDatabaseUnavailableError(error)) {
          return res.status(503).set("Retry-After", "1")
            .json({ message: "Contact service is temporarily unavailable" });
        }
        return res.status(500).json({ message: "Could not save contact request" });
      }
    },
  );
}