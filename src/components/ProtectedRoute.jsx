import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function SuspendedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 w-full max-w-sm text-center">
        <div
          className="w-8 h-8 rounded-lg shrink-0 mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
        />
        <h1 className="text-lg font-medium mb-2">Access suspended</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          Your access to this workspace has been suspended. Please check with your organization admin for more information.
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { session, loading, hasOrg, isSuspended, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // check suspended before the onboarding fallback below - a suspended
  // member has no active org either, but "go create a workspace" is the
  // wrong message for someone who's been locked out of an existing one.
  if (isSuspended) {
    return <SuspendedScreen />;
  }

  // only redirect to onboarding once loading is complete
  // and we're certain the user has no org
  if (!hasOrg && !isSuperAdmin) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export function SuperAdminRoute({ children }) {
  const { session, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/app" replace />;
  }

  return children;
}