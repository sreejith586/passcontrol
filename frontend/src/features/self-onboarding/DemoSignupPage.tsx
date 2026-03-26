import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/auth-context';
import { isApiError } from '@/core/api/errors';
import { demoInstantAccess } from '@/features/auth/api';
import {
  trackDemoEntryViewed,
  trackDemoInstantCtaClicked,
  trackDemoInstantFailed,
  trackDemoInstantStarted,
  trackDemoInstantSucceeded,
  trackDemoSignupCollapseClicked,
  trackDemoSignupExpandClicked,
} from './analytics/demo-entry-analytics';
import { Button } from '@/shared/ui/Button';
import { SelfSignupForm } from './components/SelfSignupForm';

function InstantDemoCard() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEnter() {
    trackDemoInstantCtaClicked();
    setError(null);
    setLoading(true);
    trackDemoInstantStarted();
    try {
      const res = await demoInstantAccess();
      await login({ accessToken: res.accessToken, user: res.user });
      trackDemoInstantSucceeded();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      trackDemoInstantFailed(e);
      if (isApiError(e) && e.status === 403) {
        setError('Instant demo is not available in this environment.');
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-border bg-background p-6 shadow-sm sm:p-8"
      aria-labelledby="instant-demo-title"
    >
      <h2 id="instant-demo-title" className="text-lg font-semibold text-foreground">
        I just want to see what&apos;s inside
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Instant access to a preloaded demo workspace. No signup friction.
      </p>
      <Button
        type="button"
        className="mt-5 w-full"
        size="lg"
        loading={loading}
        onClick={onEnter}
      >
        Enter demo workspace
      </Button>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function DemoSignupPage() {
  const [signupExpanded, setSignupExpanded] = useState(false);
  const signupPanelId = useId();
  const signupHeadingId = useId();
  const demoEntryViewRecordedRef = useRef(false);

  useEffect(() => {
    document.title = 'Try PassControl - PassControl';
    return () => {
      document.title = 'PassControl';
    };
  }, []);

  useEffect(() => {
    if (demoEntryViewRecordedRef.current) return;
    demoEntryViewRecordedRef.current = true;
    const source =
      typeof document !== 'undefined' && document.referrer ? document.referrer : undefined;
    trackDemoEntryViewed(source);
  }, []);

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            PassControl
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Try PassControl
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Choose how you want to explore the product.
          </p>
        </header>

        <div className="space-y-5">
          <InstantDemoCard />

          <section
            className="rounded-lg border border-border bg-background p-6 shadow-sm sm:p-8"
            aria-labelledby={signupHeadingId}
          >
            <h2 id={signupHeadingId} className="text-lg font-semibold text-foreground">
              Create my own demo workspace
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Experience tenant setup, onboarding, and how PassControl works in a multi-tenant
              environment.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5 w-full sm:w-auto"
              aria-expanded={signupExpanded}
              aria-controls={signupPanelId}
              onClick={() =>
                setSignupExpanded((v) => {
                  const next = !v;
                  if (next) trackDemoSignupExpandClicked();
                  else trackDemoSignupCollapseClicked();
                  return next;
                })
              }
            >
              {signupExpanded ? 'Hide signup form' : 'Show signup form'}
            </Button>

            <div
              id={signupPanelId}
              role="region"
              aria-labelledby={signupHeadingId}
              hidden={!signupExpanded}
              className={
                signupExpanded ? 'mt-6 border-t border-border pt-6' : undefined
              }
            >
              <SelfSignupForm
                embedded
                embeddedShowHeader={false}
                trackAsDemoEntry
                signupMode="DEMO"
                title="Create my own demo workspace"
                subtitle="Experience tenant setup, onboarding, and how PassControl works in a multi-tenant environment."
                submitLabel="Start demo signup"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
