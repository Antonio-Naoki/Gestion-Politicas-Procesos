import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  CheckCircle, 
  Info, 
  Clock, 
  Calendar, 
  User, 
  PlayCircle,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Define a local UserInfo type for component use
interface UserInfo {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  createdAt?: Date;
}

interface TaskItemProps {
  task: Task & {
    assignedToUser?: UserInfo;
    assignedByUser?: UserInfo;
    documentTitle?: string;
  };
}

export function TaskItem({ task }: TaskItemProps) {
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<string>(task.status);
  const [statusComment, setStatusComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const canUpdateTask = user?.id === task.assignedTo || 
                        ["admin", "manager", "coordinator"].includes(user?.role || "");
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive bg-opacity-10 text-destructive";
      case "high":
        return "bg-error bg-opacity-10 text-error";
      case "medium":
        return "bg-warning bg-opacity-10 text-warning";
      case "low":
        return "bg-info bg-opacity-10 text-info";
      default:
        return "bg-info bg-opacity-10 text-info";
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
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success bg-opacity-10 text-success";
      case "in_progress":
        return "bg-primary bg-opacity-10 text-primary";
      case "canceled":
        return "bg-destructive bg-opacity-10 text-destructive";
      case "pending":
      default:
        return "bg-warning bg-opacity-10 text-warning";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada";
      case "in_progress":
        return "En Progreso";
      case "canceled":
        return "Cancelada";
      case "pending":
      default:
        return "Pendiente";
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
  
  const handleUpdateStatus = async () => {
    try {
      setIsProcessing(true);
      await apiRequest("PUT", `/api/tasks/${task.id}/status`, {
        status: statusValue,
        comments: statusComment
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      toast({
        title: "Estado actualizado",
        description: `La tarea ha sido marcada como "${getStatusText(statusValue)}"`,
      });
      
      setIsStatusDialogOpen(false);
      setStatusComment("");
    } catch (error) {
      toast({
        title: "Error al actualizar estado",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al actualizar el estado de la tarea",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";

  return (
    <>
      <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive border-2' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <div className="flex space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(task.priority)}`}>
                {getPriorityText(task.priority)}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(task.status)}`}>
                {getStatusText(task.status)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2 text-sm">
          {task.description && (
            <p className="text-neutral-700 mb-3">{task.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 text-neutral-500 mr-1" />
              <span>Vence: {formatDate(task.dueDate)}</span>
            </div>
            <div className="flex items-center">
              <User className="h-3.5 w-3.5 text-neutral-500 mr-1" />
              <span>Asignado por: {task.assignedByUser?.name || "Usuario"}</span>
            </div>
            
            {task.documentTitle && (
              <div className="flex items-center col-span-2">
                <Info className="h-3.5 w-3.5 text-neutral-500 mr-1" />
                <span>Documento: {task.documentTitle}</span>
              </div>
            )}
          </div>
          
          {isOverdue && (
            <div className="mt-3 p-2 bg-destructive/10 rounded-md text-xs text-destructive flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Vencida
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          <div className="flex justify-end w-full space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-500"
              onClick={() => setIsDetailsDialogOpen(true)}
            >
              <Info className="h-4 w-4 mr-1" />
              Detalles
            </Button>
            
            {canUpdateTask && task.status !== "completed" && task.status !== "canceled" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary border-primary hover:bg-primary/10"
                  onClick={() => {
                    setStatusValue("in_progress");
                    setIsStatusDialogOpen(true);
                  }}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Iniciar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-success border-success hover:bg-success/10"
                  onClick={() => {
                    setStatusValue("completed");
                    setIsStatusDialogOpen(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Completar
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Task Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalles de la Tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <h3 className="text-lg font-medium">{task.title}</h3>
              <div className="flex space-x-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(task.priority)}`}>
                  {getPriorityText(task.priority)}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
              </div>
            </div>
            
            {task.description && (
              <div className="mt-2">
                <Label className="text-neutral-500">Descripción:</Label>
                <p className="mt-1 text-neutral-700">{task.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-neutral-500">Asignado a:</Label>
                <p className="mt-1 font-medium">{task.assignedToUser?.name || "Usuario"}</p>
              </div>
              <div>
                <Label className="text-neutral-500">Asignado por:</Label>
                <p className="mt-1">{task.assignedByUser?.name || "Usuario"}</p>
              </div>
              <div>
                <Label className="text-neutral-500">Fecha de creación:</Label>
                <p className="mt-1">{formatDateTime(task.createdAt)}</p>
              </div>
              <div>
                <Label className="text-neutral-500">Fecha de vencimiento:</Label>
                <p className="mt-1">{formatDateTime(task.dueDate)}</p>
              </div>
              {task.status === "completed" && task.completedAt && (
                <div>
                  <Label className="text-neutral-500">Fecha de completado:</Label>
                  <p className="mt-1">{formatDateTime(task.completedAt)}</p>
                </div>
              )}
            </div>
            
            {task.documentTitle && (
              <div className="mt-2">
                <Label className="text-neutral-500">Documento relacionado:</Label>
                <p className="mt-1">{task.documentTitle}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Actualizar Estado de la Tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Estado</Label>
              <RadioGroup 
                value={statusValue} 
                onValueChange={setStatusValue}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="in_progress" id="in_progress" />
                  <Label htmlFor="in_progress" className="cursor-pointer">En Progreso</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completed" id="completed" />
                  <Label htmlFor="completed" className="cursor-pointer">Completada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pending" id="pending" />
                  <Label htmlFor="pending" className="cursor-pointer">Pendiente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="canceled" id="canceled" />
                  <Label htmlFor="canceled" className="cursor-pointer">Cancelada</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-comment">Comentario (Opcional)</Label>
              <Textarea
                id="status-comment"
                placeholder="Añadir comentario sobre el cambio de estado..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateStatus}
              className={
                statusValue === "completed" ? "bg-success hover:bg-success/90" :
                statusValue === "canceled" ? "bg-destructive hover:bg-destructive/90" :
                ""
              }
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
                <span>Actualizar Estado</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
