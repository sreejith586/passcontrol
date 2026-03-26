import { useToast } from './useToast';
import { cn } from '@/lib/cn';

export function ToastContainer() {
  const { toast: t } = useToast();

  if (!t) return null;

  return (
    <div
      className={cn(
        'fixed right-4 z-[100] top-[max(calc(4rem+0.75rem),calc(env(safe-area-inset-top,0px)+0.75rem))] rounded-lg border px-4 py-3 shadow-lg bg-white dark:bg-slate-900',
        t.type === 'success' &&
          'border-green-600 text-green-900 dark:border-green-500 dark:text-green-100',
        t.type === 'error' && 'border-destructive text-destructive',
        t.type === 'info' &&
          'border-primary text-slate-900 dark:border-slate-300 dark:text-slate-100'
      )}
      role="alert"
    >
      {t.message}
    </div>
  );
}
