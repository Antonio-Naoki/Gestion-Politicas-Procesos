import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { TasksList } from "@/components/dashboard/tasks-list";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { Document } from "@shared/schema";
import { 
  FileText, 
  Timer, 
  CheckCircle, 
  BookOpen 
} from "lucide-react";

export default function DashboardPage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  // Get pending approvals count
  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
    select: (data) => data.filter(approval => approval.status === "pending")
  });
  
  // Get pending tasks count
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter(task => 
      task.status === "pending" || task.status === "in_progress"
    )
  });
  
  // Get documents count
  const { data: documents } = useQuery({
    queryKey: ["/api/documents"]
  });
  
  // Get policies count and acceptance rate
  const { data: policies } = useQuery({
    queryKey: ["/api/documents"],
    select: (data) => data.filter(doc => 
      doc.category === "policy" && doc.status === "approved"
    )
  });
  
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };
  
  return (
    <MainLayout 
      pendingApprovalCount={approvals?.length || 0}
      pendingTaskCount={tasks?.length || 0}
    >
      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Documentos Totales"
          value={documents?.length || 0}
          icon={<FileText className="h-5 w-5" />}
          iconBgColor="bg-primary bg-opacity-10"
          iconColor="text-primary"
          changeValue={12}
          changeText="desde el último mes"
        />
        
        <StatsCard
          title="Pendientes de Aprobación"
          value={approvals?.length || 0}
          icon={<Timer className="h-5 w-5" />}
          iconBgColor="bg-secondary bg-opacity-10"
          iconColor="text-secondary"
          changeValue={5}
          changeText="desde el último mes"
        />
        
        <StatsCard
          title="Tareas Completadas"
          value={tasks?.filter(task => task.status === "completed")?.length || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          iconBgColor="bg-success bg-opacity-10"
          iconColor="text-success"
          changeValue={18}
          changeText="desde el último mes"
        />
        
        <StatsCard
          title="Políticas Activas"
          value={policies?.length || 0}
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
        <PendingApprovals onViewDocument={handleViewDocument} />
        
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
