import type { ReactNode } from "react";
import "@/styles/parity-pages.css";

interface ParityTaxonomyListingProps {
  children: ReactNode;
  level: "category" | "subcategory" | "sub-subcategory";
}

export function ParityTaxonomyListing({ children, level }: ParityTaxonomyListingProps) {
  return (
    <div className={`parity-page parity-taxonomy-page parity-taxonomy-${level}`}>
      {children}
    </div>
  );
}