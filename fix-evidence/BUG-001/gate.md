# VG-001 — PDF export produces no file (HIGH) — PASS

## Root cause
The `pdf` case in `client/src/components/ui/export-tools.tsx` never produced a PDF: it built a hidden iframe (`srcdoc`) and called `contentWindow.print()`. Print dialogs are suppressed/manual in many browsers (mobile especially, and any automated/kiosk context), and `settled = true` was set immediately after `print()` returned — disarming the HTML fallback even when nothing visible happened. Net effect on prod: no request, no download, no blob, no error (exactly the audit observation).

## Fix
Replaced the print-dialog flow with real client-side PDF generation via jsPDF (`await import("jspdf")` — lazy chunk, entry bundle untouched). Paginated A4 layout, honors all export options (descriptions, tags, categories, group-by-category, category filter), yields to the event loop every 150 resources so the "Exporting..." spinner keeps painting, then `doc.save("awesome-video.pdf")` triggers a standard blob download. Failures propagate to the existing catch → destructive "Export Failed" toast.

## Evidence (dev, localhost:5000, July 19, 2026)
- `desktop.pdf` — 1,321,306 bytes, downloaded via real click at 1440×900. `%PDF-1.3`, 165 pages A4 (pdfinfo). `desktop-pdf.txt` = pdftotext extraction: title header, category sections, 1,809 https URLs, descriptions + tags. `desktop-page1.png` = rendered page 1 (real content visible).
- `mobile.pdf` — identical bytes, downloaded at 375×667 (touch, isMobile). `mobile-after.png` shows "Export Successful — 1814 resources exported as PDF" toast.
- Loading state: `desktop.pdf-loading.png` + `mobile.pdf-loading.png` show the disabled button with spinner "Exporting...".
- Real failure: fresh browser context taken offline (`context.setOffline(true)`) before first export → lazy jspdf chunk fetch genuinely fails → visible destructive toast "Export Failed / There was an error exporting your data. Please try again." (`failure-toast.png`). No mocked/intercepted requests.
- Other formats regression check (same session): Markdown 588,495 B; JSON 846,632 B; CSV 617,774 B; YAML 732,833 B; HTML 1,025,738 B — all downloaded.
- Note: first-ever run in dev hit Vite's one-time dep-optimization reload for the new jspdf chunk (dev-only artifact; production serves a prebuilt chunk).

## Verdict: PASS → BUG-002
