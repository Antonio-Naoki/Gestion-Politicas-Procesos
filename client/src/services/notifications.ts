import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Notification {
  id: number;
  type: 'approval' | 'document' | 'task' | 'policy' | 'user' | 'report';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  link?: string;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("/api/notifications");
      return response.data;
    },
  });

  const markAsRead = async (notificationId: number) => {
    await api.patch(`/api/notifications/${notificationId}/read`);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllAsRead = async () => {
    await api.patch("/api/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createNotification = async (notification: Omit<Notification, "id" | "createdAt" | "read">) => {
    try {
      await api.post("/api/notifications", notification);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error) {
      console.warn("No se pudo crear la notificación:", error);
      // No lanzar el error para no detener el flujo
    }
  };

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    createNotification,
  };
}; 