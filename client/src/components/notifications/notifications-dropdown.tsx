import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/services/notifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function NotificationsDropdown() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'approval':
        return '📝';
      case 'document':
        return '📄';
      case 'task':
        return '✅';
      case 'policy':
        return '📋';
      case 'user':
        return '👤';
      case 'report':
        return '📊';
      default:
        return '📌';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-[#075E54] text-white">
          <h4 className="font-medium">Notificaciones</h4>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-white/80 hover:text-white hover:underline"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex flex-col gap-1 cursor-pointer group",
                    !notification.read && "bg-[#E7FFDB]/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#128C7E] flex items-center justify-center text-white">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#075E54] truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-[#128C7E] whitespace-nowrap">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                      <div className="mt-1 p-3 rounded-lg bg-[#E7FFDB] text-sm text-[#075E54]">
                        {notification.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 