CREATE TYPE "public"."evidence_type" AS ENUM('Training', 'PAT_Testing', 'Equipment_Calibration', 'Health_and_Safety', 'Risk_Assessment', 'Infection_Control', 'Disability_Access', 'Cleanliness', 'Business_Continuity', 'Prescribing', 'Fire_Safety', 'Palliative_Care', 'CQC_Compliance_Report');--> statement-breakpoint
CREATE TYPE "public"."job" AS ENUM('doctor', 'nurse', 'business', 'admin', 'reception', 'pharmacy', 'physio', 'health visitor', 'dentist', 'dental therapist', 'hygienist');--> statement-breakpoint
CREATE TYPE "public"."module_status" AS ENUM('good', 'attention', 'critical');--> statement-breakpoint
CREATE TYPE "public"."policy_type" AS ENUM('Safeguarding', 'Complaints', 'Chaperoning', 'Medicine_Management', 'Repeat_Prescribing', 'Locum', 'Induction', 'Human_Resources');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('compliant', 'needs_review', 'non_compliant');--> statement-breakpoint
CREATE TYPE "public"."shift_pattern" AS ENUM('all day', 'am', 'pm', 'not in');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('permanent', 'temporary', 'locum', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."in_out" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('staff', 'poweruser', 'user');--> statement-breakpoint
CREATE TABLE "appraisal_evidence" (
	"practice_id" text NOT NULL,
	"file_name" text PRIMARY KEY NOT NULL,
	"file_path" text NOT NULL,
	"description" text,
	"employee_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"conversation_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversations_conversation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"practice_id" text NOT NULL,
	"participant_ids" text[] NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cqc_standards" (
	"regulation_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"key_question" text NOT NULL,
	"source_url" text,
	"last_checked_for_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"practice_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"vat_amount" numeric(10, 2),
	"total_amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"due_date" date,
	"paid_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"message_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "messages_message_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"conversation_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"blocked" boolean DEFAULT false,
	"block_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "people_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"practice_id" text NOT NULL,
	"file_name" text PRIMARY KEY NOT NULL,
	"file_path" text NOT NULL,
	"description" text,
	"policy_type" "policy_type" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "practice_evidence" (
	"practice_id" text NOT NULL,
	"file_name" text PRIMARY KEY NOT NULL,
	"file_path" text NOT NULL,
	"description" text,
	"evidence_type" "evidence_type" NOT NULL,
	"upload_date" timestamp DEFAULT now(),
	"status" "review_status" DEFAULT 'needs_review' NOT NULL,
	"standard_ids" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "practices" (
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text PRIMARY KEY NOT NULL,
	"cqc_registration_number" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "purchases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"practice_id" text NOT NULL,
	"description" text NOT NULL,
	"supplier" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"vat_amount" numeric(10, 2),
	"total_amount" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"receipt_url" text,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rotas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rotas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"practice_id" text NOT NULL,
	"day" text NOT NULL,
	"requirements" jsonb NOT NULL,
	"assignments" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"email" text PRIMARY KEY NOT NULL,
	"shift_pattern" "shift_pattern"
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"practice_id" text NOT NULL,
	"employee_id" text PRIMARY KEY NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"address" text,
	"date_of_birth" date,
	"ni_number" text,
	"position" "job" NOT NULL,
	"department" text NOT NULL,
	"start_date" date NOT NULL,
	"contract" "contract_type" NOT NULL,
	"salary" numeric(10, 2),
	"working_hours" "shift_pattern"[7],
	"annual_leave" integer DEFAULT 28,
	"study_leave" integer DEFAULT 5,
	"other_leave" integer DEFAULT 0,
	"professional_body" text,
	"professional_body_number" text,
	"appraisal_date" date,
	"appraisal_next" date,
	"revalidation_info" text,
	"dbs_check_expiry" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relation" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"transaction_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_transaction_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"practice_id" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" "in_out" NOT NULL,
	"subcategory" text,
	"date" date NOT NULL,
	"bank_reference" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_person_relation" (
	"user_id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"employee_id" text PRIMARY KEY NOT NULL,
	"hashed_password" text NOT NULL,
	"salt" text NOT NULL,
	"practice_id" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vat_returns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vat_returns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"practice_id" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"vat_due" numeric(10, 2) NOT NULL,
	"vat_reclaimed" numeric(10, 2) NOT NULL,
	"net_vat" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "appraisal_evidence" ADD CONSTRAINT "appraisal_evidence_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_evidence" ADD CONSTRAINT "appraisal_evidence_employee_id_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_evidence" ADD CONSTRAINT "practice_evidence_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_email_practices_email_fk" FOREIGN KEY ("email") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_employee_id_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_person_relation" ADD CONSTRAINT "user_person_relation_user_id_users_employee_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("employee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_person_relation" ADD CONSTRAINT "user_person_relation_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_people_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_practice_id_practices_email_fk" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("email") ON DELETE no action ON UPDATE no action;