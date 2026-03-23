import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { EmailSettings, UpdateEmailSettingsDto } from '../types';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { usePermission } from '@/core/permissions/use-permission';

interface EmailSettingsFormProps {
  settings: EmailSettings | null;
  onSubmit: (dto: UpdateEmailSettingsDto) => void | Promise<void>;
  isSubmitting?: boolean;
}

const DEFAULT_PORT = 587;

export function EmailSettingsForm({
  settings,
  onSubmit,
  isSubmitting = false,
}: EmailSettingsFormProps) {
  const canManage = usePermission('alert.workflow-policy.manage');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      smtpHost: '',
      smtpPort: DEFAULT_PORT,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: '',
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser ?? '',
        smtpPassword: '',
        fromEmail: settings.fromEmail,
        fromName: settings.fromName ?? '',
      });
    } else {
      reset({
        smtpHost: '',
        smtpPort: DEFAULT_PORT,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: '',
      });
    }
  }, [settings, reset]);

  return (
    <form
      onSubmit={handleSubmit((dto) => {
        const payload: UpdateEmailSettingsDto = {
          smtpHost: dto.smtpHost?.trim() || undefined,
          smtpPort: dto.smtpPort ? Number(dto.smtpPort) : undefined,
          smtpUser: dto.smtpUser?.trim() || null,
          fromEmail: dto.fromEmail?.trim() || undefined,
          fromName: dto.fromName?.trim() || null,
        };
        if (dto.smtpPassword?.trim()) {
          payload.smtpPassword = dto.smtpPassword;
        }
        // Omit smtpPassword when blank to keep existing (per backend: optional update)
        onSubmit(payload);
      })}
      className="space-y-6 max-w-xl"
    >
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            SMTP Host
          </label>
          <Input
            {...register('smtpHost', { required: 'SMTP Host is required' })}
            placeholder="smtp.example.com"
            disabled={!canManage}
            className="h-10"
          />
          {errors.smtpHost && (
            <p className="mt-1 text-sm text-destructive">{errors.smtpHost.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            Port
          </label>
          <Input
            {...register('smtpPort', {
              required: 'Port is required',
              min: { value: 1, message: 'Port must be 1–65535' },
              max: { value: 65535, message: 'Port must be 1–65535' },
            })}
            type="number"
            placeholder="587"
            disabled={!canManage}
            className="h-10"
          />
          {errors.smtpPort && (
            <p className="mt-1 text-sm text-destructive">{errors.smtpPort.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            Username
          </label>
          <Input
            {...register('smtpUser')}
            placeholder="Optional"
            disabled={!canManage}
            className="h-10"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            Password
          </label>
          <Input
            {...register('smtpPassword')}
            type="password"
            placeholder={settings?.hasPassword ? '•••••••• (leave blank to keep)' : 'Optional'}
            disabled={!canManage}
            autoComplete="new-password"
            className="h-10"
          />
          {settings?.hasPassword && (
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to keep the existing password.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            From Email
          </label>
          <Input
            {...register('fromEmail', {
              required: 'From Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address',
              },
            })}
            type="email"
            placeholder="noreply@example.com"
            disabled={!canManage}
            className="h-10"
          />
          {errors.fromEmail && (
            <p className="mt-1 text-sm text-destructive">{errors.fromEmail.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-foreground">
            From Name
          </label>
          <Input
            {...register('fromName')}
            placeholder="PassControl"
            disabled={!canManage}
            className="h-10"
          />
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
