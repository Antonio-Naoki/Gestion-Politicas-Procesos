import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ApprovalItem } from "@/components/approvals/approval-item";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { Document, Approval, User, Task } from "@shared/schema";
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
  Loader2,
  RotateCw,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type ExtendedApproval = Approval & {
  entityData?: any;
  entityCreator?: Partial<User>;
};

type ApprovalItem = {
  id: number;
  type: 'approval' | 'document' | 'task' | 'policy';
  status: string;
  title: string;
  description?: string;
  department?: string;
  category?: string;
  priority?: string;
  createdAt: Date;
  createdBy?: number;
  createdByUser?: Partial<User>;
  entityType?: string;
  entityId?: number;
  entityData?: any;
};

export default function ApprovalsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [, setLocation] = useLocation();

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Verificar si el usuario tiene permiso para ver esta página
  if (!user || !["admin", "manager"].includes(user.role)) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
          <p className="text-muted-foreground mb-4">
            No tienes permisos para acceder a esta sección. Solo los administradores y managers pueden gestionar aprobaciones.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-primary hover:underline"
          >
            Volver al Dashboard
          </button>
        </div>
      </MainLayout>
    );
  }

  // Get pending tasks count for the badge in the sidebar
  const { data: sidebarTasks } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter(task => 
      task.status === "pending" || task.status === "in_progress"
    )
  });

  // Get all approvals with their documents and creators
  const { data: allApprovals, isLoading: approvalsLoading } = useQuery<ExtendedApproval[]>({
    queryKey: ["/api/approvals"]
  });

  // Get all tasks
  const { data: allTasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"]
  });

  // Get all documents (including policies)
  const { data: allDocuments, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"]
  });

  // Get users for creator information
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  // Combine all items into a single list
  const allItems: ApprovalItem[] = [];

  // Add approvals
  if (allApprovals) {
    allApprovals.forEach(approval => {
      allItems.push({
        id: approval.id,
        type: 'approval',
        status: approval.status,
        title: approval.entityData?.title || "Sin título",
        description: approval.entityData?.description,
        department: approval.entityData?.department,
        category: approval.entityData?.category,
        createdAt: new Date(approval.createdAt),
        createdBy: approval.createdBy,
        createdByUser: users?.find(u => u.id === approval.createdBy),
        entityType: approval.entityType,
        entityId: approval.entityId,
        entityData: approval.entityData
      });
    });
  }

  // Add tasks
  if (allTasks) {
    allTasks.forEach(task => {
      allItems.push({
        id: task.id,
        type: 'task',
        status: task.status,
        title: task.title,
        description: task.description,
        priority: task.priority,
        createdAt: new Date(task.createdAt),
        createdBy: task.createdBy,
        createdByUser: users?.find(u => u.id === task.createdBy),
        entityType: 'task',
        entityId: task.id,
        entityData: task
      });
    });
  }

  // Add documents and policies
  if (allDocuments) {
    allDocuments.forEach(doc => {
      allItems.push({
        id: doc.id,
        type: doc.category === 'policy' ? 'policy' : 'document',
        status: doc.status,
        title: doc.title,
        description: doc.description,
        department: doc.department,
        category: doc.category,
        createdAt: new Date(doc.createdAt),
        createdBy: doc.createdBy,
        createdByUser: users?.find(u => u.id === doc.createdBy),
        entityType: doc.category === 'policy' ? 'policy' : 'document',
        entityId: doc.id,
        entityData: doc
      });
    });
  }

  // Filter items based on search and filters
  const filteredItems = allItems.filter(item => {
    // Entity type filter
    const matchesEntityType = entityTypeFilter === "all" ? true : 
                             (entityTypeFilter === "document" && (item.type === 'document' || item.category === 'document')) ||
                             (entityTypeFilter === "task" && item.type === 'task') ||
                             (entityTypeFilter === "policy" && (item.type === 'policy' || item.category === 'policy'));

    // Status filter
    const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;

    // Search query filter
    let matchesSearch = true;
    if (searchQuery) {
      matchesSearch = (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                     (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    }

    // Department filter - only applies to documents and policies
    let matchesDepartment = true;
    if (departmentFilter !== "all" && (item.type === "document" || item.type === "policy")) {
      matchesDepartment = item.department === departmentFilter;
    }

    return matchesSearch && matchesStatus && matchesDepartment && matchesEntityType;
  });

  // Separate items by status
  const pendingItems = filteredItems.filter(item => item.status === "pending") || [];
  const inProgressItems = filteredItems.filter(item => item.status === "in_progress") || [];
  const approvedItems = filteredItems.filter(item => item.status === "approved") || [];
  const rejectedItems = filteredItems.filter(item => item.status === "rejected") || [];

  // Loading state
  const isLoading = approvalsLoading || tasksLoading || documentsLoading;
  const isError = false; // We'll handle errors differently

  // Get unique departments for filter options
  const departments = allItems
    ? [...new Set(allItems
        .filter(item => item.type === "document" || item.type === "policy")
        .map(item => item.department)
        .filter(Boolean))]
    : [];

  const handleViewEntity = (entity: any, entityType: string) => {
    if (entityType === "document" || entityType === "policy") {
      setSelectedDocument(entity);
      setShowDocumentModal(true);
    } else if (entityType === "task") {
      // For tasks, we could implement a task preview modal in the future
      // For now, just show a toast notification with task details
      toast({
        title: "Detalles de la Tarea",
        description: `${entity.title} - ${entity.description || "Sin descripción"}`,
      });
    }
  };

  return (
    <MainLayout 
      pendingApprovalCount={pendingItems.length || 0}
      pendingTaskCount={sidebarTasks?.length || 0}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Aprobaciones y Seguimiento</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona y visualiza todas las tareas, documentos y políticas en sus diferentes estados
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="document">Documentos</SelectItem>
                  <SelectItem value="task">Tareas</SelectItem>
                  <SelectItem value="policy">Políticas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
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
            Pendientes ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center">
            <RotateCw className="mr-2 h-4 w-4" />
            En Progreso ({inProgressItems.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprobados ({approvedItems.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center">
            <XCircle className="mr-2 h-4 w-4" />
            Rechazados ({rejectedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar elementos. Intente de nuevo.
            </div>
          ) : pendingItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingItems.map((item) => (
                <ApprovalItem 
                  key={`${item.type}-${item.id}`} 
                  approval={{
                    id: item.id,
                    status: item.status,
                    entityType: item.entityType || item.type,
                    entityId: item.entityId || item.id,
                    entityData: item.entityData || item,
                    createdAt: item.createdAt,
                    createdBy: item.createdBy || 0,
                    updatedAt: item.createdAt
                  }}
                  onViewEntity={handleViewEntity}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay elementos pendientes</h3>
              <p>No hay tareas, documentos o políticas pendientes que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar elementos. Intente de nuevo.
            </div>
          ) : inProgressItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressItems.map((item) => (
                <ApprovalItem 
                  key={`${item.type}-${item.id}`} 
                  approval={{
                    id: item.id,
                    status: item.status,
                    entityType: item.entityType || item.type,
                    entityId: item.entityId || item.id,
                    entityData: item.entityData || item,
                    createdAt: item.createdAt,
                    createdBy: item.createdBy || 0,
                    updatedAt: item.createdAt
                  }}
                  onViewEntity={handleViewEntity}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay elementos en progreso</h3>
              <p>No hay tareas, documentos o políticas en progreso que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : approvedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedItems.map((item) => (
                <ApprovalItem 
                  key={`${item.type}-${item.id}`} 
                  approval={{
                    id: item.id,
                    status: item.status,
                    entityType: item.entityType || item.type,
                    entityId: item.entityId || item.id,
                    entityData: item.entityData || item,
                    createdAt: item.createdAt,
                    createdBy: item.createdBy || 0,
                    updatedAt: item.createdAt
                  }}
                  onViewEntity={handleViewEntity}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay elementos aprobados</h3>
              <p>No hay tareas, documentos o políticas aprobados que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rejectedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedItems.map((item) => (
                <ApprovalItem 
                  key={`${item.type}-${item.id}`} 
                  approval={{
                    id: item.id,
                    status: item.status,
                    entityType: item.entityType || item.type,
                    entityId: item.entityId || item.id,
                    entityData: item.entityData || item,
                    createdAt: item.createdAt,
                    createdBy: item.createdBy || 0,
                    updatedAt: item.createdAt
                  }}
                  onViewEntity={handleViewEntity}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay elementos rechazados</h3>
              <p>No hay tareas, documentos o políticas rechazados que coincidan con los filtros actuales.</p>
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
