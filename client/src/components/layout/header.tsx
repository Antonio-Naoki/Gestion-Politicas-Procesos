import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, Search, Bell, HelpCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  toggleSidebar: () => void;
  notificationCount?: number;
}

export function Header({ toggleSidebar, notificationCount = 0 }: HeaderProps) {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  
  const getPageTitle = () => {
    if (location.startsWith("/dashboard")) return "Dashboard";
    if (location.startsWith("/documents")) return "Documentos";
    if (location.startsWith("/approvals")) return "Aprobaciones";
    if (location.startsWith("/tasks")) return "Tareas";
    if (location.startsWith("/policies")) return "Políticas";
    if (location.startsWith("/users")) return "Usuarios";
    if (location.startsWith("/reports")) return "Reportes";
    if (location.startsWith("/settings")) return "Configuración";
    return "Panel de Control";
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="md:hidden text-neutral-500"
            onClick={toggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="ml-4 md:ml-0">
            <h1 className="text-xl font-heading font-bold text-neutral-900">{getPageTitle()}</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {searchOpen ? (
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Buscar..." 
                className="w-48 md:w-64 pl-8"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
              <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500" />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-500 hover:text-neutral-900"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-500 hover:text-neutral-900"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full"></span>
              )}
            </Button>
          </div>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-500 hover:text-neutral-900"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-500 hover:text-neutral-900"
            >
              <div className="h-8 w-8 rounded-full bg-neutral-200 overflow-hidden flex justify-center items-center">
                <User className="h-5 w-5 text-neutral-500" />
              </div>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
