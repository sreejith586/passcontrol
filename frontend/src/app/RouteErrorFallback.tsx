import { useRouteError, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';

export function RouteErrorFallback() {
  useRouteError(); // Required for error boundary - consumed but not displayed to users
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-8 shadow-sm text-center">
        <h1 className="mb-2 text-xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again or return to the home page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Go back
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/alerts')}
          >
            Go to home
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
