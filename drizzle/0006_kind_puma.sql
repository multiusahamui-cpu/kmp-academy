ALTER TYPE "academy"."user_status" ADD VALUE 'ARCHIVED';--> statement-breakpoint
CREATE TABLE "academy"."account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(12) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_by_name" varchar(255),
	"decided_by_role" varchar(20),
	"decided_at" timestamp,
	"decision_note" text
);
--> statement-breakpoint
CREATE TABLE "academy"."balance_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"transfer_date" date NOT NULL,
	"bank_ref" varchar(100) NOT NULL,
	"note" text,
	"proof_file" varchar(100) NOT NULL,
	"proof_mime" varchar(50) NOT NULL,
	"settled_by" uuid,
	"settled_by_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."users" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "academy"."account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."balance_settlements" ADD CONSTRAINT "balance_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."balance_settlements" ADD CONSTRAINT "balance_settlements_request_id_account_deletion_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "academy"."account_deletion_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."balance_settlements" ADD CONSTRAINT "balance_settlements_settled_by_users_id_fk" FOREIGN KEY ("settled_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_deletion_one_pending" ON "academy"."account_deletion_requests" USING btree ("user_id") WHERE "academy"."account_deletion_requests"."status" = 'PENDING';