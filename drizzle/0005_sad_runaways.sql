CREATE TABLE "academy"."email_change_requests" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"new_email" varchar(255) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academy"."email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE cascade ON UPDATE no action;