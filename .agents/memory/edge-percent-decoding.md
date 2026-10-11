---
name: Production edge decodes percent-escapes
description: Why escaped-URL redirects proven on DEV never fire on awesome.video, and how to probe what path the app actually received.
---
- Google Frontend in front of the deployment decodes percent-escaped unreserved characters (`%2D`, `%75`, …) before the request reaches Express. Production never sees `/category/encoding%2Dcodecs`, only `/category/encoding-codecs`. Escape-normalising 301s therefore work on DEV and local prod builds but cannot fire in production. Production answers 200 with the plain canonical, which already meets the SEO goal.
  **Why:** a confirmation run of the encoded-taxonomy redirect fix on the published site found "no 301" after the fix was live. Republishing would not have changed it.
  **How to apply:** don't file "prod lacks escape redirect" as a deploy gap. To see what path the app received, request a path with an escape plus a trailing slash (`/abo%75t/`). The app's trailing-slash 301 echoes its `urlPath`: DEV gives `/abo%75t`, prod gives `/about`.
