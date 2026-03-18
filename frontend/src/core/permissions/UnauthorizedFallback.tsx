import { Link } from 'react-router-dom';

export function UnauthorizedFallback() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-foreground">You don&apos;t have permission to view this page</h2>
      <p className="text-sm text-muted-foreground">
        Contact your administrator if you believe you should have access.
      </p>
      <Link
        to="/alerts"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Alerts
      </Link>
    </div>
  );
}
