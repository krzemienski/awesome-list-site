# CLI Application Validation Reference

## Prerequisites

- **Rust**: `cargo --version` (install via `rustup` if missing)
- **Go**: `go version` (install via `brew install go` if missing)
- **Node**: `node --version` (for JS/TS CLIs compiled with `pkg` or run with `npx`)
- **Python**: `python3 --version` (check specific version if project requires it, e.g., `python3.12`)

Only the toolchain for YOUR project's language is needed.

## Language Detection

| Indicator | Language | Build Command | Binary / Entry Point |
|-----------|----------|---------------|----------------------|
| `Cargo.toml` | Rust | `cargo build --release` | `./target/release/<name>` |
| `go.mod` | Go | `go build -o ./bin/app` | `./bin/app` |
| `package.json` with `bin` | Node | `npm run build` | `npx <name>` or `./dist/<name>` |
| `pyproject.toml` with `[project.scripts]` | Python | `pip install -e .` | Entry point name from scripts table |
| `pyproject.toml` with `__main__.py` | Python | `pip install -e .` | `python3 -m <module_name>` |
| `setup.py` / `setup.cfg` | Python (legacy) | `pip install -e .` | Check `console_scripts` in setup |

## The Validation Pattern (Compiled Languages)

```bash
# Build → Execute → Capture → Verify (always this order)
BUILD_CMD="cargo build --release"  # or: go build -o ./bin/app, npm run build
BINARY="./target/release/myapp"    # adjust for language

# 1. Build and verify binary exists
$BUILD_CMD 2>&1 | tee build.log
[ $? -ne 0 ] && echo "BUILD FAILED" && cat build.log && exit 1

# 2. Verify binary is executable
[ ! -x "$BINARY" ] && echo "Binary not found at $BINARY" && exit 1
$BINARY --version  # Smoke test

# 3. Execute with real input, capture everything
$BINARY process input.json > stdout.txt 2> stderr.txt
EXIT_CODE=$?

# 4. Verify
echo "Exit code: $EXIT_CODE"
echo "=== STDOUT ===" && cat stdout.txt
echo "=== STDERR ===" && cat stderr.txt
```

## The Validation Pattern (Python CLI Tools)

Python CLIs are NOT just scripts — they must be installed and invoked as an end user would.

```bash
# Install → Verify Entry Point → Execute → Capture → Verify

# 1. Install in editable mode (creates real entry points)
pip install -e . 2>&1 | tee install.log
[ $? -ne 0 ] && echo "INSTALL FAILED" && cat install.log && exit 1

# 2. Verify the entry point exists and is callable
#    Option A: If pyproject.toml defines [project.scripts]
which my-tool  # Must resolve to a real path, not "not found"
my-tool --help 2>&1 | head -5

#    Option B: If the project uses __main__.py (python -m invocation)
python3 -m my_module --help 2>&1 | head -5

# 3. Execute with real input AS AN END USER WOULD
my-tool run input.json > stdout.txt 2> stderr.txt
# OR: python3 -m my_module run input.json > stdout.txt 2> stderr.txt
EXIT_CODE=$?

# 4. Verify
echo "Exit code: $EXIT_CODE"
echo "=== STDOUT ===" && cat stdout.txt
echo "=== STDERR ===" && cat stderr.txt
```

### Python-Specific Gotchas

| Gotcha | Why It Breaks | What To Do |
|--------|---------------|------------|
| Running `python3 script.py` directly | Bypasses entry points, `__main__.py`, and package imports. User won't invoke it this way. | Use `pip install -e .` then invoke the entry point or `python3 -m module` |
| Forgetting `pip install -e .` after changes | Old code is still installed. Your edits aren't running. | Re-run `pip install -e .` after ANY code change, or use editable install which picks up changes automatically for pure Python |
| Wrong Python version | `python3` might be 3.9 while project needs 3.12. Entry point shebang may differ. | Use explicit version: `python3.12 -m module`. Check `python3 --version`. |
| Missing dependencies | `pip install -e .` failed silently or partially | Check install log. Run `pip install -e ".[dev]"` if extras are needed. |
| `ModuleNotFoundError` on import | Package not installed, or installed in wrong venv | Verify: `pip show <package-name>`. Check you're in the right virtualenv. |
| Entry point not found after install | `[project.scripts]` misconfigured in pyproject.toml | Check `pip show -f <package>` to list installed files. Verify scripts table. |
| `--dry-run` works but real run fails | Dry-run skips real I/O, network, or file operations | Always validate with a REAL run, not just `--dry-run`. Use dry-run only as a smoke test. |

## What PASS Looks Like (Not Just "It Ran")

| Verification | Good Evidence | Bad Evidence |
|-------------|--------------|-------------|
| Functionality | Output contains expected transformed data | `exit 0` only (proves nothing) |
| Error handling | Invalid input → clear error message + non-zero exit | Crash/panic/traceback with stack trace |
| Performance | `Processed 1000 items in 0.8s` | No timing information |
| Side effects | Output file exists with correct content | File exists but empty |
| Entry point works | `which my-tool` returns a path AND `my-tool --help` prints usage | `python3 my_tool/cli.py` works (not how users invoke it) |

## Failure Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `command not found` | Wrong PATH or binary location | Use absolute path: `$(pwd)/target/release/myapp` |
| `command not found` (Python) | Entry point not installed or not on PATH | Run `pip install -e .` and check `which <tool-name>` |
| `Permission denied` | Binary not executable | `chmod +x $BINARY` |
| `dyld: Library not loaded` | Missing dynamic dependency | Check `otool -L $BINARY` (macOS) or `ldd` (Linux) |
| `ModuleNotFoundError` | Python package not installed or wrong env | `pip install -e .` in the correct virtualenv |
| `SyntaxError` on import | Wrong Python version running the code | Check shebang, use explicit `python3.12 -m module` |
| Non-zero exit with no stderr | Error swallowed or written to log file | Check for log files in working directory |
| Works locally, fails in CI | Different working directory or env vars | Use absolute paths; check `$HOME`, `$PATH` |

## Never Do

- **NEVER use `cargo test` / `go test` / `npm test` / `pytest` for validation** — those test abstractions, not the real binary or installed tool
- **NEVER run `python3 script.py` instead of the installed entry point** — users don't run raw scripts, they run `my-tool` or `python3 -m my_module`
- **NEVER mock file system operations** — use real files, verify real output
- **NEVER create test fixtures** — generate real input data or use existing data
- **NEVER add `#[cfg(test)]` / `if TEST_MODE` / `if __name__ == "__main__"` test paths** — there is one code path: production
- **NEVER skip `pip install -e .`** — importing from source without installing misses entry points, package metadata, and dependency resolution
