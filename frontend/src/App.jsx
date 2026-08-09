import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Public Pages
import Home from './pages/Home';
import SubmitClaim from './pages/SubmitClaim';
import StaffDashboard from './pages/StaffDashboard';

// Auth Pages
import AdminLogin from './pages/auth/AdminLogin';
import StaffLogin from './pages/auth/StaffLogin';
import StaffRegister from './pages/auth/StaffRegister';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import ClaimsList from './pages/admin/ClaimsList';
import ClaimDetail from './pages/admin/ClaimDetail';
import UsersList from './pages/admin/UsersList';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/claim" element={<SubmitClaim />} />
          <Route path="/dashboard" element={<StaffDashboard />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/login" element={<StaffLogin />} />
          <Route path="/register" element={<StaffRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="claims" element={<ClaimsList />} />
          <Route path="claim/:id" element={<ClaimDetail />} />
          <Route path="users" element={<UsersList />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
