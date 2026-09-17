import { useEffect, useState } from "react";
import { CanonicalDocs } from "./canonical/CanonicalDocs";
import { CanonicalAnatomy, CanonicalShowcase } from "./canonical/CanonicalShowcase";

type View = "showcase" | "anatomy" | "docs";
function readView(): View {
  let rawHash = window.location.hash;
  // The URL is user-controlled. A malformed percent escape must not prevent
  // the artifact shell from mounting before the browser can render it.
  try {
    rawHash = decodeURIComponent(rawHash);
  } catch {
    // Keep the undecoded hash and fall back to the showcase route below.
  }
  const hash = rawHash
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
