/**
 * Read-only consistency gate for Continue Learning.
 *
 * Verifies that stored row ids stay inside their journey, currentStepId belongs
 * to the same journey, and completedAt agrees with grouped logical-step
 * completion. It also checks that this feature's disposable E2E accounts left
 * no user/session/audit residue.
 */
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15_000,
});

type Issue = {
  progress_id: number;
  issue: string;
  detail: string;
};

try {
  const { rows: issues } = await pool.query<Issue>(`
    WITH progress AS (
      SELECT
        id,
        journey_id,
        current_step_id,
        completed_at,
        CASE
          WHEN jsonb_typeof(completed_steps) = 'array' THEN completed_steps
          ELSE '[]'::jsonb
        END AS completed_steps,
        jsonb_typeof(completed_steps) AS completed_steps_type
      FROM user_journey_progress
    ),
    exploded AS (
      SELECT
        progress.id AS progress_id,
        progress.journey_id,
        value::integer AS completed_step_id
      FROM progress
      CROSS JOIN LATERAL jsonb_array_elements_text(progress.completed_steps)
      WHERE value ~ '^[0-9]+$'
    ),
    logical_groups AS (
      SELECT
        progress.id AS progress_id,
        journey_steps.step_number,
        bool_or(NOT coalesce(journey_steps.is_optional, false)) AS has_required_rows,
        bool_and(
          CASE
            WHEN coalesce(journey_steps.is_optional, false) THEN true
            ELSE progress.completed_steps @> jsonb_build_array(journey_steps.id)
          END
        ) AS required_rows_complete,
        bool_and(
          progress.completed_steps @> jsonb_build_array(journey_steps.id)
        ) AS all_rows_complete
      FROM progress
      JOIN journey_steps
        ON journey_steps.journey_id = progress.journey_id
      GROUP BY progress.id, journey_steps.step_number
    ),
    actual_completion AS (
      SELECT
        progress.id AS progress_id,
        count(logical_groups.step_number) AS required_group_count,
        coalesce(
          bool_and(
            CASE
              WHEN logical_groups.has_required_rows
                THEN logical_groups.required_rows_complete
              ELSE logical_groups.all_rows_complete
            END
          ),
          false
        ) AS is_complete
      FROM progress
      LEFT JOIN logical_groups
        ON logical_groups.progress_id = progress.id
      GROUP BY progress.id
    )
    SELECT
      progress.id AS progress_id,
      'completed_steps_shape' AS issue,
      coalesce(progress.completed_steps_type, 'null') AS detail
    FROM progress
    WHERE progress.completed_steps_type IS DISTINCT FROM 'array'

    UNION ALL

    SELECT
      exploded.progress_id,
      'foreign_completed_step' AS issue,
      exploded.completed_step_id::text AS detail
    FROM exploded
    LEFT JOIN journey_steps
      ON journey_steps.id = exploded.completed_step_id
     AND journey_steps.journey_id = exploded.journey_id
    WHERE journey_steps.id IS NULL

    UNION ALL

    SELECT
      progress.id,
      'foreign_current_step' AS issue,
      progress.current_step_id::text AS detail
    FROM progress
    LEFT JOIN journey_steps
      ON journey_steps.id = progress.current_step_id
     AND journey_steps.journey_id = progress.journey_id
    WHERE progress.current_step_id IS NOT NULL
      AND journey_steps.id IS NULL

    UNION ALL

    SELECT
      progress.id,
      'duplicate_completed_step' AS issue,
      exploded.completed_step_id::text AS detail
    FROM progress
    JOIN exploded ON exploded.progress_id = progress.id
    GROUP BY progress.id, exploded.completed_step_id
    HAVING count(*) > 1

    UNION ALL

    SELECT
      progress.id,
      'completed_at_mismatch' AS issue,
      concat(
        'stored=', progress.completed_at IS NOT NULL,
        ', grouped=', actual_completion.is_complete,
        ', required_groups=', actual_completion.required_group_count
      ) AS detail
    FROM progress
    JOIN actual_completion
      ON actual_completion.progress_id = progress.id
    WHERE (progress.completed_at IS NOT NULL)
      IS DISTINCT FROM actual_completion.is_complete

    ORDER BY progress_id, issue
  `);

  if (issues.length > 0) {
    console.error(`FAIL: found ${issues.length} journey-progress consistency issue(s)`);
    for (const issue of issues) {
      console.error(`  progress=${issue.progress_id} ${issue.issue}: ${issue.detail}`);
    }
    process.exitCode = 1;
  } else {
    console.log('PASS: all journey progress matches grouped logical-step semantics');
  }

  const residuePrefix = '__qa_test_continue_learning_';
  const { rows: residue } = await pool.query<{ surface: string; count: string }>(
    `
      SELECT 'users' AS surface, count(*)::text AS count
      FROM users
      WHERE email LIKE $1
      UNION ALL
      SELECT 'sessions', count(*)::text
      FROM sessions
      WHERE sess::text LIKE $1
      UNION ALL
      SELECT 'auth_audit', count(*)::text
      FROM resource_audit_log
      WHERE changes::text LIKE $1
      UNION ALL
      SELECT 'journeys', count(*)::text
      FROM learning_journeys
      WHERE title LIKE $1
    `,
    [`%${residuePrefix}%`],
  );
  const dirty = residue.filter((row) => Number(row.count) > 0);
  if (dirty.length > 0) {
    console.error(
      `FAIL: Continue Learning QA residue remains (${dirty
        .map((row) => `${row.surface}=${row.count}`)
        .join(', ')})`,
    );
    process.exitCode = 1;
  } else {
    console.log('PASS: Continue Learning E2E teardown is net-zero');
  }
} finally {
  await pool.end();
}