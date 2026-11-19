CREATE TABLE "academy"."role_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"action" varchar(8) NOT NULL,
	"from_role" varchar(20) NOT NULL,
	"to_role" varchar(20) NOT NULL,
	"note" text NOT NULL,
	"actor_id" uuid,
	"actor_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."role_appointments" ADD CONSTRAINT "role_appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."role_appointments" ADD CONSTRAINT "role_appointments_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "role_appointments_created_idx" ON "academy"."role_appointments" USING btree ("created_at");