import { useEffect, useState } from "react";
import { CanonicalDocs } from "./canonical/CanonicalDocs";
import { CanonicalAnatomy, CanonicalShowcase } from "./canonical/CanonicalShowcase";

type View = "showcase" | "anatomy" | "docs";
function readView(): View {
  const hash = decodeURIComponent(window.location.hash)
    .replace(/^#\/?/, "")
    .split(/[?&/]/, 1)[0]
    .toLowerCase();
  if (hash.startsWith("docs-")) return "docs";
  return hash === "anatomy" ? "anatomy" : "showcase";
}

export default function App() {
  const [view, setView] = useState<View>(readView);
  useEffect(() => {
    const update = () => setView(readView());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  if (view === "docs") return <CanonicalDocs />;
  if (view === "anatomy") return <CanonicalAnatomy />;
  return <CanonicalShowcase />;
}
