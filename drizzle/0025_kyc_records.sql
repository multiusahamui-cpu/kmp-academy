CREATE TABLE "academy"."kyc_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"actor_id" uuid,
	"file" varchar(10) NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."kyc_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(12) NOT NULL,
	"source" varchar(12) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"nik_enc" text NOT NULL,
	"nik_last4" varchar(4) NOT NULL,
	"nik_fingerprint" varchar(64) NOT NULL,
	"ktp_key" text NOT NULL,
	"ktp_mime" varchar(40) NOT NULL,
	"selfie_key" text NOT NULL,
	"selfie_mime" varchar(40) NOT NULL,
	"reject_note" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "academy"."kyc_access_log" ADD CONSTRAINT "kyc_access_log_record_id_kyc_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "academy"."kyc_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."kyc_access_log" ADD CONSTRAINT "kyc_access_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."kyc_records" ADD CONSTRAINT "kyc_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."kyc_records" ADD CONSTRAINT "kyc_records_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_records_user_uq" ON "academy"."kyc_records" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_records_nik_active_uq" ON "academy"."kyc_records" USING btree ("nik_fingerprint") WHERE status <> 'REJECTED';--> statement-breakpoint
CREATE INDEX "kyc_records_status_idx" ON "academy"."kyc_records" USING btree ("status");