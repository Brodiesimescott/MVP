import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertStaffSchema, insertMessageSchema, insertTransactionSchema, insertInvoiceSchema, insertPurchaseSchema } from "@shared/schema";
import { z } from "zod";

// AI Safety Net - Mock implementation for MVP
async function analyzeMessageForPII(content: string): Promise<{ safe: boolean; reason?: string }> {
  // Simple keyword detection - in production this would use a proper AI service
  const piiKeywords = [
    'nhs number', 'date of birth', 'dob', 'postcode', 'address',
    'medical record', 'patient id', 'diagnosis', 'prescription',
    'blood pressure', 'test results', 'medication', 'treatment'
  ];
  
  const lowerContent = content.toLowerCase();
  const foundKeywords = piiKeywords.filter(keyword => lowerContent.includes(keyword));
  
  if (foundKeywords.length > 0) {
    return {
      safe: false,
      reason: `Message blocked due to potential patient data: ${foundKeywords.join(', ')}`
    };
  }
  
  return { safe: true };
}

// Mock current user for MVP - in production this would come from session
const getCurrentUser = () => ({
  id: "user1",
  practiceId: "practice1",
  role: "poweruser" as const,
  email: "user@example.com",
  firstName: "Dr. Sarah",
  lastName: "Wilson"
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'join_conversation') {
          ws.send(JSON.stringify({ type: 'joined', conversationId: message.conversationId }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });
  });

  // Broadcast message to WebSocket clients
  const broadcastMessage = (conversationId: string, message: any) => {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_message',
          conversationId,
          message
        }));
      }
    });
  };

  // Modules endpoint
  app.get("/api/modules", async (req, res) => {
    const modules = [
      { 
        id: "1", 
        title: "ChironCQC", 
        name: "cqc", 
        description: "CQC compliance tracking, regulatory checklists, and inspection preparation tools.", 
        icon: "shield-check", 
        status: "good" 
      },
      { 
        id: "2", 
        title: "ChironHR", 
        name: "hr", 
        description: "Staff scheduling, rota management, and HR compliance tools for your practice team.", 
        icon: "users", 
        status: "good" 
      },
      { 
        id: "3", 
        title: "ChironMessaging", 
        name: "messaging", 
        description: "Secure internal communication system for staff collaboration and coordination.", 
        icon: "message-square", 
        status: "good" 
      },
      { 
        id: "4", 
        title: "ChironMoney", 
        name: "money", 
        description: "Financial management, billing automation, and revenue tracking for private services.", 
        icon: "pound-sterling", 
        status: "attention" 
      },
      { 
        id: "5", 
        title: "ChironStock", 
        name: "stock", 
        description: "Inventory management, stock tracking, and automated reordering for medical supplies.", 
        icon: "package", 
        status: "attention" 
      },
      { 
        id: "6", 
        title: "ChironFacilities", 
        name: "facilities", 
        description: "Facility management, maintenance tracking, and asset management for your practice.", 
        icon: "building", 
        status: "good" 
      }
    ];
    
    res.json(modules);
  });

  // HR endpoints
  app.get("/api/hr/metrics", async (req, res) => {
    const currentUser = getCurrentUser();
    const allStaff = await storage.getStaffByPractice(currentUser.practiceId);
    
    res.json({
      totalStaff: allStaff.length,
      onDuty: Math.floor(allStaff.length * 0.75),
      pendingReviews: Math.floor(allStaff.length * 0.125),
      leaveRequests: Math.floor(allStaff.length * 0.3)
    });
  });

  app.get("/api/hr/staff", async (req, res) => {
    const currentUser = getCurrentUser();
    const staff = await storage.getStaffByPractice(currentUser.practiceId);
    res.json(staff);
  });

  app.post("/api/hr/staff", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const staffData = insertStaffSchema.parse({
        ...req.body,
        practiceId: currentUser.practiceId
      });
      
      const newStaff = await storage.createStaff(staffData);
      res.json(newStaff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid staff data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create staff member" });
      }
    }
  });

  app.get("/api/hr/staff/:id", async (req, res) => {
    const staff = await storage.getStaff(req.params.id);
    if (!staff) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    
    const currentUser = getCurrentUser();
    if (staff.practiceId !== currentUser.practiceId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    
    res.json(staff);
  });

  app.put("/api/hr/staff/:id", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const updates = insertStaffSchema.partial().parse(req.body);
      
      const existingStaff = await storage.getStaff(req.params.id);
      if (!existingStaff || existingStaff.practiceId !== currentUser.practiceId) {
        res.status(404).json({ message: "Staff member not found" });
        return;
      }
      
      const updatedStaff = await storage.updateStaff(req.params.id, updates);
      res.json(updatedStaff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid staff data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update staff member" });
      }
    }
  });

  app.delete("/api/hr/staff/:id", async (req, res) => {
    const currentUser = getCurrentUser();
    const staff = await storage.getStaff(req.params.id);
    
    if (!staff || staff.practiceId !== currentUser.practiceId) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    
    const deleted = await storage.deleteStaff(req.params.id);
    if (deleted) {
      res.json({ message: "Staff member deleted successfully" });
    } else {
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // CQC endpoints
  app.get("/api/cqc/dashboard", async (req, res) => {
    const currentUser = getCurrentUser();
    const standards = await storage.getCqcStandards();
    const evidence = await storage.getPracticeEvidence(currentUser.practiceId);
    
    res.json({
      complianceScore: 98,
      openIssues: 2,
      totalStandards: standards.length,
      evidenceCount: evidence.length,
      keyQuestions: {
        Safe: 95,
        Effective: 98,
        Caring: 100,
        Responsive: 96,
        WellLed: 99
      }
    });
  });

  app.get("/api/cqc/standards", async (req, res) => {
    const standards = await storage.getCqcStandards();
    res.json(standards);
  });

  app.post("/api/cqc/evidence", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const evidenceData = {
        ...req.body,
        practiceId: currentUser.practiceId
      };
      
      const evidence = await storage.createPracticeEvidence(evidenceData);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to create evidence" });
    }
  });

  app.get("/api/cqc/activity", async (req, res) => {
    res.json([
      {
        id: "1",
        type: "evidence_upload",
        description: "New evidence uploaded for Regulation 12",
        timestamp: new Date().toISOString()
      },
      {
        id: "2",
        type: "standard_update",
        description: "CQC Regulation 17 guidance updated",
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  });

  // Messaging endpoints
  app.get("/api/messaging/contacts", async (req, res) => {
    const currentUser = getCurrentUser();
    const users = await storage.getUsersByPractice(currentUser.practiceId);
    const contacts = users.filter(u => u.id !== currentUser.id);
    res.json(contacts);
  });

  app.get("/api/messaging/conversations", async (req, res) => {
    const currentUser = getCurrentUser();
    const conversations = await storage.getConversationsByUser(currentUser.id, currentUser.practiceId);
    res.json(conversations);
  });

  app.post("/api/messaging/messages", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: currentUser.id
      });

      // AI Safety Net
      const safetyCheck = await analyzeMessageForPII(messageData.content);
      if (!safetyCheck.safe) {
        res.status(400).json({ 
          message: "Message blocked due to potential patient data",
          reason: safetyCheck.reason 
        });
        return;
      }

      // Verify conversation belongs to user's practice
      const conversation = await storage.getConversation(messageData.conversationId, currentUser.practiceId);
      if (!conversation) {
        res.status(404).json({ message: "Conversation not found" });
        return;
      }

      const message = await storage.createMessage(messageData);
      
      // Broadcast to WebSocket clients
      broadcastMessage(messageData.conversationId, message);
      
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  });

  // Money endpoints
  app.get("/api/money/dashboard", async (req, res) => {
    const currentUser = getCurrentUser();
    const transactions = await storage.getTransactionsByPractice(currentUser.practiceId);
    const invoices = await storage.getInvoicesByPractice(currentUser.practiceId);
    
    const revenue = transactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
    
    res.json({
      monthlyRevenue: revenue,
      expenses,
      profitLoss: revenue - expenses,
      vatDue: revenue * 0.2, // 20% VAT estimate
      overdueInvoices
    });
  });

  app.get("/api/money/transactions", async (req, res) => {
    const currentUser = getCurrentUser();
    const transactions = await storage.getTransactionsByPractice(currentUser.practiceId);
    res.json(transactions);
  });

  app.post("/api/money/transactions", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        practiceId: currentUser.practiceId
      });
      
      const transaction = await storage.createTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transaction" });
      }
    }
  });

  app.get("/api/money/invoices", async (req, res) => {
    const currentUser = getCurrentUser();
    const invoices = await storage.getInvoicesByPractice(currentUser.practiceId);
    res.json(invoices);
  });

  app.post("/api/money/invoices", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        practiceId: currentUser.practiceId
      });
      
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create invoice" });
      }
    }
  });

  app.get("/api/money/purchases", async (req, res) => {
    const currentUser = getCurrentUser();
    const purchases = await storage.getPurchasesByPractice(currentUser.practiceId);
    res.json(purchases);
  });

  app.post("/api/money/purchases", async (req, res) => {
    try {
      const currentUser = getCurrentUser();
      const purchaseData = insertPurchaseSchema.parse({
        ...req.body,
        practiceId: currentUser.practiceId
      });
      
      const purchase = await storage.createPurchase(purchaseData);
      res.json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create purchase" });
      }
    }
  });

  app.get("/api/money/reports/profit-and-loss", async (req, res) => {
    const currentUser = getCurrentUser();
    const transactions = await storage.getTransactionsByPractice(currentUser.practiceId);
    
    const income = transactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = transactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    res.json({
      income,
      expenses,
      netProfit: income - expenses,
      profitMargin: income > 0 ? ((income - expenses) / income) * 100 : 0
    });
  });

  app.get("/api/money/calculations/corporation-tax", async (req, res) => {
    const currentUser = getCurrentUser();
    const transactions = await storage.getTransactionsByPractice(currentUser.practiceId);
    
    const profit = transactions
      .filter(t => t.category === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) -
      transactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // UK Corporation Tax rate for small companies (19%)
    const taxRate = 0.19;
    const estimatedTax = Math.max(0, profit * taxRate);
    
    res.json({
      profit,
      taxRate: taxRate * 100,
      estimatedTax,
      allowances: 0 // Placeholder for future implementation
    });
  });

  return httpServer;
}
