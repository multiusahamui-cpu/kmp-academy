ALTER TABLE "academy"."notifications" ADD COLUMN "category" varchar(12) DEFAULT 'INFO' NOT NULL;--> statement-breakpoint
ALTER TABLE "academy"."notifications" ADD COLUMN "emailed_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."notifications" ADD COLUMN "email_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "academy"."user_preferences" ADD COLUMN "muted_categories" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "academy"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_email_pending_idx" ON "academy"."notifications" USING btree ("created_at") WHERE "academy"."notifications"."emailed_at" is null;