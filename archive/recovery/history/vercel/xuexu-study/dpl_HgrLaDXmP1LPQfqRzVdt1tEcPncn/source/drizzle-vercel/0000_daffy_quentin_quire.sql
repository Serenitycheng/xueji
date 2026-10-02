CREATE TABLE "study_ai_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"created_at" text NOT NULL,
	"cost" double precision DEFAULT 0 NOT NULL,
	"input" integer DEFAULT 0 NOT NULL,
	"output" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"result" text,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_ai_locks" (
	"user_id" text PRIMARY KEY NOT NULL,
	"expires" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"attempts" integer NOT NULL,
	"expires" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_secrets" (
	"user_id" text PRIMARY KEY NOT NULL,
	"cipher" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_ai_user_month" ON "study_ai_calls" USING btree ("user_id","month");