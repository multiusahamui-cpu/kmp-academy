CREATE TABLE "academy"."helpdesk_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"is_staff" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academy"."helpdesk_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" varchar(150) NOT NULL,
	"category" varchar(12) NOT NULL,
	"status" varchar(10) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"closed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "academy"."helpdesk_messages" ADD CONSTRAINT "helpdesk_messages_ticket_id_helpdesk_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "academy"."helpdesk_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."helpdesk_messages" ADD CONSTRAINT "helpdesk_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy"."helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "helpdesk_messages_ticket_idx" ON "academy"."helpdesk_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "helpdesk_tickets_user_idx" ON "academy"."helpdesk_tickets" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "helpdesk_tickets_status_idx" ON "academy"."helpdesk_tickets" USING btree ("status","updated_at");