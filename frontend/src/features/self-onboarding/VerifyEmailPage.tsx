import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { selfOnboardingVerifyEmail } from './api';
import { isApiError } from '@/core/api/errors';
import { PublicAuthCard } from './components/PublicAuthCard';
import { Button } from '@/shared/ui/Button';

type VerifyState =
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'already_verified'; message: string }
  | { status: 'expired'; message: string }
  | { status: 'invalid'; message: string };

const MSG_VERIFIED = 'Your email has been verified.';
const MSG_ALREADY = 'Your email is already verified.';

function parseVerifyState(err: unknown): { kind: 'expired' | 'invalid'; message: string } {
  const msg = isApiError(err)
    ? (() => {
        const raw = err.details as { message?: unknown } | undefined;
        const m = raw?.message;
        if (Array.isArray(m)) {
          return m.filter((x) => typeof x === 'string').join(' ');
        }
        if (typeof m === 'string') return m;
        return err.message;
      })()
    : err instanceof Error
      ? err.message
      : 'This verification link is invalid.';

  const lower = msg.toLowerCase();
  if (lower.includes('expired')) {
    return { kind: 'expired', message: msg };
  }
  return { kind: 'invalid', message: msg };
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';

  const [state, setState] = useState<VerifyState>(
    token ? { status: 'loading' } : { status: 'invalid', message: 'Missing verification token.' }
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
        const m = res.message?.trim() ?? '';
        if (m.includes(MSG_ALREADY) || m.toLowerCase().includes('already verified')) {
          setState({ status: 'already_verified', message: res.message });
          return;
        }
        if (m.includes(MSG_VERIFIED) || m.toLowerCase().includes('has been verified')) {
          setState({ status: 'success' });
          return;
        }
        setState({ status: 'success' });
      })
      .catch((err) => {
        if (cancelled) return;
        const parsed = parseVerifyState(err);
        setState(
          parsed.kind === 'expired'
            ? { status: 'expired', message: parsed.message }
            : { status: 'invalid', message: parsed.message }
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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
          <p className="text-center text-sm text-muted-foreground">Verifying your email…</p>
        )}

        {state.status === 'success' && (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-foreground" role="status">
              Your email has been verified.
            </p>
            <Button type="button" className="w-full" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
          </div>
        )}

        {state.status === 'already_verified' && (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-foreground" role="status">
              {state.message || 'Your email is already verified.'}
            </p>
            <Button type="button" className="w-full" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
          </div>
        )}

        {state.status === 'expired' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-foreground">This link has expired</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{state.message}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Verification links expire for security. There is no resend from this screen yet—
              contact support or complete signup again if needed.
            </p>
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-medium text-foreground">We couldn’t verify this link</p>
            <p className="text-sm leading-relaxed text-destructive" role="alert">
              {state.message}
            </p>
            <p className="text-sm text-muted-foreground">
              If you already used this link, sign in with your work email. Otherwise, request a
              new invitation from your administrator or start signup again.
            </p>
          </div>
        )}
      </div>
    </PublicAuthCard>
  );
}
