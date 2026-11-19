ALTER TABLE "academy"."courses" ADD COLUMN "content_source_id" uuid;--> statement-breakpoint
-- Workshop yang sudah disetujui sebelum kolom ini ada: arahkan materinya ke kursus sumber proposalnya.
UPDATE "academy"."courses" c SET "content_source_id" = p."source_course_id" FROM "academy"."workshop_proposals" p WHERE p."workshop_course_id" = c."id" AND p."status" = 'APPROVED' AND c."content_source_id" IS NULL;
