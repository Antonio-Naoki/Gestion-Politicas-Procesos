import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { TasksList } from "@/components/dashboard/tasks-list";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { Document, Approval } from "@shared/schema";
import { 
  FileText, 
  Timer, 
  CheckCircle, 
  BookOpen 
} from "lucide-react";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { api } from "@/lib/api";

interface ApprovalWithDocument extends Approval {
  document: Document;
}

interface ApprovalData {
  pendingApprovals: ApprovalWithDocument[];
  completedApprovals: ApprovalWithDocument[];
  recentApprovals: Array<{
    id: number;
    document: Document;
    status: string;
    createdAt: string;
  }>;
}

// Helper for status type guard
const allowedStatuses = ["pending", "in_progress", "approved", "rejected", "draft"] as const;
function toStatus(status: string): typeof allowedStatuses[number] {
  return allowedStatuses.includes(status as any) ? status as typeof allowedStatuses[number] : "draft";
}

export default function DashboardPage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const { triggerNotification } = useNotificationTrigger();
  
  // Get pending approvals count
  const { data: approvals = { pendingApprovals: [], completedApprovals: [], recentApprovals: [] } } = useQuery<ApprovalData>({
    queryKey: ["/api/approvals"],
    queryFn: async () => {
      const [approvalsResponse, documentsResponse] = await Promise.all([
        api.get("/api/approvals"),
        api.get("/api/documents")
      ]);
      
      const approvals = approvalsResponse.data;
      const documents = documentsResponse.data;
      
      // Map approvals with their corresponding documents
      const approvalsWithDocuments = approvals.map((approval: Approval) => {
        const document = documents.find((doc: Document) => doc.id === approval.documentId);
        return {
          id: approval.id,
          status: approval.status,
          createdAt: new Date(approval.createdAt).toISOString(),
          document: document ? {
            id: document.id,
            title: document.title,
            description: document.description,
            content: document.content,
            category: document.category,
            department: document.department,
            version: document.version,
            status: document.status,
            createdBy: document.createdBy,
            createdAt: typeof document.createdAt === 'string' ? document.createdAt : new Date(document.createdAt).toISOString(),
            updatedAt: typeof document.updatedAt === 'string' ? document.updatedAt : new Date(document.updatedAt).toISOString(),
            tags: document.tags
          } : {
            id: 0,
            title: "Documento no encontrado",
            description: null,
            content: "",
            category: "",
            department: "",
            version: "",
            status: "draft",
            createdBy: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: null
          }
        };
      });
      
      const pendingApprovals = approvalsWithDocuments.filter((approval: { status: string }) => approval.status === "pending");
      const completedApprovals = approvalsWithDocuments.filter((approval: { status: string }) => approval.status === "approved");
      const recentApprovals = (pendingApprovals
        .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((approval) => ({
          id: approval.id,
          status: approval.status,
          createdAt: approval.createdAt,
          document: {
            id: approval.document.id,
            title: approval.document.title,
            description: approval.document.description,
            content: approval.document.content,
            category: approval.document.category,
            department: approval.document.department,
            version: approval.document.version,
            status: toStatus(approval.document.status),
            createdBy: approval.document.createdBy,
            createdAt: String(approval.document.createdAt),
            updatedAt: String(approval.document.updatedAt),
            tags: approval.document.tags,
            fileUrl: approval.document.fileUrl ?? null
          }
        })) as Array<{
          id: number;
          status: string;
          createdAt: string;
          document: {
            id: number;
            title: string;
            description: string | null;
            content: string;
            category: string;
            department: string;
            version: string;
            status: string;
            createdBy: number;
            createdAt: string;
            updatedAt: string;
            tags: string[] | null;
            fileUrl: string | null;
          };
        }>)
      
      return {
        pendingApprovals,
        completedApprovals,
        recentApprovals
      };
    }
  });
  
  // Get pending tasks count
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await api.get("/api/tasks");
      return response.data;
    },
    select: (data) => data.filter((task: any) => 
      task.status === "pending" || task.status === "in_progress"
    )
  });
  
  // Get documents count
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await api.get("/api/documents");
      return response.data;
    }
  });
  
  // Get policies count and acceptance rate
  const { data: policies = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const response = await api.get("/api/documents");
      return response.data;
    },
    select: (data) => data.filter((doc: any) => 
      doc.category === "policy" && doc.status === "approved"
    )
  });
  
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };
  
  return (
    <MainLayout 
      pendingApprovalCount={approvals.pendingApprovals.length}
      pendingTaskCount={tasks.length}
    >
      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Documentos Totales"
          value={documents.length}
          icon={<FileText className="h-5 w-5" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-primary"
          changeValue={12}
          changeText="desde el último mes"
        />
        
        <StatsCard
          title="Pendientes de Aprobación"
          value={approvals.pendingApprovals.length}
          icon={<Timer className="h-5 w-5" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
          changeValue={5}
          changeText="desde el último mes"
        />
        
        <StatsCard
          title="Aprobaciones Completadas"
          value={approvals.completedApprovals.length}
          icon={<CheckCircle className="h-5 w-5" />}
          iconBgColor="bg-success bg-opacity-10"
          iconColor="text-success"
          changeValue={18}
          changeText="desde el último mes"
        />
        
        <StatsCard
          title="Políticas Activas"
          value={policies.length}
          icon={<BookOpen className="h-5 w-5" />}
          iconBgColor="bg-info bg-opacity-10"
          iconColor="text-info"
          progress={90}
          progressColor="bg-info"
        />
      </div>
      
      {/* Main content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Section */}
        <PendingApprovals 
          onViewDocument={handleViewDocument} 
          recentApprovals={approvals.recentApprovals}
        />
        
        {/* Tasks Section */}
        <TasksList />
      </div>
      
      {/* Recent Documents Section */}
      <RecentDocuments onViewDocument={handleViewDocument} />
      
      {/* Activity Timeline */}
      <ActivityTimeline />
      
      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        document={selectedDocument || undefined}
      />
    </MainLayout>
  );
}
