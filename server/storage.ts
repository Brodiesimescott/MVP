import {
  users,
  people,
  staff,
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
  type Person,
  type InsertPerson,
  type AppraisalEvidence,
  type InsertAppraisalEvidence,
  type Policy,
  type InsertPolicy,
  type Rota,
  type InsertRota,
} from "@shared/schema";
import { db } from "@shared/index";
import { eq, and, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  //Person methods
  getPerson(id: string): Promise<Person | undefined>;
  getPersonByEmail(email: string): Promise<Person | undefined>;
  createPerson(person: InsertPerson): Promise<Person>;
  updatePerson(
    id: string,
    person: Partial<InsertPerson>,
  ): Promise<Person | undefined>;

  // Staff methods
  getStaffByPractice(practiceId: string): Promise<Staff[]>;
  getStaff(id: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(
    id: string,
    staff: Partial<InsertStaff>,
  ): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private people: Map<string, Person>;
  private practices: Map<string, Practice>;
  private staff: Map<string, Staff>;
  private appraisals: Map<string, AppraisalEvidence>;
  private policies: Map<string, Policy>;
  private cqcStandards: Map<string, CqcStandard>;
  private practiceEvidence: Map<string, PracticeEvidence>;
  private practiceComplianceScores: Map<
    string,
    {
      Safe: number;
      Effective: number;
      Caring: number;
      Responsive: number;
      WellLed: number;
    }
  >;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private transactions: Map<string, Transaction>;
  private invoices: Map<string, Invoice>;
  private purchases: Map<string, Purchase>;
  private vatReturns: Map<string, VatReturn>;
  private rotas: Map<number, Rota>;
  private rotaIdCounter: number;

  constructor() {
    this.users = new Map();
    this.people = new Map();
    this.practices = new Map();
    this.staff = new Map();
    this.appraisals = new Map();
    this.policies = new Map();
    this.cqcStandards = new Map();
    this.practiceEvidence = new Map();
    this.practiceComplianceScores = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.transactions = new Map();
    this.invoices = new Map();
    this.purchases = new Map();
    this.vatReturns = new Map();
    this.rotas = new Map();
    this.rotaIdCounter = 1;

    // Initialize with some default CQC standards
    this.initializeCqcStandards();
  }

  private initializeCqcStandards() {
    const standards: InsertCqcStandard[] = [
      {
        regulationId: "REG12",
        title: "Safe care and treatment",
        summary:
          "People using services must be protected from avoidable harm and abuse.",
        keyQuestion: "Safe",
        sourceUrl:
          "https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-12",
      },
      {
        regulationId: "REG17",
        title: "Good governance",
        summary:
          "Systems and processes must be established and operated effectively.",
        keyQuestion: "Well-led",
        sourceUrl:
          "https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-17",
      },
      {
        regulationId: "REG9",
        title: "Person-centred care",
        summary:
          "Care and treatment must be appropriate and meet service users' needs and reflect their personal preferences.",
        keyQuestion: "Responsive",
        sourceUrl:
          "https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers/health-social-care-act/regulation-9",
      },
    ];

    standards.forEach((standard) => {
      const cqcStandard: CqcStandard = {
        ...standard,
        summary: standard.summary ?? null,
        sourceUrl: standard.sourceUrl ?? null,
        lastCheckedForUpdate: new Date(),
        createdAt: new Date(),
      };
      this.cqcStandards.set(cqcStandard.regulationId, cqcStandard);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    /* const user = await db.select().from(users).where(eq(users.employeeId, id));
    return user[0];*/
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Note: Users table doesn't have email directly - email is stored in people/staff tables
    // This would require joining with people table in a real database implementation
    // For in-memory storage, we'll need to look up via staff records that have email

    /* const personWithEmaildb = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.email, email));
    if (personWithEmaildb) {
      const dbuser = await db
        .select()
        .from(users)
        .where(eq(users.employeeId, personWithEmaildb[0].id));
      return dbuser[0];
    }*/
    const personWithEmail = Array.from(this.people.values()).find(
      (person) => person.email === email,
    );
    if (personWithEmail) {
      return this.users.get(personWithEmail.id);
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      role: insertUser.role ?? "user",
      createdAt: new Date(),
    };
    this.users.set(user.employeeId, user);
    // Note: Uncomment the line below when using actual database
    // await db.insert(users).values(user);
    return user;
  }

  //Person methods
  async getPerson(id: string): Promise<Person | undefined> {
    /* const person = await db.select().from(people).where(eq(people.id, id));
    return person[0];*/
    return this.people.get(id);
  }

  async getPersonByEmail(email: string): Promise<Person | undefined> {
    /*const person = await db
    .select()
    .from(people)
    .where(eq(people.email, email));
    return person[0];*/
    return Array.from(this.people.values()).find(
      (person) => person.email === email,
    );
  }

  async createPerson(insertPerson: InsertPerson): Promise<Person> {
    const person: Person = {
      ...insertPerson,
    };
    this.people.set(person.id, person);
    // await db.insert(people).values(person);
    return person;
  }

  async updatePerson(
    id: string,
    updates: Partial<InsertPerson>,
  ): Promise<Person | undefined> {
    /*const dbexisting = await db.select().from(people).where(eq(people.id, id));
    if (!dbexisting) return undefined;

    const dbupdated: Person = { ...dbexisting[0], ...updates };

    await db
      .update(people)
      .set(dbupdated)
      .where(eq(users.employeeId, id));
    return dbupdated*/

    const existing = this.people.get(id);
    if (!existing) return undefined;

    const updated: Person = { ...existing, ...updates };
    this.people.set(id, updated);
    return updated;
  }

  // Staff methods
  async getStaffByPractice(practiceId: string): Promise<Staff[]> {
    /*return await db
      .select()
      .from(staff)
      .where(eq(staff.practiceId, practiceId));*/

    return Array.from(this.staff.values()).filter(
      (s) => s.practiceId === practiceId,
    );
  }

  async getStaff(id: string): Promise<Staff | undefined> {
    /* const staffById = await db.select().from(staff).where(eq(staff.employeeId, id));
    return staffById[0];*/
    return this.staff.get(id);
  }

  async createStaff(insertStaff: InsertStaff): Promise<Staff> {
    const staffMember: Staff = {
      ...insertStaff,
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
      nextAppraisal: insertStaff.nextAppraisal ?? null,
      revalidationInfo: insertStaff.revalidationInfo ?? null,
      dbsCheckExpiry: insertStaff.dbsCheckExpiry ?? null,
      emergencyContactName: insertStaff.emergencyContactName ?? null,
      emergencyContactPhone: insertStaff.emergencyContactPhone ?? null,
      emergencyContactRelation: insertStaff.emergencyContactRelation ?? null,
      status: insertStaff.status ?? "active",
      createdAt: new Date(),
    };
    this.staff.set(staffMember.employeeId, staffMember);
    // Note: Uncomment the line below when using actual database
    // await db.insert(staff).values(staffMember);
    return staffMember;
  }

  async updateStaff(
    id: string,
    updates: Partial<InsertStaff>,
  ): Promise<Staff | undefined> {
    /*const dbexisting = await db.select().from(staff).where(eq(staff.id, id));
    if (!dbexisting) return undefined;

    const dbupdated: Staff = { ...dbexisting[0], ...updates };

    await db.update(staff).set(dbupdated).where(eq(users.employeeId, id));
    return dbupdated;*/

    const existing = this.staff.get(id);
    if (!existing) return undefined;

    const updated: Staff = { ...existing, ...updates };
    this.staff.set(id, updated);
    return updated;
  }

  async deleteStaff(id: string): Promise<boolean> {
    //return await db.delete(staff).where(eq(staff.employeeId, id));
    return this.staff.delete(id);
  }

  //Appraisal methods
  async getAppraisalsByPractice(
    practiceId: string,
  ): Promise<AppraisalEvidence[]> {
    /*return await db
      .select()
      .from(appraisalEvidence)
      .where(eq(appraisalEvidence.practiceId, practiceId));*/
    return Array.from(this.appraisals.values()).filter(
      (appraisal) => appraisal.practiceId === practiceId,
    );
  }

  // Method to create an appraisal
  async createAppraisal(
    evidence: InsertAppraisalEvidence,
  ): Promise<AppraisalEvidence> {
    const appraisal: AppraisalEvidence = {
      ...evidence,
      description: evidence.description ?? null,
      createdAt: new Date(),
    };
    this.appraisals.set(appraisal.fileName, appraisal);
    // Note: Uncomment the line below when using actual database
    // await db.insert(appraisalEvidence).values(appraisal);
    return appraisal;
  }

  //policy methods
  async getPoliciesByPractice(practiceId: string): Promise<Policy[]> {
    /*return await db
    .select()
    .from(policy)
    .where(eq(policy.practiceId, practiceId));*/
    return Array.from(this.policies.values()).filter(
      (policy) => policy.practiceId === practiceId,
    );
  }

  // Method to create a policy
  async createPolicy(evidence: InsertPolicy): Promise<Policy> {
    const policy: Policy = {
      ...evidence,
      description: evidence.description ?? null,
      createdAt: new Date(),
    };
    this.policies.set(policy.fileName, policy);
    // Note: Uncomment the line below when using actual database
    // await db.insert(policies).values(policy);
    return policy;
  }

  // CQC methods
  async getCqcStandards(): Promise<CqcStandard[]> {
    //await db.select().from(cqcStandards);
    return Array.from(this.cqcStandards.values());
  }

  async createCqcStandard(
    insertStandard: InsertCqcStandard,
  ): Promise<CqcStandard> {
    const standard: CqcStandard = {
      ...insertStandard,
      summary: insertStandard.summary ?? null,
      sourceUrl: insertStandard.sourceUrl ?? null,
      lastCheckedForUpdate: new Date(),
      createdAt: new Date(),
    };
    this.cqcStandards.set(standard.regulationId, standard);
    // Note: Uncomment the line below when using actual database
    // await db.insert(cqcStandards).values(standard);
    return standard;
  }

  async getPracticeEvidence(practiceId: string): Promise<PracticeEvidence[]> {
    /*return await db
    .select()
    .from(practiceEvidence)
    .where(eq(practiceEvidence.practiceId, practiceId));*/
    return Array.from(this.practiceEvidence.values()).filter(
      (e) => e.practiceId === practiceId,
    );
  }

  async createPracticeEvidence(
    insertEvidence: InsertPracticeEvidence,
  ): Promise<PracticeEvidence> {
    const evidence: PracticeEvidence = {
      ...insertEvidence,
      description: insertEvidence.description ?? null,
      reviewStatus: insertEvidence.reviewStatus ?? "needs_review",
      standardIds: insertEvidence.standardIds ?? null,
      uploadDate: new Date(),
      createdAt: insertEvidence.createdAt ?? new Date(),
    };
    this.practiceEvidence.set(evidence.fileName, evidence);
    // Note: Uncomment the line below when using actual database
    // await db.insert(practiceEvidence).values(evidence);
    return evidence;
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
    this.practiceComplianceScores.set(practiceId, scores);
  }

  async getPracticeComplianceScores(practiceId: string): Promise<{
    Safe: number;
    Effective: number;
    Caring: number;
    Responsive: number;
    WellLed: number;
  } | null> {
    return this.practiceComplianceScores.get(practiceId) || null;
  }

  // Messaging methods
  async getUsersByPractice(practiceId: string): Promise<User[]> {
    /*return await db
    .select()
    .from(users)
    .where(eq(users.practiceId, practiceId));*/
    return Array.from(this.users.values()).filter(
      (u) => u.practiceId === practiceId,
    );
  }

  async getConversationsByUser(
    userId: string,
    practiceId: string,
  ): Promise<Conversation[]> {
    /*return await db
    .select()
    .from(conversations)
    .where(eq(conversations.practiceId, practiceId));*/
    return Array.from(this.conversations.values()).filter(
      (c) => c.practiceId === practiceId && c.participantIds.includes(userId),
    );
  }

  async getConversation(
    id: number,
    practiceId: string,
  ): Promise<Conversation | undefined> {
    /*const dbconversation = await db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, id), eq(conversations.practiceId, practiceId)),
      );
    if (!dbconversation) return undefined;
    return dbconversation[0];*/

    const conversation = this.conversations.get(id.toString());
    if (!conversation || conversation.practiceId !== practiceId)
      return undefined;
    return conversation;
  }

  async createConversation(
    insertConversation: InsertConversation,
  ): Promise<Conversation> {
    const id = Math.floor(Math.random() * 1000000); // Simple ID for in-memory storage
    const conversation: Conversation = {
      ...insertConversation,
      id,
      title: insertConversation.title ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id.toString(), conversation);
    // Note: Uncomment the line below when using actual database
    // await db.insert(conversations).values(conversation);
    return conversation;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    /*return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));*/
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = Math.floor(Math.random() * 1000000); // Simple ID for in-memory storage
    const message: Message = {
      ...insertMessage,
      id,
      blocked: insertMessage.blocked ?? null,
      blockReason: insertMessage.blockReason ?? null,
      createdAt: new Date(),
    };
    this.messages.set(id.toString(), message);
    // Note: Uncomment the line below when using actual database
    // await db.insert(messages).values(message);
    return message;
  }

  // Financial methods
  async getTransactionsByPractice(practiceId: string): Promise<Transaction[]> {
    /*return await db
    .select()
    .from(transactions)
    .where(eq(transactions.practiceId, practiceId));*/
    return Array.from(this.transactions.values()).filter(
      (t) => t.practiceId === practiceId,
    );
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
  ): Promise<Transaction> {
    const id = Math.floor(Math.random() * 1000000); // Simple ID for in-memory storage
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      subcategory: insertTransaction.subcategory ?? null,
      bankReference: insertTransaction.bankReference ?? null,
      createdAt: new Date(),
    };
    this.transactions.set(id.toString(), transaction);
    // Note: Uncomment the line below when using actual database
    // await db.insert(transactions).values(transaction);
    return transaction;
  }

  async getInvoicesByPractice(practiceId: string): Promise<Invoice[]> {
    /*return await db
    .select()
    .from(invoices)
    .where(eq(invoices.practiceId, practiceId));*/
    return Array.from(this.invoices.values()).filter(
      (i) => i.practiceId === practiceId,
    );
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = Math.floor(Math.random() * 1000000); // Simple ID for in-memory storage
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
    this.invoices.set(id.toString(), invoice);
    // Note: Uncomment the line below when using actual database
    // await db.insert(invoices).values(invoice);
    return invoice;
  }

  async updateInvoice(
    id: string,
    updates: Partial<InsertInvoice>,
  ): Promise<Invoice | undefined> {
    /*const dbexisting = await db.select().from(invoices).where(eq(invoices.id, Number(id)));
    if (!dbexisting) return undefined;

    const dbupdated: Invoice = { ...dbexisting[0], ...updates };

    await db.update(invoices).set(dbupdated).where(eq(invoices.id, Number(id)));
    return dbupdated;*/

    const existing = this.invoices.get(id);
    if (!existing) return undefined;

    const updated: Invoice = { ...existing, ...updates };
    this.invoices.set(id, updated);
    return updated;
  }

  async getPurchasesByPractice(practiceId: string): Promise<Purchase[]> {
    /*return await db
    .select()
    .from(purchases)
    .where(eq(purchases.practiceId, practiceId));*/
    return Array.from(this.purchases.values()).filter(
      (p) => p.practiceId === practiceId,
    );
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = Math.floor(Math.random() * 1000000); // Simple ID for in-memory storage
    const purchase: Purchase = {
      ...insertPurchase,
      id,
      vatAmount: insertPurchase.vatAmount ?? null,
      receiptUrl: insertPurchase.receiptUrl ?? null,
      createdAt: new Date(),
    };
    this.purchases.set(id.toString(), purchase);
    // Note: Uncomment the line below when using actual database
    // await db.insert(purchases).values(purchase);
    return purchase;
  }

  async getVatReturnsByPractice(practiceId: string): Promise<VatReturn[]> {
    /*return await db
    .select()
    .from(vatReturns)
    .where(eq(vatReturns.practiceId, practiceId));*/
    return Array.from(this.vatReturns.values()).filter(
      (v) => v.practiceId === practiceId,
    );
  }

  async createVatReturn(insertVatReturn: InsertVatReturn): Promise<VatReturn> {
    const id = Math.floor(Math.random() * 1000000); // Simple ID for in-memory storage
    const vatReturn: VatReturn = {
      ...insertVatReturn,
      id,
      status: insertVatReturn.status ?? null,
      submittedAt: insertVatReturn.submittedAt ?? null,
      createdAt: new Date(),
    };
    this.vatReturns.set(id.toString(), vatReturn);
    // Note: Uncomment the line below when using actual database
    // await db.insert(VatReturns).values(vatReturn);
    return vatReturn;
  }

  async insertDBUsers(usersReg: User[]) {
    usersReg.forEach((user) => {
      this.users.set(user.employeeId, user);
    });
  }
  async insertDBpractice(practiceReg: Practice) {
    this.practices.set(practiceReg.email, practiceReg);
  }
  async insertDBstafflist(staffReg: Staff[]) {
    staffReg.forEach((staffMember) => {
      this.staff.set(staffMember.employeeId, staffMember);
    });
  }
  async insertDBCQC(cqcReg: CqcStandard[]) {
    cqcReg.forEach((cqc) => {
      this.cqcStandards.set(cqc.regulationId, cqc);
    });
  }
  async insertDBEvidence(evidenceList: PracticeEvidence[]) {
    evidenceList.forEach((evidence) => {
      this.practiceEvidence.set(evidence.fileName, evidence);
    });
  }
  async insertDBconversations(conversationsList: Conversation[]) {
    conversationsList.forEach((conversation) => {
      this.conversations.set(conversation.id.toString(), conversation);
    });
  }
  async insertDBtransactions(transactionsRec: Transaction[]) {
    transactionsRec.forEach((transaction) => {
      this.transactions.set(transaction.id.toString(), transaction);
    });
  }
  async insertDBinvoices(invoicesRec: Invoice[]) {
    invoicesRec.forEach((invoice) => {
      this.invoices.set(invoice.id.toString(), invoice);
    });
  }
  async insertDBpurchases(purchasesRec: Purchase[]) {
    purchasesRec.forEach((purchase) => {
      this.purchases.set(purchase.id.toString(), purchase);
    });
  }
  async insertDBvatReturn(vatReturnRec: VatReturn[]) {
    vatReturnRec.forEach((vatReturn) => {
      this.vatReturns.set(vatReturn.id.toString(), vatReturn);
    });
  }

  async insertMessages(messagelist: Message[]) {
    messagelist.forEach((message) => {
      this.messages.set(message.id.toString(), message);
    });
  }

  // Rota methods
  async getRotasByPractice(practiceId: string): Promise<Rota[]> {
    /*return await db
    .select()
    .from(vatReturns)
    .where(eq(vatReturns.practiceId, practiceId));*/
    return Array.from(this.rotas.values()).filter(
      (rota) => rota.practiceId === practiceId,
    );
  }

  async getRotaByDay(
    practiceId: string,
    day: string,
  ): Promise<Rota | undefined> {
    /*return await db
    .select()
    .from(rotas)
    .where(eq(rotas.practiceId, practiceId));*/
    return Array.from(this.rotas.values()).find(
      (rota) => rota.practiceId === practiceId && rota.day === day,
    );
  }

  async createRota(insertRota: InsertRota): Promise<Rota> {
    const id = this.rotaIdCounter++;
    const rota: Rota = {
      practiceId: insertRota.practiceId,
      day: insertRota.day,
      requirements: insertRota.requirements,
      assignments: insertRota.assignments,
      id,
      createdAt: new Date(),
    };
    this.rotas.set(id, rota);
    // await db.insert(rotas).values(rota);
    return rota;
  }

  async updateRota(
    practiceId: string,
    day: string,
    updates: Partial<InsertRota>,
  ): Promise<Rota | undefined> {
    /*const dbexisting = await db.select().from(rotas).where(and(eq(rotas.practiceId, practiceId), eq(rotas.day, day)));
    if (!dbexisting) return undefined;

    const dbupdated: Rota = { ...dbexisting[0], ...updates, practiceId: dbexisting[0].practiceId,
      day: dbexisting[0].day,
      id: dbexisting[0].id,
      createdAt: dbexisting[0].createdAt, };

    await db.update(rotas).set(dbupdated).where(and(eq(rotas.practiceId, practiceId), eq(rotas.day, day)));
    return dbupdated;*/

    const existingRota = await this.getRotaByDay(practiceId, day);
    if (!existingRota) {
      return undefined;
    }

    const updatedRota: Rota = {
      ...existingRota,
      ...updates,
      practiceId: existingRota.practiceId,
      day: existingRota.day,
      id: existingRota.id,
      createdAt: existingRota.createdAt,
    };

    this.rotas.set(existingRota.id, updatedRota);
    return updatedRota;
  }
}

export const storage = new MemStorage();
