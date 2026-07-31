import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';

const LandingPage = lazy(() => import('../pages/LandingPage.jsx'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage.jsx'));
const CashierPage = lazy(() => import('../pages/CashierPage.jsx'));
const OwnerPortalPage = lazy(() => import('../pages/OwnerPortalPage.jsx'));
const ERROR_BOUNDARY_TEST_KEY = 'toub-error-boundary-test-triggered';

function ErrorBoundaryTestProbe() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const shouldThrow = new URLSearchParams(globalThis.location?.search).get('force-render-error') === 'true';
  if (shouldThrow && globalThis.sessionStorage?.getItem(ERROR_BOUNDARY_TEST_KEY) !== 'true') {
    throw new Error('Synthetic render failure for boundary verification');
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundaryTestProbe />
      <Router>
        <Suspense fallback={<LoadingState label="Loading TouB POS..." className="min-h-svh bg-brand-bg" />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/cashier"
              element={(
                <ProtectedRoute allowedRoles={['cashier']}>
                  <CashierPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/owner-portal"
              element={(
                <ProtectedRoute allowedRoles={['owner', 'manager']}>
                  <OwnerPortalPage />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
