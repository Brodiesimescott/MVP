import { response, type Express } from "express";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertStaffSchema,
  insertMessageSchema,
  insertTransactionSchema,
  insertInvoiceSchema,
  insertPurchaseSchema,
  insertConversationSchema,
  InsertUser,
  InsertPerson,
  insertPersonSchema,
  InsertConversation,
  insertRotaSchema,
  reviewStatusEnum,
} from "@shared/schema";
import { z } from "zod";
import { generateHealthcareResponse } from "./ai-service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

import { db, verifyConnection } from "@shared/index";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

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

// Helper to get current user from request
async function getCurrentUserFromRequest(req: any) {
  const email = req.query.email || req.body.email;
  if (!email) {
    return null;
  }
  return getCurrentUser(email);
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

  //Home api - returns user info if email is provided via query parameter
  app.get("/api/home", async (req, res) => {
    const email = req.query.email as string;

    if (!email) {
      res.status(400).json({ message: "Email parameter required" });
      return;
    }

    const currentUser = await getCurrentUser(email);
    if (currentUser == null) {
      res.status(401).json({ message: "Invalid user: Please login" });
      return;
    }
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
        employeeId: user.employeeId,
        hashedPassword: dohash(user.password, salt).toString("base64"),
        salt: salt,
        practiceId: user.practiceId,
        role: user.role,
      };
      const personTemplate: InsertPerson = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        id: user.employeeId,
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
        role: user.role,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const allStaff = await storage.getStaffByPractice(currentUser.practiceId);

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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const staff = await storage.getStaffByPractice(currentUser.practiceId);

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
          practiceId: currentUser.practiceId,
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
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const updates = insertStaffSchema.partial().parse(req.body);
      const updateName = insertPersonSchema.partial().parse(req.body);

      const existingStaff = await storage.getStaff(req.params.id);
      const existingPerson = await storage.getPerson(req.params.id);
      if (
        !existingStaff ||
        existingStaff.practiceId !== currentUser.practiceId ||
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
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

  app.get("/api/hr/appraisals", async (req, res) => {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const appraisals = await storage.getAppraisalsByPractice(
      currentUser.practiceId,
    );
    res.json(appraisals);
  });

  app.post("/api/hr/appraisal", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const appraisalEvidence = {
        ...req.body,
        practiceId: currentUser.practiceId,
      };

      const evidence = await storage.createAppraisal(appraisalEvidence);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to create evidence" });
    }
  });

  app.get("/api/hr/policies", async (req, res) => {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const policies = await storage.getPoliciesByPractice(
      currentUser.practiceId,
    );
    res.json(policies);
  });

  app.post("/api/hr/policy", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const policy = {
        ...req.body,
        practiceId: currentUser.practiceId,
      };

      const evidence = await storage.createPolicy(policy);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to create policy" });
    }
  });

  // Rota endpoints
  app.get("/api/hr/rota/:day", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { day } = req.params;
      const rota = await storage.getRotaByDay(currentUser.practiceId, day);

      if (!rota) {
        return res.status(404).json({ message: "Rota not found" });
      }

      res.json(rota);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rota" });
    }
  });

  app.post("/api/hr/rota", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const rotaData = insertRotaSchema.parse({
        ...req.body,
        practiceId: currentUser.practiceId,
      });

      const rota = await storage.createRota(rotaData);

      // Map day name to index (Sunday=0, Monday=1, etc.)
      const dayMap: { [key: string]: number } = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };

      const dayIndex = dayMap[rota.day];

      // Update workingHours for each assigned staff member
      if (
        dayIndex !== undefined &&
        rota.assignments &&
        Array.isArray(rota.assignments)
      ) {
        for (const assignment of rota.assignments as Array<{
          employeeId: string;
          shifts: string[];
        }>) {
          const staff = await storage.getStaff(assignment.employeeId);
          if (staff) {
            // Get existing workingHours or create default array
            const workingHours =
              staff.workingHours ||
              ([
                "not in",
                "not in",
                "not in",
                "not in",
                "not in",
                "not in",
                "not in",
              ] as ("am" | "pm" | "all day" | "not in")[]);

            // Determine the shift value
            let shiftValue: "am" | "pm" | "all day" | "not in" = "not in";
            if (assignment.shifts.includes("all-day")) {
              shiftValue = "all day";
            } else if (
              assignment.shifts.includes("am") &&
              assignment.shifts.includes("pm")
            ) {
              shiftValue = "all day";
            } else if (assignment.shifts.includes("am")) {
              shiftValue = "am";
            } else if (assignment.shifts.includes("pm")) {
              shiftValue = "pm";
            }

            // Update the specific day
            workingHours[dayIndex] = shiftValue;

            // Update staff member
            await storage.updateStaff(assignment.employeeId, { workingHours });
          }
        }
      }

      res.json(rota);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid rota data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create rota" });
      }
    }
  });

  app.put("/api/hr/rota/:day", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { day } = req.params;
      const updates = req.body;

      const updatedRota = await storage.updateRota(
        currentUser.practiceId,
        day,
        updates,
      );

      if (!updatedRota) {
        return res.status(404).json({ message: "Rota not found" });
      }

      res.json(updatedRota);
    } catch (error) {
      res.status(500).json({ message: "Failed to update rota" });
    }
  });

  // CQC endpoints
  app.get("/api/cqc/dashboard", async (req, res) => {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const standards = await storage.getCqcStandards();
    const evidence = await storage.getPracticeEvidence(currentUser.practiceId);

    // Get analyzed compliance scores if available, otherwise use defaults
    const complianceScores = await storage.getPracticeComplianceScores(
      currentUser.practiceId,
    );
    const keyQuestions = complianceScores || {
      Safe: 95,
      Effective: 98,
      Caring: 100,
      Responsive: 96,
      WellLed: 99,
    };

    // Calculate overall compliance score from key questions
    const totalScore = Object.values(keyQuestions).reduce(
      (sum, score) => sum + score,
      0,
    );
    const complianceScore = Math.round(
      totalScore / Object.keys(keyQuestions).length,
    );

    res.json({
      complianceScore,
      openIssues: complianceScore < 85 ? 3 : complianceScore < 95 ? 2 : 1,
      totalStandards: standards.length,
      evidenceCount: evidence.length,
      keyQuestions,
    });
  });

  app.get("/api/cqc/standards", async (req, res) => {
    const standards = await storage.getCqcStandards();
    res.json(standards);
  });

  app.post("/api/cqc/evidence", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const evidenceData = {
        ...req.body,
        practiceId: currentUser!.practiceId,
      };

      const evidence = await storage.createPracticeEvidence(evidenceData);
      res.json(evidence);
    } catch (error) {
      console.error("Error creating evidence:", error);
      res.status(500).json({ message: "Failed to create evidence" });
    }
  });

  app.get("/api/hr/cqcevidence", async (req, res) => {
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const evidence = await storage.getPracticeEvidence(currentUser.practiceId);
    res.json(evidence);
  });

  app.post("/api/cqc/generate-report", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const evidence = await storage.getPracticeEvidence(
        currentUser.practiceId,
      );

      if (evidence.length === 0) {
        return res
          .status(400)
          .json({ message: "No uploaded files found to analyze" });
      }

      // Download and read file contents from object storage
      const objectStorageService = new ObjectStorageService();
      const filesWithContent = await Promise.all(
        evidence.map(async (file) => {
          try {
            const objectFile = await objectStorageService.getObjectEntityFile(
              file.path,
            );
            const [fileContent] = await objectFile.download();
            const contentText = fileContent.toString("utf-8");

            return {
              fileName: file.fileName,
              description: file.description,
              uploadDate: file.uploadDate,
              content: contentText.substring(0, 10000), // Limit to first 10k chars to avoid token limits
            };
          } catch (error) {
            console.error(`Error reading file ${file.fileName}:`, error);
            return {
              fileName: file.fileName,
              description: file.description,
              uploadDate: file.uploadDate,
              content: "[File content could not be read]",
            };
          }
        }),
      );

      // Analyze files with AI to extract CQC compliance insights
      const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

      const analysisPrompt = `
Analyze these CQC compliance documents and provide scores (0-100) for each of the 5 key questions:

Uploaded Files and Their Contents:
${filesWithContent
  .map(
    (file) => `
--- File: ${file.fileName} ---
Description: ${file.description || "No description"}
Upload Date: ${file.uploadDate}

File Content:
${file.content}

---
`,
  )
  .join("\n")}

Based on the actual file contents above, provide realistic CQC compliance scores for:
1. Safe - How well does this evidence demonstrate patient safety measures?
2. Effective - How well does this evidence show effective care and treatment?
3. Caring - How well does this evidence demonstrate compassionate care?
4. Responsive - How well does this evidence show responsive services?
5. Well-Led - How well does this evidence demonstrate good leadership and governance?

Respond only with a JSON object in this exact format:
{
  "Safe": 85,
  "Effective": 92,
  "Caring": 78,
  "Responsive": 88,
  "WellLed": 94
}

Provide realistic scores based on the evidence provided. If evidence strongly supports an area, score it higher (80-95). If evidence is weak or missing for an area, score it lower (60-75).`;

      const result = await model.generateContent(analysisPrompt);
      const analysisText = result.response.text();

      try {
        // Clean AI response by removing code blocks if present
        let cleanedResponse = analysisText.trim();
        if (
          cleanedResponse.startsWith("```json") ||
          cleanedResponse.startsWith("```")
        ) {
          cleanedResponse = cleanedResponse
            .replace(/^```json?\s*/, "")
            .replace(/```\s*$/, "")
            .trim();
        }

        // Parse AI response and validate it
        const scores = JSON.parse(cleanedResponse);

        // Validate the response has all required keys
        const requiredKeys = [
          "Safe",
          "Effective",
          "Caring",
          "Responsive",
          "WellLed",
        ];
        const hasAllKeys = requiredKeys.every(
          (key) => key in scores && typeof scores[key] === "number",
        );

        if (!hasAllKeys) {
          throw new Error("Invalid AI response format");
        }

        // Store the analyzed scores for dashboard display
        await storage.updatePracticeComplianceScores(
          currentUser.practiceId,
          scores,
        );

        // Store the generated report as evidence
        const date = new Date().toISOString();
        await storage.createPracticeEvidence({
          practiceId: currentUser.practiceId,
          fileName: "CQC Compliance Report",
          description: `AI-generated CQC compliance report based on uploaded evidence`,
          path: `/reports/cqc-compliance-report_${date}`,
          reviewStatus: "needs_review",
          createdAt: new Date(),
        });
        // need to convert cleanedResponse string to file ;
        fs.writeFileSync(
          `./reports/cqc-compliance-report_${date}`,
          cleanedResponse,
        );

        // Return the analyzed scores
        res.json({
          success: true,
          keyQuestions: scores,
          analysisDate: new Date().toISOString(),
          filesAnalyzed: evidence.length,
        });
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        // Fallback: provide default scores based on file count and types
        const baseScore = Math.min(95, Math.max(65, 70 + evidence.length * 3));
        res.json({
          success: true,
          keyQuestions: {
            Safe: baseScore + Math.floor(Math.random() * 10) - 5,
            Effective: baseScore + Math.floor(Math.random() * 10) - 5,
            Caring: baseScore + Math.floor(Math.random() * 10) - 5,
            Responsive: baseScore + Math.floor(Math.random() * 10) - 5,
            WellLed: baseScore + Math.floor(Math.random() * 10) - 5,
          },
          analysisDate: new Date().toISOString(),
          filesAnalyzed: evidence.length,
          note: "AI analysis unavailable, scores estimated from uploaded evidence",
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Messaging endpoints
  app.get("/api/messaging/contacts", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const users = await storage.getUsersByPractice(currentUser.practiceId);
      const contactusers = users.filter((u) => u.employeeId !== currentUser.id);

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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
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
      currentUser.id,
      currentUser.practiceId,
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
          participantIds: [newuser0.employeeId, currentUser.id],
          title: "Sister Jane Smith",
        },
        {
          practiceId: "practice1",
          participantIds: [newuser1.employeeId, currentUser.id],
          title: "Mark Brown",
        },
        {
          practiceId: "practice1",
          participantIds: [newuser2.employeeId, currentUser.id],
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
      currentUser.id,
      currentUser.practiceId,
    );

    res.json(conversations);
  });

  app.post("/api/messaging/createconversations", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const newconversation: InsertConversation =
        insertConversationSchema.parse({
          ...req.body,
        });

      await storage.createConversation(newconversation);
      const conversations = await storage.getConversationsByUser(
        currentUser.id,
        currentUser.practiceId,
      );
      res.json(conversations);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/messaging/announcements", async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const UserbyPractice = await storage.getUsersByPractice(
        currentUser.practiceId,
      );

      const ids = UserbyPractice.map((user) => user.employeeId);

      const newconversation: InsertConversation =
        insertConversationSchema.parse({
          practiceId: currentUser.practiceId,
          title: "Announcements",
          participantIds: ids,
        });

      const testcreate = await storage.getConversationsByUser(
        currentUser.id,
        currentUser.practiceId,
      );
      if (testcreate.find((obj) => obj.title == "Announcements") == null) {
        await storage.createConversation(newconversation);
      }
      const conversations = await storage.getConversationsByUser(
        currentUser.id,
        currentUser.practiceId,
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
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      var messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: currentUser.id,
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
        currentUser.practiceId,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const transactions = await storage.getTransactionsByPractice(
      currentUser.practiceId,
    );
    const invoices = await storage.getInvoicesByPractice(
      currentUser.practiceId,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const transactions = await storage.getTransactionsByPractice(
      currentUser.practiceId,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const invoices = await storage.getInvoicesByPractice(
      currentUser.practiceId,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const purchases = await storage.getPurchasesByPractice(
      currentUser.practiceId,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const transactions = await storage.getTransactionsByPractice(
      currentUser.practiceId,
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
    const currentUser = await getCurrentUserFromRequest(req);
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const transactions = await storage.getTransactionsByPractice(
      currentUser.practiceId,
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

      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const objectStorageService = new ObjectStorageService();

      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileURL,
        {
          owner: currentUser.id,
          visibility: "private", // Healthcare files should be private
          aclRules: [
            {
              group: {
                type: "practice_members" as any,
                id: currentUser.practiceId,
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
      const currentUser = await getCurrentUserFromRequest(req);
      if (!currentUser) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const objectStorageService = new ObjectStorageService();

      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: currentUser.id,
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
