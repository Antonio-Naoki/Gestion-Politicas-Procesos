import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertDocumentSchema, 
  insertApprovalSchema,
  insertTaskSchema,
  insertPolicyAcceptanceSchema,
  insertActivitySchema,
  insertDocumentVersionSchema
} from "@shared/schema";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check user role
const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Document routes
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(Number(req.params.id));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      const document = await storage.createDocument(validatedData);
      
      // Create initial version
      await storage.createDocumentVersion({
        documentId: document.id,
        version: document.version,
        content: document.content,
        createdBy: req.user.id
      });
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "create",
        entityType: "document",
        entityId: document.id,
        details: { title: document.title }
      });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.put("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user is the creator or has appropriate role
      if (document.createdBy !== req.user.id && !["admin", "manager", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        createdBy: document.createdBy
      });
      
      // Create new version if content changed
      if (document.content !== validatedData.content) {
        // Increment version
        const versionParts = document.version.split(".");
        const minorVersion = parseInt(versionParts[1]) + 1;
        validatedData.version = `${versionParts[0]}.${minorVersion}`;
        
        await storage.createDocumentVersion({
          documentId: document.id,
          version: validatedData.version,
          content: validatedData.content,
          createdBy: req.user.id
        });
      }
      
      const updatedDocument = await storage.updateDocument(documentId, validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "update",
        entityType: "document",
        entityId: documentId,
        details: { title: updatedDocument.title, version: updatedDocument.version }
      });
      
      res.json(updatedDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      await storage.deleteDocument(documentId);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "delete",
        entityType: "document",
        entityId: documentId,
        details: { title: document.title }
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Approval routes
  app.get("/api/approvals", isAuthenticated, async (req, res) => {
    try {
      // For managers and coordinators - show all approvals they can manage
      if (["manager", "coordinator", "admin"].includes(req.user.role)) {
        const approvals = await storage.getAllApprovals();
        return res.json(approvals);
      }
      
      // For others - show only approvals for their documents
      const approvals = await storage.getApprovalsByUser(req.user.id);
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  app.post("/api/documents/:id/submit", isAuthenticated, async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user is the creator
      if (document.createdBy !== req.user.id && !["admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Update document status
      await storage.updateDocument(documentId, { 
        ...document,
        status: "pending" 
      });
      
      // Create approval request for managers/coordinators
      const managers = await storage.getUsersByRole(["manager", "coordinator"]);
      
      for (const manager of managers) {
        await storage.createApproval({
          documentId,
          userId: manager.id,
          status: "pending"
        });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "submit",
        entityType: "document",
        entityId: documentId,
        details: { title: document.title }
      });
      
      res.json({ message: "Document submitted for approval" });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit document for approval" });
    }
  });

  app.post("/api/approvals/:id", isAuthenticated, checkRole(["admin", "manager", "coordinator"]), async (req, res) => {
    try {
      const approvalId = Number(req.params.id);
      const { status, comments } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const approval = await storage.getApproval(approvalId);
      
      if (!approval) {
        return res.status(404).json({ message: "Approval not found" });
      }
      
      // Update approval
      const updatedApproval = await storage.updateApproval(approvalId, {
        ...approval,
        status,
        comments,
        approvedAt: new Date()
      });
      
      // Get document
      const document = await storage.getDocument(approval.documentId);
      
      // Update document status if all approvals are done
      if (status === "approved") {
        const allApprovals = await storage.getApprovalsByDocumentId(approval.documentId);
        const allApproved = allApprovals.every(a => a.status === "approved" || a.id === approvalId);
        
        if (allApproved) {
          await storage.updateDocument(approval.documentId, {
            ...document,
            status: "approved"
          });
        }
      } else if (status === "rejected") {
        // If rejected, update document status
        await storage.updateDocument(approval.documentId, {
          ...document,
          status: "rejected"
        });
      }
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: status,
        entityType: "approval",
        entityId: approvalId,
        details: { documentTitle: document.title, comments }
      });
      
      res.json(updatedApproval);
    } catch (error) {
      res.status(500).json({ message: "Failed to process approval" });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      if (["admin", "manager", "coordinator"].includes(req.user.role)) {
        // Managers and coordinators can see all tasks
        const tasks = await storage.getAllTasks();
        return res.json(tasks);
      }
      
      // Regular users only see their assigned tasks
      const tasks = await storage.getTasksByAssignee(req.user.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse({
        ...req.body,
        assignedBy: req.user.id
      });
      
      const task = await storage.createTask(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "create",
        entityType: "task",
        entityId: task.id,
        details: { title: task.title, assignedTo: task.assignedTo }
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id/status", isAuthenticated, async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const { status } = req.body;
      
      if (!["pending", "in_progress", "completed", "canceled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check if user is assignee or has admin/manager role
      if (task.assignedTo !== req.user.id && !["admin", "manager", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updates: any = { ...task, status };
      
      // Set completed date if task is marked as completed
      if (status === "completed") {
        updates.completedAt = new Date();
      }
      
      const updatedTask = await storage.updateTask(taskId, updates);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "update_status",
        entityType: "task",
        entityId: taskId,
        details: { title: task.title, status }
      });
      
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Policy acceptance routes
  app.post("/api/policies/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document || document.status !== "approved") {
        return res.status(404).json({ message: "Policy not found or not approved" });
      }
      
      // Create policy acceptance
      const acceptance = await storage.createPolicyAcceptance({
        userId: req.user.id,
        documentId
      });
      
      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "accept",
        entityType: "policy",
        entityId: documentId,
        details: { title: document.title }
      });
      
      res.status(201).json(acceptance);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept policy" });
    }
  });

  app.get("/api/policies/:id/acceptances", isAuthenticated, checkRole(["admin", "manager", "coordinator"]), async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const acceptances = await storage.getPolicyAcceptancesByDocument(documentId);
      res.json(acceptances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch policy acceptances" });
    }
  });

  // User routes
  app.get("/api/users", isAuthenticated, checkRole(["admin", "manager", "coordinator"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Activity routes
  app.get("/api/activities", isAuthenticated, async (req, res) => {
    try {
      const activities = await storage.getRecentActivities(20);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
