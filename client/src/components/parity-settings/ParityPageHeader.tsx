import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import "./parity-settings.css";

interface ParityPageHeaderProps {
  title: string;
  titleTestId?: string;
  description?: ReactNode;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: ReactNode;
  children?: ReactNode;
}

export default function ParityPageHeader({
  title,
  titleTestId,
  description,
  icon,
  backHref,
  backLabel = "Back",
  meta,
  children,
}: ParityPageHeaderProps) {
  return (
    <header className="parity-page-header">
      {backHref ? (
        <Link href={backHref} className="parity-back-link">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="parity-page-title-row">
        {icon ? <span className="parity-page-icon">{icon}</span> : null}
        <h1 className="parity-page-title" data-testid={titleTestId}>{title}</h1>
      </div>
      {description ? <p className="parity-page-description">{description}</p> : null}
      {meta ? <div className="parity-page-meta">{meta}</div> : null}
      {children}
    </header>
  );
}