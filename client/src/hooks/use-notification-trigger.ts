import { useNotifications } from "@/services/notifications";

export const useNotificationTrigger = () => {
  const { createNotification } = useNotifications();

  const triggerNotification = (
    type: 'approval' | 'document' | 'task' | 'policy' | 'user' | 'report',
    title: string,
    message: string,
    link?: string
  ) => {
    createNotification({
      type,
      title,
      message,
      link,
    });
  };

  return {
    triggerNotification,
  };
}; 