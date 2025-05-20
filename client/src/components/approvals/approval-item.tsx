import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock,
  AlertCircle,
  Info
} from "lucide-react";
import { useState } from "react";
import { Approval, Document, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApprovalItemProps {
  approval: Approval & { 
    entityData?: any;
    entityCreator?: Partial<User>;
  };
  onViewEntity: (entity: any, entityType: string) => void;
}

export function ApprovalItem({ approval, onViewEntity }: ApprovalItemProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  const formattedDate = approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : "Fecha no disponible";
  const formattedTime = approval.createdAt ? new Date(approval.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Hora no disponible";

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      console.log(`Sending approval request for approval ID: ${approval.id}`);
      console.log(`Approval data:`, { status: "approved", comments: approvalComment });

      const response = await apiRequest("POST", `/api/approvals/${approval.id}`, {
        status: "approved",
        comments: approvalComment
      });

      console.log(`Approval response:`, response);

      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      const entityTypeText = approval.entityType === "document" ? "Documento" : 
                            approval.entityType === "task" ? "Tarea" : "Política";

      toast({
        title: `${entityTypeText} aprobado`,
        description: `El ${entityTypeText.toLowerCase()} ha sido aprobado exitosamente.`,
      });

      setIsApproveDialogOpen(false);
      setApprovalComment("");
    } catch (error) {
      console.error(`Error approving approval ID: ${approval.id}`, error);

      const entityTypeText = approval.entityType === "document" ? "documento" : 
                            approval.entityType === "task" ? "tarea" : "política";

      let errorMessage = `Ha ocurrido un error al aprobar el ${entityTypeText}`;
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`Error details: ${error.stack || 'No stack trace available'}`);
      }

      toast({
        title: "Error al aprobar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionComment) {
      toast({
        title: "Comentario requerido",
        description: "Por favor, proporcione un comentario explicando el motivo del rechazo.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`Sending rejection request for approval ID: ${approval.id}`);
      console.log(`Rejection data:`, { status: "rejected", comments: rejectionComment });

      const response = await apiRequest("POST", `/api/approvals/${approval.id}`, {
        status: "rejected",
        comments: rejectionComment
      });

      console.log(`Rejection response:`, response);

      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

      const entityTypeText = approval.entityType === "document" ? "Documento" : 
                            approval.entityType === "task" ? "Tarea" : "Política";

      toast({
        title: `${entityTypeText} rechazado`,
        description: `El ${entityTypeText.toLowerCase()} ha sido rechazado.`,
      });

      setIsRejectDialogOpen(false);
      setRejectionComment("");
    } catch (error) {
      console.error(`Error rejecting approval ID: ${approval.id}`, error);

      const entityTypeText = approval.entityType === "document" ? "documento" : 
                            approval.entityType === "task" ? "tarea" : "política";

      let errorMessage = `Ha ocurrido un error al rechazar el ${entityTypeText}`;
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`Error details: ${error.stack || 'No stack trace available'}`);
      }

      toast({
        title: "Error al rechazar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine if user can approve this document or policy
  // Only managers and admins can approve policies, while coordinators can approve other types
  const canApprove = 
    approval.entityType === "policy" 
      ? ["admin", "manager"].includes(user?.role || "") 
      : ["admin", "manager", "coordinator"].includes(user?.role || "");

  return (
    <>
      <div className="p-4 border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium text-neutral-900">{approval.entityData?.title || "Sin título"}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            approval.status === "approved" ? "bg-success text-white" :
            approval.status === "rejected" ? "bg-destructive text-white" :
            approval.status === "in_progress" ? "bg-primary text-white" :
            "bg-warning text-white"
          }`}>
            {approval.status === "approved" ? "Aprobado" :
             approval.status === "rejected" ? "Rechazado" :
             approval.status === "in_progress" ? "En Progreso" :
             "Pendiente"}
          </span>
        </div>

        <p className="mt-1 text-xs text-neutral-500">
          {approval.entityType === "document" && (
            <>
              {approval.entityData?.category === "process" ? "Proceso Operativo" :
               approval.entityData?.category === "policy" ? "Política" :
               approval.entityData?.category === "instruction" ? "Instructivo" :
               approval.entityData?.category === "procedure" ? "Procedimiento" :
               approval.entityData?.category === "manual" ? "Manual" :
               "Documento"} - {approval.entityData?.department}
            </>
          )}
          {approval.entityType === "task" && (
            <>
              Tarea - Prioridad: {approval.entityData?.priority === "urgent" ? "Urgente" :
                                 approval.entityData?.priority === "high" ? "Alta" :
                                 approval.entityData?.priority === "medium" ? "Media" :
                                 "Baja"}
            </>
          )}
          {approval.entityType === "policy" && (
            <>
              Política - {approval.entityData?.department}
            </>
          )}
        </p>

        <div className="mt-3 flex justify-between items-center text-xs">
          <span className="text-neutral-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Solicitado: {formattedDate}
          </span>

          {approval.status === "pending" && canApprove ? (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onViewEntity(approval.entityData, approval.entityType)}
                title="Ver detalles"
              >
                <Info className="h-3.5 w-3.5 text-primary" />
              </Button>
              {/*<Button*/}
              {/*  variant="ghost"*/}
              {/*  size="icon"*/}
              {/*  className="h-6 w-6"*/}
              {/*  onClick={() => setIsRejectDialogOpen(true)}*/}
              {/*  title="Rechazar"*/}
              {/*>*/}
              {/*  <XCircle className="h-3.5 w-3.5 text-destructive" />*/}
              {/*</Button>*/}
              {/*<Button*/}
              {/*  variant="ghost"*/}
              {/*  size="icon"*/}
              {/*  className="h-6 w-6"*/}
              {/*  onClick={() => setIsApproveDialogOpen(true)}*/}
              {/*  title="Aprobar"*/}
              {/*>*/}
              {/*  <CheckCircle className="h-3.5 w-3.5 text-success" />*/}
              {/*</Button>*/}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onViewEntity(approval.entityData, approval.entityType)}
              title="Ver detalles"
            >
              <Info className="h-3.5 w-3.5 text-primary" />
            </Button>
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aprobar {approval.entityType === "document" ? "Documento" : approval.entityType === "task" ? "Tarea" : "Política"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="approval-comment">Comentarios (Opcional)</Label>
              <Textarea
                id="approval-comment"
                placeholder="Añadir comentarios sobre la aprobación..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove}
              className="bg-success hover:bg-success/90"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirmar Aprobación
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rechazar {approval.entityType === "document" ? "Documento" : approval.entityType === "task" ? "Tarea" : "Política"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">Por favor, indique el motivo del rechazo.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rejection-comment">
                Comentarios <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-comment"
                placeholder="Añadir comentarios sobre el rechazo..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                rows={4}
                className={!rejectionComment ? "border-destructive" : ""}
              />
              {!rejectionComment && (
                <p className="text-xs text-destructive">Es necesario proporcionar un motivo para el rechazo</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReject}
              variant="destructive"
              disabled={!rejectionComment || isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
              ) : (
                <span className="flex items-center">
                  <XCircle className="h-4 w-4 mr-1" />
                  Confirmar Rechazo
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
