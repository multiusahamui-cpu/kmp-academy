CREATE TABLE "academy"."system_config" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."system_config_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"old_value" text,
	"new_value" text NOT NULL,
	"changed_by" uuid,
	"changed_by_name" varchar(255),
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."system_config" ADD CONSTRAINT "system_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."system_config_history" ADD CONSTRAINT "system_config_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;