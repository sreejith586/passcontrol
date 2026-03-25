declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: unknown[];
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

  const dataLayer = (window.dataLayer = window.dataLayer ?? []);
  function gtag(...args: any[]) {
    dataLayer.push(args);
  }

  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId);

  initialized = true;
}

export function trackPageView(path: string) {
  if (!window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
  });
}

export function trackEvent(event: string, params?: Record<string, any>) {
  if (!window.gtag) return;
  window.gtag('event', event, params);
}
