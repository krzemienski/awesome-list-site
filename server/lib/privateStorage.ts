/**
 * The project's private App Storage bucket (Replit Object Storage).
 *
 * `PRIVATE_OBJECT_DIR` is "/<bucket>/<dir>"; object names are bucket-relative.
 * Each feature keeps its objects under its own subdirectory of that private
 * directory (database backups, the latest validation results), and nothing here
 * is ever served over HTTP.
 */
import { Client as ObjectStorageClient } from "@replit/object-storage";

export type StorageEnvironment = "production" | "development";

export type PrivateStorageErrorReason = "unconfigured" | "misconfigured";

export class PrivateStorageError extends Error {
  constructor(
    message: string,
    readonly reason: PrivateStorageErrorReason,
  ) {
    super(message);
    this.name = "PrivateStorageError";
  }
}

export interface PrivateStorage {
  client: ObjectStorageClient;
  /** Bucket-relative object-name prefix, ending in "/". */
  prefix: string;
}

export function storageEnvironment(): StorageEnvironment {
  return process.env.REPLIT_DEPLOYMENT === "1" ? "production" : "development";
}

export function isPrivateStorageConfigured(): boolean {
  return Boolean(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID && process.env.PRIVATE_OBJECT_DIR);
}

export function resolvePrivateStorage(subdir: string): PrivateStorage {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!bucketId || !privateDir) {
    throw new PrivateStorageError(
      "The private App Storage bucket (DEFAULT_OBJECT_STORAGE_BUCKET_ID / PRIVATE_OBJECT_DIR) is missing.",
      "unconfigured",
    );
  }
  const segments = privateDir.split("/").filter(Boolean);
  if (segments[0] === bucketId) segments.shift();
  if (segments.length === 0) {
    throw new PrivateStorageError("PRIVATE_OBJECT_DIR names no private directory.", "misconfigured");
  }
  return {
    client: new ObjectStorageClient({ bucketId }),
    prefix: `${segments.join("/")}/${subdir}/`,
  };
}
