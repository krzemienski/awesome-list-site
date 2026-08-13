/**
 * Shared transactional email transport.
 *
 * Gmail is reached through the Replit connector, which owns OAuth credentials
 * and refresh. Callers receive an explicit delivered/unavailable/failed result:
 * there is no success-shaped fallback.
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
