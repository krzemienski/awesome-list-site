/**
 * Shared transactional email transport.
 *
 * Gmail is reached through the Replit connector, which owns OAuth credentials
 * and refresh. Callers receive an explicit delivered/unavailable/failed result:
 * there is no success-shaped fallback. Password reset keeps its historical
 * development-only console link, while digests never do.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";

const FROM_NAME = "Awesome Video";

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  messageId?: string;
  unsubscribeUrl?: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  status: "delivered" | "unavailable" | "failed" | "delivery_unknown";
  providerMessageId?: string;
  errorCode?: string;
}

function base64url(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function buildMimeMessage(message: TransactionalEmail): string {
  const boundary = `bnd_${crypto.randomUUID().replace(/-/g, "")}`;
  const headers = [
    `To: ${singleLine(message.to)}`,
    `Subject: ${singleLine(message.subject)}`,
    ...(message.messageId
      ? [`Message-ID: <${singleLine(message.messageId)}@awesome.video>`]
      : []),
    ...(message.unsubscribeUrl
      ? [
          `List-Unsubscribe: <${singleLine(message.unsubscribeUrl)}>`,
          "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
        ]
      : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  return [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    message.html,
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function classifyTransportError(error: unknown): EmailDeliveryResult {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /Cannot find package|module not found|not connected|unauthori[sz]ed|401|403|identity|connector/i.test(
      message,
    )
  ) {
    return {
      delivered: false,
      status: "unavailable",
      errorCode: "transport_unavailable",
    };
  }
  // Once the proxy request starts, a thrown network/timeout error cannot prove
  // Gmail rejected the message. Never retry an ambiguous outcome.
  return {
    delivered: false,
    status: "delivery_unknown",
    errorCode: "transport_delivery_unknown",
  };
}

function classifyProviderResponse(status: number): EmailDeliveryResult {
  if (status === 401 || status === 403) {
    return {
      delivered: false,
      status: "unavailable",
      errorCode: "transport_unavailable",
    };
  }
  if (status === 429) {
    return {
      delivered: false,
      status: "failed",
      errorCode: "transport_rate_limited",
    };
  }
  return {
    delivered: false,
    status: "failed",
    errorCode: "transport_send_failed",
  };
}

export async function sendTransactionalEmail(
  message: TransactionalEmail,
): Promise<EmailDeliveryResult> {
  try {
    const connectors = new ReplitConnectors();
    const raw = base64url(buildMimeMessage(message));
    const response = await connectors.proxy(
      "google-mail",
      "/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );
    if (!response.ok) {
      return classifyProviderResponse(response.status);
    }
    const payload = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    if (!payload?.id) {
      return {
        delivered: false,
        status: "delivery_unknown",
        errorCode: "transport_missing_provider_receipt",
      };
    }
    return {
      delivered: true,
      status: "delivered",
      providerMessageId: payload.id,
    };
  } catch (error) {
    return classifyTransportError(error);
  }
}

export async function probeEmailTransport(): Promise<{
  available: boolean;
  errorCode?: string;
}> {
  try {
    const connectors = new ReplitConnectors();
    // gmail.send is sufficient for delivery but does not grant users.getProfile;
    // probing that endpoint therefore reports a healthy send-only connection as
    // unavailable. Connector health is the non-sending readiness check.
    const connections = await connectors.listConnections({
      connector_names: "google-mail",
      refresh_policy: "auto",
    });
    const healthy = connections.some(
      (connection) =>
        connection.connector_name === "google-mail" &&
        (!connection.status ||
          connection.status === "healthy" ||
          connection.status === "active"),
    );
    if (!healthy) {
      throw new Error("Gmail connector is not connected or healthy");
    }
    return { available: true };
  } catch (error) {
    return {
      available: false,
      errorCode: "transport_unavailable",
    };
  }
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

  const result = await sendTransactionalEmail({ to, subject, html, text });
  if (!result.delivered) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] Password reset link for ${to}: ${resetUrl}`);
    } else {
      console.warn(
        `[email] Password reset email NOT sent (${result.errorCode ?? "unknown"})`,
      );
    }
  }
  return { delivered: result.delivered };
}