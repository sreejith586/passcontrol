import { analytics } from '@/lib/analytics/analytics';
import { isApiError } from '@/core/api/errors';

/** Shared dimensions for demo signup funnel events (PostHog + GA4 via analytics.capture). */
const DEMO_ENTRY_BASE = {
  entry_page: 'demo_signup',
  ui_variant: 'stacked_cards',
  app_area: 'self_onboarding',
} as const;

function clientInstantDemoFlags() {
  const key = String(import.meta.env.VITE_DEMO_INSTANT_ACCESS_KEY ?? '').trim();
  return {
    requires_access_key: key.length > 0,
    /** Instant demo CTA is shown on this page; backend may still reject (see demo_instant_failed). */
    instant_demo_option_visible: true,
  };
}

function withDemoContext(extra?: Record<string, unknown>): Record<string, unknown> {
  return {
    ...DEMO_ENTRY_BASE,
    ...clientInstantDemoFlags(),
    ...extra,
  };
}

export function trackDemoEntryViewed(sourcePage?: string) {
  analytics.capture(
    'demo_entry_viewed',
    withDemoContext({
      ...(sourcePage ? { source_page: sourcePage } : {}),
    }),
  );
}

export function trackDemoInstantCtaClicked() {
  analytics.capture('demo_instant_cta_clicked', withDemoContext());
}

export function trackDemoInstantStarted() {
  analytics.capture('demo_instant_started', withDemoContext());
}

export function trackDemoInstantSucceeded() {
  analytics.capture('demo_instant_succeeded', withDemoContext());
}

export function trackDemoInstantFailed(err: unknown) {
  const { error_code, error_type } = classifyHttpError(err);
  analytics.capture(
    'demo_instant_failed',
    withDemoContext({
      ...(error_code != null ? { error_code } : {}),
      error_type,
    }),
  );
}

export function trackDemoSignupExpandClicked() {
  analytics.capture('demo_signup_expand_clicked', withDemoContext());
}

export function trackDemoSignupCollapseClicked() {
  analytics.capture('demo_signup_collapse_clicked', withDemoContext());
}

export function trackDemoSignupStarted() {
  analytics.capture('demo_signup_started', withDemoContext());
}

export function trackDemoSignupSubmitted(props: { has_phone: boolean; has_job_title: boolean }) {
  analytics.capture('demo_signup_submitted', withDemoContext(props));
}

export function trackDemoSignupSucceeded(props: { has_phone: boolean; has_job_title: boolean }) {
  analytics.capture('demo_signup_succeeded', withDemoContext(props));
}

export function trackDemoSignupFailed(err: unknown) {
  const { error_code, error_type } = classifyHttpError(err);
  analytics.capture(
    'demo_signup_failed',
    withDemoContext({
      ...(error_code != null ? { error_code } : {}),
      error_type,
    }),
  );
}

function classifyHttpError(err: unknown): { error_code?: number; error_type: string } {
  if (isApiError(err)) {
    const status = err.status;
    let error_type = 'api_error';
    if (status === 403) error_type = 'forbidden';
    else if (status === 401) error_type = 'unauthorized';
    else if (status === 408 || status === 504) error_type = 'timeout';
    else if (status == null) error_type = 'network';
    return { ...(status != null ? { error_code: status } : {}), error_type };
  }
  if (err instanceof Error) {
    return { error_type: 'client_error' };
  }
  return { error_type: 'unknown' };
}
