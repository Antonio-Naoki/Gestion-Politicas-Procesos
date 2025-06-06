import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Download, User } from "lucide-react";
import { Document, User as UserType } from "@shared/schema";

interface DocumentCardProps {
  document: Document & { createdByUser?: Partial<UserType> };
  onView: (document: Document) => void;
}

export function DocumentCard({ document, onView }: DocumentCardProps) {
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
      return "https://pixabay.com/get/gff4c9714c8feff06beb3e0a4e61504889eb4153dc8b0f13e6b3ac730ed68c395765e50063ec05e63301065bc4041bcbd71572beff0c276499bd5e3ff0d3dc94e_1280.jpg";
    } else if (document.category === "quality") {
      return "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=300";
    } else {
      return "https://pixabay.com/get/g253a681f59413f62f9237807f3d570ed56c4f37f60f3722461b12738e558a374e1a250e821615928c61e20cda9d141a059ba0b26d2bf51e291d3fd76e9ccc97b_1280.jpg";
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
          </div>
        </div>
      </div>
    </Card>
  );
}
