import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

const listeners: Array<(t: ToastState | null) => void> = [];
let toastId = 0;
let currentToast: ToastState | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: ToastType) {
  if (hideTimeout) clearTimeout(hideTimeout);
  currentToast = { message, type, id: ++toastId };
  listeners.forEach((fn) => fn(currentToast));
  hideTimeout = setTimeout(() => {
    currentToast = null;
    listeners.forEach((fn) => fn(null));
    hideTimeout = null;
  }, 4000);
}

export const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
};

export function useToast() {
  const [state, setState] = useState<ToastState | null>(currentToast);

  useEffect(() => {
    const listener = (t: ToastState | null) => setState(t);
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);

  return { toast: state, ...toast };
}
