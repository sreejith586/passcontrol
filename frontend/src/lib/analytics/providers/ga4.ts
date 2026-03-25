declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;
/** Set only after a successful init so SPA page views can issue follow-up `config` commands. */
let gaMeasurementId: string | null = null;

export function initGA4() {
  const raw = import.meta.env.VITE_GA4_ID;
  const measurementId = typeof raw === 'string' ? raw.trim() : '';
  if (!measurementId) {
    console.warn('GA4 not configured');
    return;
  }

  if (initialized) return;

  window.dataLayer = window.dataLayer || [];

  // Official gtag snippet shape: `dataLayer.push(arguments)` (see Google gtag.js install guide).
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  } as Window['gtag'];

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  gaMeasurementId = measurementId;
  initialized = true;
}

/**
 * SPA navigations: GA4 expects a `config` update with `page_path` / `page_location` so hits
 * are tied to the tag (avoids “deferred until config” in Tag Assistant / Realtime).
 */
export function trackPageView(path: string) {
  if (!window.gtag || !gaMeasurementId) return;
  const pagePath = path.startsWith('/') ? path : `/${path}`;
  window.gtag('config', gaMeasurementId, {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
    send_page_view: true,
  });
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (!window.gtag || !gaMeasurementId) return;
  window.gtag('event', event, params);
}
