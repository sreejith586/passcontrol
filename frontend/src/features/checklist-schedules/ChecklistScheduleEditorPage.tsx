import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getScheduleById,
  createSchedule,
  updateSchedule,
  activateSchedule,
  deactivateSchedule,
  previewNextRun,
} from './api';
import type { CreateSchedulePayload, UpdateSchedulePayload } from './api';
import { listTemplates } from '@/features/checklist-templates/api';
import { listUsers } from '@/features/users/api';
import { queryKeys as usersQueryKeys } from '@/features/users/query-keys';
import { queryKeys } from './query-keys';
import {
  RRULE_PRESETS,
  CUSTOM_FALLBACK_ID,
  findPresetByRrule,
} from './rrule-presets';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { NativeSelect } from '@/shared/ui/NativeSelect';
import { toast } from '@/shared/feedback/useToast';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { ScopeSelectors } from '@/features/org-scope/ScopeSelectors';
import { TIMEZONES, getBrowserTimezone } from '@/lib/timezones';
import { formatDateTime } from '@/lib/date';

function toIsoDateLocal(d: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromIsoDateLocal(s: string): Date | null {
  if (!s?.trim()) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function validate(
  name: string,
  templateId: string,
  timezone: string,
  presetId: string,
  startsAt: Date | null,
  endsAt: Date | null
): string[] {
  const errors: string[] = [];
  if (!name.trim()) errors.push('Name is required');
  if (!templateId) errors.push('Template is required');
  if (!timezone.trim()) errors.push('Timezone is required');
  if (!presetId || presetId === CUSTOM_FALLBACK_ID) {
    errors.push('Recurrence preset is required');
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    errors.push('End date must be on or after start date');
  }
  return errors;
}

export function ChecklistScheduleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [checklistTemplateId, setChecklistTemplateId] = useState('');
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState(getBrowserTimezone);
  const [presetId, setPresetId] = useState('');
  const [customRrule, setCustomRrule] = useState(''); // preserved when preset is custom
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');
  const [brandId, setBrandId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [watcherUserIds, setWatcherUserIds] = useState<string[]>([]);

  const scheduleQuery = useQuery({
    queryKey: queryKeys.detail(id!),
    queryFn: () => getScheduleById(id!),
    enabled: !isNew && !!id,
  });

  const templatesQuery = useQuery({
    queryKey: ['checklist-templates', 'list', { status: 'PUBLISHED' }],
    queryFn: () => listTemplates({ status: 'PUBLISHED', limit: 100 }),
  });

  const usersQuery = useQuery({
    queryKey: usersQueryKeys.users.list({ page: 1, limit: 100 }),
    queryFn: () => listUsers({ page: 1, limit: 100 }),
  });

  useEffect(() => {
    if (scheduleQuery.data) {
      const s = scheduleQuery.data;
      setChecklistTemplateId(s.checklistTemplateId);
      setName(s.name);
      setTimezone(s.timezone);
      const preset = findPresetByRrule(s.rrule);
      if (preset) {
        setPresetId(preset.id);
        setCustomRrule('');
      } else {
        setPresetId(CUSTOM_FALLBACK_ID);
        setCustomRrule(s.rrule);
      }
      setStartsAt(s.startsAt ? toIsoDateLocal(new Date(s.startsAt)) : '');
      setEndsAt(s.endsAt ? toIsoDateLocal(new Date(s.endsAt)) : '');
      setBrandId(s.brandId ?? '');
      setLocationId(s.locationId ?? '');
      setZoneId(s.zoneId ?? '');
      setOwnerUserId(s.ownerUserId ?? '');
      setWatcherUserIds(
        (s.watchers ?? []).map((w) => w.userId),
      );
    }
  }, [scheduleQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateSchedulePayload) => createSchedule(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Schedule created');
      navigate(`/checklist-schedules/${data.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create schedule');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      scheduleId,
      payload,
    }: {
      scheduleId: string;
      payload: UpdateSchedulePayload;
    }) => updateSchedule(scheduleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      if (id) queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
      toast.success('Schedule updated');
      scheduleQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update schedule');
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      if (id) queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
      toast.success('Schedule activated');
      scheduleQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to activate');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      if (id) queryClient.invalidateQueries({ queryKey: queryKeys.detail(id) });
      toast.success('Schedule deactivated');
      scheduleQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate');
    },
  });

  const schedule = scheduleQuery.data;
  const publishedTemplates = templatesQuery.data ?? [];
  const effectiveRrule =
    presetId && presetId !== CUSTOM_FALLBACK_ID
      ? RRULE_PRESETS.find((p) => p.id === presetId)?.rrule ?? ''
      : customRrule;

  const startsAtDate = fromIsoDateLocal(startsAt);
  const endsAtDate = fromIsoDateLocal(endsAt);
  const isInvalidWindow =
    startsAtDate && endsAtDate && endsAtDate < startsAtDate;
  const previewParams = {
    rrule: effectiveRrule.trim(),
    timezone: timezone.trim(),
    startsAt: startsAtDate?.toISOString(),
    endsAt: endsAtDate?.toISOString(),
  };
  const canPreview =
    !!previewParams.rrule &&
    !!previewParams.timezone &&
    !isInvalidWindow;

  const previewQuery = useQuery({
    queryKey: [
      'schedule-preview',
      previewParams.rrule,
      previewParams.timezone,
      previewParams.startsAt ?? '',
      previewParams.endsAt ?? '',
    ],
    queryFn: () =>
      previewNextRun({
        rrule: previewParams.rrule,
        timezone: previewParams.timezone,
        startsAt: previewParams.startsAt || undefined,
        endsAt: previewParams.endsAt || undefined,
      }),
    enabled: canPreview,
  });

  function handleSave() {
    const startsAtDate = fromIsoDateLocal(startsAt);
    const endsAtDate = fromIsoDateLocal(endsAt);
    const errors = validate(
      name,
      checklistTemplateId,
      timezone,
      presetId,
      startsAtDate,
      endsAtDate
    );
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    const startsAtIso = startsAtDate?.toISOString();
    const endsAtIso = endsAtDate?.toISOString();

    const scopeForCreate: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      ownerUserId?: string;
      watcherUserIds?: string[];
    } = {};
    if (brandId) scopeForCreate.brandId = brandId;
    if (locationId) scopeForCreate.locationId = locationId;
    if (zoneId) scopeForCreate.zoneId = zoneId;
    if (ownerUserId) scopeForCreate.ownerUserId = ownerUserId;
    if (watcherUserIds.length > 0) scopeForCreate.watcherUserIds = watcherUserIds;

    const scopeForUpdate = {
      brandId: brandId || null,
      locationId: locationId || null,
      zoneId: zoneId || null,
      ownerUserId: ownerUserId || null,
      watcherUserIds,
    };

    if (isNew) {
      createMutation.mutate({
        checklistTemplateId,
        name: name.trim(),
        timezone: timezone.trim(),
        rrule: effectiveRrule.trim(),
        ...scopeForCreate,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
      });
    } else if (id) {
      updateMutation.mutate({
        scheduleId: id,
        payload: {
          name: name.trim(),
          timezone: timezone.trim(),
          rrule: effectiveRrule.trim(),
          ...scopeForUpdate,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
        },
      });
    }
  }

  function handleActiveToggle() {
    if (!id || !schedule) return;
    if (schedule.isActive) {
      deactivateMutation.mutate(id);
    } else {
      activateMutation.mutate(id);
    }
  }

  if (!isNew && scheduleQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!isNew && scheduleQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit Schedule" />
        <ErrorState
          title="Failed to load schedule"
          description={
            scheduleQuery.error instanceof Error
              ? scheduleQuery.error.message
              : 'Something went wrong'
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => scheduleQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isTogglePending =
    activateMutation.isPending || deactivateMutation.isPending;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Checklist Schedules', href: '/checklist-schedules' },
          { label: isNew ? 'New Schedule' : schedule?.name ?? 'Edit' },
        ]}
      />
      <PageHeader
        title={isNew ? 'New Schedule' : schedule?.name ?? 'Edit Schedule'}
        description={
          isNew
            ? 'Create a schedule to generate runs from a published template'
            : 'Edit schedule'
        }
      />

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Template
            </label>
            <NativeSelect
              sizeVariant="form"
              value={checklistTemplateId}
              onChange={(e) => setChecklistTemplateId(e.target.value)}
              disabled={!isNew}
            >
              <option value="">Select template</option>
              {publishedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.templateKey})
                </option>
              ))}
            </NativeSelect>
            {!isNew && (
              <p className="mt-1 text-xs text-slate-500">
                Template cannot be changed after creation
              </p>
            )}
          </div>

          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily Opening Checklist"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Timezone
            </label>
            <NativeSelect
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Recurrence
            </label>
            <NativeSelect
              value={presetId}
              onChange={(e) => {
                const v = e.target.value;
                setPresetId(v);
                if (v !== CUSTOM_FALLBACK_ID) setCustomRrule('');
              }}
            >
              <option value="">Select preset</option>
              {RRULE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              {!isNew && customRrule && (
                <option value={CUSTOM_FALLBACK_ID}>
                  Custom existing schedule
                </option>
              )}
            </NativeSelect>
            {presetId === CUSTOM_FALLBACK_ID && customRrule && (
              <p className="mt-1 text-xs text-slate-500">
                Current: {customRrule}. Select a preset to change.
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Scope (optional)</h3>
          <ScopeSelectors
            brandId={brandId}
            locationId={locationId}
            zoneId={zoneId}
            onChange={({ brandId: b, locationId: l, zoneId: z }) => {
              setBrandId(b);
              setLocationId(l);
              setZoneId(z);
            }}
          />
        </div>

        <div>
          <label
            htmlFor="schedule-owner"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Owner (optional)
          </label>
          <NativeSelect
            id="schedule-owner"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            className="max-w-xs"
          >
            <option value="">None</option>
            {(usersQuery.data?.items ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div>
          <h3 className="mb-1.5 text-sm font-medium text-foreground">
            Watchers (optional)
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            Watchers receive important notifications about this scheduled checklist
            but are not responsible for completing it.
          </p>
          <div className="max-h-40 overflow-y-auto rounded-md border border-border">
            <ul className="divide-y divide-border">
              {(usersQuery.data?.items ?? []).map((u) => {
                const checked = watcherUserIds.includes(u.id);
                return (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setWatcherUserIds((prev) =>
                            checked
                              ? prev.filter((id) => id !== u.id)
                              : [...prev, u.id],
                          );
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm font-medium">{u.name}</span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          {watcherUserIds.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              {watcherUserIds.length} watcher{watcherUserIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Activation Window (optional)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Start (optional)"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Schedule will start generating runs at or after this time
              </p>
            </div>
            <div>
              <Input
                label="End (optional)"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Schedule will stop generating runs after this time
              </p>
              {(() => {
                const endsAtDate = fromIsoDateLocal(endsAt);
                const isEndPast =
                  endsAtDate && endsAtDate < new Date();
                return isEndPast ? (
                  <p className="mt-1.5 text-sm text-amber-700" role="status">
                    End date has already passed. This schedule will not generate new runs.
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Next Run Preview
          </h3>
          {!canPreview ? (
            <p className="text-sm text-slate-500">
              Select recurrence and timezone to see next run
            </p>
          ) : previewQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : previewQuery.isError ? (
            <p className="text-sm text-amber-700">
              Could not compute preview
            </p>
          ) : previewQuery.data?.nextRunAt ? (
            <p className="text-sm text-foreground">
              Next run: {formatDateTime(previewQuery.data.nextRunAt)}
            </p>
          ) : (
            <p className="text-sm text-foreground">No future runs</p>
          )}
        </div>

        {!isNew && schedule && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={schedule.isActive}
                onChange={handleActiveToggle}
                disabled={isTogglePending}
                className="h-4 w-4 rounded border-border"
              />
              Active
            </label>
            <span className="text-xs text-slate-500">
              {schedule.isActive
                ? 'Schedule generates runs. Toggle off to pause.'
                : 'Schedule is paused. Toggle on to resume.'}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <PermissionGate
            permission={isNew ? 'checklist.schedule.create' : 'checklist.schedule.update'}
          >
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </PermissionGate>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/checklist-schedules')}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
