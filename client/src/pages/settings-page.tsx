import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        department: formData.get('department'),
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el perfil');
      }

      toast({
        title: "Perfil actualizado",
        description: "Tu perfil ha sido actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

const handleSavePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const formData = new FormData(e.target as HTMLFormElement);
    const currentPassword = formData.get('current-password');
    const newPassword = formData.get('new-password');
    const confirmPassword = formData.get('confirm-password');

    if (newPassword !== confirmPassword) {
      throw new Error('Las contraseñas no coinciden');
    }

    const response = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al actualizar la contraseña');
    }

    toast({
      title: "Contraseña actualizada",
      description: "Tu contraseña ha sido actualizada correctamente.",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: error.message || "No se pudo actualizar la contraseña. Por favor intenta de nuevo.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Preferencias actualizadas",
        description: "Tus preferencias de notificación han sido actualizadas.",
      });
    }, 1000);
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Administra tu cuenta y preferencias
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Cuenta</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          {isAdmin && <TabsTrigger value="system">Sistema</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <form onSubmit={handleSaveProfile}>
              <CardHeader>
                <CardTitle>Información de Perfil</CardTitle>
                <CardDescription>
                  Actualiza tu información personal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" name="name" defaultValue={user?.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" name="email" type="email" defaultValue={user?.email} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  {isAdmin ? (
                    <Select id="department" name="department" defaultValue={user?.department}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Administration">Administración</SelectItem>
                        <SelectItem value="Production">Producción</SelectItem>
                        <SelectItem value="Quality">Calidad</SelectItem>
                        <SelectItem value="Operations">Operaciones</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="department" name="department" defaultValue={user?.department} readOnly />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Input id="role" defaultValue={
                    user?.role === "coordinator" ? "Coordinador" : 
                    user?.role === "manager" ? "Manager" : 
                    user?.role === "analyst" ? "Analista" : 
                    user?.role === "operator" ? "Operador" : 
                    user?.role === "admin" ? "Administrador" : ""
                  } disabled />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar cambios"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <form onSubmit={handleSavePassword}>
              <CardHeader>
                <CardTitle>Cambiar contraseña</CardTitle>
                <CardDescription>
                  Actualiza la contraseña de tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input id="current-password" name="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input id="new-password" name="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input id="confirm-password" name="confirm-password" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <form onSubmit={handleSaveNotifications}>
              <CardHeader>
                <CardTitle>Preferencias de notificación</CardTitle>
                <CardDescription>
                  Configura cuando y cómo quieres recibir notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notificaciones por correo electrónico</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-approvals">Aprobaciones</Label>
                      <p className="text-sm text-muted-foreground">
                        Recibe notificaciones cuando un documento requiera tu aprobación
                      </p>
                    </div>
                    <Switch id="email-approvals" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-tasks">Tareas asignadas</Label>
                      <p className="text-sm text-muted-foreground">
                        Recibe notificaciones cuando se te asigne una nueva tarea
                      </p>
                    </div>
                    <Switch id="email-tasks" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-policies">Nuevas políticas</Label>
                      <p className="text-sm text-muted-foreground">
                        Recibe notificaciones cuando se publique una nueva política
                      </p>
                    </div>
                    <Switch id="email-policies" defaultChecked />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Notificaciones en la aplicación</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="in-app-approvals">Aprobaciones</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar notificaciones para solicitudes de aprobación
                      </p>
                    </div>
                    <Switch id="in-app-approvals" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="in-app-tasks">Tareas asignadas</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar notificaciones para nuevas tareas
                      </p>
                    </div>
                    <Switch id="in-app-tasks" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="in-app-policies">Nuevas políticas</Label>
                      <p className="text-sm text-muted-foreground">
                        Mostrar notificaciones para nuevas políticas
                      </p>
                    </div>
                    <Switch id="in-app-policies" defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar preferencias"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del sistema</CardTitle>
                <CardDescription>
                  Configuraciones generales del sistema (solo administradores)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Flujos de aprobación</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="approval-levels">Niveles de aprobación requeridos</Label>
                      <Select defaultValue="2">
                        <SelectTrigger id="approval-levels">
                          <SelectValue placeholder="Seleccionar niveles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 nivel</SelectItem>
                          <SelectItem value="2">2 niveles</SelectItem>
                          <SelectItem value="3">3 niveles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auto-approve">Aprobación automática (días)</Label>
                      <Input id="auto-approve" type="number" min="0" defaultValue="0" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Tareas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-reminder">Recordatorios de tareas (días)</Label>
                      <Input id="task-reminder" type="number" min="1" defaultValue="3" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-escalation">Escalamiento automático (días)</Label>
                      <Input id="task-escalation" type="number" min="0" defaultValue="7" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Seguridad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-timeout">Tiempo de sesión (minutos)</Label>
                      <Input id="session-timeout" type="number" min="5" defaultValue="60" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-expiration">Expiración de contraseña (días)</Label>
                      <Input id="password-expiration" type="number" min="0" defaultValue="90" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor">Autenticación de dos factores</Label>
                      <p className="text-sm text-muted-foreground">
                        Requerir 2FA para todos los usuarios
                      </p>
                    </div>
                    <Switch id="two-factor" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>
                  Guardar configuración
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </MainLayout>
  );
}
