import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  putNotificationPreferences,
  type NotificationPreferenceItem,
  type NotificationType,
} from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { toast } from '@/shared/feedback/useToast';

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  ESCALATION_ASSIGNED: 'Alert assigned to you',
  ESCALATION_CREATED: 'New alert created',
  ESCALATION_RESOLVED: 'Alert resolved',
  CHECKLIST_DUE_SOON: 'Checklist due soon',
  CHECKLIST_OVERDUE: 'Checklist overdue',
};

export function NotificationPreferencesPage() {
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<NotificationPreferenceItem[] | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: getNotificationPreferences,
  });

  useEffect(() => {
    if (data?.items) setLocalItems(data.items);
  }, [data?.items]);

  const mutation = useMutation({
    mutationFn: (items: NotificationPreferenceItem[]) =>
      putNotificationPreferences(items),
    onSuccess: (result) => {
      setLocalItems(result.items);
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.preferences,
      });
      toast.success('Notification preferences saved');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save preferences'),
  });

  const toggle = (
    type: NotificationType,
    field: 'inAppEnabled' | 'emailEnabled' | 'whatsAppEnabled'
  ) => {
    if (!localItems) return;
    setLocalItems(
      localItems.map((item) =>
        item.notificationType === type
          ? { ...item, [field]: !item[field] }
          : item
      )
    );
  };

  const handleSave = () => {
    if (localItems) mutation.mutate(localItems);
  };

  const hasChanges =
    localItems &&
    data?.items &&
    JSON.stringify(localItems) !== JSON.stringify(data.items);

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'My Account' },
            { label: 'Notification Preferences' },
          ]}
        />
        <PageHeader title="Notification Preferences" />
        <ErrorState
          title="Failed to load preferences"
          description={error instanceof Error ? error.message : 'Something went wrong'}
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !localItems) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'My Account' },
            { label: 'Notification Preferences' },
          ]}
        />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'My Account' },
          { label: 'Notification Preferences' },
        ]}
      />
      <PageHeader
        title="Notification Preferences"
        description="Control how you receive notifications for alerts and checklists."
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Notification type
                </th>
                <th className="px-4 py-3 text-center font-medium text-foreground w-24">
                  In-app
                </th>
                <th className="px-4 py-3 text-center font-medium text-foreground w-24">
                  Email
                </th>
                <th className="px-4 py-3 text-center font-medium text-foreground w-24">
                  <span className="flex flex-col items-center gap-0.5">
                    <span>WhatsApp</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Coming soon
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {localItems.map((item) => (
                <tr
                  key={item.notificationType}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 text-foreground">
                    {NOTIFICATION_TYPE_LABELS[item.notificationType]}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.inAppEnabled}
                        onChange={() => toggle(item.notificationType, 'inAppEnabled')}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="flex items-center justify-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.emailEnabled}
                        onChange={() => toggle(item.notificationType, 'emailEnabled')}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="flex items-center justify-center gap-2 cursor-pointer opacity-60">
                      <input
                        type="checkbox"
                        checked={item.whatsAppEnabled}
                        onChange={() => toggle(item.notificationType, 'whatsAppEnabled')}
                        disabled
                        title="WhatsApp delivery not yet available"
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save preferences'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
