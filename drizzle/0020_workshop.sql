CREATE TABLE "academy"."workshop_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_course_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"status" varchar(10) DEFAULT 'PENDING' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp,
	"decision_note" text,
	"workshop_course_id" uuid,
	"class_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "mentor_id" uuid;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "mentor_share_percent" integer;--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "mentor_share" integer;--> statement-breakpoint
ALTER TABLE "academy"."mentor_classes" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "academy"."workshop_proposals" ADD CONSTRAINT "workshop_proposals_source_course_id_courses_id_fk" FOREIGN KEY ("source_course_id") REFERENCES "academy"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."workshop_proposals" ADD CONSTRAINT "workshop_proposals_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."workshop_proposals" ADD CONSTRAINT "workshop_proposals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."workshop_proposals" ADD CONSTRAINT "workshop_proposals_workshop_course_id_courses_id_fk" FOREIGN KEY ("workshop_course_id") REFERENCES "academy"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."workshop_proposals" ADD CONSTRAINT "workshop_proposals_class_id_mentor_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "academy"."mentor_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workshop_proposals_mentor_idx" ON "academy"."workshop_proposals" USING btree ("mentor_id","created_at");--> statement-breakpoint
CREATE INDEX "workshop_proposals_status_idx" ON "academy"."workshop_proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_proposals_pending_uq" ON "academy"."workshop_proposals" USING btree ("mentor_id","source_course_id") WHERE status = 'PENDING';--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD CONSTRAINT "enrollments_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."mentor_classes" ADD CONSTRAINT "mentor_classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE set null ON UPDATE no action;