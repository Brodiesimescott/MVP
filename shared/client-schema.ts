import { z } from "zod";

// Enum values (client-safe)
export const USER_ROLES = ["staff", "poweruser", "user"] as const;
export const JOBS = [
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
] as const;
export const MODULE_STATUSES = ["good", "attention", "critical"] as const;
export const CONTRACT_TYPES = [
  "permanent",
  "temporary",
  "locum",
  "contractor",
] as const;
export const REVIEW_STATUSES = [
  "compliant",
  "needs_review",
  "non_compliant",
] as const;
export const SHIFTS = ["all day", "am", "pm", "not in"] as const;
export const TRANSACTION_CATEGORIES = ["income", "expense"] as const;

// Zod schemas for validation (client-safe)
export const insertUserSchema = z.object({
  employeeId: z.string(),
  hashedPassword: z.string(),
  salt: z.string(),
  practiceId: z.string(),
  role: z.enum(USER_ROLES).default("user"),
});

export const insertPersonSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

export const insertStaffSchema = z.object({
  practiceId: z.string(),
  employeeId: z.string(),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.date().optional(),
  niNumber: z.string().optional(),
  position: z.enum(JOBS),
  department: z.string(),
  startDate: z.date(),
  contract: z.enum(CONTRACT_TYPES),
  salary: z.number().optional(),
  workingHours: z.array(z.enum(SHIFTS)).max(5).optional(),
  annualLeave: z.number().default(28).optional(),
  studyLeave: z.number().default(5).optional(),
  otherLeave: z.number().default(0).optional(),
  professionalBody: z.string().optional(),
  professionalBodyNumber: z.string().optional(),
  appraisalDate: z.date().optional(),
  revalidationInfo: z.string().optional(),
  dbsCheckExpiry: z.date().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  status: z.string().default("active").optional(),
});

export const insertCqcStandardSchema = z.object({
  regulationId: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  keyQuestion: z.string(),
  sourceUrl: z.string().optional(),
});

export const insertPracticeEvidenceSchema = z.object({
  practiceId: z.string(),
  fileName: z.string(),
  description: z.string().optional(),
  reviewStatus: z.enum(REVIEW_STATUSES).default("needs_review"),
  standardIds: z.array(z.string()).optional(),
});

export const insertConversationSchema = z.object({
  practiceId: z.string(),
  participantIds: z.array(z.string()),
  title: z.string().optional(),
});

export const insertMessageSchema = z.object({
  conversationId: z.number(),
  senderId: z.string(),
  content: z.string(),
  blocked: z.boolean().default(false).optional(),
  blockReason: z.string().optional(),
});

export const insertTransactionSchema = z.object({
  practiceId: z.string(),
  description: z.string(),
  amount: z.string(),
  category: z.enum(TRANSACTION_CATEGORIES),
  subcategory: z.string().optional(),
  date: z.date(),
  bankReference: z.string().optional(),
});

export const insertInvoiceSchema = z.object({
  practiceId: z.string(),
  invoiceNumber: z.string(),
  clientName: z.string(),
  clientEmail: z.string().optional(),
  description: z.string(),
  amount: z.string(),
  vatAmount: z.string().optional(),
  totalAmount: z.string(),
  status: z.string().default("draft").optional(),
  dueDate: z.date().optional(),
  paidDate: z.date().optional(),
});

export const insertPurchaseSchema = z.object({
  practiceId: z.string(),
  description: z.string(),
  supplier: z.string(),
  amount: z.string(),
  vatAmount: z.string().optional(),
  totalAmount: z.string(),
  category: z.string(),
  receiptUrl: z.string().optional(),
  date: z.date(),
});

export const insertVatReturnSchema = z.object({
  practiceId: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  vatDue: z.string(),
  vatReclaimed: z.string(),
  netVat: z.string(),
  status: z.string().default("draft").optional(),
  submittedAt: z.date().optional(),
});

export const insertShiftSchema = z.object({
  email: z.string(),
  mon: z.enum(SHIFTS).optional(),
  tue: z.enum(SHIFTS).optional(),
  wed: z.enum(SHIFTS).optional(),
  thu: z.enum(SHIFTS).optional(),
  fri: z.enum(SHIFTS).optional(),
});

// TypeScript types (inferred from Zod schemas)
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type InsertCqcStandard = z.infer<typeof insertCqcStandardSchema>;
export type InsertPracticeEvidence = z.infer<
  typeof insertPracticeEvidenceSchema
>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertVatReturn = z.infer<typeof insertVatReturnSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;

// Select types (for data coming from the server)
export type User = {
  employeeId: string;
  hashedPassword: string;
  salt: string;
  practiceId: string;
  role: (typeof USER_ROLES)[number];
  createdAt: Date | null;
};

export type Practice = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string;
  cqcRegistrationNumber: string | null;
  createdAt: Date | null;
};

export type Staff = {
  practiceId: string;
  employeeId: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  niNumber: string | null;
  position: (typeof JOBS)[number];
  department: string;
  startDate: Date;
  contract: (typeof CONTRACT_TYPES)[number];
  salary: string | null;
  workingHours: (typeof SHIFTS)[number][] | null;
  annualLeave: number | null;
  studyLeave: number | null;
  otherLeave: number | null;
  professionalBody: string | null;
  professionalBodyNumber: string | null;
  appraisalDate: Date | null;
  revalidationInfo: string | null;
  dbsCheckExpiry: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  status: string | null;
  createdAt: Date | null;
};

export type CqcStandard = {
  regulationId: string;
  title: string;
  summary: string | null;
  keyQuestion: string;
  sourceUrl: string | null;
  lastCheckedForUpdate: Date | null;
  createdAt: Date | null;
};

export type PracticeEvidence = {
  practiceId: string;
  fileName: string;
  description: string | null;
  uploadDate: Date | null;
  reviewStatus: (typeof REVIEW_STATUSES)[number];
  standardIds: string[] | null;
  createdAt: Date | null;
};

export type Conversation = {
  id: number;
  practiceId: string;
  participantIds: string[];
  title: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type Message = {
  id: number;
  conversationId: number;
  senderId: string;
  content: string;
  blocked: boolean | null;
  blockReason: string | null;
  createdAt: Date | null;
};

export type Transaction = {
  id: number;
  practiceId: string;
  description: string;
  amount: string;
  category: (typeof TRANSACTION_CATEGORIES)[number];
  subcategory: string | null;
  date: string;
  bankReference: string | null;
  createdAt: Date | null;
};

export type Invoice = {
  id: number;
  practiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string | null;
  description: string;
  amount: string;
  vatAmount: string | null;
  totalAmount: string;
  status: string | null;
  dueDate: Date | null;
  paidDate: Date | null;
  createdAt: Date | null;
};

export type Purchase = {
  id: number;
  practiceId: string;
  description: string;
  supplier: string;
  amount: string;
  vatAmount: string | null;
  totalAmount: string;
  category: string;
  receiptUrl: string | null;
  date: Date;
  createdAt: Date | null;
};

export type VatReturn = {
  id: number;
  practiceId: string;
  periodStart: Date;
  periodEnd: Date;
  vatDue: string;
  vatReclaimed: string;
  netVat: string;
  status: string | null;
  submittedAt: Date | null;
  createdAt: Date | null;
};

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type Shift = {
  email: string;
  mon: (typeof SHIFTS)[number] | null;
  tue: (typeof SHIFTS)[number] | null;
  wed: (typeof SHIFTS)[number] | null;
  thu: (typeof SHIFTS)[number] | null;
  fri: (typeof SHIFTS)[number] | null;
};
