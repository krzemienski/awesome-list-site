export type MigrationBootStatus =
  | "pending"
  | "running"
  | "ready"
  | "not-required"
  | "failed";

const migrationState: {
  status: MigrationBootStatus;
  completedAt?: string;
} = {
  status: "pending",
};

export function markMigrationsRunning(): void {
  migrationState.status = "running";
  delete migrationState.completedAt;
}

export function markMigrationsReady(): void {
  migrationState.status = "ready";
  migrationState.completedAt = new Date().toISOString();
}

export function markMigrationsNotRequired(): void {
  migrationState.status = "not-required";
  migrationState.completedAt = new Date().toISOString();
}

export function markMigrationsFailed(): void {
  migrationState.status = "failed";
  migrationState.completedAt = new Date().toISOString();
}

export function getMigrationBootState() {
  return { ...migrationState };
}

export function migrationsAreReady(): boolean {
  return (
    migrationState.status === "ready" || migrationState.status === "not-required"
  );
}