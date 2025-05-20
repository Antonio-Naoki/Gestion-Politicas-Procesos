import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { NewDocumentModal } from "@/components/documents/new-document-modal";
import { Document, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Search, 
  Plus, 
  Filter,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RotateCw
} from "lucide-react";

type ExtendedDocument = Document & {
  createdByUser?: Partial<User>;
};

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Get approvals and tasks counts for the badge in the sidebar
  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
    select: (data) => data.filter(approval => approval.status === "pending")
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter(task => 
      task.status === "pending" || task.status === "in_progress"
    )
  });

  // Get documents with their creators
  const { data: documents, isLoading, isError, refetch } = useQuery<ExtendedDocument[]>({
    queryKey: ["/api/documents"],
    refetchOnMount: true,
    staleTime: 0,
    onSuccess: (data) => {
      console.log("Raw documents data:", data);
    },
    onError: (error) => {
      console.error("Error fetching documents:", error);
    }
  });

  // Effect to refetch documents when component mounts
  useEffect(() => {
    console.log("Component mounted, refetching documents...");
    refetch();
  }, [refetch]);

  // Submit document for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest("POST", `/api/documents/${documentId}/submit`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento enviado",
        description: "El documento se ha enviado para aprobación exitosamente.",
      });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Hubo un error al enviar el documento para aprobación",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Update document status mutation
  const updateDocumentStatusMutation = useMutation({
    mutationFn: async ({ documentId, status }: { documentId: number; status: string }) => {
      return await apiRequest("PUT", `/api/documents/${documentId}`, {
        status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del documento ha sido actualizado exitosamente.",
      });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Hubo un error al actualizar el estado del documento",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Hubo un error al eliminar el documento",
        variant: "destructive",
      });
    },
  });

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleSubmitForApproval = async (document: Document) => {
    try {
      setIsSubmitting(true);
      await submitForApprovalMutation.mutateAsync(document.id);
    } catch (error) {
      // Error is handled in the mutation callbacks
      setIsSubmitting(false);
    }
  };

  const handleStartProgress = async (document: Document) => {
    try {
      setIsSubmitting(true);
      await updateDocumentStatusMutation.mutateAsync({
        documentId: document.id,
        status: "in_progress"
      });
    } catch (error) {
      // Error is handled in the mutation callbacks
      setIsSubmitting(false);
    }
  };

  const handleCompleteDocument = async (document: Document) => {
    try {
      setIsSubmitting(true);
      await updateDocumentStatusMutation.mutateAsync({
        documentId: document.id,
        status: "approved"
      });
    } catch (error) {
      // Error is handled in the mutation callbacks
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (document: Document) => {
    try {
      await deleteDocumentMutation.mutateAsync(document.id);
    } catch (error) {
      // Error is handled in the mutation callbacks
    }
  };

  // Ensure documents is not undefined or null
  const documentsArray = documents || [];
  console.log("Documents array:", documentsArray);

  // Filter documents based on search and filters
  const filteredDocuments = documentsArray.filter(doc => {
    // Search query filter
    const matchesSearch = searchQuery 
      ? doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Category filter
    const matchesCategory = categoryFilter === "all" ? true : doc.category === categoryFilter;

    // Department filter
    const matchesDepartment = departmentFilter === "all" ? true : doc.department === departmentFilter;

    // Status filter
    const matchesStatus = statusFilter === "all" ? true : doc.status === statusFilter;

    return matchesSearch && matchesCategory && matchesDepartment && matchesStatus;
  });

  // Log filtered documents
  console.log("Filtered documents:", filteredDocuments);

  // Separate documents by status
  const draftDocuments = filteredDocuments?.filter(doc => doc.status === "draft") || [];
  const pendingDocuments = filteredDocuments?.filter(doc => doc.status === "pending") || [];
  const inProgressDocuments = filteredDocuments?.filter(doc => doc.status === "in_progress") || [];
  const approvedDocuments = filteredDocuments?.filter(doc => doc.status === "approved") || [];
  const rejectedDocuments = filteredDocuments?.filter(doc => doc.status === "rejected") || [];

  // Log documents by status
  console.log("Draft documents:", draftDocuments);
  console.log("Pending documents:", pendingDocuments);
  console.log("In progress documents:", inProgressDocuments);
  console.log("Approved documents:", approvedDocuments);
  console.log("Rejected documents:", rejectedDocuments);

  // Get unique categories, departments for filter options
  const categories = [...new Set(documentsArray.map(doc => doc.category))];
  const departments = [...new Set(documentsArray.map(doc => doc.department))];
  console.log("Categories:", categories);
  console.log("Departments:", departments);

  return (
    <MainLayout 
      pendingApprovalCount={approvals?.length || 0}
      pendingTaskCount={tasks?.length || 0}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              console.log("Refetching documents...");
              refetch();
            }}
            disabled={isLoading}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            {isLoading ? "Cargando..." : "Actualizar"}
          </Button>
          <Button onClick={() => setShowNewDocumentModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        </div>
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
                  placeholder="Buscar documentos..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category, index) => (
                    <SelectItem key={index} value={category}>
                      {category === "process" ? "Proceso Operativo" :
                       category === "instruction" ? "Instructivo" :
                       category === "procedure" ? "Procedimiento" :
                       category === "manual" ? "Manual" :
                       category === "policy" ? "Política" :
                       category}
                    </SelectItem>
                  ))}
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

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="draft" className="mb-6">
        <TabsList>
          <TabsTrigger value="draft" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Borradores ({draftDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Pendientes ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center">
            <RotateCw className="mr-2 h-4 w-4" />
            En Progreso ({inProgressDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            Aprobados ({approvedDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center">
            <XCircle className="mr-2 h-4 w-4" />
            Rechazados ({rejectedDocuments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draft" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar documentos. Intente de nuevo.
            </div>
          ) : draftDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {draftDocuments.map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  onView={() => handleViewDocument(document)}
                  showSubmitButton={document.createdBy === user?.id}
                  onSubmit={() => handleSubmitForApproval(document)}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay documentos en borrador</h3>
              <p>No hay documentos en borrador que coincidan con los filtros actuales.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowNewDocumentModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Documento
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar documentos. Intente de nuevo.
            </div>
          ) : pendingDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pendingDocuments.map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  onView={() => handleViewDocument(document)}
                  onStartProgress={() => handleStartProgress(document)}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay documentos pendientes</h3>
              <p>No hay documentos pendientes que coincidan con los filtros actuales.</p>
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
              Error al cargar documentos. Intente de nuevo.
            </div>
          ) : inProgressDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inProgressDocuments.map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  onView={() => handleViewDocument(document)}
                  onComplete={() => handleCompleteDocument(document)}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay documentos en progreso</h3>
              <p>No hay documentos en progreso que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar documentos. Intente de nuevo.
            </div>
          ) : approvedDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {approvedDocuments.map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  onView={() => handleViewDocument(document)}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay documentos aprobados</h3>
              <p>No hay documentos aprobados que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar documentos. Intente de nuevo.
            </div>
          ) : rejectedDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rejectedDocuments.map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  onView={() => handleViewDocument(document)}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay documentos rechazados</h3>
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

      {/* New Document Modal */}
      <NewDocumentModal
        open={showNewDocumentModal}
        onClose={() => setShowNewDocumentModal(false)}
      />
    </MainLayout>
  );
}
