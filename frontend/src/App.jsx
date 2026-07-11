import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoadingState from './components/ui/LoadingState.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const CashierPage = lazy(() => import('./pages/CashierPage.jsx'));
const OwnerPortalPage = lazy(() => import('./pages/OwnerPortalPage.jsx'));

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingState label="Loading TouB POS..." className="min-h-svh bg-brand-bg" />}>
          <Routes>
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
