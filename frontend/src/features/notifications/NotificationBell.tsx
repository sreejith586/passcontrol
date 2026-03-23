import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatRelative } from '@/lib/date';
import { Button } from '@/shared/ui/Button';
import {
  getUnreadCount,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './api';
import { queryKeys } from './query-keys';
import type { Notification } from './types';

const POLL_INTERVAL_MS = 45_000;

function getDisplayText(n: Notification): string {
  const msg = n.payload?.message;
  if (typeof msg === 'string') return msg;
  return n.type === 'ESCALATION_ASSIGNED' ? 'Escalation assigned to you' : 'New notification';
}

function getTargetUrl(n: Notification): string | null {
  if (n.sourceType === 'ALERT_EVENT') {
    return `/alerts/${n.sourceId}`;
  }
  return null;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { data: listData, refetch: refetchList } = useQuery({
    queryKey: queryKeys.notifications.list({ limit: 10 }),
    queryFn: () => listNotifications({ limit: 10 }),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const count = unreadData?.count ?? 0;
  const badge = count > 99 ? '99+' : count > 0 ? String(count) : null;
  const items = listData?.items ?? [];

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refetchList();
  };

  const handleNotificationClick = (n: Notification) => {
    setOpen(false);
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    const url = getTargetUrl(n);
    if (url) navigate(url);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" className="relative px-2">
          <Bell className="h-5 w-5" />
          {badge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 max-h-[min(24rem,80vh)] overflow-hidden rounded-md border border-border bg-background shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            {count > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className="flex w-full items-start gap-2 rounded-none border-b border-border px-3 py-2.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <span
                    className={
                      n.readAt
                        ? 'invisible h-2 w-2 shrink-0'
                        : 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary'
                    }
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={n.readAt ? 'font-normal' : 'font-medium'}>
                      {getDisplayText(n)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
