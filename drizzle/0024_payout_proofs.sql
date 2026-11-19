ALTER TABLE "academy"."payout_payees" ADD COLUMN "proof_key" text;--> statement-breakpoint
ALTER TABLE "academy"."payout_payees" ADD COLUMN "proof_mime" varchar(50);--> statement-breakpoint
ALTER TABLE "academy"."payout_payees" ADD COLUMN "proof_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "academy"."payout_payees" ADD COLUMN "proof_emailed_at" timestamp;