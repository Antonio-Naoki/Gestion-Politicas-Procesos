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
  Loader2,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ExtendedDocument = Document & {
  createdByUser?: Partial<User>;
};

export default function PoliciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");

  const [selectedPolicy, setSelectedPolicy] = useState<Document | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showNewPolicyModal, setShowNewPolicyModal] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

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

  // Get all documents
  const { data: allDocuments, isLoading, isError } = useQuery<ExtendedDocument[]>({
    queryKey: ["/api/documents"]
  });

  // Filter only policies (documents with category "policy")
  const policies = allDocuments?.filter(doc => doc.category === "policy") || [];

  const handleViewPolicy = (policy: Document) => {
    setSelectedPolicy(policy);
    setShowPolicyModal(true);
  };

  // Filter policies based on search and filters
  const filteredPolicies = policies?.filter(policy => {
    // Search query filter
    const matchesSearch = searchQuery 
      ? policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (policy.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Department filter
    const matchesDepartment = departmentFilter === "all" ? true : policy.department === departmentFilter;

    // Status filter
    const matchesStatus = statusFilter === "all" ? true : policy.status === statusFilter;

    // Tab filter (My Policies, All Policies)
    const matchesTab = activeTab === "all" ? true : (user && policy.createdBy === user.id);

    return matchesSearch && matchesDepartment && matchesStatus && matchesTab;
  });

  // Get unique departments for filter options
  const departments = policies ? [...new Set(policies.map(policy => policy.department))] : [];

  // Handle submitting a policy for approval
  const handleSubmitForApproval = async (policyId: number) => {
    try {
      await apiRequest("POST", `/api/policies/${policyId}/submit`, {});

      toast({
        title: "Política enviada para aprobación",
        description: "La política ha sido enviada para su revisión y aprobación.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la política para aprobación. Intente de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout 
      pendingApprovalCount={approvals?.length || 0}
      pendingTaskCount={tasks?.length || 0}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Políticas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las políticas de la organización
          </p>
        </div>
        <Button onClick={() => setShowNewPolicyModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Política
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
                  placeholder="Buscar políticas..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <TabsTrigger value="all">Todas las Políticas</TabsTrigger>
          <TabsTrigger value="my">Mis Políticas</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar políticas. Intente de nuevo.
            </div>
          ) : filteredPolicies && filteredPolicies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPolicies.map((policy) => (
                <DocumentCard 
                  key={policy.id} 
                  document={policy}
                  onView={() => handleViewPolicy(policy)}
                  showSubmitButton={policy.status === "draft"}
                  onSubmit={() => handleSubmitForApproval(policy.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No se encontraron políticas</h3>
              <p>Pruebe a cambiar los filtros o cree una nueva política.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowNewPolicyModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Política
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="my" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar políticas. Intente de nuevo.
            </div>
          ) : filteredPolicies && filteredPolicies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPolicies.map((policy) => (
                <DocumentCard 
                  key={policy.id} 
                  document={policy}
                  onView={() => handleViewPolicy(policy)}
                  showSubmitButton={policy.status === "draft"}
                  onSubmit={() => handleSubmitForApproval(policy.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No se encontraron políticas</h3>
              <p>No has creado ninguna política aún o no coinciden con los filtros actuales.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowNewPolicyModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Política
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Policy Preview Modal */}
      <DocumentPreviewModal
        open={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        document={selectedPolicy || undefined}
      />

      {/* New Policy Modal */}
      <NewDocumentModal
        open={showNewPolicyModal}
        onClose={() => setShowNewPolicyModal(false)}
        defaultCategory="policy"
        title="Nueva Política"
      />
    </MainLayout>
  );
}
