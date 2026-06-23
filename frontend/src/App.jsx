import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import CashierPage from './pages/CashierPage.jsx';
import AdminPortalPage from './pages/AdminPortalPage.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cashier" element={<CashierPage />} />
        <Route path="/admin-portal" element={<AdminPortalPage />} />
        {/* Fallback to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}