import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
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
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { Approval, Document, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ApprovalItemProps {
  approval: Approval & { 
    document: Document;
    documentCreator?: Partial<User>;
  };
  onViewDocument: (document: Document) => void;
}

export function ApprovalItem({ approval, onViewDocument }: ApprovalItemProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const formattedDate = new Date(approval.createdAt).toLocaleDateString();
  const formattedTime = new Date(approval.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await apiRequest("POST", `/api/approvals/${approval.id}`, {
        status: "approved",
        comments: approvalComment
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      toast({
        title: "Documento aprobado",
        description: "El documento ha sido aprobado exitosamente.",
      });
      
      setIsApproveDialogOpen(false);
      setApprovalComment("");
    } catch (error) {
      toast({
        title: "Error al aprobar",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al aprobar el documento",
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
      await apiRequest("POST", `/api/approvals/${approval.id}`, {
        status: "rejected",
        comments: rejectionComment
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      toast({
        title: "Documento rechazado",
        description: "El documento ha sido rechazado.",
      });
      
      setIsRejectDialogOpen(false);
      setRejectionComment("");
    } catch (error) {
      toast({
        title: "Error al rechazar",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al rechazar el documento",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Determine if user can approve this document
  const canApprove = ["admin", "manager", "coordinator"].includes(user?.role || "");
  
  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-base">{approval.document.title}</CardTitle>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              approval.status === "approved" ? "bg-success text-white" :
              approval.status === "rejected" ? "bg-destructive text-white" :
              "bg-warning text-white"
            }`}>
              {approval.status === "approved" ? "Aprobado" :
               approval.status === "rejected" ? "Rechazado" :
               "Pendiente"}
            </span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {approval.document.category === "process" ? "Proceso Operativo" :
             approval.document.category === "policy" ? "Política" :
             approval.document.category === "instruction" ? "Instructivo" :
             approval.document.category === "procedure" ? "Procedimiento" :
             approval.document.category === "manual" ? "Manual" :
             "Documento"} - {approval.document.department}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="grid grid-cols-2 text-sm">
            <div>
              <p className="text-neutral-500">Solicitante:</p>
              <p className="font-medium">{approval.documentCreator?.name || "Usuario"}</p>
              <p className="text-xs text-neutral-500">
                {approval.documentCreator?.role === "analyst" ? "Analista" :
                 approval.documentCreator?.role === "operator" ? "Operador" :
                 approval.documentCreator?.role === "manager" ? "Manager" :
                 approval.documentCreator?.role === "coordinator" ? "Coordinador" :
                 "Usuario"} de {approval.documentCreator?.department || ""}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Fecha de solicitud:</p>
              <p className="font-medium">{formattedDate}</p>
              <p className="text-xs text-neutral-500">{formattedTime}</p>
            </div>
          </div>
          
          {approval.status !== "pending" && approval.comments && (
            <div className="mt-3 p-3 bg-neutral-50 rounded-md text-sm">
              <p className="text-neutral-500 mb-1">Comentarios:</p>
              <p className="text-neutral-700">{approval.comments}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          {approval.status === "pending" && canApprove ? (
            <div className="flex justify-end w-full space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-neutral-500"
                onClick={() => onViewDocument(approval.document)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setIsRejectDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-success border-success hover:bg-success/10"
                onClick={() => setIsApproveDialogOpen(true)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
            </div>
          ) : (
            <div className="flex justify-end w-full">
              <Button
                variant="ghost"
                size="sm"
                className="text-neutral-500"
                onClick={() => onViewDocument(approval.document)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver detalles
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aprobar Documento</DialogTitle>
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
            <DialogTitle>Rechazar Documento</DialogTitle>
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
