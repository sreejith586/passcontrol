export type UTMParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

const STORAGE_KEY = 'utm_params';

export function captureUTMParams() {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);

  const utm: UTMParams = {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };

  const hasAny = Object.values(utm).some(Boolean);
  if (hasAny) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  }
}

export function getUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as UTMParams;
  } catch {
    return {};
  }
}

export function clearUTMParams() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
