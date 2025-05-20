import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Download, User, SendHorizonal, PlayCircle, CheckCircle, Trash2, AlertCircle } from "lucide-react";
import { Document, User as UserType } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface DocumentCardProps {
  document: Document & { createdByUser?: Partial<UserType> };
  onView: (document: Document) => void;
  showSubmitButton?: boolean;
  onSubmit?: () => void;
  onStartProgress?: () => void;
  onComplete?: () => void;
  onDelete?: (document: Document) => void;
}

export function DocumentCard({ document, onView, showSubmitButton, onSubmit, onStartProgress, onComplete, onDelete }: DocumentCardProps) {
  const { user } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Check if user can update document status
  const canUpdateDocument = user?.id === document.createdBy || 
                           ["admin", "manager", "coordinator"].includes(user?.role || "");
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success text-white";
      case "pending":
        return "bg-warning text-white";
      case "rejected":
        return "bg-destructive text-white";
      case "draft":
      default:
        return "bg-neutral-500 text-white";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprobado";
      case "pending":
        return "Pendiente";
      case "rejected":
        return "Rechazado";
      case "draft":
      default:
        return "Borrador";
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Fecha no disponible";
    return new Date(date).toLocaleDateString();
  };

  // Function to get placeholder image based on document type
  const getDocumentImage = (document: Document) => {
    if (document.category === "process") {
      return "https://cdn.pixabay.com/photo/2020/03/19/21/25/flow-chart-4948176_1280.jpg";
    } else if (document.category === "policy") {
      return "https://cdn.pixabay.com/photo/2018/01/17/20/22/analytics-3088958_1280.jpg";
    } else if (document.category === "quality") {
      return "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300";
    } else {
      return "https://cdn.pixabay.com/photo/2018/03/10/12/00/teamwork-3213924_1280.jpg";
    }
  };

  return (
    <Card className="border border-neutral-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden">
      <div className="h-36 bg-neutral-100 relative flex items-center justify-center">
        <img 
          src={getDocumentImage(document)} 
          alt={document.title} 
          className="h-full w-full object-cover" 
        />
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(document.status)}`}>
            {getStatusText(document.status)}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-medium text-neutral-900">{document.title}</h3>
        <p className="mt-1 text-xs text-neutral-500">Actualizado: {formatDate(document.updatedAt)}</p>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-xs text-neutral-500 flex items-center">
            <User className="h-3 w-3 mr-1" />
            {document.createdByUser?.name || "Usuario"}
          </span>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onView(document)}
              title="Ver documento"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Descargar"
            >
              <Download className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
            {onDelete && canUpdateDocument && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsDeleteDialogOpen(true)}
                title="Eliminar documento"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* Action buttons based on document status */}
        {document.status === "draft" && showSubmitButton && onSubmit && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 text-xs"
            onClick={onSubmit}
          >
            <SendHorizonal className="h-3.5 w-3.5 mr-1" />
            Enviar para aprobación
          </Button>
        )}

        {document.status === "pending" && canUpdateDocument && onStartProgress && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 text-xs text-primary border-primary hover:bg-primary/10"
            onClick={onStartProgress}
          >
            <PlayCircle className="h-3.5 w-3.5 mr-1" />
            Iniciar Progreso
          </Button>
        )}

        {document.status === "in_progress" && canUpdateDocument && onComplete && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 text-xs text-success border-success hover:bg-success/10"
            onClick={onComplete}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Completar
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar el documento "{document.title}"? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 text-warning mt-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">Esta acción eliminará permanentemente el documento.</p>
            </div>
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  onDelete(document);
                  setIsDeleteDialogOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
