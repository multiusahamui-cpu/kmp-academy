CREATE TABLE "academy"."job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar(40) NOT NULL,
	"trigger" varchar(10) NOT NULL,
	"status" varchar(8) NOT NULL,
	"affected" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp NOT NULL,
	"triggered_by" uuid
);
--> statement-breakpoint
ALTER TABLE "academy"."job_runs" ADD CONSTRAINT "job_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_runs_job_idx" ON "academy"."job_runs" USING btree ("job_id","started_at");