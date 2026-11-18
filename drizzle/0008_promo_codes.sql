CREATE TABLE "academy"."course_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"code" varchar(20),
	"percent" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"batch_id" uuid,
	"created_by" uuid NOT NULL,
	"created_by_role" varchar(20) NOT NULL,
	"reason" text,
	"cancelled_at" timestamp,
	"cancelled_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."discount_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"amount_paid" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discount_redemptions_user_discount_unique" UNIQUE("discount_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "base_price" integer;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "discount_percent" integer;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "discount_id" uuid;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "amount_paid" integer;--> statement-breakpoint
ALTER TABLE "academy"."course_discounts" ADD CONSTRAINT "course_discounts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."course_discounts" ADD CONSTRAINT "course_discounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."course_discounts" ADD CONSTRAINT "course_discounts_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."discount_redemptions" ADD CONSTRAINT "discount_redemptions_discount_id_course_discounts_id_fk" FOREIGN KEY ("discount_id") REFERENCES "academy"."course_discounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."discount_redemptions" ADD CONSTRAINT "discount_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."discount_redemptions" ADD CONSTRAINT "discount_redemptions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_discounts_code_unique" ON "academy"."course_discounts" USING btree ("course_id","code") WHERE "academy"."course_discounts"."code" is not null;--> statement-breakpoint
CREATE INDEX "course_discounts_course_idx" ON "academy"."course_discounts" USING btree ("course_id");