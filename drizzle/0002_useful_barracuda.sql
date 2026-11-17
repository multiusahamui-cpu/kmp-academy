CREATE TYPE "academy"."application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "academy"."card_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_number" varchar(24) NOT NULL,
	"prefix" varchar(1) NOT NULL,
	"event" varchar(20) NOT NULL,
	"issued_by" uuid,
	"issued_by_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."role_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_role" varchar(20) NOT NULL,
	"profile" text NOT NULL,
	"experience" text NOT NULL,
	"status" "academy"."application_status" DEFAULT 'PENDING' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp,
	"decision_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"theme" varchar(10) DEFAULT 'light' NOT NULL,
	"language" varchar(5) DEFAULT 'id' NOT NULL,
	"notify_email" boolean DEFAULT true NOT NULL,
	"notify_in_app" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "card_number" varchar(24);--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "card_issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "digitalcoop_user_id" varchar(64);--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "member_number" varchar(32);--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "kyc_status" varchar(20);--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "wilayah" varchar(100);--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "consent_version" varchar(20);--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "linked_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."card_history" ADD CONSTRAINT "card_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."card_history" ADD CONSTRAINT "card_history_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."role_applications" ADD CONSTRAINT "role_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."role_applications" ADD CONSTRAINT "role_applications_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD CONSTRAINT "enrollments_user_course_unique" UNIQUE("user_id","course_id");--> statement-breakpoint
ALTER TABLE "academy"."users" ADD CONSTRAINT "users_card_number_unique" UNIQUE("card_number");--> statement-breakpoint
ALTER TABLE "academy"."users" ADD CONSTRAINT "users_digitalcoop_user_id_unique" UNIQUE("digitalcoop_user_id");