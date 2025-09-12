import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  pgEnum,
  primaryKey,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
//staff is doctors nurses and janitors etc user is admin staff and poweruser practice manager
export const userRoleEnum = pgEnum("user_role", ["staff", "poweruser", "user"]);
export const jobEnum = pgEnum("job", [
  "doctor",
  "nurse",
  "business",
  "admin",
  "reception",
  "pharmacy",
  "physio",
  "health visitor",
  "dentist",
  "dental therapist",
  "hygienist",
]);
export const moduleStatusEnum = pgEnum("module_status", [
  "good",
  "attention",
  "critical",
]);
export const staffContractTypeEnum = pgEnum("contract_type", [
  "permanent",
  "temporary",
  "locum",
  "contractor",
]);
export const reviewStatusEnum = pgEnum("review_status", [
  "compliant",
  "needs_review",
  "non_compliant",
]);
export const shiftEnum = pgEnum("shift_pattern", [
  "all day",
  "am",
  "pm",
  "not in",
]);
export const transactionCategoryEnum = pgEnum("in_out", ["income", "expense"]);

// Users table
export const users = pgTable("users", {
  employeeId: text("employee_id")
    .primaryKey()
    .references(() => people.id, { onDelete: "no action" })
    .notNull(),
  hashedPassword: text("hashed_password").notNull(),
  salt: text("salt").notNull(),
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

//People table
export const people = pgTable("users", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
});

// Practices table
export const practices = pgTable("practices", {
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email").primaryKey(),
  cqcRegistrationNumber: text("cqc_registration_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shifts = pgTable("shifts", {
  email: text("email")
    .primaryKey()
    .references(() => practices.email, { onDelete: "no action" }),
  mon: shiftEnum("shift_pattern"),
  tue: shiftEnum("shift_pattern"),
  wed: shiftEnum("shift_pattern"),
  thu: shiftEnum("shift_pattern"),
  fri: shiftEnum("shift_pattern"),
});

// Staff table
export const staff = pgTable("staff", {
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  employeeId: text("employee_id")
    .references(() => people.id, { onDelete: "no action" })
    .notNull()
    .primaryKey(),
  title: text("title"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: date("date_of_birth"),
  niNumber: text("ni_number"),
  position: jobEnum("position").notNull(),
  department: text("department").notNull(),
  startDate: date("start_date").notNull(),
  contract: staffContractTypeEnum("contract").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  workingHours: shiftEnum("working_hours").array(5),
  annualLeave: integer("annual_leave").default(28),
  studyLeave: integer("study_leave").default(5),
  otherLeave: integer("other_leave").default(0),
  professionalBody: text("professional_body"),
  professionalBodyNumber: text("professional_body_number"),
  appraisalDate: date("appraisal_date"),
  revalidationInfo: text("revalidation_info"),
  dbsCheckExpiry: text("dbs_check_expiry"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CQC Standards table
export const cqcStandards = pgTable("cqc_standards", {
  regulationId: text("regulation_id").primaryKey().notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  keyQuestion: text("key_question").notNull(),
  sourceUrl: text("source_url"),
  lastCheckedForUpdate: timestamp("last_checked_for_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Practice Evidence table
export const practiceEvidence = pgTable("practice_evidence", {
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  fileName: text("file_name").notNull().primaryKey(),
  description: text("description"),
  uploadDate: timestamp("upload_date").defaultNow(),
  reviewStatus: reviewStatusEnum("status").notNull().default("needs_review"),
  standardIds: text("standard_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Appraisal Evidence table
export const appraisalEvidence = pgTable("appraisal_evidence", {
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  fileName: text("file_name").notNull().primaryKey(),
  path: text("file_path").notNull(),
  description: text("description"),
  employeeId: text("employee_id")
    .references(() => people.id, { onDelete: "no action" })
    .notNull(),
  reviewStatus: reviewStatusEnum("review_status").notNull().default("needs_review"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: integer("conversation_id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  participantIds: text("participant_ids").array().notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: integer("message_id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, { onDelete: "no action" })
    .notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  blocked: boolean("blocked").default(false),
  blockReason: text("block_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: integer("transaction_id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: transactionCategoryEnum("category").notNull(),
  subcategory: text("subcategory"),
  date: date("date").notNull(),
  bankReference: text("bank_reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  dueDate: date("due_date"),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchases table
export const purchases = pgTable("purchases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  description: text("description").notNull(),
  supplier: text("supplier").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  receiptUrl: text("receipt_url"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// VAT Returns table
export const vatReturns = pgTable("vat_returns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: text("practice_id")
    .references(() => practices.email, { onDelete: "no action" })
    .notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  vatDue: decimal("vat_due", { precision: 10, scale: 2 }).notNull(),
  vatReclaimed: decimal("vat_reclaimed", { precision: 10, scale: 2 }).notNull(),
  netVat: decimal("net_vat", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

//relational tables
export const userPersonRelation = pgTable("user_person_relation", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.employeeId, { onDelete: "cascade" })
    .notNull(),
  personId: text("person_id")
    .references(() => people.id, { onDelete: "cascade" })
    .notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});

export const insertPersonSchema = createInsertSchema(people);

export const insertStaffSchema = createInsertSchema(staff).omit({
  createdAt: true,
});

export const insertCqcStandardSchema = createInsertSchema(cqcStandards).omit({
  createdAt: true,
  lastCheckedForUpdate: true,
});

export const insertPracticeEvidenceSchema = createInsertSchema(
  practiceEvidence,
).omit({
  createdAt: true,
  uploadDate: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  createdAt: true,
});

export const insertVatReturnSchema = createInsertSchema(vatReturns).omit({
  createdAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Practice = typeof practices.$inferSelect;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type CqcStandard = typeof cqcStandards.$inferSelect;
export type InsertCqcStandard = z.infer<typeof insertCqcStandardSchema>;

export type PracticeEvidence = typeof practiceEvidence.$inferSelect;
export type InsertPracticeEvidence = z.infer<
  typeof insertPracticeEvidenceSchema
>;

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

export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type AppraisalEvidence = typeof appraisalEvidence.$inferSelect;
export type InsertAppraisalEvidence = typeof appraisalEvidence.$inferInsert;
