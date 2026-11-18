CREATE TABLE "academy"."course_exam_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."course_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"type" varchar(10) NOT NULL,
	"content_key" text,
	"content_mime" varchar(50),
	"content_size" integer,
	"text_content" text,
	"is_free_preview" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "license_accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "license_version" varchar(10);--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "exam_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "exam_passing_grade" integer DEFAULT 70 NOT NULL;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "exam_duration_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "academy"."course_exam_questions" ADD CONSTRAINT "course_exam_questions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_exam_questions_course_idx" ON "academy"."course_exam_questions" USING btree ("course_id","position");--> statement-breakpoint
CREATE INDEX "course_modules_course_idx" ON "academy"."course_modules" USING btree ("course_id","position");--> statement-breakpoint
ALTER TABLE "academy"."courses" ADD CONSTRAINT "courses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;