CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"messages" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_identifier" text NOT NULL,
	"company_name" text NOT NULL,
	"sector" text[] NOT NULL,
	"relevance_score" integer NOT NULL,
	"summary" text NOT NULL,
	"benefits" text[] NOT NULL,
	"matched_exhibitors_count" integer NOT NULL,
	"matched_exhibitor_ids" integer[],
	"analysis_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exhibitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sector" text NOT NULL,
	"country" text NOT NULL,
	"booth" text NOT NULL,
	"description" text NOT NULL,
	"logo_url" text,
	"website" text,
	"products" text[],
	"contact_email" text,
	"contact_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_email" text NOT NULL,
	"visitor_company" text NOT NULL,
	"exhibitor_id" integer NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
