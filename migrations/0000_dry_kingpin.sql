CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"key" varchar NOT NULL,
	"name" varchar NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "awesome_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"repo_url" text NOT NULL,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "enrichment_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"filter" text DEFAULT 'all',
	"batch_size" integer DEFAULT 10,
	"total_resources" integer DEFAULT 0,
	"processed_resources" integer DEFAULT 0,
	"successful_resources" integer DEFAULT 0,
	"failed_resources" integer DEFAULT 0,
	"skipped_resources" integer DEFAULT 0,
	"processed_resource_ids" jsonb DEFAULT '[]'::jsonb,
	"failed_resource_ids" jsonb DEFAULT '[]'::jsonb,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"started_by" varchar,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrichment_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"error_message" text,
	"ai_metadata" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "github_sync_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_url" text NOT NULL,
	"direction" text NOT NULL,
	"commit_sha" text,
	"commit_message" text,
	"commit_url" text,
	"resources_added" integer DEFAULT 0,
	"resources_updated" integer DEFAULT 0,
	"resources_removed" integer DEFAULT 0,
	"total_resources" integer DEFAULT 0,
	"performed_by" varchar,
	"snapshot" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "github_sync_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_url" text NOT NULL,
	"branch" text DEFAULT 'main',
	"resource_ids" jsonb DEFAULT '[]'::jsonb,
	"action" text NOT NULL,
	"status" text DEFAULT 'pending',
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "journey_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"resource_id" integer,
	"step_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_optional" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learning_journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"difficulty" text DEFAULT 'beginner',
	"estimated_duration" text,
	"icon" text,
	"order_index" integer,
	"category" text NOT NULL,
	"status" text DEFAULT 'published',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" integer,
	"original_resource_id" integer,
	"action" text NOT NULL,
	"performed_by" varchar,
	"changes" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_edits" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" integer NOT NULL,
	"submitted_by" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"original_resource_updated_at" timestamp NOT NULL,
	"proposed_changes" jsonb NOT NULL,
	"proposed_data" jsonb NOT NULL,
	"claude_metadata" jsonb,
	"claude_analyzed_at" timestamp,
	"handled_by" varchar,
	"handled_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_tags" (
	"resource_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "resource_tags_resource_id_tag_id_pk" PRIMARY KEY("resource_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"sub_subcategory" text,
	"status" text DEFAULT 'approved',
	"submitted_by" varchar,
	"approved_by" varchar,
	"approved_at" timestamp,
	"github_synced" boolean DEFAULT false,
	"last_synced_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "resources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"subcategory_id" integer,
	CONSTRAINT "sub_subcategories_slug_subcategory_unique" UNIQUE("slug","subcategory_id")
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" integer,
	CONSTRAINT "subcategories_slug_category_unique" UNIQUE("slug","category_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_bookmarks" (
	"user_id" varchar NOT NULL,
	"resource_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_bookmarks_user_id_resource_id_pk" PRIMARY KEY("user_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"user_id" varchar NOT NULL,
	"resource_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_favorites_user_id_resource_id_pk" PRIMARY KEY("user_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"resource_id" integer NOT NULL,
	"interaction_type" text NOT NULL,
	"interaction_value" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_journey_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"journey_id" integer NOT NULL,
	"current_step_id" integer,
	"completed_steps" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp DEFAULT now(),
	"last_accessed_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "user_journey_unique" UNIQUE("user_id","journey_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"preferred_categories" jsonb DEFAULT '[]'::jsonb,
	"skill_level" text DEFAULT 'beginner' NOT NULL,
	"learning_goals" jsonb DEFAULT '[]'::jsonb,
	"preferred_resource_types" jsonb DEFAULT '[]'::jsonb,
	"time_commitment" text DEFAULT 'flexible',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"password" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_jobs" ADD CONSTRAINT "enrichment_jobs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_queue" ADD CONSTRAINT "enrichment_queue_job_id_enrichment_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."enrichment_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_queue" ADD CONSTRAINT "enrichment_queue_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_sync_history" ADD CONSTRAINT "github_sync_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_journey_id_learning_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."learning_journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_steps" ADD CONSTRAINT "journey_steps_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_log" ADD CONSTRAINT "resource_audit_log_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_audit_log" ADD CONSTRAINT "resource_audit_log_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_edits" ADD CONSTRAINT "resource_edits_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_edits" ADD CONSTRAINT "resource_edits_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_edits" ADD CONSTRAINT "resource_edits_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tags" ADD CONSTRAINT "resource_tags_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_tags" ADD CONSTRAINT "resource_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_subcategories" ADD CONSTRAINT "sub_subcategories_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_journey_progress" ADD CONSTRAINT "user_journey_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_journey_progress" ADD CONSTRAINT "user_journey_progress_journey_id_learning_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."learning_journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_journey_progress" ADD CONSTRAINT "user_journey_progress_current_step_id_journey_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."journey_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_user_id" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_key" ON "api_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_api_keys_expires_at" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_enrichment_jobs_status" ON "enrichment_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_enrichment_jobs_started_by" ON "enrichment_jobs" USING btree ("started_by");--> statement-breakpoint
CREATE INDEX "idx_enrichment_queue_job_id" ON "enrichment_queue" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_enrichment_queue_resource_id" ON "enrichment_queue" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_enrichment_queue_status" ON "enrichment_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_github_sync_history_repo" ON "github_sync_history" USING btree ("repository_url");--> statement-breakpoint
CREATE INDEX "idx_github_sync_history_direction" ON "github_sync_history" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "idx_github_sync_queue_status" ON "github_sync_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_journey_steps_journey_id" ON "journey_steps" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_journey_steps_resource_id" ON "journey_steps" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_resource_edits_resource_id" ON "resource_edits" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_resource_edits_status" ON "resource_edits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_resource_edits_submitted_by" ON "resource_edits" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "idx_resources_status" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_resources_status_category" ON "resources" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "idx_resources_category" ON "resources" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_user_id" ON "user_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_resource_id" ON "user_interactions" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_type" ON "user_interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX "idx_user_journey_progress_user_id" ON "user_journey_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_journey_progress_journey_id" ON "user_journey_progress" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_user_preferences_user_id" ON "user_preferences" USING btree ("user_id");