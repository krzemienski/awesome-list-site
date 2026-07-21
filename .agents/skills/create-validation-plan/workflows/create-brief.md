<overview>
Create a project brief with embedded validation strategy. Starting point for any new project.
</overview>

<when_to_use>Starting a new project. No `.planning/` directory exists yet.</when_to_use>

<steps>
**Step 1: Gather vision.** Ask the user: What are you building? Why does it matter? Who uses it? What platform (iOS, CLI, API, Web, Full-Stack)? Is this greenfield or brownfield?

If platform is unclear, ask directly — it determines all validation gates downstream.

**Step 2: Define validation strategy.** Based on platform:

| Platform | Evidence method | Key tool |
|----------|----------------|----------|
| iOS/macOS | Simulator screenshots | `xcrun simctl` |
| CLI | Terminal output + exit codes | Binary execution |
| API | curl responses + JSON | `curl` + `jq` |
| Web | Browser screenshots + text | Playwright |
| Full-Stack | Bottom-up layered | Combined |

**Step 3: Write BRIEF.md.** Create `.planning/BRIEF.md` containing: project name, vision, platform, validation strategy (evidence method, tools, gate pattern), and mock policy ("Zero tolerance — no mocks, stubs, test files, or test modes").

**Step 4: Confirm with user.** Show the brief. Ask: "Does this capture your vision? Ready to create roadmap?"
</steps>

<done_when>
- Project vision stated
- Platform identified
- Validation strategy defined
- `.planning/BRIEF.md` saved
- User confirmed
</done_when>
