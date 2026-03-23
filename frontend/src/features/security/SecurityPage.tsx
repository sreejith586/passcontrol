import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { changePassword } from '@/features/auth/api';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/shared/feedback/useToast';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

type FormData = z.infer<typeof schema>;

export function SecurityPage() {
  const mutation = useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      changePassword({ currentPassword: dto.currentPassword, newPassword: dto.newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to change password'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'Security' }]} />
      <PageHeader
        title="Security"
        description="Change your password and manage account security."
      />

      <Card className="max-w-xl space-y-6 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Change password
        </h3>
        <form
          onSubmit={handleSubmit((data) =>
            mutation.mutate({
              currentPassword: data.currentPassword,
              newPassword: data.newPassword,
            })
          )}
          className="space-y-6"
        >
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword')}
          />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Changing...' : 'Change password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
