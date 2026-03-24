import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { selfOnboardingVerifyEmail } from './api';
import { isApiError } from '@/core/api/errors';
import { PublicAuthCard } from './components/PublicAuthCard';
import { Button } from '@/shared/ui/Button';

/**
 * Exact backend messages from SelfOnboardingService.verifyEmail (Nest BadRequest / success body).
 */
const BACKEND = {
  successVerified: 'Your email has been verified.',
  successAlready: 'Your email is already verified.',
  errInvalid: 'This verification link is invalid.',
  errAlreadyUsed: 'This verification link has already been used.',
  errExpired: 'This verification link has expired.',
} as const;

type VerifyState =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'already_verified' }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'already_used' };

function extractApiMessage(err: unknown): string {
  if (isApiError(err)) {
    const raw = err.details as { message?: unknown } | undefined;
    const m = raw?.message;
    if (Array.isArray(m)) {
      return m.filter((x) => typeof x === 'string').join(' ').trim();
    }
    if (typeof m === 'string' && m.length > 0) {
      return m.trim();
    }
    return (err.message ?? '').trim();
  }
  if (err instanceof Error) {
    return err.message.trim();
  }
  return '';
}

/** Maps 200 response body.message → UI state. */
function mapSuccessMessage(message: string): Extract<
  VerifyState,
  { status: 'success' | 'already_verified' }
> {
  const m = message.trim();
  if (m === BACKEND.successAlready) {
    return { status: 'already_verified' };
  }
  if (m === BACKEND.successVerified) {
    return { status: 'success' };
  }
  // Defensive: phrasing drift or future copy changes
  const lower = m.toLowerCase();
  if (lower.includes('already verified')) {
    return { status: 'already_verified' };
  }
  return { status: 'success' };
}

/** Maps 400 error message → UI state; unknown → invalid. */
function mapErrorToState(message: string): Exclude<VerifyState, { status: 'loading' }> {
  const m = message.trim();
  if (m === BACKEND.errExpired) {
    return { status: 'expired' };
  }
  if (m === BACKEND.errAlreadyUsed) {
    return { status: 'already_used' };
  }
  if (m === BACKEND.errInvalid) {
    return { status: 'invalid' };
  }
  const lower = m.toLowerCase();
  if (lower.includes('expired')) {
    return { status: 'expired' };
  }
  if (lower.includes('already been used')) {
    return { status: 'already_used' };
  }
  return { status: 'invalid' };
}

function VerifyResult({
  title,
  description,
  showSignIn,
  onSignIn,
}: {
  title: string;
  description: string;
  showSignIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <div className="space-y-3 text-center">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      {showSignIn && (
        <div className="pt-2">
          <Button type="button" className="w-full" onClick={onSignIn}>
            Go to sign in
          </Button>
        </div>
      )}
    </div>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';

  const [state, setState] = useState<VerifyState>(
    token ? { status: 'loading' } : { status: 'invalid' }
  );

  useEffect(() => {
    document.title = 'Verify email - PassControl';
    return () => {
      document.title = 'PassControl';
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    selfOnboardingVerifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        const next = mapSuccessMessage(res.message ?? '');
        setState(next);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = extractApiMessage(err);
        setState(mapErrorToState(msg || 'unknown'));
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const goLogin = () => navigate('/login');

  return (
    <PublicAuthCard className="max-w-md">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          PassControl
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Email verification</h1>
      </div>

      <div className="mt-8">
        {state.status === 'loading' && (
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            Verifying your email…
          </p>
        )}

        {state.status === 'success' && (
          <VerifyResult
            title="Email verified"
            description="Your email has been successfully verified."
            showSignIn
            onSignIn={goLogin}
          />
        )}

        {state.status === 'already_verified' && (
          <VerifyResult
            title="Email already verified"
            description="Your email is already verified. You can sign in."
            showSignIn
            onSignIn={goLogin}
          />
        )}

        {state.status === 'expired' && (
          <VerifyResult
            title="Link expired"
            description="This verification link has expired. Please request a new one."
            showSignIn
            onSignIn={goLogin}
          />
        )}

        {state.status === 'invalid' && (
          <VerifyResult
            title="Invalid link"
            description="This verification link is invalid or has been corrupted."
            showSignIn
            onSignIn={goLogin}
          />
        )}

        {state.status === 'already_used' && (
          <VerifyResult
            title="Link already used"
            description="This verification link has already been used."
            showSignIn
            onSignIn={goLogin}
          />
        )}
      </div>
    </PublicAuthCard>
  );
}
