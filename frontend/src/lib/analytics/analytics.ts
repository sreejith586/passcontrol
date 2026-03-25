import { initPosthog, captureEvent, identifyUser, resetUser } from './providers/posthog';
import { initGA4, trackEvent as trackGA4Event, trackPageView as trackGA4PageView } from './providers/ga4';
import { getUTMParams } from './utm';

type EventProperties = Record<string, unknown>;

let initialized = false;

function withUTM(properties?: EventProperties): EventProperties {
  return {
    ...getUTMParams(),
    ...(properties || {}),
  };
}

export function initAnalytics() {
  if (initialized) return;

  console.info('[Analytics] initAnalytics() starting');

  initGA4();

  try {
    initPosthog();
  } catch (err) {
    console.error('[Analytics] PostHog init failed (GA4 still active):', err);
  }

  initialized = true;
}

export const analytics = {
  page(path: string, properties?: EventProperties) {
    const payload = withUTM(properties);
    captureEvent('page_view', { path, ...payload });
    trackGA4PageView(path);
  },

  capture(event: string, properties?: EventProperties) {
    const payload = withUTM(properties);
    captureEvent(event, payload);
    trackGA4Event(event, payload);
  },

  identify(userId: string, properties?: EventProperties) {
    identifyUser(userId, properties);
  },

  reset() {
    resetUser();
  },
};
