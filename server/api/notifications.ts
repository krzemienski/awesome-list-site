import type { Express, RequestHandler } from "express";
import { notificationPreferencesUpdateSchema } from "@shared/notifications";
import { parseIntInRange } from "@shared/validation";
import {
  getDigestQueueHealth,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectDigestContent,
  unsubscribeDigestToken,
  updateNotificationPreferences,
} from "../services/digestService";

type AuthedRequest = Parameters<RequestHandler>[0] & {
  user?: { claims?: { sub?: string } };
};

function userIdOf(request: AuthedRequest): string {
  return String(request.user?.claims?.sub ?? "");
}

function unsubscribePage(success: boolean): string {
  const title = success ? "Email digests unsubscribed" : "Link unavailable";
  const body = success
    ? "You will no longer receive Awesome Video email digests. In-app reminders were not changed."
    : "This unsubscribe link is invalid or expired. You can still change reminder settings after signing in.";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} · Awesome Video</title>
<style>body{margin:0;background:#080706;color:#f4f3ee;font:16px/1.6 system-ui,sans-serif}.card{max-width:620px;margin:12vh auto;padding:32px;border:1px solid #37322e;background:#11100e}.eyebrow{color:#ff5266;text-transform:uppercase;letter-spacing:.12em;font-size:12px}h1{font-size:32px;line-height:1.1}a{display:inline-block;margin-top:14px;color:#fff;background:#c92f43;padding:11px 16px;text-decoration:none;font-weight:700}</style>
</head><body><main class="card"><p class="eyebrow">Awesome Video</p><h1>${title}</h1><p>${body}</p><a href="/settings">Open Settings</a></main></body></html>`;
}

function unsubscribeConfirmationPage(token: string): string {
  const action = `/unsubscribe/digest/${encodeURIComponent(token)}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Unsubscribe from email digests · Awesome Video</title>
<style>body{margin:0;background:#080706;color:#f4f3ee;font:16px/1.6 system-ui,sans-serif}.card{max-width:620px;margin:12vh auto;padding:32px;border:1px solid #37322e;background:#11100e}.eyebrow{color:#ff5266;text-transform:uppercase;letter-spacing:.12em;font-size:12px}h1{font-size:32px;line-height:1.1}button{min-height:44px;margin-top:14px;color:#fff;background:#c92f43;border:0;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer}</style>
</head><body><main class="card"><p class="eyebrow">Awesome Video</p><h1>Unsubscribe from email digests?</h1><p>This stops email digests only. In-app reminders will not change.</p><form method="post" action="${action}"><button type="submit">Unsubscribe from email digests</button></form></main></body></html>`;
}

export function registerNotificationRoutes(
  app: Express,
  isAuthenticated: RequestHandler,
  isAdmin: RequestHandler,
): void {
  app.get(
    "/api/notification-preferences",
    isAuthenticated,
    async (request: AuthedRequest, response) => {
      response.set("Cache-Control", "no-store");
      response.json(await getNotificationPreferences(userIdOf(request)));
    },
  );

  app.put(
    "/api/notification-preferences",
    isAuthenticated,
    async (request: AuthedRequest, response) => {
      const parsed = notificationPreferencesUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.status(400).json({
          message: "Check your reminder settings and try again.",
          errors: parsed.error.flatten().fieldErrors,
        });
      }
      try {
        const saved = await updateNotificationPreferences(
          userIdOf(request),
          parsed.data,
        );
        response.set("Cache-Control", "no-store");
        return response.json(saved);
      } catch (error) {
        const code = error instanceof Error ? error.message : "unknown";
        if (code === "invalid_timezone") {
          return response
            .status(400)
            .json({ message: "Choose a valid IANA time zone." });
        }
        if (code === "pause_too_long") {
          return response
            .status(400)
            .json({ message: "Reminders can be paused for up to one year." });
        }
        if (code === "email_required") {
          return response.status(400).json({
            message: "Add an email address before enabling email digests.",
          });
        }
        console.error("[notifications] Failed to save preferences:", error);
        return response
          .status(500)
          .json({ message: "Could not save reminder settings." });
      }
    },
  );

  app.get(
    "/api/digests/preview",
    isAuthenticated,
    async (request: AuthedRequest, response) => {
      response.set("Cache-Control", "no-store");
      response.json(await selectDigestContent(userIdOf(request)));
    },
  );

  app.get(
    "/api/notifications",
    isAuthenticated,
    async (request: AuthedRequest, response) => {
      const rawLimit =
        typeof request.query.limit === "string" ? request.query.limit : "50";
      const limit = parseIntInRange(rawLimit, { min: 1, max: 100 });
      if (!limit) {
        return response
          .status(400)
          .json({ message: "limit must be an integer between 1 and 100" });
      }
      response.set("Cache-Control", "no-store");
      return response.json(await listNotifications(userIdOf(request), limit));
    },
  );

  app.patch(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (request: AuthedRequest, response) => {
      const id = parseIntInRange(request.params.id, {
        min: 1,
        max: 2_147_483_647,
      });
      if (!id) {
        return response.status(400).json({ message: "Invalid notification ID" });
      }
      const found = await markNotificationRead(userIdOf(request), id);
      return found
        ? response.json({ id, read: true })
        : response.status(404).json({ message: "Notification not found" });
    },
  );

  app.post(
    "/api/notifications/read-all",
    isAuthenticated,
    async (request: AuthedRequest, response) => {
      const updated = await markAllNotificationsRead(userIdOf(request));
      response.json({ updated });
    },
  );

  app.get("/unsubscribe/digest/:token", (request, response) => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(request.params.token)) {
      return response
        .status(400)
        .set("Cache-Control", "no-store")
        .type("html")
        .send(unsubscribePage(false));
    }
    return response
      .status(200)
      .set("Cache-Control", "no-store")
      .type("html")
      .send(unsubscribeConfirmationPage(request.params.token));
  });
  app.post("/unsubscribe/digest/:token", async (request, response) => {
    const success = await unsubscribeDigestToken(request.params.token);
    return response
      .status(success ? 200 : 410)
      .set("Cache-Control", "no-store")
      .type("html")
      .send(unsubscribePage(success));
  });

  app.get(
    "/api/admin/digests/health",
    isAuthenticated,
    isAdmin,
    async (_request, response) => {
      response.set("Cache-Control", "no-store");
      response.json(await getDigestQueueHealth());
    },
  );
}