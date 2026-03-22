<overview>
Platform-specific validation gate templates. Load only the section matching your detected platform.
</overview>

<platform name="ios-macos">
<detection>`.xcodeproj`, `.xcworkspace`, SwiftUI, UIKit, `xcrun`</detection>

<prerequisites_template>
```bash
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null || true
xcodebuild -scheme {Scheme} -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build
xcrun simctl install booted {app_path}
xcrun simctl launch booted {bundle_id}
sleep 3
```
</prerequisites_template>

<evidence_capture>
```bash
xcrun simctl io booted screenshot evidence/vg{N}-{description}.png
```
</evidence_capture>

<review_method>Use the Read tool to view the screenshot. Check for specific UI state — not just "app loaded" but specific text, counts, layout elements visible.</review_method>

<example_gate>
```
<validation_gate id="VG-LAUNCH" blocking="true">
Prerequisites: Boot sim | Build | Install | Launch | sleep 3
Execute: xcrun simctl io booted screenshot evidence/vg-launch.png
Pass criteria: Main screen visible (not splash, not crash) | Nav elements present | No error dialogs
Review: View evidence/vg-launch.png with Read tool
Verdict: PASS → proceed | FAIL → fix → rebuild → re-run
Mock guard: No XCTest, no Storybook, no SwiftUI Preview assertions
</validation_gate>
```
</example_gate>
</platform>

<platform name="cli">
<detection>`Cargo.toml`, `go.mod`, `pyproject.toml` with scripts, binary execution</detection>

<prerequisites_template>
```bash
cargo build --release 2>&1 | tee evidence/vg{N}-build.txt
# or: go build -o ./binary | or: pip install -e .
```
</prerequisites_template>

<evidence_capture>
```bash
./target/release/{binary} {args} 2>&1 | tee evidence/vg{N}-output.txt
echo "EXIT: $?" >> evidence/vg{N}-output.txt
```
</evidence_capture>

<example_gate>
```
<validation_gate id="VG-CLI" blocking="true">
Prerequisites: cargo build --release (exit 0)
Execute: ./target/release/{binary} {test_args} 2>&1 | tee evidence/vg-cli-output.txt
Pass criteria: Exit code 0 | stdout contains "{expected_string}" | stderr empty
Review: cat evidence/vg-cli-output.txt | tail -1 for exit code
Verdict: PASS → proceed | FAIL → fix → rebuild → re-run
</validation_gate>
```
</example_gate>

<error_handling_gate>
```
<validation_gate id="VG-CLI-ERR" blocking="true">
Execute: ./target/release/{binary} --invalid-flag 2>&1 | tee evidence/vg-cli-err.txt
Pass criteria: Exit code non-zero | stderr has helpful error (not stack trace) | no crash/segfault
Review: cat evidence/vg-cli-err.txt
</validation_gate>
```
</error_handling_gate>
</platform>

<platform name="api">
<detection>REST routes, endpoints, OpenAPI, HTTP methods, `curl`</detection>

<health_check_polling>
Use in ALL API prerequisites — poll, never guess timing:
```bash
for i in $(seq 1 60); do
  curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1 && break
  [ "$i" -eq 60 ] && echo "Server failed to start" && exit 1
  sleep 1
done
```
</health_check_polling>

<evidence_capture>
```bash
curl -s -w "\nHTTP:%{http_code} TIME:%{time_total}s\n" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  "http://localhost:$PORT/api/endpoint" \
  | tee evidence/vg{N}-response.json
```
</evidence_capture>

<json_verification>
```bash
jq -e '.field | length > 0' evidence/vg{N}-response.json > /dev/null 2>&1 \
  || echo "FAIL: field empty or missing"
```
</json_verification>

<crud_gate_example>
```
<validation_gate id="VG-CRUD" blocking="true">
Prerequisites: DB running (pg_isready) | Server started | Health check polling
Execute:
  CREATE: curl -s -X POST .../items -d '{"name":"Test","value":42}' | tee evidence/vg-create.json
  READ:   curl -s .../items/$ID | tee evidence/vg-read.json
  UPDATE: curl -s -X PUT .../items/$ID -d '{"name":"Updated","value":99}' | tee evidence/vg-update.json
  DELETE: curl -s -X DELETE .../items/$ID | tee evidence/vg-delete.json
  VERIFY: curl -s -o /dev/null -w "%{http_code}" .../items/$ID | tee evidence/vg-deleted.txt
Pass criteria: CREATE 201 with "id" | READ 200 matching data | UPDATE 200 changed | DELETE 200/204 | VERIFY 404
Review: jq -e '.id' evidence/vg-create.json && cat evidence/vg-deleted.txt
</validation_gate>
```
</crud_gate_example>

<auth_gate_example>
```
<validation_gate id="VG-AUTH" blocking="true">
Execute:
  UNAUTH: curl -s -o evidence/vg-unauth.json -w "%{http_code}" .../protected
  LOGIN:  curl -s -X POST .../auth/login -d '{"email":"test@test.com","password":"test123"}' | tee evidence/vg-login.json
  AUTH:   curl -s -H "Authorization: Bearer $TOKEN" .../protected | tee evidence/vg-auth.json
Pass criteria: UNAUTH 401/403 | LOGIN 200 with non-empty "token" | AUTH 200 with expected data
</validation_gate>
```
</auth_gate_example>
</platform>

<platform name="web">
<detection>React, Vue, Svelte, `package.json` with frontend deps, Playwright</detection>

<prerequisites_template>
```bash
npm run dev &
for i in $(seq 1 30); do
  curl -sf http://localhost:3000 > /dev/null 2>&1 && break
  sleep 1
done
npx playwright install chromium
```
</prerequisites_template>

<evidence_capture>
```javascript
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/{path}');
await page.waitForSelector('{selector}');
await page.screenshot({ path: 'evidence/vg{N}-{page}.png', fullPage: true });
const text = await page.textContent('{selector}');
require('fs').writeFileSync('evidence/vg{N}-{page}.txt', text);
await browser.close();
```
</evidence_capture>

<example_gate>
```
<validation_gate id="VG-WEB" blocking="true">
Prerequisites: npm run dev & | poll until 200 | playwright chromium installed
Execute: Navigate to /{path} | wait for {selector} | screenshot + text capture
Pass criteria: No error overlay | expected heading visible | data populated (not "Loading...") | nav elements correct
Review: View screenshot with Read tool | cat text file
</validation_gate>
```
</example_gate>
</platform>

<platform name="full-stack">
<detection>Both frontend and backend components present</detection>

<rule>Always validate bottom-up: Database → Backend API → Frontend. A frontend bug might actually be a backend bug. Bottom-up isolation prevents misdiagnosis.</rule>

<gate_sequence>
```
VG-DB (database seeded and queryable)
  → VG-API (endpoints return correct data from real DB)
    → VG-WEB (UI renders data from real API from real DB)
```
</gate_sequence>

Each layer uses its own platform patterns from the sections above.
</platform>

<platform name="generic">
<detection>None of the above, or ambiguous</detection>

<template>
```
<validation_gate id="VG-{N}" blocking="true">
Prerequisites: [List dependencies + health check each]
Execute: [Run command | save to evidence/vg{N}-output.{ext}]
Pass criteria: Exit code 0 | output contains "{expected}" | file has size > 0 | no error strings
Review: cat evidence/vg{N}-output.{ext} | verify each criterion
Verdict: PASS → proceed | FAIL → fix → re-run
</validation_gate>
```
</template>
</platform>
