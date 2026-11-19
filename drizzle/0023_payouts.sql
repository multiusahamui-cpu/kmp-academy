CREATE TABLE "academy"."payout_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cutoff_at" timestamp NOT NULL,
	"status" varchar(10) DEFAULT 'POSTED' NOT NULL,
	"posted_by" uuid,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"voided_by" uuid,
	"voided_at" timestamp,
	"void_note" text,
	"completed_at" timestamp,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"gross_total" integer DEFAULT 0 NOT NULL,
	"owner_total" integer DEFAULT 0 NOT NULL,
	"mentor_total" integer DEFAULT 0 NOT NULL,
	"platform_total" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."payout_payees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"owner_amount" integer DEFAULT 0 NOT NULL,
	"mentor_amount" integer DEFAULT 0 NOT NULL,
	"amount" integer NOT NULL,
	"status" varchar(8) DEFAULT 'PENDING' NOT NULL,
	"bank_name" varchar(50),
	"account_number" varchar(50),
	"holder_name" varchar(100),
	"transfer_ref" varchar(100),
	"note" text,
	"paid_at" timestamp,
	"paid_by" uuid
);
--> statement-breakpoint
ALTER TABLE "academy"."enrollments" ADD COLUMN "payout_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "academy"."payout_batches" ADD CONSTRAINT "payout_batches_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payout_batches" ADD CONSTRAINT "payout_batches_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payout_batches" ADD CONSTRAINT "payout_batches_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payout_payees" ADD CONSTRAINT "payout_payees_batch_id_payout_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "academy"."payout_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payout_payees" ADD CONSTRAINT "payout_payees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payout_payees" ADD CONSTRAINT "payout_payees_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payout_batches_cutoff_uq" ON "academy"."payout_batches" USING btree ("cutoff_at") WHERE status <> 'VOID';--> statement-breakpoint
CREATE INDEX "payout_batches_status_idx" ON "academy"."payout_batches" USING btree ("status","cutoff_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payout_payees_batch_user_uq" ON "academy"."payout_payees" USING btree ("batch_id","user_id");--> statement-breakpoint
CREATE INDEX "payout_payees_user_idx" ON "academy"."payout_payees" USING btree ("user_id");