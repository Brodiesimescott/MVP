import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['staff', 'poweruser', 'user']);
export const moduleStatusEnum = pgEnum('module_status', ['good', 'attention', 'critical']);
export const staffContractTypeEnum = pgEnum('contract_type', ['permanent', 'temporary', 'locum', 'contractor']);
export const reviewStatusEnum = pgEnum('review_status', ['compliant', 'needs_review', 'non_compliant']);
export const transactionCategoryEnum = pgEnum('transaction_category', ['income', 'expense']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  salt: text("salt").notNull(),
  practiceId: varchar("practice_id").notNull(),
  role: userRoleEnum("role").notNull().default('user'),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Practices table
export const practices = pgTable("practices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  cqcRegistrationNumber: text("cqc_registration_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff table
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  employeeId: text("employee_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: text("date_of_birth"),
  niNumber: text("ni_number"),
  position: text("position").notNull(),
  department: text("department").notNull(),
  startDate: text("start_date").notNull(),
  contractType: staffContractTypeEnum("contract_type").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  workingHours: text("working_hours"),
  annualLeave: integer("annual_leave").default(28),
  studyLeave: integer("study_leave").default(5),
  otherLeave: integer("other_leave").default(0),
  professionalBody: text("professional_body"),
  professionalBodyNumber: text("professional_body_number"),
  appraisalDate: text("appraisal_date"),
  revalidationInfo: text("revalidation_info"),
  dbsCheckExpiry: text("dbs_check_expiry"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  status: text("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
});

// CQC Standards table
export const cqcStandards = pgTable("cqc_standards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regulationId: text("regulation_id").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  keyQuestion: text("key_question").notNull(),
  sourceUrl: text("source_url"),
  lastCheckedForUpdate: timestamp("last_checked_for_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Practice Evidence table
export const practiceEvidence = pgTable("practice_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  fileName: text("file_name").notNull(),
  description: text("description"),
  uploadDate: timestamp("upload_date").defaultNow(),
  reviewStatus: reviewStatusEnum("review_status").notNull().default('needs_review'),
  standardIds: text("standard_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  participantIds: text("participant_ids").array().notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  blocked: boolean("blocked").default(false),
  blockReason: text("block_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: transactionCategoryEnum("category").notNull(),
  subcategory: text("subcategory"),
  date: text("date").notNull(),
  bankReference: text("bank_reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default('draft'),
  dueDate: text("due_date"),
  paidDate: text("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchases table
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  description: text("description").notNull(),
  supplier: text("supplier").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  receiptUrl: text("receipt_url"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// VAT Returns table
export const vatReturns = pgTable("vat_returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  practiceId: varchar("practice_id").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  vatDue: decimal("vat_due", { precision: 10, scale: 2 }).notNull(),
  vatReclaimed: decimal("vat_reclaimed", { precision: 10, scale: 2 }).notNull(),
  netVat: decimal("net_vat", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default('draft'),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
});

export const insertCqcStandardSchema = createInsertSchema(cqcStandards).omit({
  id: true,
  createdAt: true,
  lastCheckedForUpdate: true,
});

export const insertPracticeEvidenceSchema = createInsertSchema(practiceEvidence).omit({
  id: true,
  createdAt: true,
  uploadDate: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export const insertVatReturnSchema = createInsertSchema(vatReturns).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Practice = typeof practices.$inferSelect;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type CqcStandard = typeof cqcStandards.$inferSelect;
export type InsertCqcStandard = z.infer<typeof insertCqcStandardSchema>;

export type PracticeEvidence = typeof practiceEvidence.$inferSelect;
export type InsertPracticeEvidence = z.infer<typeof insertPracticeEvidenceSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type VatReturn = typeof vatReturns.$inferSelect;
export type InsertVatReturn = z.infer<typeof insertVatReturnSchema>;
