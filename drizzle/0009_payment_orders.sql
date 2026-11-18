CREATE TABLE "academy"."payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"course_id" uuid,
	"method" varchar(12) NOT NULL,
	"status" varchar(12) DEFAULT 'PENDING' NOT NULL,
	"amount" integer NOT NULL,
	"base_price" integer,
	"discount_percent" integer,
	"discount_id" uuid,
	"bank" varchar(10),
	"va_number" varchar(40),
	"gateway_status" varchar(30),
	"debit_tx_id" varchar(100),
	"proof_key" text,
	"proof_mime" varchar(60),
	"proof_sha256" varchar(64),
	"proof_uploaded_at" timestamp,
	"paid_reference" varchar(100),
	"paid_date" date,
	"decided_by" uuid,
	"decided_at" timestamp,
	"decision_note" text,
	"paid_at" timestamp,
	"enrollment_id" uuid,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payment_orders" ADD CONSTRAINT "payment_orders_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "academy"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."payment_orders" ADD CONSTRAINT "payment_orders_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_open_course_unique" ON "academy"."payment_orders" USING btree ("user_id","course_id") WHERE "academy"."payment_orders"."kind" = 'COURSE' and "academy"."payment_orders"."status" in ('PENDING','VERIFYING','CONFIRMING');--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_proof_sha_unique" ON "academy"."payment_orders" USING btree ("proof_sha256") WHERE "academy"."payment_orders"."proof_sha256" is not null;--> statement-breakpoint
CREATE INDEX "payment_orders_status_idx" ON "academy"."payment_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_user_idx" ON "academy"."payment_orders" USING btree ("user_id","created_at");