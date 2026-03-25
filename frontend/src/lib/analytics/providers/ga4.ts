declare global {
  interface Window {
    /** gtag command queue; each entry is a command + arguments array. */
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initGA4() {
  const measurementId = import.meta.env.VITE_GA4_ID;
  if (!measurementId) {
    console.warn('GA4 not configured');
    return;
  }

  if (initialized) return;

  window.dataLayer = window.dataLayer || [];

  const queueCmd = (...args: unknown[]) => {
    window.dataLayer.push(args);
  };

  window.gtag = queueCmd as (...args: unknown[]) => void;

  queueCmd('js', new Date());
  queueCmd('config', measurementId, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  initialized = true;
}

export function trackPageView(path: string) {
  if (!window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
  });
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (!window.gtag) return;
  window.gtag('event', event, params);
}
