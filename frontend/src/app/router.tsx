import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { AuthGuard } from '@/core/auth/auth-guard';
import { RoutePermissionGuard } from '@/core/permissions/RoutePermissionGuard';
import { AppShell } from '@/features/shell/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { AlertListPage } from '@/features/alerts/AlertListPage';
import { AlertDetailPage } from '@/features/alerts/AlertDetailPage';
import { EscalationsPage } from '@/features/escalations/EscalationsPage';
import { AlertWorkflowSettingsPage } from '@/features/organization-settings/AlertWorkflowSettingsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/alerts" replace /> },
      {
        path: 'dashboard',
        element: (
          <RoutePermissionGuard>
            <DashboardPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'alerts',
        element: (
          <RoutePermissionGuard>
            <AlertListPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'alerts/:id',
        element: (
          <RoutePermissionGuard>
            <AlertDetailPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'escalations',
        element: (
          <RoutePermissionGuard>
            <EscalationsPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="/settings/alert-workflow" replace /> },
          {
            path: 'alert-workflow',
            element: (
              <RoutePermissionGuard>
                <AlertWorkflowSettingsPage />
              </RoutePermissionGuard>
            ),
          },
        ],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
