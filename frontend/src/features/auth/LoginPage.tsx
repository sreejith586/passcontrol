import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/core/auth/auth-context';
import { login } from './api';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const locationState = location.state as
    | { from?: { pathname: string }; passwordSetSuccess?: boolean }
    | undefined;
  const from = locationState?.from?.pathname ?? '/dashboard';
  const passwordSetSuccess = locationState?.passwordSetSuccess ?? false;

  useEffect(() => {
    document.title = 'Sign in - PassControl';
    return () => {
      document.title = 'PassControl';
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await login(data);
      await authLogin({
        accessToken: res.accessToken,
        user: res.user,
      });
      navigate(from, { replace: true, state: { from: undefined } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          PassControl
        </h1>
        {passwordSetSuccess && (
          <div
            className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
            role="status"
          >
            Password set successfully. You can now sign in.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
