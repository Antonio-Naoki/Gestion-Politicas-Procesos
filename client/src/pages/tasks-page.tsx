import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TaskItem } from "@/components/tasks/task-item";
import { Task, User, Document } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  CalendarIcon,
  Search,
  Plus,
  ClipboardList,
  ListChecks,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ExtendedTask = Task & {
  assignedToUser?: Partial<User>;
  assignedByUser?: Partial<User>;
  documentTitle?: string;
};

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<number | null>(null);
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { triggerNotification } = useNotificationTrigger();

  // Get pending approvals count for the badge in the sidebar
  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
    select: (data) => data.filter(approval => approval.status === "pending")
  });

  // Get all tasks with related users
  const { data: allTasks, isLoading, isError } = useQuery<ExtendedTask[]>({
    queryKey: ["/api/tasks"]
  });

  // Get all users for assignee selection
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"]
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: any) => {
      const response = await apiRequest("POST", "/api/tasks", newTask);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Tarea creada",
        description: "La tarea ha sido creada exitosamente",
      });
      setShowNewTaskDialog(false);
      resetTaskForm();
    },
    onError: (error) => {
      toast({
        title: "Error al crear tarea",
        description: error instanceof Error ? error.message : "Error al crear la tarea",
        variant: "destructive",
      });
    },
  });

  // Filter tasks based on search and filters
  const filteredTasks = allTasks?.filter(task => {
    // Search query filter
    const matchesSearch = searchQuery 
      ? task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Status filter
    const matchesStatus = statusFilter === "all" ? true : task.status === statusFilter;

    // Priority filter
    const matchesPriority = priorityFilter === "all" ? true : task.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Separate tasks by status
  const pendingTasks = filteredTasks?.filter(task => task.status === "pending") || [];
  const inProgressTasks = filteredTasks?.filter(task => task.status === "in_progress") || [];
  const completedTasks = filteredTasks?.filter(task => task.status === "completed") || [];
  const canceledTasks = filteredTasks?.filter(task => task.status === "canceled") || [];

  const handleCreateTask = async () => {
    if (!taskTitle) {
      toast({
        title: "Título requerido",
        description: "Por favor, proporcione un título para la tarea",
        variant: "destructive",
      });
      return;
    }

    if (!taskAssignee) {
      toast({
        title: "Asignación requerida",
        description: "Por favor, seleccione un usuario para asignar la tarea",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const newTask = {
      title: taskTitle,
      description: taskDescription,
      assignedTo: taskAssignee,
      assignedBy: user?.id,
      priority: taskPriority,
      status: "pending",
      dueDate: taskDueDate ? taskDueDate.toISOString() : null,
    };

    try {
      const response = await createTaskMutation.mutateAsync(newTask);
      
      // Trigger notification for the assigned user
      triggerNotification(
        "task",
        "Nueva tarea asignada",
        `Se te ha asignado la tarea "${taskTitle}"`,
        `/tasks`
      );

      // If the task was created by someone else, also notify the creator
      if (user?.id !== taskAssignee) {
        triggerNotification(
          "task",
          "Tarea creada",
          `Has creado la tarea "${taskTitle}" y asignado a ${users?.find(u => u.id === taskAssignee)?.name || "un usuario"}`,
          `/tasks`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskAssignee(null);
    setTaskPriority("medium");
    setTaskDueDate(null);
  };

  return (
    <MainLayout 
      pendingApprovalCount={approvals?.length || 0}
      pendingTaskCount={pendingTasks.length + inProgressTasks.length}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y controla tus tareas y asignaciones
          </p>
        </div>
        <Button onClick={() => setShowNewTaskDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar tareas..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="low">Normal</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="mb-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center">
            <ClipboardList className="mr-2 h-4 w-4" />
            Pendientes ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            En Progreso ({inProgressTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center">
            <CheckCircle className="mr-2 h-4 w-4" />
            Completadas ({completedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="canceled" className="flex items-center">
            <XCircle className="mr-2 h-4 w-4" />
            Canceladas ({canceledTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar tareas. Intente de nuevo.
            </div>
          ) : pendingTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay tareas pendientes</h3>
              <p>No hay tareas pendientes que coincidan con los filtros actuales.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowNewTaskDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Nueva Tarea
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inProgressTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay tareas en progreso</h3>
              <p>No hay tareas en progreso que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : completedTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay tareas completadas</h3>
              <p>No hay tareas completadas que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="canceled" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : canceledTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {canceledTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No hay tareas canceladas</h3>
              <p>No hay tareas canceladas que coincidan con los filtros actuales.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Tarea</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-title"
                placeholder="Título de la tarea"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className={!taskTitle ? "border-destructive" : ""}
              />
              {!taskTitle && (
                <p className="text-xs text-destructive mt-1">El título es requerido</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-description">Descripción</Label>
              <Textarea
                id="task-description"
                placeholder="Descripción detallada de la tarea..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-assignee">
                Asignar a <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={taskAssignee?.toString() || ""} 
                onValueChange={(value) => setTaskAssignee(Number(value))}
              >
                <SelectTrigger 
                  id="task-assignee"
                  className={!taskAssignee ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {users ? (
                    users.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name} ({u.role === "analyst" ? "Analista" : 
                         u.role === "operator" ? "Operador" : 
                         u.role === "coordinator" ? "Coordinador" : 
                         u.role === "manager" ? "Manager" : 
                         "Usuario"})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="">Cargando usuarios...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!taskAssignee && (
                <p className="text-xs text-destructive mt-1">Debe seleccionar un usuario</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Prioridad</Label>
                <Select 
                  value={taskPriority} 
                  onValueChange={setTaskPriority}
                >
                  <SelectTrigger id="task-priority">
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Normal</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="task-due-date">Fecha límite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="task-due-date"
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !taskDueDate && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {taskDueDate ? (
                        format(taskDueDate, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={taskDueDate || undefined}
                      onSelect={setTaskDueDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                resetTaskForm();
                setShowNewTaskDialog(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!taskTitle || !taskAssignee || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </span>
              ) : (
                <span>Crear Tarea</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
