import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

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

// Shown once, right after an invite link signs someone in automatically.
// Supabase doesn't prompt for a password on its own - without this step,
// an invited user would be left with no way to log back in later, since
// the invite link is single-use and by then already consumed.
function SetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) { setError(updateError.message); return; }
    onDone();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 w-full max-w-sm">
        <div
          className="w-8 h-8 rounded-lg shrink-0 mb-4"
          style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
        />
        <h1 className="text-lg font-medium mb-1">Set your password</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
          You're signed in from your invite — choose a password so you can log back in next time.
        </p>

        {error && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            className="input-field"
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="input-field"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="submit" disabled={submitting} className="btn-primary justify-center disabled:opacity-60">
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { session, loading, hasOrg, isSuspended, isSuperAdmin, needsPassword, clearNeedsPassword } = useAuth();

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

  // checked first - this must happen before anything else for a freshly
  // invited user, since they have no org yet and would otherwise just get
  // bounced straight to onboarding with no password ever set.
  if (needsPassword) {
    return <SetPasswordScreen onDone={clearNeedsPassword} />;
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