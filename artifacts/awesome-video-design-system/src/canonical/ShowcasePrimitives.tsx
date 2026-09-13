import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";

type ClassToken = string | false | null | undefined;

function classNames(...tokens: ClassToken[]): string | undefined {
  const value = tokens.filter(Boolean).join(" ");
  return value || undefined;
}

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** The visual modifier used by the canonical `.btn` styles. */
  variant?: ButtonVariant;
  /** Renders the square `.btn.icon` treatment. */
  icon?: boolean;
  className?: string;
}

/**
 * Canonical action control. The default variant intentionally emits only
 * `.btn`, matching the frozen showcase markup.
 */
export function Button({
  variant = "default",
  icon = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "btn",
        variant !== "default" && variant,
        icon && "icon",
        className,
      )}
    >
      {children}
    </button>
  );
}

export type ChipVariant = "default" | "accent" | "ok" | "warn" | "bad" | "muted";

export interface ChipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  variant?: ChipVariant;
  className?: string;
}

/** Canonical compact status/category label. */
export function Chip({
  variant = "default",
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      {...props}
      className={classNames(
        "chip",
        variant !== "default" && variant,
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface CardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  /** Adds the canonical hover affordance. */
  hoverable?: boolean;
  /** Adds the canonical accent glow on hover. */
  glow?: boolean;
  className?: string;
}

/** Canonical surface container. */
export function Card({
  hoverable = false,
  glow = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={classNames(
        "card",
        hoverable && "hoverable",
        glow && "glow",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface StatProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  className?: string;
  children?: never;
}

/** Canonical admin-style statistic card from the frozen reference. */
export function Stat({
  label,
  value,
  sub,
  accent = false,
  className,
  style,
  ...props
}: StatProps) {
  return (
    <div
      {...props}
      className={classNames("card", className)}
      style={{ padding: 20, ...style }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 1.4,
          color: "var(--text-3)",
          marginBottom: 10,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: -1,
          lineHeight: 1,
          color: accent ? "var(--accent)" : "var(--text)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-2)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export interface EyebrowProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  className?: string;
}

/** Canonical mono section label. */
export function Eyebrow({
  className,
  style,
  children,
  ...props
}: EyebrowProps) {
  return (
    <div
      {...props}
      className={classNames("eyebrow", className)}
      style={{ marginBottom: 14, ...style }}
    >
      {children}
    </div>
  );
}

export interface KbdProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  className?: string;
}

/** Canonical keyboard shortcut label. */
export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <span {...props} className={classNames("kbd", className)}>
      {children}
    </span>
  );
}

export type DotStatus = "ok" | "warn" | "bad";

export interface DotProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  status?: DotStatus;
  className?: string;
}

/** Canonical compact status indicator. */
export function Dot({ status, className, ...props }: DotProps) {
  return (
    <span
      {...props}
      className={classNames("dot", status, className)}
    />
  );
}

export interface TableShellProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "title" | "children" | "className" | "style"
  > {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Canonical card-backed table frame from the frozen admin reference. */
export function TableShell({
  title,
  sub,
  actions,
  children,
  className,
  style,
  ...props
}: TableShellProps) {
  return (
    <div
      {...props}
      className={classNames("card", className)}
      style={{ padding: 0, overflow: "hidden", ...style }}
    >
      <div
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>
          {sub && (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              {sub}
            </p>
          )}
        </div>
        {actions}
      </div>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}