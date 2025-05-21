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
  Info,
  Calendar,
  User
} from "lucide-react";
import { useState } from "react";
import { Approval, Document, User as UserType, Task } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

interface ApprovalItemProps {
  approval: Approval & { 
    entityData?: any;
    entityCreator?: Partial<UserType>;
  };
  onViewEntity: (entity: any, entityType: string) => void;
}

export function ApprovalItem({ approval, onViewEntity }: ApprovalItemProps) {
  const { user } = useAuth();
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { toast } = useToast();

  const formattedDate = approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : "Fecha no disponible";
  const formattedTime = approval.createdAt ? new Date(approval.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Hora no disponible";

  const handleViewDetails = () => {
    if (approval.entityType === "document" || approval.entityType === "policy") {
      setShowDocumentModal(true);
    } else if (approval.entityType === "task") {
      setShowTaskModal(true);
    } else {
      onViewEntity(approval.entityData, approval.entityType);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success text-white";
      case "rejected":
        return "bg-destructive text-white";
      case "in_progress":
        return "bg-primary text-white";
      case "pending":
      default:
        return "bg-warning text-white";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprobado";
      case "rejected":
        return "Rechazado";
      case "in_progress":
        return "En Progreso";
      case "pending":
      default:
        return "Pendiente";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-white";
      case "high":
        return "bg-error text-white";
      case "medium":
        return "bg-warning text-white";
      case "low":
        return "bg-info text-white";
      default:
        return "bg-info text-white";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "Urgente";
      case "high":
        return "Alta";
      case "medium":
        return "Media";
      case "low":
        return "Normal";
      default:
        return "Normal";
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "No especificada";
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return "";
    return `${new Date(date).toLocaleDateString()} ${new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  const renderTaskDetails = (task: Task) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
        <p className="text-sm text-muted-foreground">{task.description || "Sin descripción"}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <p className="text-sm font-medium">
            {task.status === "pending" ? "Pendiente" :
             task.status === "in_progress" ? "En Progreso" :
             task.status === "completed" ? "Completada" :
             "Cancelada"}
          </p>
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground">Prioridad</Label>
          <p className="text-sm font-medium">
            {task.priority === "urgent" ? "Urgente" :
             task.priority === "high" ? "Alta" :
             task.priority === "medium" ? "Media" :
             "Normal"}
          </p>
        </div>

        {task.dueDate && (
          <div>
            <Label className="text-xs text-muted-foreground">Fecha límite</Label>
            <p className="text-sm font-medium">
              {new Date(task.dueDate).toLocaleDateString()}
            </p>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground">Fecha de creación</Label>
          <p className="text-sm font-medium">
            {new Date(task.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{approval.entityData?.title || "Sin título"}</CardTitle>
            <div className="flex space-x-2">
              {approval.entityType === "task" && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(approval.entityData?.priority)}`}>
                  {getPriorityText(approval.entityData?.priority)}
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(approval.status)}`}>
                {getStatusText(approval.status)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 text-sm">
          {approval.entityData?.description && (
            <p className="text-neutral-700 mb-3">{approval.entityData.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 text-neutral-500 mr-1" />
              <span>Creado: {formatDate(approval.createdAt)}</span>
            </div>
            {approval.entityType === "task" && approval.entityData?.dueDate && (
              <div className="flex items-center">
                <Clock className="h-3.5 w-3.5 text-neutral-500 mr-1" />
                <span>Vence: {formatDate(approval.entityData.dueDate)}</span>
              </div>
            )}
            {approval.entityType === "document" && (
              <div className="flex items-center col-span-2">
                <FileText className="h-3.5 w-3.5 text-neutral-500 mr-1" />
                <span>
                  {approval.entityData?.category === "process" ? "Proceso Operativo" :
                   approval.entityData?.category === "policy" ? "Política" :
                   approval.entityData?.category === "instruction" ? "Instructivo" :
                   approval.entityData?.category === "procedure" ? "Procedimiento" :
                   approval.entityData?.category === "manual" ? "Manual" :
                   "Documento"} - {approval.entityData?.department}
                </span>
              </div>
            )}
            {approval.entityCreator && (
              <div className="flex items-center col-span-2">
                <User className="h-3.5 w-3.5 text-neutral-500 mr-1" />
                <span>Creado por: {approval.entityCreator.name || "Usuario"}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <div className="flex flex-wrap gap-2 justify-end w-full">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-500"
              onClick={handleViewDetails}
            >
              <Info className="h-4 w-4 mr-1" />
              Detalles
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Document Preview Modal */}
      {(approval.entityType === "document" || approval.entityType === "policy") && (
        <DocumentPreviewModal
          open={showDocumentModal}
          onClose={() => setShowDocumentModal(false)}
          document={approval.entityData}
        />
      )}

      {/* Task Preview Modal */}
      {approval.entityType === "task" && (
        <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Detalles de la Tarea</DialogTitle>
            </DialogHeader>
            {renderTaskDetails(approval.entityData)}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
