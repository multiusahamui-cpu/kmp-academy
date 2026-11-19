ALTER TABLE "academy"."enrollments" ADD COLUMN "creator_share_percent" integer;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "creator_share" integer;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "platform_share" integer;--> statement-breakpoint
UPDATE "academy"."enrollments" SET "creator_share_percent" = 70, "creator_share" = floor("amount_paid" * 70 / 100.0)::int, "platform_share" = "amount_paid" - floor("amount_paid" * 70 / 100.0)::int WHERE "amount_paid" IS NOT NULL;