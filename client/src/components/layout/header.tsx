import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, Search, Bell, HelpCircle, User, ChevronDown, ChevronUp, Book, MessageCircle, FileQuestion, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";

interface HeaderProps {
  toggleSidebar: () => void;
  notificationCount?: number;
}

export function Header({ toggleSidebar, notificationCount = 0 }: HeaderProps) {
  const [location] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    howToUse: true,
    commonQuestions: false,
    faq: false,
    charts: false,
    roles: false
  });
  const { user } = useAuth();

  const toggleSection = (section: 'howToUse' | 'commonQuestions' | 'faq' | 'charts' | 'roles') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

          <NotificationsDropdown />

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-neutral-500 hover:text-neutral-900"
              onClick={() => setHelpDialogOpen(true)}
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>

          <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Ayuda y Soporte</DialogTitle>
                <DialogDescription>
                  Información sobre cómo usar la aplicación, dudas y preguntas frecuentes.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 overflow-y-auto pr-2">
                {/* Cómo usar la aplicación */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('howToUse')}
                  >
                    <div className="flex items-center space-x-2">
                      <Book className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Cómo usar la aplicación</h3>
                    </div>
                    {expandedSections.howToUse ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {expandedSections.howToUse && (
                    <div className="p-4 space-y-3 border-t">
                      <p>TaskTrackMaster es una aplicación para gestionar documentos, tareas y aprobaciones en su organización. Aquí hay una guía rápida para comenzar:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Use el <strong>Dashboard</strong> para ver un resumen de sus actividades pendientes y métricas importantes.</li>
                        <li>En <strong>Documentos</strong> puede crear, gestionar y compartir documentos importantes de la organización.</li>
                        <li>La sección de <strong>Aprobaciones</strong> muestra documentos que requieren su revisión y firma.</li>
                        <li>Use <strong>Tareas</strong> para gestionar sus actividades pendientes y asignar responsabilidades.</li>
                        <li>En <strong>Políticas</strong> encontrará documentos oficiales y procedimientos que debe conocer.</li>
                        <li>La sección de <strong>Reportes</strong> le permite generar informes detallados y análisis de datos.</li>
                        <li>En <strong>Usuarios</strong> puede gestionar los miembros del equipo y sus permisos.</li>
                        <li>Use <strong>Configuración</strong> para personalizar su experiencia y preferencias.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Dudas comunes */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('commonQuestions')}
                  >
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Dudas comunes</h3>
                    </div>
                    {expandedSections.commonQuestions ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {expandedSections.commonQuestions && (
                    <div className="p-4 space-y-4 border-t">
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo creo un nuevo documento?</h4>
                        <p className="text-sm mt-1">Vaya a la sección de Documentos y haga clic en el botón "Nuevo Documento". Complete el formulario con la información requerida y adjunte los archivos necesarios.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo funciona el sistema de aprobaciones?</h4>
                        <p className="text-sm mt-1">Cuando se crea un documento que requiere aprobación, se notifica a los aprobadores designados. Ellos pueden revisar, comentar y aprobar o rechazar el documento.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo genero reportes?</h4>
                        <p className="text-sm mt-1">En la sección de Reportes, seleccione el tipo de informe deseado, configure los filtros y fechas, luego haga clic en "Generar Reporte". Puede exportar en varios formatos.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo asigno una tarea?</h4>
                        <p className="text-sm mt-1">En la sección de Tareas, haga clic en "Nueva Tarea", seleccione el usuario al que desea asignarla, establezca la prioridad y fecha límite, y complete los detalles.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo cambio mi contraseña?</h4>
                        <p className="text-sm mt-1">Vaya a Configuración, seleccione la pestaña "Cuenta" y use la opción para cambiar su contraseña. Asegúrese de usar una contraseña segura.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preguntas frecuentes */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('faq')}
                  >
                    <div className="flex items-center space-x-2">
                      <FileQuestion className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Preguntas frecuentes</h3>
                    </div>
                    {expandedSections.faq ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {expandedSections.faq && (
                    <div className="p-4 space-y-4 border-t">
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Quién puede aprobar documentos?</h4>
                        <p className="text-sm mt-1">Los usuarios con roles de Administrador, Manager o Coordinador pueden aprobar documentos. Los permisos específicos se configuran en la sección de Usuarios.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Qué tipos de reportes puedo generar?</h4>
                        <p className="text-sm mt-1">Puede generar reportes de tareas pendientes, documentos por estado, aprobaciones por usuario, tiempos de respuesta, y métricas de rendimiento del equipo.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo actualizo mi perfil?</h4>
                        <p className="text-sm mt-1">Vaya a Configuración y modifique los campos en la pestaña "Perfil". Puede actualizar su información personal, preferencias y configuración de notificaciones.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Cómo funciona el sistema de notificaciones?</h4>
                        <p className="text-sm mt-1">Recibirá notificaciones cuando tenga tareas pendientes, documentos por aprobar, o cuando otros usuarios interactúen con sus documentos. Configure sus preferencias en Configuración.</p>
                      </div>
                      <div className="p-3 bg-muted/20 rounded-md">
                        <h4 className="font-medium">¿Puedo exportar reportes?</h4>
                        <p className="text-sm mt-1">Sí, en la sección de Reportes puede generar y exportar diferentes tipos de informes en formatos PDF, Excel o CSV para su análisis posterior.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cómo leer las gráficas de reportes */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('charts')}
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Cómo leer las gráficas de reportes</h3>
                    </div>
                    {expandedSections.charts ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedSections.charts && (
                    <div className="p-4 space-y-3 border-t">
                      <p>Las gráficas de reportes muestran visualmente los datos clave del sistema. Aquí algunos consejos para interpretarlas:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Colores:</strong> Cada color representa una categoría, estado o prioridad diferente. Consulta la leyenda debajo de cada gráfica.</li>
                        <li><strong>Barras y sectores:</strong> El tamaño de la barra o sector indica la cantidad relativa de cada elemento.</li>
                        <li><strong>Tooltip:</strong> Al pasar el cursor sobre una barra o sector, verás el valor exacto y el porcentaje.</li>
                        <li><strong>Ejes:</strong> El eje X muestra las categorías o períodos, el eje Y muestra los valores numéricos.</li>
                        <li>Las gráficas circulares (pie) muestran proporciones, las de barras muestran comparaciones y las de línea muestran tendencias en el tiempo.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Roles de usuario en el sistema */}
                <div className="border rounded-lg overflow-hidden">
                  <button 
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection('roles')}
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Roles de usuario en el sistema</h3>
                    </div>
                    {expandedSections.roles ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  {expandedSections.roles && (
                    <div className="p-4 space-y-3 border-t">
                      <p>El sistema cuenta con diferentes roles de usuario, cada uno con permisos específicos:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Administrador:</strong> Acceso total a todas las funciones, gestión de usuarios, configuración y reportes.</li>
                        <li><strong>Manager:</strong> Puede aprobar documentos, asignar tareas y ver reportes.</li>
                        <li><strong>Coordinador:</strong> Puede crear y editar documentos, asignar tareas y ver métricas.</li>
                        <li><strong>Usuario:</strong> Puede ver y trabajar en sus tareas, consultar documentos y recibir notificaciones.</li>
                      </ul>
                      <p>Los permisos pueden personalizarse según las necesidades de la organización.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t pt-4 mt-auto">
                <Button onClick={() => setHelpDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
