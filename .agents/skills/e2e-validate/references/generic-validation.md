<overview>
Validation approach for projects that don't fit standard platform categories: libraries, data pipelines, ML models, infrastructure-as-code, static site generators, build tools, etc. The Iron Rule still applies — validate through real execution, never mocks.
</overview>

<adaptive_detection>
If auto-detection returned "generic", investigate further:

| Project Type | Indicators | Validation Approach |
|-------------|-----------|---------------------|
| **Library/SDK** | No binary, `src/lib.rs`, exported modules | Import in a real script, call functions, verify outputs |
| **Data pipeline** | ETL scripts, `dbt_project.yml`, Airflow DAGs | Run pipeline with real data, verify output tables/files |
| **ML model** | `model.py`, `train.py`, `.h5`/`.pt` files | Train with real data subset, inference with real input, verify predictions |
| **Infrastructure** | `terraform/`, `pulumi/`, `docker-compose.yml` | `terraform plan`, `docker-compose up`, verify services respond |
| **Static site** | `gatsby-config.js`, `hugo.toml`, `_config.yml` | Build site, serve, verify pages render |
| **Build tool** | Custom Makefile, build scripts, plugins | Run build on a real project, verify output |
| **Lambda/Serverless** | `serverless.yml`, `sam template` | Deploy locally (SAM local, serverless offline), invoke |
| **Desktop app** | Electron, Tauri, GTK bindings | Build, launch, screenshot |

For each: Execute the REAL thing, capture output, verify correctness.
</adaptive_detection>

<generic_validation_pattern>
```bash
EVIDENCE="e2e-evidence/generic"
mkdir -p "$EVIDENCE"

# 1. Identify what "running" means for this project
# (build, serve, execute, deploy — determine from project files)

# 2. Execute the real thing
<build/run command> 2>&1 | tee "$EVIDENCE/01-execution.log"
EXIT_CODE=$?

# 3. Capture evidence of what it produced
ls -la <output-directory> | tee "$EVIDENCE/02-outputs.txt"
cat <primary-output> | tee "$EVIDENCE/03-output-content.txt"

# 4. Verify against criteria
<verification-command> && echo "PASS" || echo "FAIL"
```
</generic_validation_pattern>

<library_validation>
Libraries can't be "launched" — validate by importing and calling from a REAL consumer:

```bash
# 1. Build/install the library
pip install -e . 2>&1 | tee "$EVIDENCE/01-install.log"

# 2. Write a minimal consumer script (NOT a test file)
cat > /tmp/use_library.py << 'EOF'
from my_library import process_data
result = process_data({"key": "value"})
print(f"Result: {result}")
assert result["processed"] == True, "Expected processed=True"
print("PASS: Library works as expected")
EOF

# 3. Run the consumer
python3 /tmp/use_library.py 2>&1 | tee "$EVIDENCE/02-usage.txt"
rm /tmp/use_library.py
```

This is NOT a test file. It's a one-off consumer script that proves the library works from the user's perspective. Delete it after use.
</library_validation>

<docker_validation>
```bash
# Build and start all services
docker-compose up -d 2>&1 | tee "$EVIDENCE/01-compose-up.log"

# Wait for services to be healthy
for service in api web db; do
  for i in $(seq 1 60); do
    docker-compose ps "$service" 2>/dev/null | grep -q "healthy\|running" && break
    sleep 1
  done
done

# Verify each service responds
curl -s http://localhost:8080/health | tee "$EVIDENCE/02-api-health.json"
curl -s http://localhost:3000 | head -20 | tee "$EVIDENCE/03-web-response.txt"

# Cleanup
docker-compose down
```
</docker_validation>

<never>
- NEVER skip execution — even "infrastructure" projects must be plan'd/apply'd
- NEVER validate libraries with test frameworks — use real consumer scripts
- NEVER assume Docker containers are healthy because they started
- NEVER test ML models only on training data
</never>
