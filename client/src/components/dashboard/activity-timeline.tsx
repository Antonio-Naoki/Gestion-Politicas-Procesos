import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Edit, XCircle, Clipboard, Clock } from "lucide-react";
import { Activity, User } from "@shared/schema";

type ExtendedActivity = Activity & {
  user?: Partial<User>;
};

interface ActivityItemProps {
  activity: ExtendedActivity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.action) {
      case "create":
        return <Edit className="h-4 w-4 text-white" />;
      case "update":
        return <Edit className="h-4 w-4 text-white" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-white" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-white" />;
      case "submit":
        return <Clipboard className="h-4 w-4 text-white" />;
      default:
        return <Edit className="h-4 w-4 text-white" />;
    }
  };

  const getActivityIconBgColor = () => {
    switch (activity.action) {
      case "create":
        return "bg-primary";
      case "update":
        return "bg-primary";
      case "approved":
        return "bg-success";
      case "rejected":
        return "bg-destructive";
      case "submit":
        return "bg-warning";
      default:
        return "bg-neutral-500";
    }
  };

  const getActivityTitle = () => {
    const details = activity.details as any;
    switch (activity.action) {
      case "create":
        if (activity.entityType === "document") {
          return `Documento "${details?.title}" creado`;
        } else if (activity.entityType === "task") {
          return `Tarea "${details?.title}" creada`;
        }
        return "Nuevo elemento creado";
      case "update":
        if (activity.entityType === "document") {
          return `Documento "${details?.title}" actualizado a v${details?.version}`;
        }
        return "Elemento actualizado";
      case "approved":
        if (activity.entityType === "approval") {
          return `Documento "${details?.documentTitle}" aprobado`;
        }
        return "Elemento aprobado";
      case "rejected":
        if (activity.entityType === "approval") {
          return `Documento "${details?.documentTitle}" rechazado`;
        }
        return "Elemento rechazado";
      case "submit":
        if (activity.entityType === "document") {
          return `Documento "${details?.title}" enviado para aprobación`;
        }
        return "Elemento enviado para aprobación";
      default:
        return "Actividad registrada";
    }
  };

  const getActivityDescription = () => {
    const details = activity.details as any;
    let description = "";

    if (activity.user) {
      description += `${activity.user.name} `;
    }

    switch (activity.action) {
      case "create":
        if (activity.entityType === "document") {
          description += `ha creado un nuevo documento en el departamento de ${details?.department || "la empresa"}.`;
        } else if (activity.entityType === "task") {
          description += `ha creado una nueva tarea asignada a ${details?.assignedToName || "un usuario"}.`;
        }
        break;
      case "update":
        description += `ha actualizado el ${activity.entityType}.`;
        break;
      case "approved":
        if (activity.entityType === "approval") {
          description += `ha aprobado el documento`;
          if (details?.comments) {
            description += ` con el comentario: "${details.comments}"`;
          }
        }
        break;
      case "rejected":
        if (activity.entityType === "approval") {
          description += `ha rechazado el documento`;
          if (details?.comments) {
            description += ` con el comentario: "${details.comments}"`;
          }
        }
        break;
      case "submit":
        description += `ha enviado el documento para aprobación.`;
        break;
      default:
        description += `ha realizado una acción en el sistema.`;
    }

    return description;
  };

  const formatActivityTime = (date: Date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoy, ${activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (diffDays === 1) {
      return `Ayer, ${activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
      return `${activityDate.toLocaleDateString()}, ${activityDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
  };

  return (
    <div className="relative flex items-start">
      <div className={`h-8 w-8 rounded-full ${getActivityIconBgColor()} flex items-center justify-center z-10 mr-4`}>
        {getActivityIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900">{getActivityTitle()}</div>
        <div className="mt-1 text-xs text-neutral-500">
          <p>{getActivityDescription()}</p>
          <div className="mt-1">
            <span className="inline-flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatActivityTime(activity.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline() {
  const [displayCount, setDisplayCount] = useState(4);

  const { data: activities, isLoading } = useQuery<ExtendedActivity[]>({
    queryKey: ["/api/activities"],
    select: (data) => {
      // Sort by createdAt
      return [...data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  });

  return (
    <Card className="mt-6">
      <CardHeader className="px-6 py-4 border-b border-neutral-200">
        <CardTitle className="text-lg font-semibold text-neutral-900">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent className="px-6 py-4">
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-neutral-200"></div>

          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-4 text-neutral-500">Cargando actividad reciente...</div>
            ) : activities && activities.length > 0 ? (
              activities.slice(0, displayCount).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="text-center py-4 text-neutral-500">No hay actividad reciente</div>
            )}
          </div>

          {activities && activities.length > displayCount && (
            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                className="text-primary hover:text-primary-dark"
                onClick={() => setDisplayCount(prev => prev + 4)}
              >
                Ver más actividad
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
