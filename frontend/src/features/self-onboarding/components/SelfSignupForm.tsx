import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { selfOnboardingSignup } from '../api';
import type { SelfSignupMode } from '../types';
import { isApiError } from '@/core/api/errors';
import { analytics } from '@/lib/analytics/analytics';
import { PublicAuthCard } from './PublicAuthCard';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { PasswordInput } from '@/shared/ui/PasswordInput';

const schema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(200),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    phoneNumber: z.string().max(50).optional(),
    organizationName: z
      .string()
      .min(1, 'Organization name is required')
      .max(200),
    jobTitle: z.string().max(200).optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(500),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SelfSignupFormValues = z.infer<typeof schema>;

export interface SelfSignupFormProps {
  signupMode: SelfSignupMode;
  title: string;
  subtitle: string;
  submitLabel: string;
}

function errorMessageFromApi(err: unknown): string {
  if (isApiError(err)) {
    const raw = err.details as { message?: unknown } | undefined;
    const m = raw?.message;
    if (Array.isArray(m)) {
      return m.filter((x) => typeof x === 'string').join(' ');
    }
    if (typeof m === 'string' && m.length > 0) {
      return m;
    }
    if (err.message && err.message !== 'Request failed') {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export function SelfSignupForm({
  signupMode,
  title,
  subtitle,
  submitLabel,
}: SelfSignupFormProps) {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = `${title} - PassControl`;
    return () => {
      document.title = 'PassControl';
    };
  }, [title]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SelfSignupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      organizationName: '',
      jobTitle: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: SelfSignupFormValues) {
    setApiError(null);
    analytics.capture('signup_started', { signup_mode: signupMode });
    try {
      await selfOnboardingSignup({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phoneNumber: values.phoneNumber?.trim() || undefined,
        organizationName: values.organizationName.trim(),
        jobTitle: values.jobTitle?.trim() || undefined,
        password: values.password,
        signupMode,
      });
      analytics.capture('signup_completed', {
        signup_mode: signupMode,
        method: 'self_signup',
      });
      setSuccess(true);
    } catch (err) {
      setApiError(errorMessageFromApi(err));
    }
  }

  if (success) {
    return (
      <PublicAuthCard>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Check your email</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We sent a verification link to your inbox.
            {signupMode === 'DEMO' ? (
              <> For this demo, you can proceed to sign in without verifying your email.</>
            ) : (
              <>
                {' '}
                Please verify your email before inviting team members or signing in.
              </>
            )}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {signupMode === 'DEMO'
              ? 'Use sign in below to continue with your demo workspace.'
              : 'After you verify, you can sign in and finish setting up your workspace.'}
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              className="min-w-[10rem]"
              onClick={() => navigate('/login')}
            >
              Go to sign in
            </Button>
          </div>
        </div>
      </PublicAuthCard>
    );
  }

  return (
    <PublicAuthCard>
      <div className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          PassControl
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />
        <Input
          label="Organization name"
          autoComplete="organization"
          error={errors.organizationName?.message}
          {...register('organizationName')}
        />
        <Input
          label="Job title (optional)"
          autoComplete="organization-title"
          error={errors.jobTitle?.message}
          {...register('jobTitle')}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {apiError && (
          <p className="text-sm text-destructive" role="alert">
            {apiError}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : submitLabel}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </PublicAuthCard>
  );
}
