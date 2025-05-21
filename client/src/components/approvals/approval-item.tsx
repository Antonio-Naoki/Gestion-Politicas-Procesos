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
import { Approval, Document, User, Task } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreviewModal } from "@/components/documents/document-preview-modal";

interface ApprovalItemProps {
  approval: Approval & { 
    entityData?: any;
    entityCreator?: Partial<User>;
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

          <div className="flex gap-2">
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
        </div>
      </div>

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
