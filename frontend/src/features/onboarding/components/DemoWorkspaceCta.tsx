import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface DemoWorkspaceCtaProps {
  disabled?: boolean;
  loading?: boolean;
  onLoadDemo: () => void;
}

export function DemoWorkspaceCta({
  disabled,
  loading,
  onLoadDemo,
}: DemoWorkspaceCtaProps) {
  return (
    <Card
      variant="soft"
      className="border border-dashed border-slate-300 bg-slate-50/80 p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">
            Prefer to explore first?
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Load a sample workspace to see templates, schedules, runs, and alerts instantly.
            You can still follow the steps below to build your own setup.
          </p>
        </div>
        <div className="shrink-0 sm:pt-0.5">
          <Button
            type="button"
            variant="secondary"
            className="w-full whitespace-nowrap sm:w-auto"
            disabled={disabled || loading}
            aria-busy={loading}
            onClick={onLoadDemo}
          >
            {loading ? 'Loading…' : 'Load demo workspace'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
