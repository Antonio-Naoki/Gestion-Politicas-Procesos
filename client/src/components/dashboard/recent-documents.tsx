import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Eye, Download, Plus } from "lucide-react";
import { Document, User } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { NewDocumentModal } from "@/components/documents/new-document-modal";

type ExtendedDocument = Document & {
  createdByUser?: Partial<User>;
};

interface DocumentCardProps {
  document: ExtendedDocument;
  onView: (document: Document) => void;
}

function DocumentCard({ document, onView }: DocumentCardProps) {
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Function to get placeholder image based on document type
  const getDocumentImage = (document: Document) => {
    if (document.category === "process") {
      return "https://images.unsplash.com/photo-1544731612-de7f96afe55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300";
    } else if (document.category === "policy") {
      return "https://cdn.pixabay.com/photo/2018/01/17/20/22/analytics-3088958_1280.jpg";
    } else if (document.category === "quality") {
      return "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300";
    } else {
      return "https://cdn.pixabay.com/photo/2018/03/10/12/00/teamwork-3213924_1280.jpg";
    }
  };

  return (
    <div className="border border-neutral-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecentDocuments({ onViewDocument }: { onViewDocument: (document: Document) => void }) {
  const [newDocumentModalOpen, setNewDocumentModalOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(4);
  const { user } = useAuth();

  const { data: documents, isLoading } = useQuery<ExtendedDocument[]>({
    queryKey: ["/api/documents"],
    select: (data) => {
      // Sort by updatedAt
      return [...data].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
  });

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-900">Documentos Recientes</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="primary" 
              size="sm" 
              className="text-sm"
              onClick={() => setNewDocumentModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Documento
            </Button>
            {documents && documents.length > displayCount && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-neutral-500 hover:text-primary"
                onClick={() => setDisplayCount(prev => prev + 4)}
              >
                Ver todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-neutral-500">Cargando documentos recientes...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents && documents.length > 0 ? (
                documents.slice(0, displayCount).map((document) => (
                  <DocumentCard 
                    key={document.id} 
                    document={document}
                    onView={() => onViewDocument(document)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-neutral-500">
                  No hay documentos recientes
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <NewDocumentModal
        open={newDocumentModalOpen}
        onClose={() => setNewDocumentModalOpen(false)}
      />
    </>
  );
}
