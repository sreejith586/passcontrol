declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function initGA4() {
  const measurementId = import.meta.env.VITE_GA4_ID;

  if (!measurementId) {
    console.warn('GA4 not configured');
    return;
  }

  if (!window.gtag) {
    console.warn('GA4 gtag not available');
    return;
  }

  window.gtag('js', new Date());

  window.gtag('config', measurementId, {
    send_page_view: false,
  });
}

export function trackPageView(path: string) {
  const measurementId = import.meta.env.VITE_GA4_ID;
  if (!measurementId || !window.gtag) return;

  const pagePath = path.startsWith('/') ? path : `/${path}`;

  window.gtag('config', measurementId, {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  });
}

export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (!window.gtag) return;
  window.gtag('event', event, params);
}
