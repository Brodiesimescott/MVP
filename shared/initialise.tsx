import { db } from "@shared/index";
import {
  users,
  practices,
  staff,
  cqcStandards,
  practiceEvidence,
  conversations,
  transactions,
  invoices,
  purchases,
  vatReturns,
  messages,
} from "./schema";
import { eq } from "drizzle-orm";
import { storage } from "server/storage";

export async function getUsers() {
  const result = await db.select().from(users);
  storage.insertDBUsers(result);
}

export async function getPracticeData(practice_id: string) {
  const practice = await db
    .select()
    .from(practices)
    .where(eq(practices.id, practice_id));

  const stafflist = await db
    .select()
    .from(staff)
    .where(eq(staff.practiceId, practice_id));

  const cqcStandardsList = await db.select().from(cqcStandards);

  const practiceEvidenceList = await db
    .select()
    .from(practiceEvidence)
    .where(eq(practiceEvidence.practiceId, practice_id));

  const conversationsList = await db
    .select()
    .from(conversations)
    .where(eq(conversations.practiceId, practice_id));

  const transactionsList = await db
    .select()
    .from(transactions)
    .where(eq(transactions.practiceId, practice_id));

  const invoicesList = await db
    .select()
    .from(invoices)
    .where(eq(invoices.practiceId, practice_id));

  const purchasesList = await db
    .select()
    .from(purchases)
    .where(eq(purchases.practiceId, practice_id));

  const vatReturnsList = await db
    .select()
    .from(vatReturns)
    .where(eq(vatReturns.practiceId, practice_id));

  storage.insertDBpractice(practice[0]);
  storage.insertDBstafflist(stafflist);
  storage.insertDBCQC(cqcStandardsList);
  storage.insertDBEvidence(practiceEvidenceList);
  storage.insertDBconversations(conversationsList);
  storage.insertDBtransactions(transactionsList);
  storage.insertDBinvoices(invoicesList);
  storage.insertDBpurchases(purchasesList);
  storage.insertDBvatReturn(vatReturnsList);
}

export async function getMessageData(conversation_Id: string) {
  const messagesList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation_Id));

  storage.insertMessages(messagesList);
}
