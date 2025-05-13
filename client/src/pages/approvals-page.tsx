import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ApprovalItem } from "@/components/approvals/approval-item";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { Document, Approval, User } from "@shared/schema";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Input 
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ExtendedApproval = Approval & {
  document: Document;
  documentCreator?: Partial<User>;
};

export default function ApprovalsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  
  const { user } = useAuth();
  
  // Get pending tasks count for the badge in the sidebar
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter(task => 
      task.status === "pending" || task.status === "in_progress"
    )
  });
  
  // Get all approvals with their documents and creators
  const { data: allApprovals, isLoading, isError } = useQuery<ExtendedApproval[]>({
    queryKey: ["/api/approvals"]
  });
  
  // Filter approvals based on search and filters
  const filteredApprovals = allApprovals?.filter(approval => {
    // Search query filter
    const matchesSearch = searchQuery 
      ? approval.document.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (approval.document.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Status filter
    const matchesStatus = statusFilter === "all" ? true : approval.status === statusFilter;
    
    // Department filter
    const matchesDepartment = departmentFilter === "all" ? true : approval.document.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });
  
  // Separate approvals by status
  const pendingApprovals = filteredApprovals?.filter(approval => approval.status === "pending") || [];
  const approvedApprovals = filteredApprovals?.filter(approval => approval.status === "approved") || [];
  const rejectedApprovals = filteredApprovals?.filter(approval => approval.status === "rejected") || [];
  
  // Get unique departments for filter options
  const departments = allApprovals 
    ? [...new Set(allApprovals.map(approval => approval.document.department))]
    : [];
  
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };
  
  return (
    <MainLayout 
      pendingApprovalCount={pendingApprovals.length || 0}
      pendingTaskCount={tasks?.length || 0}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Aprobaciones</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona las solicitudes de aprobación de documentos
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar aprobaciones..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((department, index) => (
                    <SelectItem key={index} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="pending" className="mb-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Pendientes ({pendingApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprobados ({approvedApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center">
            <XCircle className="mr-2 h-4 w-4" />
            Rechazados ({rejectedApprovals.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar aprobaciones. Intente de nuevo.
            </div>
          ) : pendingApprovals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingApprovals.map((approval) => (
                <ApprovalItem 
                  key={approval.id} 
                  approval={approval}
                  onViewDocument={handleViewDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay aprobaciones pendientes</h3>
              <p>No tienes documentos pendientes de aprobación en este momento.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : approvedApprovals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedApprovals.map((approval) => (
                <ApprovalItem 
                  key={approval.id} 
                  approval={approval}
                  onViewDocument={handleViewDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay aprobaciones aprobadas</h3>
              <p>No hay documentos aprobados que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rejectedApprovals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedApprovals.map((approval) => (
                <ApprovalItem 
                  key={approval.id} 
                  approval={approval}
                  onViewDocument={handleViewDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay aprobaciones rechazadas</h3>
              <p>No hay documentos rechazados que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        document={selectedDocument || undefined}
      />
    </MainLayout>
  );
}
