import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/onboarding');
    }
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

        <h1 className="text-lg font-medium mb-1">Create your account</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
          Set up your Flota Labs workspace in minutes.
        </p>

        {error && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Full name</label>
            <input
              type="text"
              required
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Mwangi"
            />
          </div>

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

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Confirm password</label>
            <input
              type="password"
              required
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1.5 disabled:opacity-60">
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-sm text-center mt-1" style={{ color: 'var(--color-ink-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-brand-blue)' }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}