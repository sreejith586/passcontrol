import { useForm } from 'react-hook-form';
import type { AlertWorkflowSettings } from '../types';
import { Button } from '@/shared/ui/Button';
import { usePermission } from '@/core/permissions/use-permission';

interface WorkflowPolicyFormProps {
  settings: AlertWorkflowSettings;
  onSubmit: (dto: Partial<AlertWorkflowSettings>) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function WorkflowPolicyForm({
  settings,
  onSubmit,
  isSubmitting = false,
}: WorkflowPolicyFormProps) {
  const canManage = usePermission('alert.workflow-policy.manage');

  const { register, handleSubmit } = useForm<AlertWorkflowSettings>({
    defaultValues: settings,
  });

  return (
    <form
      onSubmit={handleSubmit((dto) => onSubmit(dto))}
      className="space-y-6 max-w-xl"
    >
      <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="font-medium text-foreground">
              Require resolution note on resolve
            </label>
            <p className="text-sm text-muted-foreground">
              When enabled, users must provide a note when resolving an alert.
            </p>
          </div>
          <input
            type="checkbox"
            {...register('requireResolutionNoteOnResolve')}
            disabled={!canManage}
            className="h-4 w-4 rounded border-border"
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="font-medium text-foreground">
              Require reopen note on reopen
            </label>
            <p className="text-sm text-muted-foreground">
              When enabled, users must provide a note when reopening a resolved alert.
            </p>
          </div>
          <input
            type="checkbox"
            {...register('requireReopenNoteOnReopen')}
            disabled={!canManage}
            className="h-4 w-4 rounded border-border"
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
