CREATE TABLE "academy"."class_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"grade" integer,
	"grade_note" text,
	"graded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "academy"."class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"starts_at" timestamp NOT NULL,
	"meeting_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."mentor_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"join_code" varchar(8) NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."class_members" ADD CONSTRAINT "class_members_class_id_mentor_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "academy"."mentor_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."class_members" ADD CONSTRAINT "class_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."class_sessions" ADD CONSTRAINT "class_sessions_class_id_mentor_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "academy"."mentor_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."mentor_classes" ADD CONSTRAINT "mentor_classes_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_members_class_user_uq" ON "academy"."class_members" USING btree ("class_id","user_id");--> statement-breakpoint
CREATE INDEX "class_members_user_idx" ON "academy"."class_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "class_sessions_class_idx" ON "academy"."class_sessions" USING btree ("class_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mentor_classes_join_code_uq" ON "academy"."mentor_classes" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX "mentor_classes_mentor_idx" ON "academy"."mentor_classes" USING btree ("mentor_id");