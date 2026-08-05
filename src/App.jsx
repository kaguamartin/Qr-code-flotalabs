import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, SuperAdminRoute } from './components/ProtectedRoute';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import LinksList from './pages/LinksList';
import LinkCreate from './pages/LinkCreate';
import LinkDetail from './pages/LinkDetail';
import BioBuilder from './pages/BioBuilder';
import TeamRoles from './pages/TeamRoles';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import PublicBioPage from './pages/PublicBioPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/p/:shortCode" element={<PublicBioPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />

        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="links" element={<LinksList />} />
          <Route path="links/new" element={<LinkCreate />} />
          <Route path="links/:id" element={<LinkDetail />} />
          <Route path="bio" element={<BioBuilder />} />
          <Route path="team" element={<TeamRoles />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}