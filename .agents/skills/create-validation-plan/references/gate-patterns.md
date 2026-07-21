<overview>
Platform-specific gate patterns for use in plans. Detect platform from BRIEF.md.
</overview>

<detection_table>
| Signal | Platform | Evidence |
|--------|----------|----------|
| `.xcodeproj`, SwiftUI | iOS/macOS | `xcrun simctl io booted screenshot` |
| `Cargo.toml`, `go.mod`, binary | CLI | `./binary 2>&1 \| tee output.txt` |
| REST routes, API, curl | API | `curl -s \| tee response.json \| jq .` |
| React, Vue, Playwright | Web | `page.screenshot()` |
| Frontend + backend | Full-Stack | Bottom-up: DB → API → Frontend |
</detection_table>

<api_patterns>
Health check polling (use in ALL API prerequisites):
```bash
for i in $(seq 1 60); do
  curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1 && break
  [ "$i" -eq 60 ] && echo "FAIL: server timeout" && exit 1
  sleep 1
done
```

Evidence capture:
```bash
curl -s -w "\nHTTP:%{http_code}\n" -H "Content-Type: application/json" \
  -d '{"key":"value"}' "http://localhost:$PORT/api/endpoint" \
  | tee evidence/vg{N}-{desc}.json
```

JSON verification: `jq -e '.field | length > 0' evidence/vg{N}.json`
</api_patterns>

<cli_patterns>
Build + execute: `cargo build --release && ./target/release/{bin} {args} 2>&1 | tee evidence/vg{N}-output.txt`

Verify: `grep -q "{expected}" evidence/vg{N}-output.txt && echo "PASS" || echo "FAIL"`
</cli_patterns>

<ios_patterns>
Build + screenshot: `xcodebuild ... build && xcrun simctl install booted {app} && xcrun simctl launch booted {id} && sleep 3 && xcrun simctl io booted screenshot evidence/vg{N}.png`

Review: Read tool to view screenshot, check specific UI state.
</ios_patterns>

<web_patterns>
Playwright: Navigate → waitForSelector → screenshot → textContent → save to evidence/
</web_patterns>

<fullstack_rule>
Always bottom-up: VG-DB → VG-API → VG-WEB. A frontend bug might be a backend bug.
</fullstack_rule>
