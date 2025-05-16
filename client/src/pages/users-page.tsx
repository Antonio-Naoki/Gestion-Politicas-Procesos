import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { User } from "@shared/schema";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Plus,
  Pencil,
  Lock,
  Users as UsersIcon,
  UserPlus,
  Filter
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

// Create user form schema with validation
const userFormSchema = insertUserSchema.extend({
  username: z.string().min(3, { message: "El usuario debe tener al menos 3 caracteres" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  email: z.string().email({ message: "Email inválido" }),
  role: z.string().min(1, { message: "El rol es obligatorio" }),
  department: z.string().min(1, { message: "El departamento es obligatorio" }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// Edit user form schema (password is optional)
const editUserFormSchema = userFormSchema.partial({ password: true });
type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  // If user is not admin, manager or coordinator, redirect
  const isAuthorized = ["admin", "manager", "coordinator"].includes(user?.role || "");

  // Check if user has permission to edit users (only admin and manager)
  const canEditUsers = ["admin", "manager"].includes(user?.role || "");

  // Get pending approvals and tasks counts for the sidebar
  const { data: approvals } = useQuery({
    queryKey: ["/api/approvals"],
    select: (data) => data.filter(approval => approval.status === "pending")
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    select: (data) => data.filter(task => 
      task.status === "pending" || task.status === "in_progress"
    )
  });

  // Get all users
  const { data: users, isLoading, isError } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthorized
  });

  // Create user form
  const {
    register: registerNewUser,
    handleSubmit: handleSubmitNewUser,
    control: controlNewUser,
    reset: resetNewUser,
    formState: { errors: errorsNewUser, isSubmitting: isSubmittingNewUser },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "analyst",
      department: "",
    },
  });

  // Edit user form
  const {
    register: registerEditUser,
    handleSubmit: handleSubmitEditUser,
    control: controlEditUser,
    reset: resetEditUser,
    formState: { errors: errorsEditUser, isSubmitting: isSubmittingEditUser },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
  });

  // Reset password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormValues) => {
      const response = await apiRequest("POST", "/api/register", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });
      setShowNewUserDialog(false);
      resetNewUser();
    },
    onError: (error) => {
      toast({
        title: "Error al crear usuario",
        description: error instanceof Error ? error.message : "Error al crear el usuario",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number, userData: Partial<User> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      });
      setShowEditUserDialog(false);
      resetEditUser();
    },
    onError: (error) => {
      toast({
        title: "Error al actualizar usuario",
        description: error instanceof Error ? error.message : "Error al actualizar el usuario",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number, password: string }) => {
      const response = await apiRequest("PUT", `/api/users/${id}/reset-password`, { password });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña restablecida",
        description: "La contraseña ha sido restablecida exitosamente",
      });
      setShowResetPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast({
        title: "Error al restablecer contraseña",
        description: error instanceof Error ? error.message : "Error al restablecer la contraseña",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users?.filter(user => {
    // Search query filter
    const matchesSearch = searchQuery 
      ? user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // Role filter
    const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;

    // Department filter
    const matchesDepartment = departmentFilter === "all" ? true : user.department === departmentFilter;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  // Get unique departments for filter options
  const departments = users 
    ? [...new Set(users.map(user => user.department))]
    : [];

  const handleCreateUser = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  const handleEditUser = (data: EditUserFormValues) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, userData: data });
    }
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    if (selectedUser) {
      resetPasswordMutation.mutate(
        { id: selectedUser.id, password: newPassword },
        {
          onSettled: () => {
            setIsResetting(false);
          }
        }
      );
    }
  };

  const openEditUserDialog = (user: User) => {
    // Only allow admin and manager to edit users
    if (!canEditUsers) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para editar usuarios",
        variant: "destructive",
      });
      return;
    }

    setSelectedUser(user);
    resetEditUser({
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });
    setShowEditUserDialog(true);
  };

  const openResetPasswordDialog = (user: User) => {
    // Only allow admin and manager to reset passwords
    if (!canEditUsers) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para restablecer contraseñas",
        variant: "destructive",
      });
      return;
    }

    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowResetPasswordDialog(true);
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "admin": return "Administrador";
      case "manager": return "Manager";
      case "coordinator": return "Coordinador";
      case "analyst": return "Analista";
      case "operator": return "Operador";
      default: return role;
    }
  };

  return (
    <MainLayout 
      pendingApprovalCount={approvals?.length || 0}
      pendingTaskCount={tasks?.length || 0}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios y sus roles en el sistema
          </p>
        </div>
        {canEditUsers && (
          <Button onClick={() => setShowNewUserDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
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
                  placeholder="Buscar usuarios..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="coordinator">Coordinador</SelectItem>
                  <SelectItem value="analyst">Analista</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((department, index) => (
                    <SelectItem key={index} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              Error al cargar usuarios. Intente de nuevo.
            </div>
          ) : !isAuthorized ? (
            <div className="text-center py-12 text-destructive">
              No tienes permiso para ver esta página.
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.role === "admin" ? "bg-destructive" :
                            user.role === "manager" ? "bg-success" :
                            user.role === "coordinator" ? "bg-info" :
                            "bg-secondary"
                          }
                        >
                          {getRoleName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {canEditUsers ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditUserDialog(user)}
                              title="Editar usuario"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openResetPasswordDialog(user)}
                              title="Restablecer contraseña"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">Solo visualización</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No se encontraron usuarios</h3>
              <p>No hay usuarios que coincidan con los filtros actuales.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New User Dialog */}
      <Dialog 
        open={showNewUserDialog} 
        onOpenChange={(open) => {
          // Only allow admin and manager to open the dialog
          if (open && !canEditUsers) {
            toast({
              title: "Acceso denegado",
              description: "No tienes permisos para crear usuarios",
              variant: "destructive",
            });
            return;
          }
          setShowNewUserDialog(open);
        }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Complete el formulario para crear un nuevo usuario en el sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitNewUser(handleCreateUser)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">
                  Nombre de usuario <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  {...registerNewUser("username")}
                  placeholder="usuario"
                  className={errorsNewUser.username ? "border-destructive" : ""}
                />
                {errorsNewUser.username && (
                  <p className="text-xs text-destructive">{errorsNewUser.username.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">
                  Contraseña <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...registerNewUser("password")}
                  placeholder="••••••"
                  className={errorsNewUser.password ? "border-destructive" : ""}
                />
                {errorsNewUser.password && (
                  <p className="text-xs text-destructive">{errorsNewUser.password.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...registerNewUser("name")}
                placeholder="Nombre y apellido"
                className={errorsNewUser.name ? "border-destructive" : ""}
              />
              {errorsNewUser.name && (
                <p className="text-xs text-destructive">{errorsNewUser.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...registerNewUser("email")}
                placeholder="correo@ejemplo.com"
                className={errorsNewUser.email ? "border-destructive" : ""}
              />
              {errorsNewUser.email && (
                <p className="text-xs text-destructive">{errorsNewUser.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="role">
                  Rol <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="role"
                  control={controlNewUser}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <SelectTrigger
                        id="role"
                        className={errorsNewUser.role ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analyst">Analista</SelectItem>
                        <SelectItem value="operator">Operador</SelectItem>
                        <SelectItem value="coordinator">Coordinador</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsNewUser.role && (
                  <p className="text-xs text-destructive">{errorsNewUser.role.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">
                  Departamento <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="department"
                  control={controlNewUser}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <SelectTrigger
                        id="department"
                        className={errorsNewUser.department ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Production">Producción</SelectItem>
                        <SelectItem value="Quality">Control de Calidad</SelectItem>
                        <SelectItem value="HR">Recursos Humanos</SelectItem>
                        <SelectItem value="Logistics">Logística</SelectItem>
                        <SelectItem value="Sales">Ventas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsNewUser.department && (
                  <p className="text-xs text-destructive">{errorsNewUser.department.message}</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetNewUser();
                  setShowNewUserDialog(false);
                }}
                disabled={isSubmittingNewUser}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingNewUser}
              >
                {isSubmittingNewUser ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </span>
                ) : (
                  <span>Crear Usuario</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog 
        open={showEditUserDialog} 
        onOpenChange={(open) => {
          // Only allow admin and manager to open the dialog
          if (open && !canEditUsers) {
            toast({
              title: "Acceso denegado",
              description: "No tienes permisos para editar usuarios",
              variant: "destructive",
            });
            return;
          }
          setShowEditUserDialog(open);
        }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualice la información del usuario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEditUser(handleEditUser)} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">
                Nombre de usuario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-username"
                {...registerEditUser("username")}
                placeholder="usuario"
                className={errorsEditUser.username ? "border-destructive" : ""}
              />
              {errorsEditUser.username && (
                <p className="text-xs text-destructive">{errorsEditUser.username.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                {...registerEditUser("name")}
                placeholder="Nombre y apellido"
                className={errorsEditUser.name ? "border-destructive" : ""}
              />
              {errorsEditUser.name && (
                <p className="text-xs text-destructive">{errorsEditUser.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-email">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                {...registerEditUser("email")}
                placeholder="correo@ejemplo.com"
                className={errorsEditUser.email ? "border-destructive" : ""}
              />
              {errorsEditUser.email && (
                <p className="text-xs text-destructive">{errorsEditUser.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role">
                  Rol <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="role"
                  control={controlEditUser}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <SelectTrigger
                        id="edit-role"
                        className={errorsEditUser.role ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analyst">Analista</SelectItem>
                        <SelectItem value="operator">Operador</SelectItem>
                        <SelectItem value="coordinator">Coordinador</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsEditUser.role && (
                  <p className="text-xs text-destructive">{errorsEditUser.role.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-department">
                  Departamento <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="department"
                  control={controlEditUser}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <SelectTrigger
                        id="edit-department"
                        className={errorsEditUser.department ? "border-destructive" : ""}
                      >
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Production">Producción</SelectItem>
                        <SelectItem value="Quality">Control de Calidad</SelectItem>
                        <SelectItem value="HR">Recursos Humanos</SelectItem>
                        <SelectItem value="Logistics">Logística</SelectItem>
                        <SelectItem value="Sales">Ventas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errorsEditUser.department && (
                  <p className="text-xs text-destructive">{errorsEditUser.department.message}</p>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetEditUser();
                  setShowEditUserDialog(false);
                }}
                disabled={isSubmittingEditUser}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEditUser}
              >
                {isSubmittingEditUser ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Actualizando...
                  </span>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog 
        open={showResetPasswordDialog} 
        onOpenChange={(open) => {
          // Only allow admin and manager to open the dialog
          if (open && !canEditUsers) {
            toast({
              title: "Acceso denegado",
              description: "No tienes permisos para restablecer contraseñas",
              variant: "destructive",
            });
            return;
          }
          setShowResetPasswordDialog(open);
        }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>
              Establecer una nueva contraseña para {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">
                Nueva contraseña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">
                Confirmar contraseña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewPassword("");
                setConfirmPassword("");
                setShowResetPasswordDialog(false);
              }}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={
                !newPassword || 
                !confirmPassword || 
                newPassword !== confirmPassword || 
                isResetting
              }
            >
              {isResetting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Restableciendo...
                </span>
              ) : (
                <span>Restablecer Contraseña</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
