import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ProtectedRoute, RoleGuard, ExcludedRoleGuard } from './components/ProtectedRoute.js';
import { Layout } from './components/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { CollectionsPage } from './pages/CollectionsPage.js';
import { WithdrawalsPage } from './pages/WithdrawalsPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { ReconciliationPage } from './pages/ReconciliationPage.js';
import { MembersPage } from './pages/MembersPage.js';
import { TsosPage } from './pages/TsosPage.js';
import { UserManagementPage } from './pages/UserManagementPage.js';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'tso-performance',
            element: (
              <ExcludedRoleGuard excludedRoles={['CSM']}>
                <TsosPage />
              </ExcludedRoleGuard>
            ),
          },
          { path: 'members', element: <MembersPage /> },
          { path: 'collections', element: <CollectionsPage /> },
          { path: 'withdrawals', element: <WithdrawalsPage /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'reconciliation', element: <ReconciliationPage /> },
          {
            path: 'user-management',
            element: (
              <RoleGuard requiredRole="SuperAdmin">
                <UserManagementPage />
              </RoleGuard>
            ),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
