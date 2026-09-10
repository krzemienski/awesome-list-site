import type { ElementType, HTMLAttributes, ReactNode } from "react";
import "@/styles/parity-pages.css";

interface ParityPageProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export function ParityPage({ as: Component = "div", className = "", children, ...props }: ParityPageProps) {
  return (
    <Component className={`parity-page ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}