<overview>
End-to-end validation for CLI applications. Build the real binary (or install the real package), execute it with real input, capture all output, verify results match expected behavior. Never use `cargo test`, `go test`, `pytest`, or any test framework.
</overview>

<prerequisites>
| Language | Check | Install |
|----------|-------|---------|
| Rust | `cargo --version` | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Go | `go version` | `brew install go` or official installer |
| Node | `node --version` | `nvm install --lts` |
| Python | `python3 --version` | Check specific version project requires |

Only the toolchain for YOUR project is needed.
</prerequisites>

<language_detection>
| Indicator | Language | Build Command | Binary / Entry Point |
|-----------|----------|---------------|----------------------|
| `Cargo.toml` | Rust | `cargo build --release` | `./target/release/<name>` |
| `go.mod` | Go | `go build -o ./bin/app` | `./bin/app` |
| `package.json` with `bin` | Node | `npm run build` | `npx <name>` or `./dist/<name>` |
| `pyproject.toml` with `[project.scripts]` | Python | `pip install -e .` | Entry point from scripts table |
| `pyproject.toml` with `__main__.py` | Python | `pip install -e .` | `python3 -m <module>` |
| `setup.py` / `setup.cfg` | Python (legacy) | `pip install -e .` | Check `console_scripts` |
</language_detection>

<validation_pattern_compiled>
```bash
# Build → Execute → Capture → Verify (always this order)
BUILD_CMD="cargo build --release"  # adjust for language
BINARY="./target/release/myapp"    # adjust for language

# 1. Build and verify
$BUILD_CMD 2>&1 | tee e2e-evidence/cli/build.log
[ $? -ne 0 ] && echo "FAIL: BUILD FAILED" && cat e2e-evidence/cli/build.log && exit 1

# 2. Verify binary exists and is executable
[ ! -x "$BINARY" ] && echo "FAIL: Binary not found at $BINARY" && exit 1
$BINARY --version 2>&1 | tee e2e-evidence/cli/version.txt

# 3. Execute with REAL input, capture EVERYTHING
$BINARY process input.json > e2e-evidence/cli/stdout.txt 2> e2e-evidence/cli/stderr.txt
EXIT_CODE=$?

# 4. Verify against PASS criteria
echo "Exit code: $EXIT_CODE"
echo "=== STDOUT ===" && cat e2e-evidence/cli/stdout.txt
echo "=== STDERR ===" && cat e2e-evidence/cli/stderr.txt

# 5. Check specific output (define BEFORE running)
grep -q "expected output" e2e-evidence/cli/stdout.txt && echo "PASS" || echo "FAIL: expected output not found"
```
</validation_pattern_compiled>

<validation_pattern_python>
Python CLIs MUST be installed and invoked as an end user would.

```bash
# 1. Install in editable mode
pip install -e . 2>&1 | tee e2e-evidence/cli/install.log
[ $? -ne 0 ] && echo "FAIL: INSTALL FAILED" && exit 1

# 2. Verify entry point exists
which my-tool || echo "FAIL: entry point not found"
my-tool --help 2>&1 | head -5 | tee e2e-evidence/cli/help.txt

# 3. Execute with REAL input AS AN END USER WOULD
my-tool run input.json > e2e-evidence/cli/stdout.txt 2> e2e-evidence/cli/stderr.txt
EXIT_CODE=$?

# 4. Verify
echo "Exit code: $EXIT_CODE"
cat e2e-evidence/cli/stdout.txt
```
</validation_pattern_python>

<journeys_to_validate>
For CLI tools, validate these journey categories:

1. **Happy path** — Primary command with valid input produces expected output
2. **Help/version** — `--help` prints usage, `--version` prints version
3. **Error handling** — Invalid input produces clear error message + non-zero exit
4. **Edge cases** — Empty input, very large input, missing files, invalid flags
5. **Side effects** — Output files created with correct content, databases updated
6. **Performance** — Timed execution within acceptable bounds
7. **Piping** — stdin/stdout work correctly for pipeline usage
8. **Subcommands** — Each subcommand works independently
</journeys_to_validate>

<pass_criteria_examples>
| Verification | Good Evidence | Bad Evidence |
|-------------|--------------|----------------|
| Functionality | Output contains expected transformed data | `exit 0` only |
| Error handling | Invalid input → clear message + non-zero exit | Crash with stack trace |
| Performance | `Processed 1000 items in 0.8s` | No timing info |
| Side effects | Output file exists with correct content | File exists but empty |
| Entry point | `which my-tool` returns path + `--help` works | `python3 script.py` works |
</pass_criteria_examples>

<failure_troubleshooting>
| Symptom | Cause | Fix |
|---------|-------|-----|
| `command not found` | Wrong PATH or binary location | Use absolute path |
| `command not found` (Python) | Entry point not installed | `pip install -e .` |
| `Permission denied` | Binary not executable | `chmod +x $BINARY` |
| `dyld: Library not loaded` | Missing dynamic dependency | `otool -L` (macOS) / `ldd` (Linux) |
| `ModuleNotFoundError` | Package not installed | `pip install -e .` in correct env |
| Non-zero exit with no stderr | Error swallowed or in log file | Check working directory for logs |
</failure_troubleshooting>

<never>
- NEVER use `cargo test` / `go test` / `npm test` / `pytest` for validation
- NEVER run `python3 script.py` instead of the installed entry point
- NEVER mock file system operations — use real files
- NEVER create test fixtures — use real or generated input data
- NEVER add `#[cfg(test)]` / `if TEST_MODE` paths
- NEVER skip `pip install -e .` for Python projects
</never>
