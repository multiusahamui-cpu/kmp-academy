CREATE TABLE "academy"."broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"title" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"audience" varchar(10) NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."management_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(8) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"snapshot" jsonb NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"read_by" uuid
);
--> statement-breakpoint
ALTER TABLE "academy"."broadcasts" ADD CONSTRAINT "broadcasts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."management_reports" ADD CONSTRAINT "management_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."management_reports" ADD CONSTRAINT "management_reports_read_by_users_id_fk" FOREIGN KEY ("read_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "management_reports_created_idx" ON "academy"."management_reports" USING btree ("created_at");