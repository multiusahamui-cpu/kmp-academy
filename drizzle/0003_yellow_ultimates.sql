ALTER TABLE "academy"."users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "academy"."users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");