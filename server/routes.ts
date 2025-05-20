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
  app.get("/api/approvals", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
    try {
      let approvals = [];
      const entityType = req.query.entityType as string;

      // For managers and admins - show all approvals they can manage
      if (entityType) {
        approvals = await storage.getApprovalsByEntityType(entityType);
      } else {
        approvals = await storage.getAllApprovals();
      }

      // Fetch related data for each approval with individual error handling
      const enhancedApprovals = await Promise.all(approvals.map(async (approval) => {
        try {
          let entityData = null;

          if (approval.entityType === "document" && approval.documentId) {
            entityData = await storage.getDocument(approval.documentId);
          } else if (approval.entityType === "task" && approval.taskId) {
            entityData = await storage.getTask(approval.taskId);
          } else if (approval.entityType === "policy" && approval.policyId) {
            const policy = await storage.getDocument(approval.policyId);
            if (policy && policy.category === "policy") {
              entityData = policy;
            }
          }

          return {
            ...approval,
            entityData
          };
        } catch (err) {
          console.error(`Error fetching data for approval ${approval.id}:`, err);
          return {
            ...approval,
            entityData: null
          };
        }
      }));

      res.json(enhancedApprovals);
    } catch (error) {
      console.error("Error in GET /api/approvals:", error);
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  app.post("/api/documents/:id/submit", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Update document status
      await storage.updateDocument(documentId, { 
        ...document,
        status: "pending" 
      });

      // Create approval request for managers/admins
      const managers = await storage.getUsersByRole(["manager", "admin"]);

      for (const manager of managers) {
        await storage.createApproval({
          documentId,
          entityType: "document",
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

  // Submit task for approval
  app.post("/api/tasks/:id/submit", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Create approval request for managers/admins
      const managers = await storage.getUsersByRole(["manager", "admin"]);

      for (const manager of managers) {
        await storage.createApproval({
          taskId,
          entityType: "task",
          userId: manager.id,
          status: "pending"
        });
      }

      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "submit",
        entityType: "task",
        entityId: taskId,
        details: { title: task.title }
      });

      res.json({ message: "Task submitted for approval" });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit task for approval" });
    }
  });

  // Submit policy for approval
  app.post("/api/policies/:id/submit", isAuthenticated, checkRole(["admin", "manager"]), async (req, res) => {
    try {
      const policyId = Number(req.params.id);
      const policy = await storage.getDocument(policyId);

      if (!policy || policy.category !== "policy") {
        return res.status(404).json({ message: "Policy not found" });
      }

      // Update policy status
      await storage.updateDocument(policyId, { 
        ...policy,
        status: "pending" 
      });

      // Create approval request for managers/admins
      const managers = await storage.getUsersByRole(["manager", "admin"]);

      for (const manager of managers) {
        await storage.createApproval({
          policyId,
          entityType: "policy",
          userId: manager.id,
          status: "pending"
        });
      }

      // Log activity
      await storage.createActivity({
        userId: req.user.id,
        action: "submit",
        entityType: "policy",
        entityId: policyId,
        details: { title: policy.title }
      });

      res.json({ message: "Policy submitted for approval" });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit policy for approval" });
    }
  });

  app.post("/api/approvals/:id", isAuthenticated, checkRole(["admin", "manager", "coordinator"]), async (req, res) => {
    try {
      const approvalId = Number(req.params.id);
      const { status, comments } = req.body;

      if (!["approved", "rejected", "in_progress"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const approval = await storage.getApproval(approvalId);

      if (!approval) {
        return res.status(404).json({ message: "Approval not found" });
      }

      // Update approval
      try {
        console.log(`Processing approval ID: ${approvalId}, status: ${status}`);

        const updatedApproval = await storage.updateApproval(approvalId, {
          ...approval,
          status,
          comments,
          approvedAt: new Date()
        });

        console.log(`Successfully updated approval ID: ${approvalId}`);

        let entityTitle = "";
        let activityDetails = { comments };

        // Handle different entity types
        try {
          if (approval.entityType === "document" && approval.documentId) {
            const document = await storage.getDocument(approval.documentId);

            if (document) {
              entityTitle = document.title;
              activityDetails = { ...activityDetails, documentTitle: document.title };

              console.log(`Processing document ID: ${approval.documentId}, title: ${document.title}`);

              // Update document status if all approvals are done
              if (status === "approved") {
                const allApprovals = await storage.getApprovalsByDocumentId(approval.documentId);
                const allApproved = allApprovals.every(a => a.status === "approved" || a.id === approvalId);

                if (allApproved) {
                  await storage.updateDocument(approval.documentId, {
                    ...document,
                    status: "approved"
                  });
                  console.log(`Document ID: ${approval.documentId} marked as approved`);
                }
              } else if (status === "rejected") {
                // If rejected, update document status
                await storage.updateDocument(approval.documentId, {
                  ...document,
                  status: "rejected"
                });
                console.log(`Document ID: ${approval.documentId} marked as rejected`);
              } else if (status === "in_progress") {
                // If in progress, update document status
                await storage.updateDocument(approval.documentId, {
                  ...document,
                  status: "in_progress"
                });
                console.log(`Document ID: ${approval.documentId} marked as in progress`);
              }
            }
          } else if (approval.entityType === "task" && approval.taskId) {
            const task = await storage.getTask(approval.taskId);

            if (task) {
              entityTitle = task.title;
              activityDetails = { ...activityDetails, taskTitle: task.title };

              console.log(`Processing task ID: ${approval.taskId}, title: ${task.title}`);

              // Update task status based on approval
              if (status === "approved") {
                const allApprovals = await storage.getApprovalsByTaskId(approval.taskId);
                const allApproved = allApprovals.every(a => a.status === "approved" || a.id === approvalId);

                if (allApproved) {
                  await storage.updateTask(approval.taskId, {
                    ...task,
                    status: "completed"
                  });
                  console.log(`Task ID: ${approval.taskId} marked as completed`);
                }
              } else if (status === "rejected") {
                // If rejected, update task status
                await storage.updateTask(approval.taskId, {
                  ...task,
                  status: "pending"
                });
                console.log(`Task ID: ${approval.taskId} marked as pending`);
              } else if (status === "in_progress") {
                // If in progress, update task status
                await storage.updateTask(approval.taskId, {
                  ...task,
                  status: "in_progress"
                });
                console.log(`Task ID: ${approval.taskId} marked as in progress`);
              }
            }
          } else if (approval.entityType === "policy" && approval.policyId) {
            try {
              const policy = await storage.getDocument(approval.policyId);

              if (policy) {
                entityTitle = policy.title;
                activityDetails = { ...activityDetails, policyTitle: policy.title };

                console.log(`Processing policy ID: ${approval.policyId}, title: ${policy.title}`);

                // Update policy status if all approvals are done
                if (status === "approved") {
                  const allApprovals = await storage.getApprovalsByPolicyId(approval.policyId);
                  const allApproved = allApprovals.every(a => a.status === "approved" || a.id === approvalId);

                  if (allApproved) {
                    await storage.updateDocument(approval.policyId, {
                      ...policy,
                      status: "approved"
                    });
                    console.log(`Policy ID: ${approval.policyId} marked as approved`);
                  }
                } else if (status === "rejected") {
                  // If rejected, update policy status
                  await storage.updateDocument(approval.policyId, {
                    ...policy,
                    status: "rejected"
                  });
                  console.log(`Policy ID: ${approval.policyId} marked as rejected`);
                } else if (status === "in_progress") {
                  // If in progress, update policy status
                  await storage.updateDocument(approval.policyId, {
                    ...policy,
                    status: "in_progress"
                  });
                  console.log(`Policy ID: ${approval.policyId} marked as in progress`);
                }
              } else {
                console.log(`Policy ID: ${approval.policyId} not found, but approval will still be updated`);
                activityDetails = { ...activityDetails, policyId: approval.policyId, policyNotFound: true };
              }
            } catch (policyError) {
              console.error(`Error processing policy for approval ${approvalId}:`, policyError);
              activityDetails = { ...activityDetails, policyId: approval.policyId, policyError: true };
            }
          } else {
            console.log(`Unknown entity type: ${approval.entityType} for approval ID: ${approvalId}`);
          }
        } catch (entityError) {
          console.error(`Error updating entity for approval ${approvalId}:`, entityError);
          // We'll continue even if entity update fails, as the approval itself was updated
        }

        // Log activity
        try {
          await storage.createActivity({
            userId: req.user.id,
            action: status,
            entityType: approval.entityType,
            entityId: approvalId,
            details: activityDetails
          });
          console.log(`Activity logged for approval ID: ${approvalId}`);
        } catch (activityError) {
          console.error(`Error logging activity for approval ${approvalId}:`, activityError);
          // We'll continue even if activity logging fails
        }

        // Return success response even if secondary operations failed
        return res.json(updatedApproval);
      } catch (updateError) {
        console.error(`Error updating approval ${approvalId}:`, updateError);
        return res.status(500).json({ 
          message: "Failed to update approval", 
          error: updateError.message || "Unknown error" 
        });
      }
    } catch (error) {
      console.error("Error in POST /api/approvals/:id:", error);
      return res.status(500).json({ 
        message: "Failed to process approval", 
        error: error.message || "Unknown error" 
      });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      let tasks;
      if (["admin", "manager", "coordinator"].includes(req.user.role)) {
        // Managers and coordinators can see all tasks
        tasks = await storage.getAllTasks();
      } else {
        // Regular users only see their assigned tasks
        tasks = await storage.getTasksByAssignee(req.user.id);
      }

      // Get all users to add user information to tasks
      const users = await storage.getAllUsers();

      // Map tasks to include user information
      const tasksWithUsers = tasks.map(task => {
        const assignedToUser = users.find(u => u.id === task.assignedTo);
        const assignedByUser = users.find(u => u.id === task.assignedBy);

        return {
          ...task,
          assignedToUser: assignedToUser ? {
            id: assignedToUser.id,
            name: assignedToUser.name,
            role: assignedToUser.role
          } : undefined,
          assignedByUser: assignedByUser ? {
            id: assignedByUser.id,
            name: assignedByUser.name,
            role: assignedByUser.role
          } : undefined
        };
      });

      res.json(tasksWithUsers);
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
