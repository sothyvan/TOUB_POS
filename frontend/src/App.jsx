import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import CashierPage from './pages/CashierPage.jsx';
import AdminPortalPage from './pages/AdminPortalPage.jsx';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Router>
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
            path="/admin-portal"
            element={(
              <ProtectedRoute allowedRoles={['owner', 'manager']}>
                <AdminPortalPage />
              </ProtectedRoute>
            )}
          />
          {/* Fallback to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
