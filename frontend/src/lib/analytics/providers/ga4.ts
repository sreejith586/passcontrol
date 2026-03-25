declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** DevTools: filter `[GA4]` while debugging (logs are mostly DEV-only below). */
const LOG_PREFIX = '[GA4]';

function gaDebug(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(LOG_PREFIX, ...args);
  }
}

function gaDevWarn(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(LOG_PREFIX, ...args);
  }
}

let initialized = false;
/** Set only after a successful init so SPA page views can issue follow-up `config` commands. */
let gaMeasurementId: string | null = null;

export function initGA4() {
  const raw = import.meta.env.VITE_GA4_ID;
  const measurementId = typeof raw === 'string' ? raw.trim() : '';

  gaDebug(
    'initGA4: VITE_GA4_ID from import.meta.env =',
    raw === undefined || raw === ''
      ? `(empty/undefined, typeof ${typeof raw})`
      : `"${String(raw).slice(0, 12)}${String(raw).length > 12 ? '…' : ''}"`
  );

  if (!measurementId) {
    console.warn(
      LOG_PREFIX,
      'GA4 not configured — no measurement ID after trim. Events and page views will no-op.'
    );
    return;
  }

  if (initialized) {
    gaDebug('initGA4: already initialized, skipping');
    return;
  }

  window.dataLayer = window.dataLayer || [];

  // Official gtag snippet shape: `dataLayer.push(arguments)` (see Google gtag.js install guide).
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  } as Window['gtag'];

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  gaDebug(
    'Queued gtag commands; dataLayer.length =',
    window.dataLayer.length,
    '(expect >= 2: js + config). measurementId =',
    measurementId
  );

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;

  script.onload = () => {
    gaDebug('gtag/js script loaded OK:', script.src);
    gaDebug('dataLayer snapshot (length)', window.dataLayer.length, window.dataLayer);
  };

  script.onerror = () => {
    console.error(
      LOG_PREFIX,
      'gtag/js script FAILED to load (blocked network, CSP, ad blocker, or bad URL?).',
      script.src
    );
  };

  document.head.appendChild(script);
  gaDebug('Injected gtag script tag into <head>');

  gaMeasurementId = measurementId;
  initialized = true;
  gaDebug('initGA4 finished; window.gtag typeof =', typeof window.gtag);
}

/**
 * SPA navigations: GA4 expects a `config` update with `page_path` / `page_location` so hits
 * are tied to the tag (avoids “deferred until config” in Tag Assistant / Realtime).
 */
export function trackPageView(path: string) {
  if (!window.gtag) {
    gaDevWarn('trackPageView skipped: window.gtag is missing (init not run or failed)');
    return;
  }
  if (!gaMeasurementId) {
    gaDevWarn('trackPageView skipped: gaMeasurementId is null');
    return;
  }

  const pagePath = path.startsWith('/') ? path : `/${path}`;
  const payload = {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  };
  gaDebug('trackPageView -> gtag(config)', { measurementId: gaMeasurementId, ...payload });

  window.gtag('config', gaMeasurementId, payload);
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (!window.gtag) {
    gaDevWarn(`trackEvent "${event}" skipped: window.gtag missing`);
    return;
  }
  if (!gaMeasurementId) {
    gaDevWarn(`trackEvent "${event}" skipped: gaMeasurementId is null`);
    return;
  }

  gaDebug('trackEvent -> gtag(event)', event, params ?? {});
  window.gtag('event', event, params);
}
