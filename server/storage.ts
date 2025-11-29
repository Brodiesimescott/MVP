import {
  users,
  people,
  practices,
  staff,
  shifts,
  appraisalEvidence,
  policies,
  cqcStandards,
  practiceEvidence,
  messages,
  conversations,
  transactions,
  invoices,
  purchases,
  vatReturns,
  rotas,
  practiceComplianceScores,
  type User,
  type InsertUser,
  type Staff,
  type InsertStaff,
  type CqcStandard,
  type InsertCqcStandard,
  type PracticeEvidence,
  type InsertPracticeEvidence,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Transaction,
  type InsertTransaction,
  type Invoice,
  type InsertInvoice,
  type Purchase,
  type InsertPurchase,
  type VatReturn,
  type InsertVatReturn,
  type Practice,
  type InsertPractice,
  type Person,
  type InsertPerson,
  type AppraisalEvidence,
  type InsertAppraisalEvidence,
  type Policy,
  type InsertPolicy,
  type Rota,
  type InsertRota,
  type Shift,
  type InsertShift,
} from "@shared/schema";
import { db } from "@shared/index";
import { eq, and, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Person methods
  getPerson(id: string): Promise<Person | undefined>;
  getPersonByEmail(email: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(
    id: string,
    person: Partial<InsertPerson>,
  ): Promise<Person | undefined>;

  // Practice methods
  getPractice(email: string): Promise<Practice | undefined>;
  createPractice(practice: InsertPractice): Promise<Practice>;

  // Staff methods
  getStaffByPractice(practiceId: string): Promise<Staff[]>;
  getStaff(id: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(
    id: string,
    staff: Partial<InsertStaff>,
  ): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;

  // Shift methods
  getShift(email: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(
    email: string,
    shift: Partial<InsertShift>,
  ): Promise<Shift | undefined>;

  getAppraisalsByPractice(practiceId: string): Promise<AppraisalEvidence[]>;
  createAppraisal(
    evidence: InsertAppraisalEvidence,
  ): Promise<AppraisalEvidence>;

  getPoliciesByPractice(practiceId: string): Promise<Policy[]>;
  createPolicy(evidence: InsertPolicy): Promise<Policy>;

  // CQC methods
  getCqcStandards(): Promise<CqcStandard[]>;
  createCqcStandard(standard: InsertCqcStandard): Promise<CqcStandard>;
  getPracticeEvidence(practiceId: string): Promise<PracticeEvidence[]>;
  createPracticeEvidence(
    evidence: InsertPracticeEvidence,
  ): Promise<PracticeEvidence>;
  updatePracticeComplianceScores(
    practiceId: string,
    scores: {
      Safe: number;
      Effective: number;
      Caring: number;
      Responsive: number;
      WellLed: number;
    },
  ): Promise<void>;
  getPracticeComplianceScores(practiceId: string): Promise<{
    Safe: number;
    Effective: number;
    Caring: number;
    Responsive: number;
    WellLed: number;
  } | null>;

  // Messaging methods
  getUsersByPractice(practiceId: string): Promise<User[]>;
  getConversationsByUser(
    userId: string,
    practiceId: string,
  ): Promise<Conversation[]>;
  getConversation(
    id: number,
    practiceId: string,
  ): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Financial methods
  getTransactionsByPractice(practiceId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getInvoicesByPractice(practiceId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(
    id: string,
    invoice: Partial<InsertInvoice>,
  ): Promise<Invoice | undefined>;
  getPurchasesByPractice(practiceId: string): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getVatReturnsByPractice(practiceId: string): Promise<VatReturn[]>;
  createVatReturn(vatReturn: InsertVatReturn): Promise<VatReturn>;

  // Rota methods
  getRotasByPractice(practiceId: string): Promise<Rota[]>;
  getRotaByDay(practiceId: string, day: string): Promise<Rota | undefined>;
  createRota(rota: InsertRota): Promise<Rota>;
  updateRota(
    practiceId: string,
    day: string,
    rota: Partial<InsertRota>,
  ): Promise<Rota | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.employeeId, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const personResult = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.email, email));
    
    if (personResult.length === 0) return undefined;
    
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.employeeId, personResult[0].id));
    
    return userResult[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Person methods
  async getPerson(id: string): Promise<Person | undefined> {
    const result = await db.select().from(people).where(eq(people.id, id));
    return result[0];
  }

  async getPersonByEmail(email: string): Promise<Person | undefined> {
    const result = await db.select().from(people).where(eq(people.email, email));
    return result[0];
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const result = await db.insert(people).values(insertPerson).returning();
    return result[0];
  }

  async updatePerson(
    id: string,
    updates: Partial<InsertPerson>,
  ): Promise<Person | undefined> {
    const result = await db
      .update(people)
      .set(updates)
      .where(eq(people.id, id))
      .returning();
    return result[0];
  }

  // Practice methods
  async getPractice(email: string): Promise<Practice | undefined> {
    const result = await db.select().from(practices).where(eq(practices.email, email));
    return result[0];
  }

  async createPractice(insertPractice: InsertPractice): Promise<Practice> {
    const result = await db.insert(practices).values(insertPractice).returning();
    return result[0];
  }

  // Staff methods
  async getStaffByPractice(practiceId: string): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.practiceId, practiceId));
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    const result = await db.select().from(staff).where(eq(staff.employeeId, id));
    return result[0];
  }

  async createStaff(insertStaff: InsertStaff): Promise<Staff> {
    const result = await db.insert(staff).values(insertStaff).returning();
    return result[0];
  }

  async updateStaff(
    id: string,
    updates: Partial<InsertStaff>,
  ): Promise<Staff | undefined> {
    const result = await db
      .update(staff)
      .set(updates)
      .where(eq(staff.employeeId, id))
      .returning();
    return result[0];
  }

  async deleteStaff(id: string): Promise<boolean> {
    const result = await db.delete(staff).where(eq(staff.employeeId, id)).returning();
    return result.length > 0;
  }

  // Shift methods
  async getShift(email: string): Promise<Shift | undefined> {
    const result = await db.select().from(shifts).where(eq(shifts.email, email));
    return result[0];
  }

  async createShift(insertShift: InsertShift): Promise<Shift> {
    const result = await db.insert(shifts).values(insertShift).returning();
    return result[0];
  }

  async updateShift(
    email: string,
    updates: Partial<InsertShift>,
  ): Promise<Shift | undefined> {
    const result = await db
      .update(shifts)
      .set(updates)
      .where(eq(shifts.email, email))
      .returning();
    return result[0];
  }

  // Appraisal methods
  async getAppraisalsByPractice(practiceId: string): Promise<AppraisalEvidence[]> {
    return await db
      .select()
      .from(appraisalEvidence)
      .where(eq(appraisalEvidence.practiceId, practiceId));
  }

  async createAppraisal(evidence: InsertAppraisalEvidence): Promise<AppraisalEvidence> {
    const result = await db.insert(appraisalEvidence).values(evidence).returning();
    return result[0];
  }

  // Policy methods
  async getPoliciesByPractice(practiceId: string): Promise<Policy[]> {
    return await db.select().from(policies).where(eq(policies.practiceId, practiceId));
  }

  async createPolicy(evidence: InsertPolicy): Promise<Policy> {
    const result = await db.insert(policies).values(evidence).returning();
    return result[0];
  }

  // CQC methods
  async getCqcStandards(): Promise<CqcStandard[]> {
    return await db.select().from(cqcStandards);
  }

  async createCqcStandard(insertStandard: InsertCqcStandard): Promise<CqcStandard> {
    const result = await db.insert(cqcStandards).values(insertStandard).returning();
    return result[0];
  }

  async getPracticeEvidence(practiceId: string): Promise<PracticeEvidence[]> {
    return await db
      .select()
      .from(practiceEvidence)
      .where(eq(practiceEvidence.practiceId, practiceId));
  }

  async createPracticeEvidence(
    insertEvidence: InsertPracticeEvidence,
  ): Promise<PracticeEvidence> {
    const result = await db.insert(practiceEvidence).values(insertEvidence).returning();
    return result[0];
  }

  async updatePracticeComplianceScores(
    practiceId: string,
    scores: {
      Safe: number;
      Effective: number;
      Caring: number;
      Responsive: number;
      WellLed: number;
    },
  ): Promise<void> {
    const existing = await db
      .select()
      .from(practiceComplianceScores)
      .where(eq(practiceComplianceScores.practiceId, practiceId));

    if (existing.length > 0) {
      await db
        .update(practiceComplianceScores)
        .set({
          safe: scores.Safe,
          effective: scores.Effective,
          caring: scores.Caring,
          responsive: scores.Responsive,
          wellLed: scores.WellLed,
        })
        .where(eq(practiceComplianceScores.practiceId, practiceId));
    } else {
      await db.insert(practiceComplianceScores).values({
        practiceId,
        safe: scores.Safe,
        effective: scores.Effective,
        caring: scores.Caring,
        responsive: scores.Responsive,
        wellLed: scores.WellLed,
      });
    }
  }

  async getPracticeComplianceScores(practiceId: string): Promise<{
    Safe: number;
    Effective: number;
    Caring: number;
    Responsive: number;
    WellLed: number;
  } | null> {
    const result = await db
      .select()
      .from(practiceComplianceScores)
      .where(eq(practiceComplianceScores.practiceId, practiceId));

    if (result.length === 0) return null;

    return {
      Safe: result[0].safe,
      Effective: result[0].effective,
      Caring: result[0].caring,
      Responsive: result[0].responsive,
      WellLed: result[0].wellLed,
    };
  }

  // Messaging methods
  async getUsersByPractice(practiceId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.practiceId, practiceId));
  }

  async getConversationsByUser(
    userId: string,
    practiceId: string,
  ): Promise<Conversation[]> {
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.practiceId, practiceId));
    
    return allConversations.filter((c) => c.participantIds.includes(userId));
  }

  async getConversation(
    id: number,
    practiceId: string,
  ): Promise<Conversation | undefined> {
    const result = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, id), eq(conversations.practiceId, practiceId)),
      );
    return result[0];
  }

  async createConversation(
    insertConversation: InsertConversation,
  ): Promise<Conversation> {
    const result = await db.insert(conversations).values(insertConversation).returning();
    return result[0];
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    return result[0];
  }

  // Financial methods
  async getTransactionsByPractice(practiceId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.practiceId, practiceId));
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
  ): Promise<Transaction> {
    const result = await db.insert(transactions).values(insertTransaction).returning();
    return result[0];
  }

  async getInvoicesByPractice(practiceId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.practiceId, practiceId));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(insertInvoice).returning();
    return result[0];
  }

  async updateInvoice(
    id: string,
    updates: Partial<InsertInvoice>,
  ): Promise<Invoice | undefined> {
    const result = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, Number(id)))
      .returning();
    return result[0];
  }

  async getPurchasesByPractice(practiceId: string): Promise<Purchase[]> {
    return await db.select().from(purchases).where(eq(purchases.practiceId, practiceId));
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const result = await db.insert(purchases).values(insertPurchase).returning();
    return result[0];
  }

  async getVatReturnsByPractice(practiceId: string): Promise<VatReturn[]> {
    return await db.select().from(vatReturns).where(eq(vatReturns.practiceId, practiceId));
  }

  async createVatReturn(insertVatReturn: InsertVatReturn): Promise<VatReturn> {
    const result = await db.insert(vatReturns).values(insertVatReturn).returning();
    return result[0];
  }

  // Rota methods
  async getRotasByPractice(practiceId: string): Promise<Rota[]> {
    return await db.select().from(rotas).where(eq(rotas.practiceId, practiceId));
  }

  async getRotaByDay(practiceId: string, day: string): Promise<Rota | undefined> {
    const result = await db
      .select()
      .from(rotas)
      .where(and(eq(rotas.practiceId, practiceId), eq(rotas.day, day)));
    return result[0];
  }

  async createRota(insertRota: InsertRota): Promise<Rota> {
    const result = await db.insert(rotas).values(insertRota).returning();
    return result[0];
  }

  async updateRota(
    practiceId: string,
    day: string,
    updates: Partial<InsertRota>,
  ): Promise<Rota | undefined> {
    const result = await db
      .update(rotas)
      .set(updates)
      .where(and(eq(rotas.practiceId, practiceId), eq(rotas.day, day)))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
