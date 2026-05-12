import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { VerifyOtpPage } from './pages/VerifyOtpPage.js';
import { AssignmentsPage } from './pages/AssignmentsPage.js';
import { RecordCollectionPage } from './pages/RecordCollectionPage.js';
import { CollectionsHistoryPage } from './pages/CollectionsHistoryPage.js';
import { WithdrawalsPage } from './pages/WithdrawalsPage.js';
import { NewWithdrawalPage } from './pages/NewWithdrawalPage.js';
import { AddThriftSaverPage } from './pages/AddThriftSaverPage.js';
import { ThriftSaverDetailsPage } from './pages/ThriftSaverDetailsPage.js';
import { DailyReportPage } from './pages/DailyReportPage.js';
import { KycUpdatePage } from './pages/KycUpdatePage.js';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route
        path="/login"
        element={<RequireGuest><LoginPage /></RequireGuest>}
      />
      <Route
        path="/verify-otp"
        element={<RequireGuest><VerifyOtpPage /></RequireGuest>}
      />

      {/* Protected routes */}
      <Route path="/" element={<RequireAuth><CollectionsHistoryPage /></RequireAuth>} />
      <Route path="/thrift-savers" element={<RequireAuth><AssignmentsPage /></RequireAuth>} />
      <Route
        path="/daily-report"
        element={<RequireAuth><DailyReportPage /></RequireAuth>}
      />
      <Route
        path="/thrift-savers/add"
        element={<RequireAuth><AddThriftSaverPage /></RequireAuth>}
      />
      <Route
        path="/thrift-savers/:memberId"
        element={<RequireAuth><ThriftSaverDetailsPage /></RequireAuth>}
      />
      <Route
        path="/kyc-update"
        element={<RequireAuth><KycUpdatePage /></RequireAuth>}
      />
      <Route
        path="/record-collection/:memberId"
        element={<RequireAuth><RecordCollectionPage /></RequireAuth>}
      />
      <Route
        path="/collections"
        element={<RequireAuth><CollectionsHistoryPage /></RequireAuth>}
      />
      <Route
        path="/withdrawals"
        element={<RequireAuth><WithdrawalsPage /></RequireAuth>}
      />
      <Route
        path="/withdrawals/new"
        element={<RequireAuth><NewWithdrawalPage /></RequireAuth>}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
