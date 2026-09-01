import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading, hasOrg, isSuperAdmin, isInvited, membership, refreshMembership } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');

  async function handleCompleteProfile(e) {
  e.preventDefault();
  setSubmitting(true);
  setError('');

  const { error: nameError } = await supabase
    .from('users')
    .update({ full_name: fullName.trim() })
    .eq('id', user.id);

  if (nameError) { setError(nameError.message); setSubmitting(false); return; }

  await refreshMembership();
  navigate('/app', { replace: true });
}


useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (hasOrg && !isSuperAdmin) {
      navigate('/app', { replace: true });
      return;
    }
    if (isSuperAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    // invited users stay on onboarding to complete their profile
    if (isInvited) return;
  }, [loading, user, hasOrg, isSuperAdmin, isInvited, navigate]);

  function generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  function handleNameChange(e) {
    const name = e.target.value;
    setOrgName(name);
    setOrgSlug(generateSlug(name));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!orgName.trim()) {
      setError('Organisation name is required.');
      return;
    }
    if (!orgSlug.trim()) {
      setError('Slug is required.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.rpc('onboard_client_org', {
      org_name: orgName.trim(),
      org_slug: orgSlug.trim(),
      org_industry: industry.trim() || null,
      owner_user_id: user.id,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      await refreshMembership();
      navigate('/app', { replace: true });
    }
  }

  const industries = [
  // Consumer & Retail
  'FMCG', 'Retail', 'E-commerce', 'Fashion & Apparel', 'Food & Beverage', 'Supermarkets & Grocery',
  // Marketing & Media
  'Advertising & Marketing', 'Media & Entertainment', 'PR & Communications', 'Events & Experiential',
  // Financial Services
  'Banking', 'Insurance', 'Microfinance', 'Fintech', 'Investment & Wealth Management', 'Saccos & Cooperatives',
  // Technology
  'Telecom', 'Software & SaaS', 'Gaming', 'IT Services & Consulting',
  // Health & Wellness
  'Healthcare', 'Pharmaceuticals', 'Beauty & Personal Care', 'Fitness & Wellness',
  // Education
  'Education', 'Training & Coaching', 'EdTech',
  // Professional Services
  'Legal & Consulting', 'Accounting & Audit', 'Recruitment & HR',
  // Property & Infrastructure
  'Real Estate', 'Construction', 'Architecture & Design',
  // Transport & Logistics
  'Logistics & Transport', 'Automotive', 'Aviation',
  // Other Sectors
  'Agriculture & Agribusiness', 'Manufacturing', 'Energy & Utilities',
  'Hospitality & Tourism', 'Religious Organisations', 'NGO & Non-profit',
  'Government & Public Sector', 'Other',
];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }


// invited user — show profile completion form instead of org creation
if (isInvited) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
          <p className="text-sm font-medium">Flota Labs</p>
        </div>
        <h1 className="text-lg font-medium mb-1">You've been invited!</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
          You've been added to <span className="font-medium">{membership?.organizations?.name ?? 'a workspace'}</span>. Enter your name to get started.
        </p>
        {error && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleCompleteProfile} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Your full name</label>
            <input
              type="text"
              required
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="James Mwangi"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center mt-1.5 disabled:opacity-60">
            {submitting ? 'Setting up...' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  );
}

// regular org creation form — keep exactly as is


  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className="w-8 h-8 rounded-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
          />
          <p className="text-sm font-medium">Flota Labs</p>
        </div>

        <h1 className="text-lg font-medium mb-1">Set up your workspace</h1>
        <p className="text-sm mb-5" style={{ color: 'var(--color-ink-secondary)' }}>
          Tell us about your organisation — you can update these details later in Settings.
        </p>

        {error && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
              Organisation name
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={orgName}
              onChange={handleNameChange}
              placeholder="Bidco Africa"
            />
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
              Slug <span style={{ color: 'var(--color-ink-tertiary)' }}>— used in your short links</span>
            </label>
            <div className="flex">
              <span
                className="font-mono text-sm px-3 py-2 rounded-l-lg border border-r-0"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-canvas)', color: 'var(--color-ink-secondary)' }}
              >
                {SHORT_LINK_BASE_URL.replace('https://', '')}/
              </span>
              <input
                type="text"
                required
                className="input-field rounded-l-none flex-1"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="Bidco-africa"
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
              Industry <span style={{ color: 'var(--color-ink-tertiary)' }}>— optional</span>
            </label>
            <select
              className="input-field"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              <option value="">Select industry...</option>
              {industries.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center mt-1.5 disabled:opacity-60"
          >
            {submitting ? 'Creating workspace...' : 'Create workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}