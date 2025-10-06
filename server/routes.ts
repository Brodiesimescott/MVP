import { response, type Express } from "express";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  User,
  insertStaffSchema,
  insertMessageSchema,
  insertTransactionSchema,
  insertInvoiceSchema,
  insertPurchaseSchema,
  insertConversationSchema,
  InsertUser,
  InsertPerson,
  insertPersonSchema,
  insertUserSchema,
  Conversation,
  InsertConversation,
  conversations,
  people,
} from "@shared/schema";
import { generateToken } from "@/lib/utils";
import { z } from "zod";
import { generateHealthcareResponse } from "./ai-service";
import { title } from "process";
import { log } from "./vite";
import { db, verifyConnection } from "@shared/index";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { Cookie } from "lucide-react";

// AI Safety Net - Mock implementation for MVP
async function analyzeMessageForPII(
  content: string,
): Promise<{ safe: boolean; reason?: string }> {
  // Simple keyword detection - in production this would use a proper AI service
  const piiKeywords = [
    "nhs number",
    "date of birth",
    "dob",
    "postcode",
    "address",
    "medical record",
    "patient id",
    "diagnosis",
    "prescription",
    "blood pressure",
    "test results",
    "medication",
    "treatment",
  ];

  const lowerContent = content.toLowerCase();
  const foundKeywords = piiKeywords.filter((keyword) =>
    lowerContent.includes(keyword),
  );

  if (foundKeywords.length > 0) {
    return {
      safe: false,
      reason: `Message blocked due to potential patient data: ${foundKeywords.join(", ")}`,
    };
  }

  return { safe: true };
}

// Mock current user for MVP - in production this would come from session
/**
 * user = storage.getUser(token.id)
 */

const ACTIVE_USER = "active_user";

