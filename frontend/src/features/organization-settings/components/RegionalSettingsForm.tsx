import { useForm } from 'react-hook-form';
import type { RegionalSettings } from '../types';
import { Button } from '@/shared/ui/Button';
import { usePermission } from '@/core/permissions/use-permission';
import { TIMEZONES } from '@/lib/timezones';
import { TEMPERATURE_UNIT_OPTIONS } from '@/lib/temperature-units';

interface RegionalSettingsFormProps {
  settings: RegionalSettings;
  onSubmit: (dto: Partial<RegionalSettings>) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function RegionalSettingsForm({
  settings,
  onSubmit,
  isSubmitting = false,
}: RegionalSettingsFormProps) {
  const canManage = usePermission('alert.workflow-policy.manage');

  const { register, handleSubmit } = useForm<{ defaultTimezone: string; defaultTemperatureUnit: string }>({
    defaultValues: {
      defaultTimezone: settings.defaultTimezone ?? '',
      defaultTemperatureUnit: settings.defaultTemperatureUnit ?? '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit((dto) => {
        const unit = dto.defaultTemperatureUnit;
        onSubmit({
          defaultTimezone: dto.defaultTimezone || null,
          defaultTemperatureUnit: unit === 'F' || unit === 'C' ? unit : null,
        });
      })}
      className="space-y-6 max-w-xl"
    >
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            Default timezone
          </label>
          <p className="mb-2 text-sm text-muted-foreground">
            Used for today runs, dashboard metrics, and quick setup when not overridden.
          </p>
          <select
            {...register('defaultTimezone')}
            disabled={!canManage}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Not set (fallback: UTC)</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            Default temperature unit
          </label>
          <p className="mb-2 text-sm text-muted-foreground">
            Used for temperature items when item config or location does not specify a unit.
          </p>
          <select
            {...register('defaultTemperatureUnit')}
            disabled={!canManage}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Not set (use default)</option>
            {TEMPERATURE_UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {canManage && (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </Button>
      )}
    </form>
  );
}
