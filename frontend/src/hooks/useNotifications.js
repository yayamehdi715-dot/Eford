import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markRead, markAllRead } from '../api';

export const useNotifications = () => {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 5 }).then(r => r.data),
    refetchInterval: 30000, // polling léger toutes les 30s
  });

  const readMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const readAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  return {
    notifications: data?.data || [],
    unreadCount: data?.unreadCount || 0,
    markRead: readMutation.mutate,
    markAllRead: readAllMutation.mutate,
  };
};
