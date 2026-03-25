import posthog from 'posthog-js';

let initialized = false;

export function initPosthog() {
  if (initialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;

  if (!key || !host) {
    console.warn('PostHog not configured');
    return;
  }

  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // we will control manually
  });

  initialized = true;
}

export function captureEvent(event: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

export function resetUser() {
  posthog.reset();
}
