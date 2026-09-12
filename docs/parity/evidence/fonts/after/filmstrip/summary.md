# First-paint filmstrip @375 — after

App: http://127.0.0.1:5000. Frames from CDP Page.startScreencast; h1 samples via requestAnimationFrame (family + measured width).

## cold cache

- frames: 14 captured, 7 unique, kept: 409ms, 422ms, 865ms, 980ms, 1041ms, 1073ms, 1156ms
- first h1 sample: {"t":252,"text":"Awesome Video","family":"Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif","width":319,"height":48,"fontsReadyAt":4}
- last h1 sample: {"t":4009,"text":"Awesome Video Resources","family":"Fraunces, Georgia, serif","width":343,"height":62.38,"fontsReadyAt":4}
- h1 changes after first paint (element swap = different text; a fallback→webfont swap = same text, new width): [{"t":913,"from":319,"to":343,"fromText":"Awesome Video","toText":"Awesome Video Resources","toFamily":"Fraunces, Georgia, serif"}]
- document.fonts.ready at: 4ms

## warm cache

- frames: 13 captured, 7 unique, kept: 21ms, 82ms, 825ms, 926ms, 976ms, 989ms, 1090ms
- first h1 sample: {"t":27,"text":"Awesome Video","family":"Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif","width":319,"height":48,"fontsReadyAt":1.2999999998137355}
- last h1 sample: {"t":4010,"text":"Awesome Video Resources","family":"Fraunces, Georgia, serif","width":343,"height":62.38,"fontsReadyAt":1.2999999998137355}
- h1 changes after first paint (element swap = different text; a fallback→webfont swap = same text, new width): [{"t":908,"from":319,"to":343,"fromText":"Awesome Video","toText":"Awesome Video Resources","toFamily":"Fraunces, Georgia, serif"}]
- document.fonts.ready at: 1.2999999998137355ms

