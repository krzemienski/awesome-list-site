---
name: "Failed" publish that still went live
description: How to tell a platform service-creation timeout from a real app startup failure
---
A publish can be marked failed ("failed to initialize due to a configuration or code error") when the build log ends with several "Creating Autoscale service" retries and the revision has NO runtime logs during them. The container never started, so the app was not at fault. In the 2026-10-24 case the same revision started ~3 min after the failure was declared, passed its health check and replaced the old revision.

**Why:** time was nearly spent hunting a code bug in a build that compiled cleanly and booted in ~3 s once scheduled.
**How to apply:** first check runtime logs with getDeploymentLogs({ revisionId: <failed build id> }) and compare https://awesome.video/api/version with the build's "Git commit" line. Healthcheck "returned status 500" before "Serving on port 5000" comes from the sidecar while the app is booting, not from the app. If prod already shows the commit, nothing needs fixing. Otherwise republish once before changing any code.
