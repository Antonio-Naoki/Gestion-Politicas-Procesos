import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { Document, User, PolicyAcceptance } from "@shared/schema";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
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
import {
  Search,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Filter
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";

type ExtendedDocument = Document & {
  createdByUser?: Partial<User>;
  acceptances?: PolicyAcceptance[];
  acceptanceCount?: number;
  acceptancePercentage?: number;
  currentUserAccepted?: boolean;
};

type UserAcceptance = PolicyAcceptance & {
  user: Partial<User>;
};

export default function PoliciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("approved");
  const [selectedPolicy, setSelectedPolicy] = useState<ExtendedDocument | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showAcceptanceDialog, setShowAcceptanceDialog] = useState(false);
  const [showAcceptancesListDialog, setShowAcceptancesListDialog] = useState(false);
  const [policyAcceptances, setPolicyAcceptances] = useState<UserAcceptance[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get pending approvals count for the badge in the sidebar
  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
    select: (data) => data.filter(approval => approval.status === "pending")
  });
  
  // Get pending tasks count for the badge in the sidebar
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter(task => 
      task.status === "pending" || task.status === "in_progress"
    )
  });
  
  // Get all documents with policies category
  const { data: policies, isLoading, isError } = useQuery<ExtendedDocument[]>({
    queryKey: ["/api/documents"],
    select: (data) => {
      // Filter policies
      return data
        .filter(doc => doc.category === "policy")
        .map(policy => ({
          ...policy,
          // Default values that will be updated with acceptance data if available
          acceptanceCount: 0,
          acceptancePercentage: 0,
          currentUserAccepted: false
        }));
    }
  });
  
  // Get all users for calculating acceptance percentage
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: policies !== undefined && policies.length > 0
  });
  
  // Get policy acceptances for the current user
  const { data: userAcceptances } = useQuery<PolicyAcceptance[]>({
    queryKey: ["/api/policies/acceptances/user"],
    enabled: policies !== undefined && policies.length > 0
  });
  
  // Accept policy mutation
  const acceptPolicyMutation = useMutation({
    mutationFn: async (policyId: number) => {
      const response = await apiRequest("POST", `/api/policies/${policyId}/accept`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies/acceptances/user"] });
      toast({
        title: "Política aceptada",
        description: "Has aceptado exitosamente esta política",
      });
      setShowAcceptanceDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error al aceptar política",
        description: error instanceof Error ? error.message : "Error al aceptar política",
        variant: "destructive",
      });
    },
  });
  
  // Get acceptances for a specific policy
  const fetchPolicyAcceptances = async (policyId: number) => {
    try {
      const response = await apiRequest("GET", `/api/policies/${policyId}/acceptances`, {});
      const acceptances = await response.json();
      setPolicyAcceptances(acceptances);
      setShowAcceptancesListDialog(true);
    } catch (error) {
      toast({
        title: "Error al obtener aceptaciones",
        description: error instanceof Error ? error.message : "Error al obtener lista de aceptaciones",
        variant: "destructive",
      });
    }
  };
  
  // Combine policies with acceptance data
  const enhancedPolicies = policies?.map(policy => {
    const accepted = userAcceptances?.some(
      acceptance => acceptance.documentId === policy.id
    ) || false;
    
    return {
      ...policy,
      currentUserAccepted: accepted
    };
  });
  
  // Filter policies based on search and filters
  const filteredPolicies = enhancedPolicies?.filter(policy => {
    // Search query filter
    const matchesSearch = searchQuery 
      ? policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (policy.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Department filter
    const matchesDepartment = departmentFilter === "all" ? true : policy.department === departmentFilter;
    
    // Status filter
    const matchesStatus = statusFilter === "all" ? true : policy.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });
  
  // Separate policies by user acceptance
  const acceptedPolicies = filteredPolicies?.filter(policy => policy.currentUserAccepted) || [];
  const pendingPolicies = filteredPolicies?.filter(policy => 
    !policy.currentUserAccepted && policy.status === "approved"
  ) || [];
  
  // Calculate total adoption rate
  const totalApprovedPolicies = policies?.filter(p => p.status === "approved").length || 0;
  const totalAcceptedByUser = acceptedPolicies.length;
  const adoptionRate = totalApprovedPolicies ? Math.round((totalAcceptedByUser / totalApprovedPolicies) * 100) : 0;
  
  // Get unique departments for filter options
  const departments = policies 
    ? [...new Set(policies.map(policy => policy.department))]
    : [];
  
  const handleViewPolicy = (policy: Document) => {
    setSelectedPolicy(policy as ExtendedDocument);
    setShowPolicyModal(true);
  };
  
  const handleAcceptPolicy = () => {
    if (selectedPolicy) {
      acceptPolicyMutation.mutate(selectedPolicy.id);
    }
  };
  
  const handleShowAcceptanceDialog = (policy: ExtendedDocument) => {
    setSelectedPolicy(policy);
    setShowAcceptanceDialog(true);
  };
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
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
            Gestiona y acepta las políticas de la empresa
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="md:col-span-3">
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
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mi Adopción</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Progreso de adopción</span>
                  <span className="text-sm font-medium">{adoptionRate}%</span>
                </div>
                <Progress value={adoptionRate} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{totalAcceptedByUser}</p>
                  <p className="text-xs text-muted-foreground">Políticas aceptadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingPolicies.length}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-warning mr-2" />
              Políticas pendientes de aceptación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingPolicies.length > 0 ? (
              <div className="space-y-4">
                {pendingPolicies.map((policy) => (
                  <div key={policy.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{policy.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {policy.department} • Actualizado: {formatDate(policy.updatedAt)}
                        </p>
                      </div>
                      <Badge variant="warning">Pendiente de aceptación</Badge>
                    </div>
                    {policy.description && (
                      <p className="text-sm mt-2">{policy.description}</p>
                    )}
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewPolicy(policy)}
                      >
                        Ver política
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleShowAcceptanceDialog(policy)}
                      >
                        Aceptar política
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <h3 className="text-lg font-medium mb-2">¡Todas las políticas aceptadas!</h3>
                <p>No tienes políticas pendientes de aceptación.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 text-primary mr-2" />
              Políticas recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredPolicies && filteredPolicies.length > 0 ? (
              <div className="space-y-3">
                {filteredPolicies.slice(0, 5).map((policy) => (
                  <div key={policy.id} className="flex justify-between items-center p-2 hover:bg-neutral-50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{policy.title}</p>
                      <p className="text-xs text-muted-foreground">{policy.department}</p>
                    </div>
                    {policy.currentUserAccepted ? (
                      <Badge variant="success" className="ml-2">Aceptada</Badge>
                    ) : policy.status === "approved" ? (
                      <Badge variant="warning" className="ml-2">Pendiente</Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2">
                        {policy.status === "draft" ? "Borrador" : 
                         policy.status === "pending" ? "En revisión" : 
                         policy.status === "rejected" ? "Rechazada" : policy.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No hay políticas que mostrar
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="link" className="w-full" onClick={() => setStatusFilter("all")}>
              Ver todas las políticas
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Todas las Políticas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar políticas. Intente de nuevo.
            </div>
          ) : filteredPolicies && filteredPolicies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPolicies.map((policy) => (
                <DocumentCard 
                  key={policy.id} 
                  document={policy}
                  onView={() => handleViewPolicy(policy)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No se encontraron políticas</h3>
              <p>No hay políticas que coincidan con los filtros actuales.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        document={selectedPolicy || undefined}
      />
      
      {/* Policy Acceptance Dialog */}
      <Dialog open={showAcceptanceDialog} onOpenChange={setShowAcceptanceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aceptar Política</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Está a punto de aceptar la política <strong>{selectedPolicy?.title}</strong>. 
              Al aceptar, usted confirma que ha leído, entendido y se compromete a cumplir con 
              todas las disposiciones establecidas en esta política.
            </p>
            <div className="bg-neutral-50 p-4 rounded-md">
              <p className="text-sm mb-2"><strong>Detalles de la política:</strong></p>
              <ul className="text-sm space-y-1">
                <li><strong>Departamento:</strong> {selectedPolicy?.department}</li>
                <li><strong>Fecha de actualización:</strong> {selectedPolicy ? formatDate(selectedPolicy.updatedAt) : ''}</li>
                <li><strong>Versión:</strong> {selectedPolicy?.version}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAcceptanceDialog(false)}
              disabled={acceptPolicyMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAcceptPolicy}
              disabled={acceptPolicyMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {acceptPolicyMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                <span>Acepto la Política</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Policy Acceptances List Dialog */}
      <Dialog open={showAcceptancesListDialog} onOpenChange={setShowAcceptancesListDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Aceptaciones de la Política</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <h3 className="text-lg font-medium mb-4">{selectedPolicy?.title}</h3>
            
            {policyAcceptances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Fecha de Aceptación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyAcceptances.map((acceptance) => (
                    <TableRow key={acceptance.id}>
                      <TableCell>{acceptance.user.name}</TableCell>
                      <TableCell>
                        {acceptance.user.role === "analyst" ? "Analista" : 
                         acceptance.user.role === "operator" ? "Operador" : 
                         acceptance.user.role === "coordinator" ? "Coordinador" : 
                         acceptance.user.role === "manager" ? "Manager" : 
                         acceptance.user.role === "admin" ? "Administrador" : 
                         acceptance.user.role}
                      </TableCell>
                      <TableCell>{acceptance.user.department}</TableCell>
                      <TableCell>{formatDate(acceptance.acceptedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No hay aceptaciones registradas para esta política
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAcceptancesListDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
