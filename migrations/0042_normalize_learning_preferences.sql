-- Repair legacy free-text learning preferences after the onboarding columns
-- exist. This is intentionally separate from 0041 so databases that already
-- journaled 0041 still receive the controlled-vocabulary conversion.
UPDATE "user_preferences" AS up
SET
  "learning_goals" = (
    SELECT COALESCE(jsonb_agg(mapped ORDER BY first_ordinal), '[]'::jsonb)
    FROM (
      SELECT mapped, min(ordinality) AS first_ordinal
      FROM jsonb_array_elements_text(up."learning_goals") WITH ORDINALITY AS goal(value, ordinality)
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN lower(trim(value)) IN (
            'learn-fundamentals','build-video-apps','improve-streaming',
            'optimize-encoding','operate-infrastructure','keep-current'
          ) THEN lower(trim(value))
          WHEN lower(trim(value)) = 'learn video encoding fundamentals' THEN 'learn-fundamentals'
          WHEN lower(trim(value)) = 'master ffmpeg command line' THEN 'optimize-encoding'
          WHEN lower(trim(value)) = 'build streaming applications' THEN 'build-video-apps'
          WHEN lower(trim(value)) = 'optimize video performance' THEN 'optimize-encoding'
          WHEN lower(trim(value)) = 'implement adaptive streaming' THEN 'improve-streaming'
          WHEN lower(trim(value)) = 'understand video compression' THEN 'optimize-encoding'
          WHEN lower(trim(value)) = 'deploy video infrastructure' THEN 'operate-infrastructure'
          WHEN lower(trim(value)) = 'develop mobile video apps' THEN 'build-video-apps'
          WHEN lower(trim(value)) = 'learn drm implementation' THEN 'build-video-apps'
          WHEN lower(trim(value)) = 'master video analytics' THEN 'operate-infrastructure'
          WHEN lower(trim(value)) = 'master video streaming protocols' THEN 'improve-streaming'
          WHEN lower(trim(value)) ~ '(fundamental|beginner|getting started|introduction|basics)' THEN 'learn-fundamentals'
          WHEN lower(trim(value)) ~ '(ffmpeg|encod|codec|compress|quality|bitrate|transcod)' THEN 'optimize-encoding'
          WHEN lower(trim(value)) ~ '(stream|hls|dash|webrtc|latency|playback|buffer)' THEN 'improve-streaming'
          WHEN lower(trim(value)) ~ '(infrastructure|deploy|cloud|cdn|operat|analytics|monitor)' THEN 'operate-infrastructure'
          WHEN lower(trim(value)) ~ '(app|application|mobile|drm|sdk|api|player)' THEN 'build-video-apps'
          WHEN lower(trim(value)) ~ '(standard|current|news|industry|emerging|release)' THEN 'keep-current'
          ELSE NULL
        END AS mapped
      ) AS mapping
      WHERE mapped IS NOT NULL
      GROUP BY mapped
    ) AS deduplicated
  ),
  "preferred_resource_types" = (
    SELECT COALESCE(jsonb_agg(mapped ORDER BY first_ordinal), '[]'::jsonb)
    FROM (
      SELECT mapped, min(ordinality) AS first_ordinal
      FROM jsonb_array_elements_text(up."preferred_resource_types") WITH ORDINALITY AS resource_type(value, ordinality)
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN lower(trim(value)) IN ('video','course','article','book','specification','tool','library','community')
            THEN lower(trim(value))
          WHEN lower(trim(value)) IN ('documentation','docs','reference','references','spec','specifications')
            THEN 'specification'
          WHEN lower(trim(value)) IN ('tutorial','tutorials','training') THEN 'course'
          WHEN lower(trim(value)) = 'videos' THEN 'video'
          WHEN lower(trim(value)) = 'tools' THEN 'tool'
          WHEN lower(trim(value)) IN ('libraries','sdk','sdks','framework','frameworks') THEN 'library'
          WHEN lower(trim(value)) IN ('articles','blog','blogs','case study','case studies') THEN 'article'
          WHEN lower(trim(value)) = 'courses' THEN 'course'
          WHEN lower(trim(value)) IN ('books','ebook','ebooks') THEN 'book'
          WHEN lower(trim(value)) IN ('community resource','community resources') THEN 'community'
          ELSE NULL
        END AS mapped
      ) AS mapping
      WHERE mapped IS NOT NULL
      GROUP BY mapped
    ) AS deduplicated
  );
--> statement-breakpoint

-- 0041 treated any non-empty legacy array as complete. Recalculate completion
-- after conversion so unmappable custom values become a reviewable invitation.
UPDATE "user_preferences"
SET
  "onboarding_status" = CASE
    WHEN jsonb_array_length("preferred_categories") > 0
      AND jsonb_array_length("learning_goals") > 0
      AND jsonb_array_length("preferred_resource_types") > 0
      THEN 'completed'
    ELSE 'in_progress'
  END,
  "onboarding_step" = CASE
    WHEN jsonb_array_length("preferred_categories") = 0 THEN 2
    WHEN jsonb_array_length("learning_goals") = 0 THEN 3
    WHEN jsonb_array_length("preferred_resource_types") = 0 THEN 4
    ELSE 5
  END,
  "onboarding_completed_at" = CASE
    WHEN jsonb_array_length("preferred_categories") > 0
      AND jsonb_array_length("learning_goals") > 0
      AND jsonb_array_length("preferred_resource_types") > 0
      THEN COALESCE("onboarding_completed_at", "updated_at", "created_at", now())
    ELSE NULL
  END
WHERE "onboarding_status" IN ('completed', 'in_progress')
   OR (
     "onboarding_status" = 'not_started'
     AND (
       jsonb_array_length("preferred_categories") > 0
       OR jsonb_array_length("learning_goals") > 0
       OR jsonb_array_length("preferred_resource_types") > 0
     )
   );
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_learning_goals_values_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_learning_goals_values_check"
      CHECK ("learning_goals" <@ '["learn-fundamentals","build-video-apps","improve-streaming","optimize-encoding","operate-infrastructure","keep-current"]'::jsonb);
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_preferences_resource_types_values_check'
      AND conrelid = 'user_preferences'::regclass
  ) THEN
    ALTER TABLE "user_preferences"
      ADD CONSTRAINT "user_preferences_resource_types_values_check"
      CHECK ("preferred_resource_types" <@ '["video","course","article","book","specification","tool","library","community"]'::jsonb);
  END IF;
END $$;