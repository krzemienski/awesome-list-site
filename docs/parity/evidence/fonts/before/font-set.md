# Declared @font-face set — before

Captured 2026-09-12T18:39:42.902Z. App: http://127.0.0.1:5000 — design source served from awesome-list-site-ds/.

## Font stylesheet links

App "/":
- https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap
- https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap

Design:
- https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap

## Diff (family|style|weight) app "/" vs design

- shared: 13
- app-only: 1 — Fraunces|normal|800
- design-only: 26 — Fraunces|italic|500, Fraunces|italic|600, Geist|normal|400, Geist|normal|500, Geist|normal|600, Geist|normal|700, IBM Plex Mono|normal|400, IBM Plex Mono|normal|500, IBM Plex Mono|normal|600, IBM Plex Mono|normal|700, IBM Plex Sans|normal|400, IBM Plex Sans|normal|500, IBM Plex Sans|normal|600, IBM Plex Sans|normal|700, Instrument Serif|italic|400, Instrument Serif|normal|400, Inter|normal|800, Manrope|normal|400, Manrope|normal|500, Manrope|normal|600, Manrope|normal|700, Manrope|normal|800, Space Grotesk|normal|400, Space Grotesk|normal|500, Space Grotesk|normal|600, Space Grotesk|normal|700

| Family | Style | Weight | App "/" | Design |
|---|---|---|---|---|
| Fraunces | italic | 400 | 3 faces | 3 faces |
| Fraunces | italic | 500 | missing | 3 faces |
| Fraunces | italic | 600 | missing | 3 faces |
| Fraunces | normal | 400 | 3 faces | 3 faces |
| Fraunces | normal | 500 | 3 faces (1 loaded) | 3 faces (1 loaded) |
| Fraunces | normal | 600 | 3 faces | 3 faces |
| Fraunces | normal | 700 | 3 faces | 3 faces |
| Fraunces | normal | 800 | 3 faces | missing |
| Geist | normal | 400 | missing | 5 faces |
| Geist | normal | 500 | missing | 5 faces |
| Geist | normal | 600 | missing | 5 faces |
| Geist | normal | 700 | missing | 5 faces |
| IBM Plex Mono | normal | 400 | missing | 5 faces |
| IBM Plex Mono | normal | 500 | missing | 5 faces |
| IBM Plex Mono | normal | 600 | missing | 5 faces |
| IBM Plex Mono | normal | 700 | missing | 5 faces |
| IBM Plex Sans | normal | 400 | missing | 6 faces |
| IBM Plex Sans | normal | 500 | missing | 6 faces |
| IBM Plex Sans | normal | 600 | missing | 6 faces |
| IBM Plex Sans | normal | 700 | missing | 6 faces |
| Instrument Serif | italic | 400 | missing | 2 faces |
| Instrument Serif | normal | 400 | missing | 2 faces |
| Inter | normal | 400 | 7 faces (1 loaded) | 7 faces (1 loaded) |
| Inter | normal | 500 | 7 faces (1 loaded) | 7 faces (1 loaded) |
| Inter | normal | 600 | 7 faces (1 loaded) | 7 faces (1 loaded) |
| Inter | normal | 700 | 7 faces (1 loaded) | 7 faces |
| Inter | normal | 800 | missing | 7 faces |
| JetBrains Mono | normal | 400 | 6 faces (1 loaded) | 6 faces (1 loaded) |
| JetBrains Mono | normal | 500 | 6 faces | 6 faces |
| JetBrains Mono | normal | 600 | 6 faces (1 loaded) | 6 faces |
| JetBrains Mono | normal | 700 | 6 faces (1 loaded) | 6 faces (1 loaded) |
| Manrope | normal | 400 | missing | 6 faces |
| Manrope | normal | 500 | missing | 6 faces |
| Manrope | normal | 600 | missing | 6 faces |
| Manrope | normal | 700 | missing | 6 faces |
| Manrope | normal | 800 | missing | 6 faces |
| Space Grotesk | normal | 400 | missing | 3 faces |
| Space Grotesk | normal | 500 | missing | 3 faces |
| Space Grotesk | normal | 600 | missing | 3 faces |
| Space Grotesk | normal | 700 | missing | 3 faces |

## /settings/theme per system

### editorial

- tokens: {"--font-display":"'Fraunces', Georgia, serif","--font-body":"'Inter', system-ui, sans-serif","--font-mono":"'JetBrains Mono', ui-monospace, monospace"}
- h1: {"text":"Theme Settings","fontFamily":"Fraunces, Georgia, serif","width":169}
- font links: 2
- declared keys: 14

### terminal

- tokens: {"--font-display":"'IBM Plex Mono', ui-monospace, monospace","--font-body":"'IBM Plex Mono', ui-monospace, monospace","--font-mono":"'IBM Plex Mono', ui-monospace, monospace"}
- h1: {"text":"Theme Settings","fontFamily":"\"IBM Plex Mono\", ui-monospace, monospace","width":198.25}
- font links: 3
- declared keys: 18

### geist

- tokens: {"--font-display":"'Geist', 'Inter', system-ui, sans-serif","--font-body":"'Geist', 'Inter', system-ui, sans-serif","--font-mono":"'JetBrains Mono', ui-monospace, monospace"}
- h1: {"text":"Theme Settings","fontFamily":"Geist, Inter, system-ui, sans-serif","width":166.921875}
- font links: 4
- declared keys: 22

### brutalist

- tokens: {"--font-display":"'Instrument Serif', 'Times New Roman', serif","--font-body":"'Space Grotesk', system-ui, sans-serif","--font-mono":"'JetBrains Mono', ui-monospace, monospace"}
- h1: {"text":"Theme Settings","fontFamily":"\"Instrument Serif\", \"Times New Roman\", serif","width":110.890625}
- font links: 5
- declared keys: 28

### swiss

- tokens: {"--font-display":"'Manrope', system-ui, sans-serif","--font-body":"'Manrope', system-ui, sans-serif","--font-mono":"'IBM Plex Mono', ui-monospace, monospace"}
- h1: {"text":"Theme Settings","fontFamily":"Manrope, system-ui, sans-serif","width":169.703125}
- font links: 6
- declared keys: 33

## Network / console log (fonts-related and errors)

- none
