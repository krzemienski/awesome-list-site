/**
 * Transactional email transport for password-reset links.
 *
 * Real transport: Gmail via the Replit Gmail connection ("google-mail") using
 * the @replit/connectors-sdk proxy → POST /gmail/v1/users/me/messages/send.
 * The connection handles OAuth token refresh automatically; we never store
 * credentials. The SDK/package is only present after the integration is added,
 * so it is imported LAZILY inside the send path — the server must boot fine
 * before the integration is connected.
 *
 * Fallback (transport unavailable — e.g. local dev before the integration is
 * bound, or a send error): we never leak account existence to the caller. In
 * development we log the reset link to the server console so the flow is
 * testable end-to-end; in production we log a loud warning (never the token) so
 * a missing integration is visible. The calling endpoint always returns a
 * generic 200 regardless of delivery outcome.
 */

const FROM_NAME = "Awesome Video";

function base64url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMimeMessage(to: string, subject: string, html: string, text: string): string {
  const boundary = "bnd_" + Math.random().toString(36).slice(2);
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<{ delivered: boolean }> {
  const subject = `Reset your ${FROM_NAME} password`;
  const text =
    `We received a request to reset your ${FROM_NAME} password.\n\n` +
    `Reset it using the link below (it expires in 1 hour):\n${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email — your password won't change.`;
  const html =
    `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:520px;margin:0 auto;padding:24px">` +
    `<h2 style="margin:0 0 12px">Reset your ${FROM_NAME} password</h2>` +
    `<p>We received a request to reset your password. This link expires in <strong>1 hour</strong>.</p>` +
    `<p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;font-weight:600">Reset password</a></p>` +
    `<p style="color:#555;font-size:13px;word-break:break-all">Or paste this URL into your browser:<br>${resetUrl}</p>` +
    `<p style="color:#888;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email — your password won't change.</p>` +
    `</body></html>`;

  try {
    // Lazy import: the package only exists once the Gmail integration is added.
    const { ReplitConnectors } = await import("@replit/connectors-sdk");
    const connectors = new ReplitConnectors();
    const raw = base64url(buildMimeMessage(to, subject, html, text));
    const resp: any = await connectors.proxy(
      "google-mail",
      "/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );
    if (!resp?.ok) {
      const body = typeof resp?.text === "function" ? await resp.text().catch(() => "") : "";
      throw new Error(`Gmail send failed: ${resp?.status} ${String(body).slice(0, 200)}`);
    }
    return { delivered: true };
  } catch (err) {
    // Transport not configured or send failed — degrade without leaking to the
    // caller. Surface enough for operators; only surface the token in dev.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] Password reset link for ${to}: ${resetUrl}`);
    } else {
      console.warn(
        `[email] Password reset email NOT sent to ${to} — transport unavailable:`,
        (err as Error)?.message,
      );
    }
    return { delivered: false };
  }
}
