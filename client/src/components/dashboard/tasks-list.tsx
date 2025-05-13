import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Info, Clock, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Task, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ExtendedTask = Task & {
  assignedToUser?: Partial<User>;
  assignedByUser?: Partial<User>;
};

interface TaskItemProps {
  task: ExtendedTask;
  onComplete: (task: Task) => void;
  onViewDetails: (task: Task) => void;
}

function TaskItem({ task, onComplete, onViewDetails }: TaskItemProps) {
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

  const formatDueDate = (date: Date | null) => {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-4 border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex justify-between">
        <h3 className="text-sm font-medium text-neutral-900">{task.title}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(task.priority)}`}>
          {getPriorityText(task.priority)}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{task.description}</p>
      <div className="mt-3 flex justify-between items-center text-xs">
        <span className="text-neutral-500 flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Vence: {formatDueDate(task.dueDate)}
        </span>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onComplete(task)}
            title="Marcar como completada"
          >
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onViewDetails(task)}
            title="Ver detalles"
          >
            <Info className="h-3.5 w-3.5 text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TasksList() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: tasks, isLoading } = useQuery<ExtendedTask[]>({
    queryKey: ["/api/tasks"],
    select: (data) => {
      // Filter only pending tasks assigned to current user
      return data.filter((task) => 
        (task.status === "pending" || task.status === "in_progress") && 
        task.assignedTo === user?.id
      );
    }
  });
  
  const handleCompleteTask = async (task: Task) => {
    try {
      await apiRequest("PUT", `/api/tasks/${task.id}/status`, {
        status: "completed"
      });
      
      toast({
        title: "Tarea completada",
        description: "La tarea ha sido marcada como completada exitosamente",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    } catch (error) {
      toast({
        title: "Error al completar tarea",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };
  
  const handleViewTaskDetails = (task: Task) => {
    // Functionality to be implemented
    toast({
      title: "Ver detalles de tarea",
      description: `Detalles de la tarea: ${task.title}`,
    });
  };
  
  const handleNewTask = () => {
    // Functionality to be implemented
    toast({
      title: "Nueva tarea",
      description: "Funcionalidad para agregar nueva tarea",
    });
  };

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-neutral-200 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-neutral-900">Mis Tareas</CardTitle>
        <Button variant="link" size="sm" className="text-primary">
          Ver todas
        </Button>
      </CardHeader>
      <CardContent className="px-6 py-4">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-sm text-neutral-500 text-center py-4">
              Cargando tareas...
            </div>
          ) : tasks && tasks.length > 0 ? (
            tasks.slice(0, 3).map((task) => (
              <TaskItem 
                key={task.id} 
                task={task}
                onComplete={handleCompleteTask}
                onViewDetails={handleViewTaskDetails}
              />
            ))
          ) : (
            <div className="text-sm text-neutral-500 text-center py-4">
              No tienes tareas pendientes
            </div>
          )}
        </div>
        
        <Button 
          variant="outline" 
          className="mt-4 w-full flex items-center justify-center text-sm text-primary border-primary border-dashed"
          onClick={handleNewTask}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva Tarea
        </Button>
      </CardContent>
    </Card>
  );
}
