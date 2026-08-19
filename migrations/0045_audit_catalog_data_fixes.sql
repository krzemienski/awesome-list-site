-- Make the cycle-01 catalog corrections deployable. The WHERE clause makes the
-- migration idempotent: reruns do not touch updated_at once values match.
UPDATE "resources" AS resource
SET
  "title" = fix."desired_title",
  "url" = COALESCE(fix."desired_url", resource."url"),
  "updated_at" = now()
FROM (
  VALUES
    (
      185759,
      'Live Video Transmuxing/Transcoding Part I: FFmpeg vs TwitchTranscoder',
      NULL::text
    ),
    (
      185760,
      'Live Video Transmuxing/Transcoding Part II: FFmpeg vs TwitchTranscoder',
      'https://blog.twitch.tv/live-video-transmuxing-transcoding-ffmpeg-vs-twitchtranscoder-part-ii-4973f475f8a3'::text
    ),
    (
      186146,
      'Live Video Transmuxing/Transcoding Part I (Medium): FFmpeg vs TwitchTranscoder',
      NULL::text
    ),
    (
      186147,
      'Live Video Transmuxing/Transcoding Part II (Medium): FFmpeg vs TwitchTranscoder',
      NULL::text
    )
) AS fix("id", "desired_title", "desired_url")
WHERE resource."id" = fix."id"
  AND (
    resource."title" IS DISTINCT FROM fix."desired_title"
    OR (
      fix."desired_url" IS NOT NULL
      AND resource."url" IS DISTINCT FROM fix."desired_url"
    )
  );