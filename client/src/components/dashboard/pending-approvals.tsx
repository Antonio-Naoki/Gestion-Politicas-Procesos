import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { User, Document, Approval } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingApprovalItemProps {
  document: Document & { createdByUser: Partial<User> };
  approval: Approval;
  onView: (document: Document) => void;
  onApprove: (approval: Approval) => void;
  onReject: (approval: Approval) => void;
}

function PendingApprovalItem({ 
  document, 
  approval, 
  onView, 
  onApprove, 
  onReject 
}: PendingApprovalItemProps) {
  return (
    <tr className="hover:bg-neutral-50">
      <td className="px-3 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="material-icons text-neutral-400 mr-2">
            <FileIcon className="h-5 w-5 text-neutral-400" />
          </span>
          <div>
            <div className="text-sm font-medium text-neutral-900">{document.title}</div>
            <div className="text-xs text-neutral-500">{document.department}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 whitespace-nowrap">
        <div className="text-sm text-neutral-900">{document.createdByUser?.name}</div>
        <div className="text-xs text-neutral-500">
          {document.createdByUser?.role === "analyst" ? "Analista" : 
           document.createdByUser?.role === "operator" ? "Operador" : 
           document.createdByUser?.role === "manager" ? "Manager" : 
           document.createdByUser?.role === "coordinator" ? "Coordinador" : "Usuario"} de {document.createdByUser?.department}
        </div>
      </td>
      <td className="px-3 py-4 whitespace-nowrap">
        <div className="text-sm text-neutral-900">
          {new Date(document.createdAt).toLocaleDateString()}
        </div>
        <div className="text-xs text-neutral-500">
          {new Date(document.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>
      <td className="px-3 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning bg-opacity-10 text-warning">
          Pendiente
        </span>
      </td>
      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onView(document)}
            title="Ver"
          >
            <Eye className="h-4 w-4 text-neutral-500" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onApprove(approval)}
            title="Aprobar"
          >
            <CheckCircle className="h-4 w-4 text-success" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onReject(approval)}
            title="Rechazar"
          >
            <XCircle className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

type ExtendedApproval = Approval & {
  document: Document & { createdByUser: Partial<User> };
};

export function PendingApprovals({ onViewDocument }: { onViewDocument: (document: Document) => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: approvals, isLoading, refetch } = useQuery<ExtendedApproval[]>({
    queryKey: ["/api/approvals"],
    select: (data) => {
      // Filter only pending approvals
      return data.filter((approval) => approval.status === "pending");
    }
  });
  
  const handleApprove = async (approval: Approval) => {
    try {
      await apiRequest("POST", `/api/approvals/${approval.id}`, {
        status: "approved",
        comments: "Documento aprobado"
      });
      
      toast({
        title: "Documento aprobado",
        description: "El documento ha sido aprobado exitosamente",
        variant: "default",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error al aprobar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };
  
  const handleReject = async (approval: Approval) => {
    try {
      await apiRequest("POST", `/api/approvals/${approval.id}`, {
        status: "rejected",
        comments: "Documento rechazado"
      });
      
      toast({
        title: "Documento rechazado",
        description: "El documento ha sido rechazado",
        variant: "default",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error al rechazar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-neutral-900">Aprobaciones Pendientes</CardTitle>
        <Button variant="link" size="sm" className="text-primary">
          Ver todas
        </Button>
      </CardHeader>
      <CardContent className="px-6 py-4">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead>
              <tr>
                <th className="px-3 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-3 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-3 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-3 py-3 bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-3 py-3 bg-neutral-50 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-neutral-500">
                    Cargando aprobaciones pendientes...
                  </td>
                </tr>
              ) : approvals && approvals.length > 0 ? (
                approvals.map((approval) => (
                  <PendingApprovalItem 
                    key={approval.id} 
                    document={approval.document}
                    approval={approval}
                    onView={() => onViewDocument(approval.document)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-sm text-neutral-500">
                    No hay aprobaciones pendientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
