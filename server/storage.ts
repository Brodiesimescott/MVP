import {
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
} from "@shared/schema";
import { randomUUID } from "crypto";
import { PgVarchar } from "drizzle-orm/pg-core";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Staff methods
  getStaffByPractice(practiceId: string): Promise<Staff[]>;
  getStaff(id: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(
    id: string,
    staff: Partial<InsertStaff>,
  ): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;

  // CQC methods
  getCqcStandards(): Promise<CqcStandard[]>;
  createCqcStandard(standard: InsertCqcStandard): Promise<CqcStandard>;
  getPracticeEvidence(practiceId: string): Promise<PracticeEvidence[]>;
  createPracticeEvidence(
    evidence: InsertPracticeEvidence,
  ): Promise<PracticeEvidence>;

  // Messaging methods
  getUsersByPractice(practiceId: string): Promise<User[]>;
  getConversationsByUser(
    userId: string,
    practiceId: string,
  ): Promise<Conversation[]>;
  getConversation(
    id: string,
    practiceId: string,
  ): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private staff: Map<string, Staff>;
  private cqcStandards: Map<string, CqcStandard>;
  private practiceEvidence: Map<string, PracticeEvidence>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private transactions: Map<string, Transaction>;
  private invoices: Map<string, Invoice>;
  private purchases: Map<string, Purchase>;
  private vatReturns: Map<string, VatReturn>;

  constructor() {
    this.users = new Map();
    this.staff = new Map();
    this.cqcStandards = new Map();
    this.practiceEvidence = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.transactions = new Map();
    this.invoices = new Map();
    this.purchases = new Map();
    this.vatReturns = new Map();

    // Initialize with some default CQC standards
    this.initializeCqcStandards();
  }

  private initializeCqcStandards() {
    const standards: InsertCqcStandard[] = [
      {
        regulationId: "REG12",
        title: "Safe care and treatment",
        summary:
          "People using services must be protected from avoidable harm and abuse",
        keyQuestion: "Safe",
        sourceUrl:
          "https://www.cqc.org.uk/guidance-regulation/regulations/regulation-12-safe-care-treatment",
      },
      {
        regulationId: "REG17",
        title: "Good governance",
        summary:
          "Systems and processes must be established and operated effectively",
        keyQuestion: "Well-led",
        sourceUrl:
          "https://www.cqc.org.uk/guidance-regulation/regulations/regulation-17-good-governance",
      },
      {
        regulationId: "REG9",
        title: "Person-centred care",
        summary:
          "Care and treatment must be appropriate and meet service users' needs",
        keyQuestion: "Responsive",
        sourceUrl:
          "https://www.cqc.org.uk/guidance-regulation/regulations/regulation-9-person-centred-care",
      },
    ];

    standards.forEach((standard) => {
      const id = randomUUID();
      const cqcStandard: CqcStandard = {
        ...standard,
        id,
        summary: standard.summary ?? null,
        sourceUrl: standard.sourceUrl ?? null,
        lastCheckedForUpdate: new Date(),
        createdAt: new Date(),
      };
      this.cqcStandards.set(id, cqcStandard);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role ?? "user",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Staff methods
  async getStaffByPractice(practiceId: string): Promise<Staff[]> {
    return Array.from(this.staff.values()).filter(
      (s) => s.practiceId === practiceId,
    );
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async createStaff(insertStaff: InsertStaff): Promise<Staff> {
    const id = randomUUID();
    const staffMember: Staff = {
      ...insertStaff,
      id,
      title: insertStaff.title ?? null,
      email: insertStaff.email ?? null,
      phone: insertStaff.phone ?? null,
      address: insertStaff.address ?? null,
      dateOfBirth: insertStaff.dateOfBirth ?? null,
      niNumber: insertStaff.niNumber ?? null,
      salary: insertStaff.salary ?? null,
      workingHours: insertStaff.workingHours ?? null,
      annualLeave: insertStaff.annualLeave ?? 28,
      studyLeave: insertStaff.studyLeave ?? 5,
      otherLeave: insertStaff.otherLeave ?? 0,
      professionalBody: insertStaff.professionalBody ?? null,
      professionalBodyNumber: insertStaff.professionalBodyNumber ?? null,
      appraisalDate: insertStaff.appraisalDate ?? null,
      revalidationInfo: insertStaff.revalidationInfo ?? null,
      dbsCheckExpiry: insertStaff.dbsCheckExpiry ?? null,
      emergencyContactName: insertStaff.emergencyContactName ?? null,
      emergencyContactPhone: insertStaff.emergencyContactPhone ?? null,
      emergencyContactRelation: insertStaff.emergencyContactRelation ?? null,
      status: insertStaff.status ?? "active",
      createdAt: new Date(),
    };
    this.staff.set(id, staffMember);
    return staffMember;
  }

  async updateStaff(
    id: string,
    updates: Partial<InsertStaff>,
  ): Promise<Staff | undefined> {
    const existing = this.staff.get(id);
    if (!existing) return undefined;

    const updated: Staff = { ...existing, ...updates };
    this.staff.set(id, updated);
    return updated;
  }

  async deleteStaff(id: string): Promise<boolean> {
    return this.staff.delete(id);
  }

  // CQC methods
  async getCqcStandards(): Promise<CqcStandard[]> {
    return Array.from(this.cqcStandards.values());
  }

  async createCqcStandard(
    insertStandard: InsertCqcStandard,
  ): Promise<CqcStandard> {
    const id = randomUUID();
    const standard: CqcStandard = {
      ...insertStandard,
      id,
      summary: insertStandard.summary ?? null,
      sourceUrl: insertStandard.sourceUrl ?? null,
      lastCheckedForUpdate: new Date(),
      createdAt: new Date(),
    };
    this.cqcStandards.set(id, standard);
    return standard;
  }

  async getPracticeEvidence(practiceId: string): Promise<PracticeEvidence[]> {
    return Array.from(this.practiceEvidence.values()).filter(
      (e) => e.practiceId === practiceId,
    );
  }

  async createPracticeEvidence(
    insertEvidence: InsertPracticeEvidence,
  ): Promise<PracticeEvidence> {
    const id = randomUUID();
    const evidence: PracticeEvidence = {
      ...insertEvidence,
      id,
      description: insertEvidence.description ?? null,
      reviewStatus: insertEvidence.reviewStatus ?? "needs_review",
      standardIds: insertEvidence.standardIds ?? null,
      uploadDate: new Date(),
      createdAt: new Date(),
    };
    this.practiceEvidence.set(id, evidence);
    return evidence;
  }

  // Messaging methods
  async getUsersByPractice(practiceId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (u) => u.practiceId === practiceId,
    );
  }

  async getConversationsByUser(
    userId: string,
    practiceId: string,
  ): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (c) => c.practiceId === practiceId && c.participantIds.includes(userId),
    );
  }

  async getConversation(
    id: string,
    practiceId: string,
  ): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation || conversation.practiceId !== practiceId)
      return undefined;
    return conversation;
  }

  async createConversation(
    insertConversation: InsertConversation,
  ): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      title: insertConversation.title ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      blocked: insertMessage.blocked ?? null,
      blockReason: insertMessage.blockReason ?? null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  // Financial methods
  async getTransactionsByPractice(practiceId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (t) => t.practiceId === practiceId,
    );
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
  ): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      subcategory: insertTransaction.subcategory ?? null,
      bankReference: insertTransaction.bankReference ?? null,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getInvoicesByPractice(practiceId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(
      (i) => i.practiceId === practiceId,
    );
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoice: Invoice = {
      ...insertInvoice,
      id,
      status: insertInvoice.status ?? null,
      clientEmail: insertInvoice.clientEmail ?? null,
      vatAmount: insertInvoice.vatAmount ?? null,
      dueDate: insertInvoice.dueDate ?? null,
      paidDate: insertInvoice.paidDate ?? null,
      createdAt: new Date(),
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(
    id: string,
    updates: Partial<InsertInvoice>,
  ): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;

    const updated: Invoice = { ...existing, ...updates };
    this.invoices.set(id, updated);
    return updated;
  }

  async getPurchasesByPractice(practiceId: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(
      (p) => p.practiceId === practiceId,
    );
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = randomUUID();
    const purchase: Purchase = {
      ...insertPurchase,
      id,
      vatAmount: insertPurchase.vatAmount ?? null,
      receiptUrl: insertPurchase.receiptUrl ?? null,
      createdAt: new Date(),
    };
    this.purchases.set(id, purchase);
    return purchase;
  }

  async getVatReturnsByPractice(practiceId: string): Promise<VatReturn[]> {
    return Array.from(this.vatReturns.values()).filter(
      (v) => v.practiceId === practiceId,
    );
  }

  async createVatReturn(insertVatReturn: InsertVatReturn): Promise<VatReturn> {
    const id = randomUUID();
    const vatReturn: VatReturn = {
      ...insertVatReturn,
      id,
      status: insertVatReturn.status ?? null,
      submittedAt: insertVatReturn.submittedAt ?? null,
      createdAt: new Date(),
    };
    this.vatReturns.set(id, vatReturn);
    return vatReturn;
  }

  // Database import methods
  async insertDBUsers(users: User[]) {
    users.forEach(user => {
      this.users.set(user.id, user);
    });
  }

  async insertDBpractice(practice: Practice) {
    // Add practice storage if needed - currently practices are not stored in MemStorage
  }

  async insertDBstafflist(staffList: Staff[]) {
    staffList.forEach(staff => {
      this.staff.set(staff.id, staff);
    });
  }

  async insertDBCQC(standards: CqcStandard[]) {
    standards.forEach(standard => {
      this.cqcStandards.set(standard.id, standard);
    });
  }

  async insertDBEvidence(evidenceList: PracticeEvidence[]) {
    evidenceList.forEach(evidence => {
      this.practiceEvidence.set(evidence.id, evidence);
    });
  }

  async insertDBconversations(conversationsList: Conversation[]) {
    conversationsList.forEach(conversation => {
      this.conversations.set(conversation.id, conversation);
    });
  }

  async insertDBtransactions(transactionsList: Transaction[]) {
    transactionsList.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });
  }

  async insertDBinvoices(invoicesList: Invoice[]) {
    invoicesList.forEach(invoice => {
      this.invoices.set(invoice.id, invoice);
    });
  }

  async insertDBpurchases(purchasesList: Purchase[]) {
    purchasesList.forEach(purchase => {
      this.purchases.set(purchase.id, purchase);
    });
  }

  async insertDBvatReturn(vatReturnsList: VatReturn[]) {
    vatReturnsList.forEach(vatReturn => {
      this.vatReturns.set(vatReturn.id, vatReturn);
    });
  }

  async insertDBConversations(conversationsList: Conversation[]) {
    // Alias for insertDBconversations for consistency
    return this.insertDBconversations(conversationsList);
  }

  async insertMessages(messagesList: Message[]) {
    messagesList.forEach(message => {
      this.messages.set(message.id, message);
    });
  }
}

export const storage = new MemStorage();
