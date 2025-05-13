import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  ClipboardList, 
  BookOpen, 
  Users, 
  BarChart2, 
  Settings, 
  LogOut 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  pendingApprovalCount?: number;
  pendingTaskCount?: number;
}

export function Sidebar({ pendingApprovalCount = 0, pendingTaskCount = 0 }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-neutral-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-neutral-200">
          <div className="text-xl font-heading font-bold text-primary flex items-center">
            <span className="mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </span>
            CERATER
          </div>
        </div>
        
        {/* User info */}
        <div className="flex flex-col items-center px-4 py-6 space-y-2 border-b border-neutral-200">
          <div className="h-16 w-16 rounded-full bg-neutral-200 overflow-hidden flex justify-center items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="text-center">
            <h3 className="font-medium text-neutral-900">{user?.name}</h3>
            <p className="text-sm text-neutral-500">{user?.role === "coordinator" ? "Coordinador" : 
               user?.role === "manager" ? "Manager" : 
               user?.role === "analyst" ? "Analista" : 
               user?.role === "operator" ? "Operador" : 
               user?.role === "admin" ? "Administrador" : ""} de {user?.department}</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          <Link href="/dashboard">
            <a className={`sidebar-link ${isActive("/dashboard") ? "active" : ""}`}>
              <LayoutDashboard className="mr-3 h-5 w-5 text-primary" />
              Dashboard
            </a>
          </Link>
          
          <Link href="/documents">
            <a className={`sidebar-link ${isActive("/documents") ? "active" : ""}`}>
              <FileText className="mr-3 h-5 w-5 text-neutral-500" />
              Documentos
            </a>
          </Link>
          
          <Link href="/approvals">
            <a className={`sidebar-link ${isActive("/approvals") ? "active" : ""}`}>
              <CheckCircle className="mr-3 h-5 w-5 text-neutral-500" />
              Aprobaciones
              {pendingApprovalCount > 0 && (
                <span className="relative ml-auto">
                  <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {pendingApprovalCount}
                  </Badge>
                </span>
              )}
            </a>
          </Link>
          
          <Link href="/tasks">
            <a className={`sidebar-link ${isActive("/tasks") ? "active" : ""}`}>
              <ClipboardList className="mr-3 h-5 w-5 text-neutral-500" />
              Tareas
              {pendingTaskCount > 0 && (
                <span className="relative ml-auto">
                  <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {pendingTaskCount}
                  </Badge>
                </span>
              )}
            </a>
          </Link>
          
          <Link href="/policies">
            <a className={`sidebar-link ${isActive("/policies") ? "active" : ""}`}>
              <BookOpen className="mr-3 h-5 w-5 text-neutral-500" />
              Políticas
            </a>
          </Link>
          
          {(user?.role === "admin" || user?.role === "manager" || user?.role === "coordinator") && (
            <Link href="/users">
              <a className={`sidebar-link ${isActive("/users") ? "active" : ""}`}>
                <Users className="mr-3 h-5 w-5 text-neutral-500" />
                Usuarios
              </a>
            </Link>
          )}
          
          <Link href="/reports">
            <a className={`sidebar-link ${isActive("/reports") ? "active" : ""}`}>
              <BarChart2 className="mr-3 h-5 w-5 text-neutral-500" />
              Reportes
            </a>
          </Link>
          
          <Link href="/settings">
            <a className={`sidebar-link ${isActive("/settings") ? "active" : ""}`}>
              <Settings className="mr-3 h-5 w-5 text-neutral-500" />
              Configuración
            </a>
          </Link>
        </nav>
        
        {/* Logout */}
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-4 py-2 text-neutral-900 rounded-md hover:bg-neutral-100"
          >
            <LogOut className="mr-3 h-5 w-5 text-neutral-500" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
