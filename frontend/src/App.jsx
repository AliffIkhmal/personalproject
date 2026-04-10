import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import RecordDetailPage from './pages/RecordDetailPage';
import RegisterPage from './pages/RegisterPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ProfilePage from './pages/ProfilePage';
import AuditLogPage from './pages/AuditLogPage';
import TechniciansPage from './pages/TechniciansPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import RemindersPage from './pages/RemindersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ErrorPage from './pages/ErrorPage';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/record/:id" element={<RecordDetailPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/technicians" element={<TechniciansPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
