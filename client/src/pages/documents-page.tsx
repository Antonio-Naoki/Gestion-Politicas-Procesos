import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { NewDocumentModal } from "@/components/documents/new-document-modal";
import { Document, User } from "@shared/schema";
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
  Loader2
} from "lucide-react";

type ExtendedDocument = Document & {
  createdByUser?: Partial<User>;
};

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  
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
  const { data: documents, isLoading, isError } = useQuery<ExtendedDocument[]>({
    queryKey: ["/api/documents"]
  });
  
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };
  
  // Filter documents based on search and filters
  const filteredDocuments = documents?.filter(doc => {
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
    
    // Tab filter (My Documents, All Documents)
    const matchesTab = true; // This would be implemented based on user
    
    return matchesSearch && matchesCategory && matchesDepartment && matchesStatus && matchesTab;
  });
  
  // Get unique categories, departments for filter options
  const categories = documents ? [...new Set(documents.map(doc => doc.category))] : [];
  const departments = documents ? [...new Set(documents.map(doc => doc.department))] : [];
  
  return (
    <MainLayout 
      pendingApprovalCount={approvals?.length || 0}
      pendingTaskCount={tasks?.length || 0}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <Button onClick={() => setShowNewDocumentModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Documento
        </Button>
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
                       category === "policy" ? "Política" :
                       category === "instruction" ? "Instructivo" :
                       category === "procedure" ? "Procedimiento" :
                       category === "manual" ? "Manual" :
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
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos los Documentos</TabsTrigger>
          <TabsTrigger value="my">Mis Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar documentos. Intente de nuevo.
            </div>
          ) : filteredDocuments && filteredDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDocuments.map((document) => (
                <DocumentCard 
                  key={document.id} 
                  document={document}
                  onView={() => handleViewDocument(document)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No se encontraron documentos</h3>
              <p>Pruebe a cambiar los filtros o cree un nuevo documento.</p>
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
        <TabsContent value="my" className="mt-6">
          {/* Similar content as "all" tab but filtered for current user's documents */}
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Filtro por mis documentos</h3>
            <p>Aquí se mostrarán solo los documentos que usted ha creado.</p>
          </div>
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
