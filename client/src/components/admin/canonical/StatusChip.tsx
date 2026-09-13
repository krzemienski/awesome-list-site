import { cn } from "@/lib/utils";

type StatusTone = "ok" | "warn" | "bad" | "muted";

export interface StatusChipProps {
  status: string;
  label?: string;
  dot?: boolean;
  className?: string;
}

const STATUS_TONES: Record<string, StatusTone> = {
  ok: "ok",
  ready: "ok",
  healthy: "ok",
  completed: "ok",
  approved: "ok",
  success: "ok",
  warn: "warn",
  warning: "warn",
  pending: "warn",
  processing: "warn",
  active: "warn",
  degraded: "warn",
  bad: "bad",
  failed: "bad",
  error: "bad",
  unavailable: "bad",
  rejected: "bad",
  cancelled: "muted",
  canceled: "muted",
  unknown: "muted",
  muted: "muted",
};

const readableStatus = (status: string) =>
  status.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/** A DS-native status chip with the shared semantic status palette. */
export default function StatusChip({ status, label, dot = false, className }: StatusChipProps) {
  const tone = STATUS_TONES[status.toLowerCase()] ?? "muted";
  if (dot) {
    return (
      <span
        className={cn("dot", tone, className)}
        aria-label={label ?? readableStatus(status)}
        role="img"
        title={label ?? readableStatus(status)}
      />
    );
  }
  return (
    <span
      className={cn("chip admin-canonical-status-chip", tone, className)}
      data-status={status}
    >
      {label ?? readableStatus(status)}
    </span>
  );
}