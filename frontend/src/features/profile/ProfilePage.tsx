import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getMyProfile, updateMyProfile, type UpdateProfileDto } from './api';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { toast } from '@/shared/feedback/useToast';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  phoneNumber: z.string().max(50).optional(),
  jobTitle: z.string().max(100).optional(),
});

type FormData = z.infer<typeof schema>;

export function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: getMyProfile,
  });

  const mutation = useMutation({
    mutationFn: (dto: UpdateProfileDto) => updateMyProfile(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Profile updated');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update profile'),
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phoneNumber: '',
      jobTitle: '',
    },
    values: profile
      ? {
          name: profile.name,
          phoneNumber: profile.phoneNumber ?? '',
          jobTitle: profile.jobTitle ?? '',
        }
      : undefined,
  });

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'My Account' }, { label: 'My Profile' }]} />
        <PageHeader title="Profile" />
        <ErrorState
          title="Failed to load profile"
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

  if (isLoading || !profile) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'My Account' }, { label: 'My Profile' }]} />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'My Profile' }]} />
      <PageHeader
        title="Profile"
        description="Your account information and contact details."
      />

      <Card className="max-w-xl space-y-6 p-5">
        <form
          onSubmit={handleSubmit((dto) => {
            const payload: UpdateProfileDto = {};
            if (dto.name !== profile.name) payload.name = dto.name;
            if ((dto.phoneNumber ?? '') !== (profile.phoneNumber ?? '')) {
              payload.phoneNumber = dto.phoneNumber?.trim() || null;
            }
            if ((dto.jobTitle ?? '') !== (profile.jobTitle ?? '')) {
              payload.jobTitle = dto.jobTitle?.trim() || null;
            }
            if (Object.keys(payload).length > 0) mutation.mutate(payload);
          })}
          className="space-y-6"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              disabled
              className="flex h-10 w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>

          <Input
            label="Name"
            {...register('name')}
            error={errors.name?.message}
            autoComplete="name"
          />

          <Input
            label="Phone number"
            {...register('phoneNumber')}
            error={errors.phoneNumber?.message}
            placeholder="+1 234 567 8900"
          />

          <Input
            label="Job title"
            {...register('jobTitle')}
            error={errors.jobTitle?.message}
            placeholder="e.g. Operations Manager"
          />

          <Button
            type="submit"
            disabled={!isDirty || mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
