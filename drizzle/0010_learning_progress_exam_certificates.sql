CREATE TABLE "academy"."certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial" varchar(30) NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"attempt_id" uuid,
	"student_name" varchar(255) NOT NULL,
	"course_title" varchar(255) NOT NULL,
	"course_type" varchar(20) NOT NULL,
	"instructor_name" varchar(255) NOT NULL,
	"grade" integer,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_user_course_unique" UNIQUE("user_id","course_id"),
	CONSTRAINT "certificates_serial_unique" UNIQUE("serial")
);
--> statement-breakpoint
CREATE TABLE "academy"."exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" varchar(12) DEFAULT 'IN_PROGRESS' NOT NULL,
	"question_order" jsonb NOT NULL,
	"answers" jsonb,
	"total_questions" integer NOT NULL,
	"correct_count" integer,
	"score" integer,
	"passing_grade" integer NOT NULL,
	"passed" boolean,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"deadline_at" timestamp NOT NULL,
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "academy"."module_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_progress_user_module_unique" UNIQUE("user_id","module_id")
);
--> statement-breakpoint
ALTER TABLE "academy"."certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."exam_attempts" ADD CONSTRAINT "exam_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."module_progress" ADD CONSTRAINT "module_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."module_progress" ADD CONSTRAINT "module_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."module_progress" ADD CONSTRAINT "module_progress_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "academy"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempts_open_unique" ON "academy"."exam_attempts" USING btree ("user_id","course_id") WHERE "academy"."exam_attempts"."status" = 'IN_PROGRESS';--> statement-breakpoint
CREATE INDEX "exam_attempts_user_course_idx" ON "academy"."exam_attempts" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "module_progress_user_course_idx" ON "academy"."module_progress" USING btree ("user_id","course_id");