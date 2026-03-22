import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { AuthGuard } from '@/core/auth/auth-guard';
import { RoutePermissionGuard } from '@/core/permissions/RoutePermissionGuard';
import { RouteErrorFallback } from '@/app/RouteErrorFallback';
import { AppShell } from '@/features/shell/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { SetPasswordPage } from '@/features/auth/SetPasswordPage';
import { AlertListPage } from '@/features/alerts/AlertListPage';
import { AlertDetailPage } from '@/features/alerts/AlertDetailPage';
import { EscalationsPage } from '@/features/escalations/EscalationsPage';
import { OrganizationSettingsPage } from '@/features/organization-settings/OrganizationSettingsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ChecklistRunsListPage } from '@/features/checklist-runs/ChecklistRunsListPage';
import { ChecklistRunDetailPage } from '@/features/checklist-runs/ChecklistRunDetailPage';
import { ChecklistTemplatesListPage } from '@/features/checklist-templates/ChecklistTemplatesListPage';
import { ChecklistTemplateEditorPage } from '@/features/checklist-templates/ChecklistTemplateEditorPage';
import { ChecklistSchedulesListPage } from '@/features/checklist-schedules/ChecklistSchedulesListPage';
import { ChecklistScheduleEditorPage } from '@/features/checklist-schedules/ChecklistScheduleEditorPage';
import { BrandsListPage } from '@/features/brands/BrandsListPage';
import { LocationsListPage } from '@/features/locations/LocationsListPage';
import { ZonesListPage } from '@/features/zones/ZonesListPage';
import { UsersPage } from '@/features/users/UsersPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { ReportsPage } from '@/features/reports/ReportsPage';

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
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <RoutePermissionGuard>
            <DashboardPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'checklist-runs',
        element: (
          <RoutePermissionGuard>
            <ChecklistRunsListPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'checklist-runs/:id',
        element: (
          <RoutePermissionGuard>
            <ChecklistRunDetailPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'checklist-templates',
        element: (
          <RoutePermissionGuard>
            <ChecklistTemplatesListPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'checklist-templates/:id',
        element: (
          <RoutePermissionGuard>
            <ChecklistTemplateEditorPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'checklist-schedules',
        element: (
          <RoutePermissionGuard>
            <ChecklistSchedulesListPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'checklist-schedules/:id',
        element: (
          <RoutePermissionGuard>
            <ChecklistScheduleEditorPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'brands',
        element: (
          <RoutePermissionGuard>
            <BrandsListPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'locations',
        element: (
          <RoutePermissionGuard>
            <LocationsListPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'zones',
        element: (
          <RoutePermissionGuard>
            <ZonesListPage />
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
        path: 'reports',
        element: (
          <RoutePermissionGuard>
            <ReportsPage />
          </RoutePermissionGuard>
        ),
      },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="/settings/organization" replace /> },
          {
            path: 'organization',
            element: (
              <RoutePermissionGuard>
                <OrganizationSettingsPage />
              </RoutePermissionGuard>
            ),
          },
          {
            path: 'regional',
            element: <Navigate to="/settings/organization" replace />,
          },
          {
            path: 'alert-workflow',
            element: <Navigate to="/settings/organization" replace />,
          },
          {
            path: 'users',
            element: (
              <RoutePermissionGuard>
                <UsersPage />
              </RoutePermissionGuard>
            ),
          },
          {
            path: 'roles',
            element: (
              <RoutePermissionGuard>
                <RolesPage />
              </RoutePermissionGuard>
            ),
          },
        ],
      },
    ],
  },
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorFallback /> },
  { path: '/set-password', element: <SetPasswordPage />, errorElement: <RouteErrorFallback /> },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorFallback /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
