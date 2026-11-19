CREATE TABLE "academy"."talent_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"sender_name" varchar(100) NOT NULL,
	"company" varchar(120) NOT NULL,
	"sender_email" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."talent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(60) NOT NULL,
	"headline" varchar(120) NOT NULL,
	"bio" text NOT NULL,
	"city" varchar(100),
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"linkedin_url" text,
	"portfolio_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp,
	"consent_version" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."talent_inquiries" ADD CONSTRAINT "talent_inquiries_profile_id_talent_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "academy"."talent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."talent_profiles" ADD CONSTRAINT "talent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "talent_inquiries_profile_idx" ON "academy"."talent_inquiries" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "talent_profiles_user_uq" ON "academy"."talent_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "talent_profiles_slug_uq" ON "academy"."talent_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "talent_profiles_public_idx" ON "academy"."talent_profiles" USING btree ("is_public");