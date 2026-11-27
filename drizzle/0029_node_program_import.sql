CREATE SCHEMA "academy_node";
--> statement-breakpoint
CREATE TABLE "academy_node"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sponsor_user_id" uuid,
	"placement_parent_user_id" uuid,
	"placement_side" varchar(5),
	"referral_code" varchar(24) NOT NULL,
	"status" varchar(10) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "accounts_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "academy_node"."bonus_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_version_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"direction" varchar(8) NOT NULL,
	"amount" bigint NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" uuid,
	"idempotency_key" varchar(150) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bonus_ledger_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "node_bonus_values_ck" CHECK ("academy_node"."bonus_ledger"."amount" >= 0 and "academy_node"."bonus_ledger"."points" >= 0),
	CONSTRAINT "node_bonus_direction_ck" CHECK ("academy_node"."bonus_ledger"."direction" in ('CREDIT', 'DEBIT'))
);
--> statement-breakpoint
CREATE TABLE "academy_node"."bonus_withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_amount" bigint NOT NULL,
	"status" varchar(12) DEFAULT 'REQUESTED' NOT NULL,
	"request_note" text,
	"bank_account_id" uuid,
	"bank_name" varchar(50),
	"account_number" varchar(50),
	"holder_name" varchar(100),
	"decision_note" text,
	"transfer_reference" varchar(100),
	"decided_by" uuid,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_bonus_withdrawal_amount_ck" CHECK ("academy_node"."bonus_withdrawals"."requested_amount" > 0),
	CONSTRAINT "node_bonus_withdrawal_status_ck" CHECK ("academy_node"."bonus_withdrawals"."status" in ('REQUESTED', 'APPROVED', 'REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "academy_node"."daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"active_nodes" integer NOT NULL,
	"capacity_points" integer NOT NULL,
	"available_points" integer DEFAULT 0 NOT NULL,
	"paid_points" integer DEFAULT 0 NOT NULL,
	"expired_points" integer DEFAULT 0 NOT NULL,
	"sponsor_bonus" bigint DEFAULT 0 NOT NULL,
	"level_bonus" bigint DEFAULT 0 NOT NULL,
	"pairing_bonus" bigint DEFAULT 0 NOT NULL,
	"total_bonus" bigint DEFAULT 0 NOT NULL,
	"status" varchar(12) DEFAULT 'PREVIEW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_daily_values_ck" CHECK ("academy_node"."daily_summaries"."active_nodes" >= 0 and "academy_node"."daily_summaries"."capacity_points" >= 0 and "academy_node"."daily_summaries"."available_points" >= 0 and "academy_node"."daily_summaries"."paid_points" >= 0 and "academy_node"."daily_summaries"."expired_points" >= 0 and "academy_node"."daily_summaries"."sponsor_bonus" >= 0 and "academy_node"."daily_summaries"."level_bonus" >= 0 and "academy_node"."daily_summaries"."pairing_bonus" >= 0 and "academy_node"."daily_summaries"."total_bonus" >= 0)
);
--> statement-breakpoint
CREATE TABLE "academy_node"."node_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topup_order_id" uuid NOT NULL,
	"rule_version_id" uuid NOT NULL,
	"issued_nodes" integer NOT NULL,
	"active_nodes" integer NOT NULL,
	"status" varchar(12) DEFAULT 'ACTIVE' NOT NULL,
	"activated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_lots_topup_order_id_unique" UNIQUE("topup_order_id"),
	CONSTRAINT "node_lots_counts_ck" CHECK ("academy_node"."node_lots"."issued_nodes" > 0 and "academy_node"."node_lots"."active_nodes" >= 0 and "academy_node"."node_lots"."active_nodes" <= "academy_node"."node_lots"."issued_nodes")
);
--> statement-breakpoint
CREATE TABLE "academy_node"."rule_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"status" varchar(10) DEFAULT 'DRAFT' NOT NULL,
	"node_price" integer DEFAULT 50000 NOT NULL,
	"sponsor_percent" integer DEFAULT 20 NOT NULL,
	"level_percent" integer DEFAULT 1 NOT NULL,
	"max_levels" integer DEFAULT 10 NOT NULL,
	"pairing_percent" integer DEFAULT 15 NOT NULL,
	"daily_point_multiplier" integer DEFAULT 16 NOT NULL,
	"effective_from" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rule_versions_version_unique" UNIQUE("version"),
	CONSTRAINT "node_rule_version_positive_ck" CHECK ("academy_node"."rule_versions"."version" > 0),
	CONSTRAINT "node_rule_price_positive_ck" CHECK ("academy_node"."rule_versions"."node_price" > 0),
	CONSTRAINT "node_rule_percent_range_ck" CHECK ("academy_node"."rule_versions"."sponsor_percent" between 0 and 100 and "academy_node"."rule_versions"."level_percent" between 0 and 100 and "academy_node"."rule_versions"."pairing_percent" between 0 and 100),
	CONSTRAINT "node_rule_limits_positive_ck" CHECK ("academy_node"."rule_versions"."max_levels" >= 0 and "academy_node"."rule_versions"."daily_point_multiplier" > 0)
);
--> statement-breakpoint
CREATE TABLE "academy_node"."topup_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_version_id" uuid NOT NULL,
	"node_count" integer NOT NULL,
	"node_price" integer NOT NULL,
	"amount" bigint NOT NULL,
	"status" varchar(12) DEFAULT 'DRAFT' NOT NULL,
	"payment_reference" varchar(100),
	"decision_note" text,
	"decided_by" uuid,
	"decided_at" timestamp,
	"paid_at" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "node_topup_positive_ck" CHECK ("academy_node"."topup_orders"."node_count" > 0 and "academy_node"."topup_orders"."node_price" > 0 and "academy_node"."topup_orders"."amount" > 0),
	CONSTRAINT "node_topup_amount_ck" CHECK ("academy_node"."topup_orders"."amount" = "academy_node"."topup_orders"."node_count"::bigint * "academy_node"."topup_orders"."node_price"::bigint)
);
--> statement-breakpoint
ALTER TABLE "academy_node"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."accounts" ADD CONSTRAINT "accounts_sponsor_user_id_users_id_fk" FOREIGN KEY ("sponsor_user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."accounts" ADD CONSTRAINT "accounts_placement_parent_user_id_users_id_fk" FOREIGN KEY ("placement_parent_user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."bonus_ledger" ADD CONSTRAINT "bonus_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."bonus_ledger" ADD CONSTRAINT "bonus_ledger_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "academy_node"."rule_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."bonus_withdrawals" ADD CONSTRAINT "bonus_withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."bonus_withdrawals" ADD CONSTRAINT "bonus_withdrawals_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "academy"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."bonus_withdrawals" ADD CONSTRAINT "bonus_withdrawals_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."node_lots" ADD CONSTRAINT "node_lots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."node_lots" ADD CONSTRAINT "node_lots_topup_order_id_topup_orders_id_fk" FOREIGN KEY ("topup_order_id") REFERENCES "academy_node"."topup_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."node_lots" ADD CONSTRAINT "node_lots_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "academy_node"."rule_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."rule_versions" ADD CONSTRAINT "rule_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."topup_orders" ADD CONSTRAINT "topup_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "academy"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."topup_orders" ADD CONSTRAINT "topup_orders_rule_version_id_rule_versions_id_fk" FOREIGN KEY ("rule_version_id") REFERENCES "academy_node"."rule_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academy_node"."topup_orders" ADD CONSTRAINT "topup_orders_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "academy"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_bonus_user_created_idx" ON "academy_node"."bonus_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "node_bonus_withdrawal_user_created_idx" ON "academy_node"."bonus_withdrawals" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "node_bonus_withdrawal_status_created_idx" ON "academy_node"."bonus_withdrawals" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "node_daily_summary_user_date_uq" ON "academy_node"."daily_summaries" USING btree ("user_id","business_date");--> statement-breakpoint
CREATE INDEX "node_daily_user_date_idx" ON "academy_node"."daily_summaries" USING btree ("user_id","business_date");--> statement-breakpoint
CREATE INDEX "node_lots_user_status_idx" ON "academy_node"."node_lots" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "node_topup_user_created_idx" ON "academy_node"."topup_orders" USING btree ("user_id","created_at");