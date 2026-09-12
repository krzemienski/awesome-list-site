# First-paint filmstrip @375 — before

App: http://127.0.0.1:5000. Frames from CDP Page.startScreencast; h1 samples via requestAnimationFrame (family + measured width).

## cold cache

- frames: 12 captured, 7 unique, kept: 301ms, 498ms, 918ms, 1013ms, 1065ms, 1112ms, 1164ms
- first h1 sample: {"t":70,"text":"Awesome Video","family":"Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif","width":319,"height":48,"fontsReadyAt":0.7999999998137355}
- last h1 sample: {"t":4003,"text":"Awesome Video Resources","family":"Fraunces, Georgia, serif","width":343,"height":62.38,"fontsReadyAt":0.7999999998137355}
- h1 changes after first paint (element swap = different text; a fallback→webfont swap = same text, new width): [{"t":866,"from":319,"to":343,"fromText":"Awesome Video","toText":"Awesome Video Resources","toFamily":"Fraunces, Georgia, serif"}]
- document.fonts.ready at: 0.7999999998137355ms

## warm cache

- frames: 12 captured, 7 unique, kept: 26ms, 82ms, 327ms, 429ms, 476ms, 490ms, 566ms
- first h1 sample: {"t":31,"text":"Awesome Video","family":"Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif","width":319,"height":48,"fontsReadyAt":1.6999999999534339}
- last h1 sample: {"t":4014,"text":"Awesome Video Resources","family":"Fraunces, Georgia, serif","width":343,"height":62.38,"fontsReadyAt":1.6999999999534339}
- h1 changes after first paint (element swap = different text; a fallback→webfont swap = same text, new width): [{"t":413,"from":319,"to":343,"fromText":"Awesome Video","toText":"Awesome Video Resources","toFamily":"Fraunces, Georgia, serif"}]
- document.fonts.ready at: 1.6999999999534339ms

