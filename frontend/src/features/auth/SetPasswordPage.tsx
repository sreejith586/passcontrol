import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validateSetupToken, setPassword } from './api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ErrorState } from '@/shared/layout/ErrorState';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

type FormData = z.infer<typeof schema>;

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [validationState, setValidationState] = useState<
    'loading' | 'valid' | 'invalid'
  >('loading');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title =
      validationState === 'loading'
        ? 'Verifying - PassControl'
        : validationState === 'invalid'
          ? 'Setup link invalid - PassControl'
          : 'Set password - PassControl';
    return () => {
      document.title = 'PassControl';
    };
  }, [validationState]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', passwordConfirm: '' },
  });

  useEffect(() => {
    if (!token) {
      setValidationState('invalid');
      return;
    }
    let cancelled = false;
    validateSetupToken(token)
      .then((res) => {
        if (!cancelled) {
          setValidationState(res.valid ? 'valid' : 'invalid');
        }
      })
      .catch(() => {
        if (!cancelled) setValidationState('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      await setPassword(token, data.password, data.passwordConfirm);
      navigate('/login', {
        replace: true,
        state: { passwordSetSuccess: true },
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to set password'
      );
    }
  }

  if (validationState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-sm">
          <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
            PassControl
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            Verifying setup link…
          </p>
        </div>
      </div>
    );
  }

  if (validationState === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md">
          <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
            PassControl
          </h1>
          <ErrorState
            title="Setup link invalid or expired"
            description="This setup link is invalid or expired. Ask your administrator for a new link."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          PassControl
        </h1>
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Set your password to complete account setup.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.passwordConfirm?.message}
            {...register('passwordConfirm')}
          />
          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Setting password…' : 'Set password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