async function getCurrentUser(userEmail: string) {
  var userStr = userEmail;
  if (userStr == null) return null;
  const user = await storage.getUserByEmail(userStr);
  const person = await storage.getPersonByEmail(userStr);
  
  if (!user || !person) {
    return null;
  }
  
  const CurrentUser = {
    id: user.employeeId,
    practiceId: user.practiceId,
    role: user.role,
    email: person.email,
    firstName: person.firstName,
    lastName: person.lastName,
    createdAt: user.createdAt,
  };
  return CurrentUser;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Map<string, WebSocket>();

  wss.on("connection", (ws) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "join_conversation") {
          ws.send(
            JSON.stringify({
              type: "joined",
              conversationId: message.conversationId,
            }),
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
    });
  });

  // Broadcast message to WebSocket clients
  const broadcastMessage = (conversationId: string, message: any) => {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "new_message",
            conversationId,
            message,
          }),
        );
      }
    });
  };

  //handling hash
  function dohash(password: string, salt: string): Buffer {
    return pbkdf2Sync(password, salt, 310000, 32, "sha256");
  }

  function makeSalt(): string {
    return randomBytes(128).toString("base64");
  }

  //Home api add omit(salt when current user is fixed)
  app.get("/api/home", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    if (currentUser == null) {
      res.status(400).json({ message: "Invalid user: Please login" });
      return;
    }
    const database = db;
    res.status(200).json(currentUser);
  });

  //sign up endpoint
  app.post("/api/signup", async (req, res) => {
    const user = req.body;
    try {
      if (!(await storage.getUserByEmail(user.email)) == null) {
        return res.status(400).json({ message: "Email in use by other user" });
      }

      const salt = makeSalt();

      const userTemplate: InsertUser = {
        employeeId: user.id,
        hashedPassword: dohash(user.password, salt).toString("base64"),
        salt: salt,
        practiceId: user.practiceId,
        role: user.role,
      };
      const personTemplate: InsertPerson = {
        email: user.email,
        firstName: user.firstname,
        lastName: user.lastname,
        id: user.id,
      };
      await storage.createPerson(personTemplate);
      await storage.createUser(userTemplate);

      const newuser = await storage.getUserByEmail(user.email);

      if (!newuser) {
        return res.status(500).json({ message: "User creation failed" });
      }

      res.status(201).json({
        message: "User created successfully",
        userId: newuser.employeeId,
      });
    } catch (error: any) {
      console.log("Error in sign up controller", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  //login endpoint
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(400).json({ message: "Invalid   credentials" });
      }

      const hashedPassword = dohash(password, user.salt);

      const isPasswordCorrect = timingSafeEqual(
        Buffer.from(user.hashedPassword, "base64"),
        hashedPassword,
      );

      if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Get person data for complete user info
      const person = await storage.getPersonByEmail(email);
      
      if (!person) {
        return res.status(400).json({ message: "User profile not found" });
      }

      res.status(200).json({ 
        message: "Login successful", 
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        userId: user.employeeId,
        practiceId: user.practiceId,
        role: user.role
      });
    } catch (error: any) {
      console.log("Error in login controller", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Modules endpoint
  app.get("/api/modules", async (req, res) => {
    const modules = [
      {
        id: "1",
        title: "ChironCQC",
        name: "cqc",
        description:
          "CQC compliance tracking, regulatory checklists, and inspection preparation tools.",
        icon: "shield-check",
        status: "good",
      },
      {
        id: "2",
        title: "ChironHR",
        name: "hr",
        description:
          "Staff scheduling, rota management, and HR compliance tools for your practice team.",
        icon: "users",
        status: "good",
      },
      {
        id: "3",
        title: "ChironMessaging",
        name: "messaging",
        description:
          "Secure internal communication system for staff collaboration and coordination.",
        icon: "message-square",
        status: "good",
      },
      {
        id: "4",
        title: "ChironMoney",
        name: "money",
        description:
          "Financial management, billing automation, and revenue tracking for private services.",
        icon: "pound-sterling",
        status: "attention",
      },
      {
        id: "5",
        title: "ChironStock",
        name: "stock",
        description:
          "Inventory management, stock tracking, and automated reordering for medical supplies.",
        icon: "package",
        status: "attention",
      },
      {
        id: "6",
        title: "ChironFacilities",
        name: "facilities",
        description:
          "Facility management, maintenance tracking, and asset management for your practice.",
        icon: "building",
        status: "attention",
      },
    ];

    res.json(modules);
  });

  // HR endpoints
  app.get("/api/hr/metrics", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const allStaff = await storage.getStaffByPractice(currentUser!.practiceId);

    const reviewdates = allStaff.map((x) => x.nextAppraisal || "now");

    const dateTo = new Date();
    const dateFrom = new Date(dateTo.setMonth(dateTo.getMonth() - 1));
    var needsReview = 0;
    for (var dateCheck of reviewdates) {
      var check = new Date(dateCheck);

      if ((check <= dateTo && check >= dateFrom) || dateCheck == "now") {
        needsReview = needsReview + 1;
      }
    }

    res.json({
      totalStaff: allStaff.length,
      onDuty: Math.floor(allStaff.length * 0.75),
      pendingReviews: needsReview,
      leaveRequests: Math.floor(allStaff.length * 0.3),
    });
  });

  app.get("/api/hr/staff", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const staff = await storage.getStaffByPractice(currentUser!.practiceId);

    const employees = [];
    for (const employee of staff) {
      const person = await storage.getPerson(employee.employeeId);
      if (person) {
        employees.push({
          employeeId: employee.employeeId,
          title: employee.title,
          email: employee.email,
          phone: employee.phone,
          address: employee.address,
          dateOfBirth: employee.dateOfBirth,
          niNumber: employee.niNumber,
          position: employee.position,
          department: employee.department,
          startDate: employee.startDate,
          contract: employee.contract,
          salary: employee.salary,
          workingHours: employee.workingHours,
          annualLeave: employee.annualLeave,
          studyLeave: employee.studyLeave,
          otherLeave: employee.otherLeave,
          professionalBody: employee.professionalBody,
          professionalBodyNumber: employee.professionalBodyNumber,
          appraisalDate: employee.appraisalDate,
          nextAppraisal: employee.nextAppraisal,
          revalidationInfo: employee.revalidationInfo,
          dbsCheckExpiry: employee.dbsCheckExpiry,
          emergencyContactName: employee.emergencyContactName,
          emergencyContactPhone: employee.emergencyContactPhone,
          emergencyContactRelation: employee.emergencyContactRelation,
          status: employee.status,
          createdAt: employee.createdAt,
          practiceId: currentUser!.practiceId,
          firstName: person.firstName,
          lastName: person.lastName,
        });
      }
    }
    res.json(employees);
  });

  app.post("/api/hr/createstaff", async (req, res) => {
    try {
      const employee = req.body;
      const currentUser = await getCurrentUser(employee.creator);
      const staffData = insertStaffSchema.parse({
        employeeId: employee.employeeId,
        title: employee.title,
        email: employee.email,
        phone: employee.phone,
        address: employee.address,
        dateOfBirth: employee.dateOfBirth,
        niNumber: employee.niNumber,
        position: employee.position,
        department: employee.department,
        startDate: employee.startDate,
        contract: employee.contract,
        salary: employee.salary,
        annualLeave: employee.annualLeave,
        studyLeave: employee.studyLeave,
        otherLeave: employee.otherLeave,
        professionalBody: employee.professionalBody,
        professionalBodyNumber: employee.professionalBodyNumber,
        appraisalDate: employee.appraisalDate,
        nextAppraisal: employee.nextAppraisal,
        revalidationInfo: employee.revalidationInfo,
        dbsCheckExpiry: employee.dbsCheckExpiry,
        emergencyContactName: employee.emergencyContactName,
        emergencyContactPhone: employee.emergencyContactPhone,
        emergencyContactRelation: employee.emergencyContactRelation,
        practiceId: currentUser!.practiceId,
      });

      if ((await storage.getPerson(employee.employeeId)) == undefined) {
        const personData = insertPersonSchema.parse({
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          id: employee.employeeId,
        });
        await storage.createPerson(personData);
      }
      const person = await storage.getPerson(employee.employeeId);

      if (!person) {
        res
          .status(500)
          .json({ message: "Failed to create or retrieve person data" });
        return;
      }

      const newStaff = await storage.createStaff(staffData);

      const newEmployee = {
        employeeId: newStaff.employeeId,
        title: newStaff.title,
        email: newStaff.email,
        phone: newStaff.phone,
        address: newStaff.address,
        dateOfBirth: newStaff.dateOfBirth,
        niNumber: newStaff.niNumber,
        position: newStaff.position,
        department: newStaff.department,
        startDate: newStaff.startDate,
        contract: newStaff.contract,
        salary: newStaff.salary,
        workingHours: newStaff.workingHours,
        annualLeave: newStaff.annualLeave,
        studyLeave: newStaff.studyLeave,
        otherLeave: newStaff.otherLeave,
        professionalBody: newStaff.professionalBody,
        professionalBodyNumber: newStaff.professionalBodyNumber,
        appraisalDate: newStaff.appraisalDate,
        nextAppraisal: newStaff.nextAppraisal,
        revalidationInfo: newStaff.revalidationInfo,
        dbsCheckExpiry: newStaff.dbsCheckExpiry,
        emergencyContactName: newStaff.emergencyContactName,
        emergencyContactPhone: newStaff.emergencyContactPhone,
        emergencyContactRelation: newStaff.emergencyContactRelation,
        status: newStaff.status,
        createdAt: newStaff.createdAt,
        practiceId: newStaff.practiceId,
        firstName: person.firstName,
        lastName: person.lastName,
      };
      res.json(newEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid staff data", errors: error.errors });
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

    const currentUser = await getCurrentUser(req.body.creator);
    if (staff.practiceId !== currentUser!.practiceId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }
    const person = await storage.getPerson(req.params.id);

    if (!person) {
      res.status(404).json({ message: "Person not found" });
      return;
    }

    const employee = {
      employeeId: staff.employeeId,
      title: staff.title,
      email: staff.email,
      phone: staff.phone,
      address: staff.address,
      dateOfBirth: staff.dateOfBirth,
      niNumber: staff.niNumber,
      position: staff.position,
      department: staff.department,
      startDate: staff.startDate,
      contract: staff.contract,
      salary: staff.salary,
      workingHours: staff.workingHours,
      annualLeave: staff.annualLeave,
      studyLeave: staff.studyLeave,
      otherLeave: staff.otherLeave,
      professionalBody: staff.professionalBody,
      professionalBodyNumber: staff.professionalBodyNumber,
      appraisalDate: staff.appraisalDate,
      nextAppraisal: staff.nextAppraisal,
      revalidationInfo: staff.revalidationInfo,
      dbsCheckExpiry: staff.dbsCheckExpiry,
      emergencyContactName: staff.emergencyContactName,
      emergencyContactPhone: staff.emergencyContactPhone,
      emergencyContactRelation: staff.emergencyContactRelation,
      status: staff.status,
      createdAt: staff.createdAt,
      practiceId: staff.practiceId,
      firstName: person.firstName,
      lastName: person.lastName,
    };
    res.json(employee);
  });

  app.put("/api/hr/staff/:id", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const updates = insertStaffSchema.partial().parse(req.body);
      const updateName = insertPersonSchema.partial().parse(req.body);

      const existingStaff = await storage.getStaff(req.params.id);
      const existingPerson = await storage.getPerson(req.params.id);
      if (
        !existingStaff ||
        existingStaff.practiceId !== currentUser!.practiceId ||
        !existingPerson
      ) {
        res.status(404).json({ message: "Staff member not found" });
        return;
      }

      const updatedStaff = await storage.updateStaff(req.params.id, updates);
      const updatedPerson = await storage.updatePerson(
        req.params.id,
        updateName,
      );

      if (!updatedStaff || !updatedPerson) {
        res.status(404).json({ message: "Failed to update staff member" });
        return;
      }

      const employee = {
        employeeId: updatedStaff.employeeId,
        title: updatedStaff.title,
        email: updatedStaff.email,
        phone: updatedStaff.phone,
        address: updatedStaff.address,
        dateOfBirth: updatedStaff.dateOfBirth,
        niNumber: updatedStaff.niNumber,
        position: updatedStaff.position,
        department: updatedStaff.department,
        startDate: updatedStaff.startDate,
        contract: updatedStaff.contract,
        salary: updatedStaff.salary,
        workingHours: updatedStaff.workingHours,
        annualLeave: updatedStaff.annualLeave,
        studyLeave: updatedStaff.studyLeave,
        otherLeave: updatedStaff.otherLeave,
        professionalBody: updatedStaff.professionalBody,
        professionalBodyNumber: updatedStaff.professionalBodyNumber,
        appraisalDate: updatedStaff.appraisalDate,
        nextAppraisal: updatedStaff.nextAppraisal,
        revalidationInfo: updatedStaff.revalidationInfo,
        dbsCheckExpiry: updatedStaff.dbsCheckExpiry,
        emergencyContactName: updatedStaff.emergencyContactName,
        emergencyContactPhone: updatedStaff.emergencyContactPhone,
        emergencyContactRelation: updatedStaff.emergencyContactRelation,
        status: updatedStaff.status,
        createdAt: updatedStaff.createdAt,
        practiceId: updatedStaff.practiceId,
        firstName: updatedPerson.firstName,
        lastName: updatedPerson.lastName,
      };
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid staff data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update staff member" });
      }
    }
  });

  app.delete("/api/hr/staff/:id", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const staff = await storage.getStaff(req.params.id);

    if (!staff || staff.practiceId !== currentUser!.practiceId) {
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

  app.get("/api/hr/appraisals", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const appraisals = await storage.getAppraisalsByPractice(
      currentUser!.practiceId,
    );
    res.json(appraisals);
  });

  app.post("/api/hr/appraisal", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body);
      const appraisalEvidence = {
        ...req.body,
        practiceId: currentUser!.practiceId,
      };

      const evidence = await storage.createAppraisal(appraisalEvidence);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to create evidence" });
    }
  });

  app.get("/api/hr/policy", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const policies = await storage.getPoliciesByPractice(
      currentUser!.practiceId,
    );
    res.json(policies);
  });

  app.post("/api/hr/policy", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const policy = {
        ...req.body,
        practiceId: currentUser!.practiceId,
      };

      const evidence = await storage.createPolicy(policy);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to create evidence" });
    }
  });

  // CQC endpoints
  app.get("/api/cqc/dashboard", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const standards = await storage.getCqcStandards();
    const evidence = await storage.getPracticeEvidence(currentUser!.practiceId);

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
        WellLed: 99,
      },
    });
  });

  app.get("/api/cqc/standards", async (req, res) => {
    const standards = await storage.getCqcStandards();
    res.json(standards);
  });

  app.post("/api/cqc/evidence", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const evidenceData = {
        ...req.body,
        practiceId: currentUser!.practiceId,
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
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        type: "standard_update",
        description: "CQC Regulation 17 guidance updated",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);
  });

  // Messaging endpoints
  app.get("/api/messaging/contacts", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body);

      const users = await storage.getUsersByPractice(currentUser!.practiceId);
      const contactusers = users.filter(
        (u) => u.employeeId !== currentUser!.id,
      );

      const contacts = [];
      for (const contactuser of contactusers) {
        const person = await storage.getPerson(contactuser.employeeId);
        if (person) {
          contacts.push({
            id: contactuser.employeeId,
            practiceId: contactuser.practiceId,
            role: contactuser.role,
            email: person.email,
            firstName: person.firstName,
            lastName: person.lastName,
          });
        }
      }

      res.json(contacts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.get("/api/messaging/conversations", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    /** const newconversations: InsertConversation[] = [
      {
        practiceId: "practice1",
        participantIds: ["user1"],
        title: "dummy data",
      },
    ];

    console.log("create convo");
    storage.createConversation(newconversations[0]);*/
    const testdata = await storage.getConversationsByUser(
      currentUser!.id,
      currentUser!.practiceId,
    );
    if (testdata.length < 2) {
      const newuser0 = await storage.createUser({
        employeeId: "uuid 1",
        hashedPassword: "string0",
        salt: makeSalt(),
        practiceId: "practice1",
        role: "user",
      });
      const newPerson0 = await storage.createPerson({
        id: "uuid 1",
        email: "ask@gmail.com",
        firstName: "Sister Jane",
        lastName: "Smith",
      });
      const newuser2 = await storage.createUser({
        employeeId: "uuid 2",
        hashedPassword: "string1",
        salt: makeSalt(),
        practiceId: "practice1",

        role: "user",
      });
      const newPerson2 = await storage.createPerson({
        id: "uuid 2",
        email: "string@gmailcom",
        firstName: "Team",
        lastName: "Chat",
      });
      const newuser1 = await storage.createUser({
        employeeId: "uuid 3",
        hashedPassword: "string2",
        salt: makeSalt(),
        practiceId: "practice1",
        role: "user",
      });
      const newPerson1 = await storage.createPerson({
        id: "uuid 3",
        email: "help.gmail.com",
        firstName: "Mark",
        lastName: "Brown",
      });
      const newconversations: InsertConversation[] = [
        {
          practiceId: "practice1",
          participantIds: [newuser0.employeeId, "user1"],
          title: "Sister Jane Smith",
        },
        {
          practiceId: "practice1",
          participantIds: [newuser1.employeeId, "user1"],
          title: "Mark Brown",
        },
        {
          practiceId: "practice1",
          participantIds: [newuser2.employeeId, "user1"],
          title: "Team Chat",
        },
      ];
      const convo1 = await storage.createConversation(newconversations[0]);
      const convo2 = await storage.createConversation(newconversations[1]);
      const convo3 = await storage.createConversation(newconversations[2]);
      await storage.createMessage({
        conversationId: convo1.id,
        senderId: newuser0.employeeId,
        content:
          "Hi Dr. Wilson, the morning appointment results are ready for review.",
        blocked: null,
        blockReason: null,
      });
      await storage.createMessage({
        conversationId: convo2.id,
        senderId: newuser1.employeeId,
        content: "CQC check ahead. Be ready.",
        blocked: null,
        blockReason: null,
      });
      await storage.createMessage({
        conversationId: convo3.id,
        senderId: newuser2.employeeId,
        content: "Good morning! Hope everyone is ready for today's schedule.",
        blocked: null,
        blockReason: null,
      });
    }

    const conversations = await storage.getConversationsByUser(
      currentUser!.id,
      currentUser!.practiceId,
    );

    res.json(conversations);
  });

  app.post("/api/messaging/createconversations", async (req, res) => {
    const currentUser = await getCurrentUser(req.body.creator);
    const newconversation: InsertConversation = insertConversationSchema.parse({
      ...req.body,
    });

    console.log("create convo");
    storage.createConversation(newconversation);
    res.json(
      await storage.getConversationsByUser(
        currentUser!.id,
        currentUser!.practiceId,
      ),
    );
  });

  app.get("/api/messaging/announcements", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body);
      const UserbyPractice = await storage.getUsersByPractice(
        currentUser!.practiceId,
      );
      //fix when current user fix
      const ids = UserbyPractice.map((user) => user.employeeId).concat(
        currentUser!.id,
      );
      const newconversation: InsertConversation =
        insertConversationSchema.parse({
          practiceId: currentUser!.practiceId,
          title: "Announcements",
          participantIds: ids,
        });

      const testcreate = await storage.getConversationsByUser(
        currentUser!.id,
        currentUser!.practiceId,
      );
      if (testcreate.find((obj) => obj.title == "Announcements") == null) {
        await storage.createConversation(newconversation);
      }
      const conversations = await storage.getConversationsByUser(
        currentUser!.id,
        currentUser!.practiceId,
      );
      const announcements = conversations.find(
        (obj) => obj.title == "Announcements",
      );
      if (!announcements) {
        res
          .status(404)
          .json({ message: "Announcements conversation not found" });
        return;
      }
      const testdata = await storage.getMessagesByConversation(
        announcements.id,
      );
      if (testdata.length == 0) {
        await storage.createMessage({
          conversationId: announcements.id,
          senderId: "user1",
          content: "CQC Inspection! Preparation meeting tomorrow 3 PM",
          blocked: null,
          blockReason: null,
        });
        await storage.createMessage({
          conversationId: announcements.id,
          senderId: "user1",
          content: "New Staff Member! Welcome Dr. Emily Chen starting Monday",
          blocked: null,
          blockReason: null,
        });
        await storage.createMessage({
          conversationId: announcements.id,
          senderId: "user1",
          content: "System Maintenance! Scheduled downtime Sunday 2-4 AM",
          blocked: null,
          blockReason: null,
        });
      }

      const messageData = await storage.getMessagesByConversation(
        announcements.id,
      );
      res.json(messageData);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to retrieve announcements", error });
    }
  });

  app.get(
    "/api/messaging/initConversation/:conversationId",
    async (req, res) => {
      try {
        const conversationId = parseInt(req.params.conversationId, 10);
        if (isNaN(conversationId)) {
          res.status(400).json({ message: "Invalid conversation ID" });
          return;
        }
        const messageData =
          await storage.getMessagesByConversation(conversationId);
        if (messageData.length == 0) {
          res.status(200).json([]); // Return empty array instead of error
          return;
        }
        res.json(messageData);
      } catch (error) {
        res.status(500).json({ message: "Failed to retrieve message" });
      }
    },
  );

  app.post("/api/messaging/messages", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);

      var messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: currentUser!.id,
      });

      /**if (messageData.conversationId == "Anouncement") {
        const conversations = await storage.getConversationsByUser(
          currentUser.id,
          currentUser.practiceId,
        );
        const announcements = conversations.find(
          (obj) => obj.title == "announcements",
        );
        messageData = insertMessageSchema.parse({
          messageData,
          conversationid: announcements.id,
        });
      }*/

      // AI Safety Net
      const safetyCheck = await analyzeMessageForPII(messageData.content);
      if (!safetyCheck.safe) {
        res.status(400).json({
          message: "Message blocked due to potential patient data",
          reason: safetyCheck.reason,
        });
        return;
      }

      // Verify conversation belongs to user's practice
      const conversation = await storage.getConversation(
        messageData.conversationId,
        currentUser!.practiceId,
      );
      if (!conversation) {
        res.status(404).json({ message: "Conversation not found" });
        return;
      }

      const message = await storage.createMessage(messageData);

      // Broadcast to WebSocket clients
      broadcastMessage(messageData.conversationId.toString(), message);

      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid message data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  });

  // Money endpoints
  app.get("/api/money/dashboard", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const transactions = await storage.getTransactionsByPractice(
      currentUser!.practiceId,
    );
    const invoices = await storage.getInvoicesByPractice(
      currentUser!.practiceId,
    );

    const revenue = transactions
      .filter((t) => t.category === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t) => t.category === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const overdueInvoices = invoices.filter(
      (i) => i.status === "overdue",
    ).length;

    res.json({
      monthlyRevenue: revenue,
      expenses,
      profitLoss: revenue - expenses,
      vatDue: revenue * 0.2, // 20% VAT estimate
      overdueInvoices,
    });
  });

  app.get("/api/money/transactions", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const transactions = await storage.getTransactionsByPractice(
      currentUser!.practiceId,
    );
    res.json(transactions);
  });

  app.post("/api/money/transactions", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        practiceId: currentUser!.practiceId,
      });

      const transaction = await storage.createTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid transaction data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create transaction" });
      }
    }
  });

  app.get("/api/money/invoices", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const invoices = await storage.getInvoicesByPractice(
      currentUser!.practiceId,
    );
    res.json(invoices);
  });

  app.post("/api/money/invoices", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const invoiceData = insertInvoiceSchema.parse({
        ...req.body,
        practiceId: currentUser!.practiceId,
      });

      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid invoice data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create invoice" });
      }
    }
  });

  app.get("/api/money/purchases", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const purchases = await storage.getPurchasesByPractice(
      currentUser!.practiceId,
    );
    res.json(purchases);
  });

  app.post("/api/money/purchases", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const purchaseData = insertPurchaseSchema.parse({
        ...req.body,
        practiceId: currentUser!.practiceId,
      });

      const purchase = await storage.createPurchase(purchaseData);
      res.json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid purchase data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create purchase" });
      }
    }
  });

  app.get("/api/money/reports/profit-and-loss", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const transactions = await storage.getTransactionsByPractice(
      currentUser!.practiceId,
    );

    const income = transactions
      .filter((t) => t.category === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t) => t.category === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    res.json({
      income,
      expenses,
      netProfit: income - expenses,
      profitMargin: income > 0 ? ((income - expenses) / income) * 100 : 0,
    });
  });

  app.get("/api/money/calculations/corporation-tax", async (req, res) => {
    const currentUser = await getCurrentUser(req.body);
    const transactions = await storage.getTransactionsByPractice(
      currentUser!.practiceId,
    );

    const profit =
      transactions
        .filter((t) => t.category === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) -
      transactions
        .filter((t) => t.category === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    // UK Corporation Tax rate for small companies (19%)
    const taxRate = 0.19;
    const estimatedTax = Math.max(0, profit * taxRate);

    res.json({
      profit,
      taxRate: taxRate * 100,
      estimatedTax,
      allowances: 0, // Placeholder for future implementation
    });
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const aiResponse = await generateHealthcareResponse(message);

      if (aiResponse.error) {
        return res.status(500).json({ error: aiResponse.error });
      }

      res.json({
        response: aiResponse.response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // File Upload Routes
  // Get upload URL for secure file upload
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Set ACL policy after file upload
  app.put("/api/files/uploaded", async (req, res) => {
    try {
      const { fileURL, fileName, fileType, fileSize } = req.body;

      if (!fileURL) {
        return res.status(400).json({ error: "fileURL is required" });
      }

      const currentUser = await getCurrentUser(req.body);
      const objectStorageService = new ObjectStorageService();

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileURL,
        {
          owner: currentUser!.id,
          visibility: "private", // Healthcare files should be private
          aclRules: [
            {
              group: {
                type: "practice_members" as any,
                id: currentUser!.practiceId,
              },
              permission: ObjectPermission.READ,
            },
          ],
        },
      );

      res.json({
        objectPath,
        fileName,
        fileType,
        fileSize,
      });
    } catch (error) {
      console.error("Error setting file ACL:", error);
      res.status(500).json({ error: "Failed to set file permissions" });
    }
  });

  // Serve protected files
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const currentUser = await getCurrentUser(req.body.creator);
      const objectStorageService = new ObjectStorageService();

      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: currentUser!.id,
        requestedPermission: ObjectPermission.READ,
      });

      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing file:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
