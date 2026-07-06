import crypto from "crypto";

/**
 * AES-256-GCM encryption for per-run agent auth tokens (custom Anthropic-compatible
 * bearer tokens) so they are never stored in plaintext at rest.
 *
 * The key is derived by SHA-256 hashing the CONFIG_ENCRYPTION_KEY secret, so any
 * sufficiently-random passphrase works as the secret (it does not need to be exactly
 * 32 bytes). The packed ciphertext format is `ivHex:tagHex:cipherHex`.
 */

const ALGO = "aes-256-gcm";
const MIN_SECRET_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.CONFIG_ENCRYPTION_KEY;
  if (!secret || secret.length < MIN_SECRET_LEN) {
    throw new Error(
      "CONFIG_ENCRYPTION_KEY is not set (or is too short). Set it as a Replit secret " +
        "(a long random string) to enable encrypted storage of custom agent auth tokens."
    );
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/** Whether encryption is currently possible (secret present). Used to gate the token UI/field. */
export function isConfigEncryptionAvailable(): boolean {
  const secret = process.env.CONFIG_ENCRYPTION_KEY;
  return !!secret && secret.length >= MIN_SECRET_LEN;
}

export function encryptAuthToken(plaintext: string): { encrypted: string; last4: string } {
  if (!plaintext) throw new Error("Cannot encrypt an empty auth token");
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const encrypted = [iv.toString("hex"), tag.toString("hex"), ct.toString("hex")].join(":");
  const last4 = plaintext.slice(-4);
  return { encrypted, last4 };
}

export function decryptAuthToken(packed: string): string {
  const key = getKey();
  const parts = packed.split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted auth token");
  const [ivHex, tagHex, ctHex] = parts;
  if (!ivHex || !tagHex || !ctHex) throw new Error("Malformed encrypted auth token");
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]);
  return pt.toString("utf8");
}
