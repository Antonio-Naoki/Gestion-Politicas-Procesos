import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, { message: "El usuario es obligatorio" }),
  password: z.string().min(1, { message: "La contraseña es obligatoria" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Registration schema
const registerSchema = insertUserSchema.extend({
  username: z.string().min(3, { message: "El usuario debe tener al menos 3 caracteres" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  email: z.string().email({ message: "Email inválido" }),
  role: z.enum(["admin", "manager", "coordinator", "analyst", "operator"], { 
    errorMap: () => ({ message: "El rol es obligatorio" }) 
  }),
  department: z.string().min(1, { message: "El departamento es obligatorio" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Use useEffect for redirection instead of conditional return
  // This avoids the "Rendered fewer hooks than expected" error
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "analyst" as const,
      department: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-neutral-50">
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <CardTitle className="text-2xl text-center font-bold">CERATER</CardTitle>
            <CardDescription className="text-center">
              Sistema de Gestión de Procesos y Políticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="login-username">Usuario</Label>
                      <Input
                        id="login-username"
                        placeholder="Ingrese su usuario"
                        {...loginForm.register("username")}
                        className={loginForm.formState.errors.username ? "border-destructive" : ""}
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-xs text-destructive mt-1">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Ingrese su contraseña"
                        {...loginForm.register("password")}
                        className={loginForm.formState.errors.password ? "border-destructive" : ""}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-destructive mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Iniciando sesión...
                        </span>
                      ) : (
                        "Iniciar Sesión"
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="register-username">Usuario</Label>
                        <Input
                          id="register-username"
                          placeholder="Nombre de usuario"
                          {...registerForm.register("username")}
                          className={registerForm.formState.errors.username ? "border-destructive" : ""}
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-xs text-destructive mt-1">
                            {registerForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="register-password">Contraseña</Label>
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Contraseña"
                          {...registerForm.register("password")}
                          className={registerForm.formState.errors.password ? "border-destructive" : ""}
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-xs text-destructive mt-1">
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="register-name">Nombre completo</Label>
                      <Input
                        id="register-name"
                        placeholder="Nombre y apellido"
                        {...registerForm.register("name")}
                        className={registerForm.formState.errors.name ? "border-destructive" : ""}
                      />
                      {registerForm.formState.errors.name && (
                        <p className="text-xs text-destructive mt-1">
                          {registerForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="register-email">Correo electrónico</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        {...registerForm.register("email")}
                        className={registerForm.formState.errors.email ? "border-destructive" : ""}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-xs text-destructive mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="register-role">Rol</Label>
                        <Select 
                          onValueChange={(value: "admin" | "manager" | "coordinator" | "analyst" | "operator") => {
                            registerForm.setValue("role", value);
                          }} 
                          defaultValue={registerForm.getValues("role")}
                        >
                          <SelectTrigger 
                            id="register-role"
                            className={registerForm.formState.errors.role ? "border-destructive" : ""}
                          >
                            <SelectValue placeholder="Seleccione un rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="analyst">Analista</SelectItem>
                            <SelectItem value="operator">Operador</SelectItem>
                            <SelectItem value="coordinator">Coordinador</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.role && (
                          <p className="text-xs text-destructive mt-1">
                            {registerForm.formState.errors.role.message}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="register-department">Departamento</Label>
                        <Select 
                          onValueChange={(value) => registerForm.setValue("department", value)} 
                          defaultValue={registerForm.getValues("department")}
                        >
                          <SelectTrigger 
                            id="register-department"
                            className={registerForm.formState.errors.department ? "border-destructive" : ""}
                          >
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Production">Producción</SelectItem>
                            <SelectItem value="Quality">Control de Calidad</SelectItem>
                            <SelectItem value="HR">Recursos Humanos</SelectItem>
                            <SelectItem value="Logistics">Logística</SelectItem>
                            <SelectItem value="Sales">Ventas</SelectItem>
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.department && (
                          <p className="text-xs text-destructive mt-1">
                            {registerForm.formState.errors.department.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registrando...
                        </span>
                      ) : (
                        "Registrarse"
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col">
            <p className="mt-2 text-xs text-center text-neutral-500">
              {activeTab === 'login' ? (
                <>
                  ¿No tienes una cuenta?{" "}
                  <button 
                    onClick={() => setActiveTab("register")} 
                    className="text-primary hover:underline"
                  >
                    Regístrate aquí
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes una cuenta?{" "}
                  <button 
                    onClick={() => setActiveTab("login")} 
                    className="text-primary hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <div className="hidden lg:flex flex-col justify-center p-12 bg-primary text-white">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-6">Sistema de Gestión de Procesos y Políticas</h1>
          <p className="text-lg mb-6">
            Centraliza, organiza y gestiona eficientemente todos los documentos, procesos y políticas de tu empresa.
          </p>
          <ul className="space-y-4 mb-8">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Centraliza la documentación de procesos internos y políticas</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Flujos de aprobación jerárquicos para garantizar la calidad de la información</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Gestión de tareas y seguimiento de aceptación de políticas</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Facilita la comunicación y el acceso a información actualizada</span>
            </li>
          </ul>
          <img 
            src="https://pixabay.com/get/g00b9e2d22c630fcdb1ecbfe40596e91babb8132ec8f9fa42bb26d971b7f7e6b16c908b73b969fe5e8a1651e97bc867cf399df130ffe3d8882b722ca1966a0b72_1280.jpg" 
            alt="Process Workflow Diagram" 
            className="rounded-lg shadow-lg max-w-full opacity-80"
          />
        </div>
      </div>
    </div>
  );
}
