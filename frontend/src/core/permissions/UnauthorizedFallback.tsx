import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/auth-context';
import { getFirstAccessibleRoute } from './permission-map';
import { Button } from '@/shared/ui/Button';

export function UnauthorizedFallback() {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const fallbackRoute = getFirstAccessibleRoute(permissions);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold text-foreground">You don&apos;t have permission to view this page</h2>
      <p className="text-sm text-muted-foreground">
        Contact your administrator if you believe you should have access.
      </p>
      {fallbackRoute ? (
        <Link
          to={fallbackRoute}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to allowed page
        </Link>
      ) : (
        <Button variant="primary" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
      )}
    </div>
  );
}
