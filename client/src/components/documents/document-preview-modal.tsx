import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Document, User, Approval } from "@shared/schema";
import { Download, Share, Edit, CheckCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  document?: Document & { 
    createdByUser?: Partial<User>;
    approvals?: (Approval & { user?: Partial<User> })[];
  };
}

export function DocumentPreviewModal({ open, onClose, document }: DocumentPreviewModalProps) {
  const [documentVersions, setDocumentVersions] = useState<any[]>([]);

  useEffect(() => {
    if (document?.id) {
      // Here you would fetch document versions from API
      // For now, we'll simulate it
      const mockVersions = [
        {
          id: 1,
          version: document.version,
          createdAt: document.createdAt,
          user: document.createdByUser
        }
      ];
      setDocumentVersions(mockVersions);
    }
  }, [document]);

  if (!document) return null;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Fecha no disponible";
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return "Fecha no disponible";
    return `${new Date(date).toLocaleDateString()} - ${new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold text-neutral-900">{document.title}</DialogTitle>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              document.status === "approved" ? "bg-success text-white" :
              document.status === "pending" ? "bg-warning text-white" :
              document.status === "rejected" ? "bg-destructive text-white" :
              "bg-neutral-500 text-white"
            }`}>
              {document.status === "approved" ? "Aprobado" :
               document.status === "pending" ? "Pendiente" :
               document.status === "rejected" ? "Rechazado" :
               "Borrador"}
            </span>
            {/*<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>*/}
            {/*  <X className="h-4 w-4" />*/}
            {/*</Button>*/}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-2">
              <h3 className="text-md font-medium text-neutral-900">Información del Documento</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">Creado por:</span>
                  <span className="ml-2 text-neutral-900">{document.createdByUser?.name || "Usuario"}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Fecha de creación:</span>
                  <span className="ml-2 text-neutral-900">{formatDate(document.createdAt)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Última actualización:</span>
                  <span className="ml-2 text-neutral-900">{formatDate(document.updatedAt)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Versión:</span>
                  <span className="ml-2 text-neutral-900">{document.version}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Departamento:</span>
                  <span className="ml-2 text-neutral-900">{document.department}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Categoría:</span>
                  <span className="ml-2 text-neutral-900">{document.category}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <h3 className="text-md font-medium text-neutral-900 mb-4">Contenido del Documento</h3>

              {document.category === "process" && (
                <img 
                  src="https://cdn.pixabay.com/photo/2020/03/19/21/25/flow-chart-4948176_1280.jpg" 
                  alt="Diagrama de flujo del proceso" 
                  className="w-full h-auto rounded-lg mb-6" 
                />
              )}

              {document.category === "policy" && (
                <img 
                  src="https://cdn.pixabay.com/photo/2018/01/17/20/22/analytics-3088958_1280.jpg" 
                  alt="Imagen de política" 
                  className="w-full h-auto rounded-lg mb-6" 
                />
              )}

              <div className="space-y-4 text-sm text-neutral-800">
                {document.content ? document.content.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                )) : <p>No hay contenido disponible</p>}
              </div>
            </div>

            {document.approvals && document.approvals.length > 0 && (
              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-md font-medium text-neutral-900 mb-4">Historial de Aprobaciones</h3>
                <div className="bg-neutral-50 rounded-lg p-4">
                  <div className="space-y-4">
                    {document.approvals.map((approval) => (
                      <div key={approval.id} className="flex items-start">
                        <div className={`h-8 w-8 rounded-full ${
                          approval.status === "approved" ? "bg-success" :
                          approval.status === "rejected" ? "bg-destructive" :
                          "bg-warning"
                        } flex items-center justify-center mr-3`}>
                          {approval.status === "approved" ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : approval.status === "rejected" ? (
                            <X className="h-4 w-4 text-white" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {approval.status === "approved" 
                              ? `Aprobado por ${approval.user?.name}`
                              : approval.status === "rejected"
                              ? `Rechazado por ${approval.user?.name}`
                              : `Pendiente de aprobación por ${approval.user?.name}`
                            }
                            {approval.user?.role && ` (${
                              approval.user.role === "manager" ? "Manager" :
                              approval.user.role === "coordinator" ? "Coordinador" :
                              approval.user.role === "admin" ? "Administrador" :
                              approval.user.role
                            }${approval.user?.department ? ` de ${approval.user.department}` : ""})`}
                          </div>
                          <div className="mt-1 text-xs text-neutral-500">
                            {approval.approvedAt ? formatDateTime(approval.approvedAt) : formatDateTime(approval.createdAt)}
                          </div>
                          {approval.comments && (
                            <div className="mt-1 text-xs text-neutral-700">
                              Comentario: "{approval.comments}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-neutral-200 flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex items-center">
              <Download className="h-4 w-4 mr-1" />
              Descargar
            </Button>
            <Button variant="outline" size="sm" className="flex items-center">
              <Share className="h-4 w-4 mr-1" />
              Compartir
            </Button>
          </div>
          <div>
            <Button variant="default" size="sm" className="flex items-center bg-primary hover:bg-primary/90">
              <Edit className="h-4 w-4 mr-1" />
              Editar Documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
