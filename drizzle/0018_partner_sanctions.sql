CREATE TABLE "academy"."partner_sanctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"reason" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"lifted_at" timestamp,
	"lifted_by" uuid,
	"lift_note" text
);
--> statement-breakpoint
ALTER TABLE "academy"."partner_sanctions" ADD CONSTRAINT "partner_sanctions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."partner_sanctions" ADD CONSTRAINT "partner_sanctions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."partner_sanctions" ADD CONSTRAINT "partner_sanctions_lifted_by_users_id_fk" FOREIGN KEY ("lifted_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_sanctions_user_idx" ON "academy"."partner_sanctions" USING btree ("user_id","created_at");