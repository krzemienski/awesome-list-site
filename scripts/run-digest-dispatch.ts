import "dotenv/config";
import crypto from "crypto";
import { pool } from "../server/db";
import { runDigestCycle } from "../server/services/digestService";

async function main() {
  const result = await runDigestCycle({
    workerId: `command-${process.pid}-${crypto.randomUUID().slice(0, 8)}`,
    limit: 100,
  });
  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error(
      "[digest] dispatch command failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });