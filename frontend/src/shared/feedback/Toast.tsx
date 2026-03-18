import { useToast } from './useToast';
import { cn } from '@/lib/cn';

export function ToastContainer() {
  const { toast: t } = useToast();

  if (!t) return null;

  return (
    <div
      className={cn(
        'fixed right-4 top-4 z-[100] rounded-lg border px-4 py-3 shadow-lg',
        t.type === 'success' && 'border-green-500/50 bg-green-500/10 text-green-800 dark:text-green-200',
        t.type === 'error' && 'border-destructive/50 bg-destructive/10 text-destructive',
        t.type === 'info' && 'border-primary/50 bg-primary/10 text-primary'
      )}
      role="alert"
    >
      {t.message}
    </div>
  );
}
