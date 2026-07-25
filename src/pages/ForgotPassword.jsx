import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await requestPasswordReset(email);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-8 h-8 rounded-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
          />
          <p className="text-sm font-medium">Flota Labs</p>
        </div>

        {sent ? (
          <>
            <h1 className="text-lg font-medium mb-1">Check your email</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
              If an account exists for <span className="font-medium">{email}</span>, we've sent a link to reset your password.
            </p>
            <Link to="/login" className="text-sm" style={{ color: 'var(--color-brand-blue)' }}>
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-lg font-medium mb-1">Reset your password</h1>
            <p className="text-sm mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
              Enter your email and we'll send you a reset link.
            </p>

            {error && (
              <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Email</label>
                <input
                  type="email"
                  required
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.co.ke"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1.5 disabled:opacity-60">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <Link to="/login" className="text-sm text-center mt-1" style={{ color: 'var(--color-ink-secondary)' }}>
                Back to sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}