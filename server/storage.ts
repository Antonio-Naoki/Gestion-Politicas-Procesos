import { 
  users, 
  documents, 
  approvals, 
  tasks, 
  policyAcceptances, 
  activities, 
  documentVersions,
  type User, 
  type InsertUser, 
  type Document, 
  type InsertDocument, 
  type Approval, 
  type InsertApproval, 
  type Task, 
  type InsertTask, 
  type PolicyAcceptance, 
  type InsertPolicyAcceptance, 
  type Activity, 
  type InsertActivity, 
  type DocumentVersion, 
  type InsertDocumentVersion 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(roles: string[]): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  
  // Document methods
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByUser(userId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<Document>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  
  // Approval methods
  getApproval(id: number): Promise<Approval | undefined>;
  getAllApprovals(): Promise<Approval[]>;
  getApprovalsByUser(userId: number): Promise<Approval[]>;
  getApprovalsByDocumentId(documentId: number): Promise<Approval[]>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: number, approval: Partial<Approval>): Promise<Approval>;
  
  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(): Promise<Task[]>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  
  // Policy acceptance methods
  getPolicyAcceptance(id: number): Promise<PolicyAcceptance | undefined>;
  getPolicyAcceptancesByUser(userId: number): Promise<PolicyAcceptance[]>;
  getPolicyAcceptancesByDocument(documentId: number): Promise<PolicyAcceptance[]>;
  createPolicyAcceptance(acceptance: InsertPolicyAcceptance): Promise<PolicyAcceptance>;
  
  // Activity methods
  getActivity(id: number): Promise<Activity | undefined>;
  getRecentActivities(limit: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Document version methods
  getDocumentVersion(id: number): Promise<DocumentVersion | undefined>;
  getDocumentVersionsByDocument(documentId: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private documentsMap: Map<number, Document>;
  private approvalsMap: Map<number, Approval>;
  private tasksMap: Map<number, Task>;
  private policyAcceptancesMap: Map<number, PolicyAcceptance>;
  private activitiesMap: Map<number, Activity>;
  private documentVersionsMap: Map<number, DocumentVersion>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private documentIdCounter: number;
  private approvalIdCounter: number;
  private taskIdCounter: number;
  private policyAcceptanceIdCounter: number;
  private activityIdCounter: number;
  private documentVersionIdCounter: number;

  constructor() {
    this.usersMap = new Map();
    this.documentsMap = new Map();
    this.approvalsMap = new Map();
    this.tasksMap = new Map();
    this.policyAcceptancesMap = new Map();
    this.activitiesMap = new Map();
    this.documentVersionsMap = new Map();
    
    this.userIdCounter = 1;
    this.documentIdCounter = 1;
    this.approvalIdCounter = 1;
    this.taskIdCounter = 1;
    this.policyAcceptanceIdCounter = 1;
    this.activityIdCounter = 1;
    this.documentVersionIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    this.seedData();
  }

  // Seed some initial data
  private seedData() {
    // Add admin user
    this.createUser({
      username: "admin",
      password: "$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41", // "admin123"
      name: "Admin User",
      email: "admin@cerater.com",
      role: "admin",
      department: "Administration"
    });
    
    // Add manager user
    this.createUser({
      username: "manager",
      password: "$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41", // "manager123"
      name: "Roberto Sánchez",
      email: "manager@cerater.com",
      role: "manager",
      department: "Production"
    });
    
    // Add coordinator user
    this.createUser({
      username: "coordinator",
      password: "$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41", // "coordinator123"
      name: "Ana Martínez",
      email: "coordinator@cerater.com",
      role: "coordinator",
      department: "Quality"
    });
    
    // Add analyst user
    this.createUser({
      username: "analyst",
      password: "$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41", // "analyst123"
      name: "Carlos Ramírez",
      email: "analyst@cerater.com",
      role: "analyst",
      department: "Operations"
    });
    
    // Add operator user
    this.createUser({
      username: "operator",
      password: "$argon2id$v=19$m=65536,t=3,p=4$Tpn5uQD5VnEXo0QiR4xoaw$ADxB9Lx2mHnsBvQyhZ/7HN1GWnpQDeLWZWGQ/xVpgII.86b13ea8c8da2a282b4b7202e2594f41", // "operator123"
      name: "María Gómez",
      email: "operator@cerater.com",
      role: "operator",
      department: "Production"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username,
    );
  }

  async getUsersByRole(roles: string[]): Promise<User[]> {
    return Array.from(this.usersMap.values()).filter(
      (user) => roles.includes(user.role)
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.usersMap.set(id, user);
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...userUpdate };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documentsMap.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documentsMap.values());
  }

  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return Array.from(this.documentsMap.values()).filter(
      (doc) => doc.createdBy === userId
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const now = new Date();
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: now, 
      updatedAt: now,
      tags: insertDocument.tags || []
    };
    this.documentsMap.set(id, document);
    return document;
  }

  async updateDocument(id: number, documentUpdate: Partial<Document>): Promise<Document> {
    const document = await this.getDocument(id);
    if (!document) {
      throw new Error("Document not found");
    }
    
    const now = new Date();
    const updatedDocument = { ...document, ...documentUpdate, updatedAt: now };
    this.documentsMap.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<void> {
    this.documentsMap.delete(id);
  }

  // Approval methods
  async getApproval(id: number): Promise<Approval | undefined> {
    return this.approvalsMap.get(id);
  }

  async getAllApprovals(): Promise<Approval[]> {
    return Array.from(this.approvalsMap.values());
  }

  async getApprovalsByUser(userId: number): Promise<Approval[]> {
    return Array.from(this.approvalsMap.values()).filter(
      (approval) => approval.userId === userId
    );
  }

  async getApprovalsByDocumentId(documentId: number): Promise<Approval[]> {
    return Array.from(this.approvalsMap.values()).filter(
      (approval) => approval.documentId === documentId
    );
  }

  async createApproval(insertApproval: InsertApproval): Promise<Approval> {
    const id = this.approvalIdCounter++;
    const now = new Date();
    const approval: Approval = { ...insertApproval, id, createdAt: now, approvedAt: null };
    this.approvalsMap.set(id, approval);
    return approval;
  }

  async updateApproval(id: number, approvalUpdate: Partial<Approval>): Promise<Approval> {
    const approval = await this.getApproval(id);
    if (!approval) {
      throw new Error("Approval not found");
    }
    
    const updatedApproval = { ...approval, ...approvalUpdate };
    this.approvalsMap.set(id, updatedApproval);
    return updatedApproval;
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasksMap.get(id);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasksMap.values());
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasksMap.values()).filter(
      (task) => task.assignedTo === userId
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const now = new Date();
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: now, 
      completedAt: null 
    };
    this.tasksMap.set(id, task);
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error("Task not found");
    }
    
    const updatedTask = { ...task, ...taskUpdate };
    this.tasksMap.set(id, updatedTask);
    return updatedTask;
  }

  // Policy acceptance methods
  async getPolicyAcceptance(id: number): Promise<PolicyAcceptance | undefined> {
    return this.policyAcceptancesMap.get(id);
  }

  async getPolicyAcceptancesByUser(userId: number): Promise<PolicyAcceptance[]> {
    return Array.from(this.policyAcceptancesMap.values()).filter(
      (acceptance) => acceptance.userId === userId
    );
  }

  async getPolicyAcceptancesByDocument(documentId: number): Promise<PolicyAcceptance[]> {
    return Array.from(this.policyAcceptancesMap.values()).filter(
      (acceptance) => acceptance.documentId === documentId
    );
  }

  async createPolicyAcceptance(insertAcceptance: InsertPolicyAcceptance): Promise<PolicyAcceptance> {
    // Check if user has already accepted this policy
    const existing = Array.from(this.policyAcceptancesMap.values()).find(
      (a) => a.userId === insertAcceptance.userId && a.documentId === insertAcceptance.documentId
    );
    
    if (existing) {
      return existing;
    }
    
    const id = this.policyAcceptanceIdCounter++;
    const now = new Date();
    const acceptance: PolicyAcceptance = { ...insertAcceptance, id, acceptedAt: now };
    this.policyAcceptancesMap.set(id, acceptance);
    return acceptance;
  }

  // Activity methods
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activitiesMap.get(id);
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activitiesMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const now = new Date();
    const activity: Activity = { 
      ...insertActivity, 
      id, 
      createdAt: now,
      details: insertActivity.details || {}
    };
    this.activitiesMap.set(id, activity);
    return activity;
  }

  // Document version methods
  async getDocumentVersion(id: number): Promise<DocumentVersion | undefined> {
    return this.documentVersionsMap.get(id);
  }

  async getDocumentVersionsByDocument(documentId: number): Promise<DocumentVersion[]> {
    return Array.from(this.documentVersionsMap.values())
      .filter((version) => version.documentId === documentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDocumentVersion(insertVersion: InsertDocumentVersion): Promise<DocumentVersion> {
    const id = this.documentVersionIdCounter++;
    const now = new Date();
    const version: DocumentVersion = { ...insertVersion, id, createdAt: now };
    this.documentVersionsMap.set(id, version);
    return version;
  }
}

export const storage = new MemStorage();
