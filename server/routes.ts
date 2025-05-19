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

// En server/routes.ts o donde tengas definido el middleware

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "No autorizado" });
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
      // Convert dueDate from ISO string to Date object if it exists
      const requestData = {
        ...req.body,
        assignedBy: req.user.id
      };

      if (requestData.dueDate && typeof requestData.dueDate === 'string') {
        requestData.dueDate = new Date(requestData.dueDate);
      }

      const validatedData = insertTaskSchema.parse(requestData);

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

  // Ruta para actualizar un usuario (admin/manager)
  app.put("/api/users/:id", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const userData = req.body;

      // Verificar que el usuario existe
      const userToUpdate = await storage.getUser(userId);
      if (!userToUpdate) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      // Actualizar el usuario
      const updatedUser = await storage.updateUser(userId, userData);

      // Registrar la actividad
      await storage.createActivity({
        userId: req.user.id,
        action: "update",
        entityType: "user",
        entityId: userId,
        details: { updatedFields: Object.keys(userData) }
      });

      // Eliminar la contraseña de la respuesta
      const { password, ...sanitizedUser } = updatedUser;

      res.json({ 
        message: "Usuario actualizado correctamente",
        user: sanitizedUser 
      });
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      res.status(500).json({ message: "Error al actualizar el usuario" });
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

  // En server/routes.ts - agregar estas rutas junto con las demás

// En server/routes.ts - añadir estas rutas junto con las demás

// Ruta para restablecer la contraseña de un usuario (admin/manager)
app.put("/api/users/:id/reset-password", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "La contraseña es requerida" });
    }

    // Verificar que el usuario existe
    const userToUpdate = await storage.getUser(userId);
    if (!userToUpdate) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar la contraseña
    const updated = await storage.updateUserPassword(userId, password);

    if (!updated) {
      return res.status(500).json({ message: "Error al actualizar la contraseña" });
    }

    // Registrar la actividad
    await storage.createActivity({
      userId: req.user.id,
      action: "update",
      entityType: "user_password",
      entityId: userId,
      details: { updatedAt: new Date() }
    });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error actualizando contraseña de usuario:", error);
    res.status(500).json({ message: "Error al actualizar la contraseña del usuario" });
  }
});

// Ruta para actualizar el perfil del usuario
// En server/routes.ts
app.put("/api/profile", isAuthenticated, async (req, res) => {
  try {
    const { name, email, department } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    // Validaciones básicas
    if (!name || !email || !department) {
      return res.status(400).json({ 
        message: "Todos los campos son requeridos" 
      });
    }

    const updatedUser = await storage.updateUser(userId, {
      name,
      email,
      department
    });

    // Log de actividad
    await storage.createActivity({
      userId,
      action: "update",
      entityType: "profile",
      entityId: userId,
      details: { updatedFields: ["name", "email", "department"] }
    });

    res.json({ 
      message: "Perfil actualizado correctamente",
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    res.status(500).json({ message: "Error al actualizar el perfil" });
  }
});

// Ruta para cambiar la contraseña
app.post("/api/profile/change-password", isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    // Verificar la contraseña actual
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si la contraseña actual es correcta
    const isPasswordValid = await storage.validateUserPassword(userId, currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "La contraseña actual es incorrecta" });
    }

    // Actualizar la contraseña
    const updatedUser = await storage.updateUserPassword(userId, newPassword);
    console.log('Password update response:', updatedUser ? 'Success' : 'Failed');

    // Registrar la actividad
    await storage.createActivity({
      userId,
      action: "update",
      entityType: "password",
      entityId: userId,
      details: { updatedAt: new Date() }
    });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error actualizando contraseña:", error);
    // Provide more specific error message based on the error
    if (error.message.includes("User not found")) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    } else if (error.message.includes("Database error")) {
      return res.status(500).json({ message: "Error de base de datos al actualizar la contraseña" });
    } else if (error.message.includes("Password update failed")) {
      return res.status(500).json({ message: "La actualización de la contraseña falló" });
    }
    res.status(500).json({ message: "Error al actualizar la contraseña" });
  }
});

  const httpServer = createServer(app);

  return httpServer;
}
