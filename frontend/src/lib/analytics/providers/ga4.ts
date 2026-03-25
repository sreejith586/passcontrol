declare global {
  interface Window {
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

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];

  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }

  window.gtag = gtag;

  window.gtag('js', new Date());
  window.gtag('config', measurementId);

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