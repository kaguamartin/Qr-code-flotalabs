import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';

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

function ReadOnlySection({ title, message }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-2">{title}</p>
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-secondary)' }}>
        {message}
      </p>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-9 h-5 rounded-full relative transition-colors shrink-0"
      style={{
        background: on ? 'var(--color-brand-blue)' : 'var(--color-canvas)',
        border: `1px solid ${on ? 'var(--color-brand-blue)' : 'var(--color-border)'}`,
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all"
        style={{ left: on ? 18 : 2, border: on ? 'none' : '1px solid var(--color-border)' }}
      />
    </button>
  );
}

function SaveBar({ saving, success, error, onSave }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-3 border-t mt-3" style={{ borderColor: 'var(--color-border)' }}>
      {success && (
        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success-fg)' }}>
          <Icons.CheckCircle size={13} /> Saved
        </span>
      )}
      {error && (
        <span className="text-xs" style={{ color: 'var(--color-danger-fg)' }}>{error}</span>
      )}
      <button onClick={onSave} disabled={saving} className="btn-primary text-xs h-8 disabled:opacity-60">
        {saving ? <><Icons.Loader size={12} className="animate-spin" /> Saving...</> : 'Save changes'}
      </button>
    </div>
  );
}

// ── GENERAL ──────────────────────────────────────────────
function GeneralSection({ org, onUpdate }) {
  const [orgName, setOrgName] = useState(org?.name ?? '');
  const [industry, setIndustry] = useState(org?.industry ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  

  useEffect(() => {
    setOrgName(org?.name ?? '');
    setIndustry(org?.industry ?? '');
  }, [org]);

  async function save() {
    setSaving(true); setError(''); setSuccess(false);
    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName.trim(), industry: industry || null })
      .eq('id', org.id);
    setSaving(false);
    if (error) { setError(error.message); }
    else { setSuccess(true); onUpdate({ name: orgName.trim(), industry }); setTimeout(() => setSuccess(false), 2000); }
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-4">General</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Workspace name</label>
          <input className="input-field" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Industry</label>
          <select className="input-field" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">Select industry...</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Default link domain</label>
        <select className="input-field max-w-60">
          <option>{SHORT_LINK_BASE_URL.replace('https://', '')}</option>
          <option>Custom domain (Pro)</option>
        </select>
      </div>
      <SaveBar saving={saving} success={success} error={error} onSave={save} />
    </div>
  );
}

// ── BRANDING ─────────────────────────────────────────────
function BrandingSection({ org, onUpdate }) {
  const [primaryColor, setPrimaryColor] = useState(org?.primary_color ?? '#9d16f1');
  const [qrStyle, setQrStyle] = useState(org?.qr_style ?? 'classic');
  const [logoUrl, setLogoUrl] = useState(org?.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPrimaryColor(org?.primary_color ?? '#9d16f1');
    setQrStyle(org?.qr_style ?? 'classic');
    setLogoUrl(org?.logo_url ?? null);
  }, [org]);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) {
      setError('Only JPG, PNG, WebP or SVG images are supported.');
      return;
    }

    setUploading(true);
    setError('');

    const fileName = `org-${org.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) { setError(uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl + '?t=' + Date.now();

    await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', org.id);
    setLogoUrl(publicUrl);
    onUpdate({ logo_url: publicUrl });
    setUploading(false);
  }

  async function save() {
    setSaving(true); setError(''); setSuccess(false);
    const { error } = await supabase
      .from('organizations')
      .update({ primary_color: primaryColor, qr_style: qrStyle })
      .eq('id', org.id);
    setSaving(false);
    if (error) { setError(error.message); }
    else { setSuccess(true); onUpdate({ primary_color: primaryColor, qr_style: qrStyle }); setTimeout(() => setSuccess(false), 2000); }
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-4">Branding</p>

      {/* logo upload */}
      <div className="mb-4">
        <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>Organisation logo</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            {logoUrl ? (
              <img
                src={logoUrl}
                className="w-14 h-14 rounded-xl object-contain border"
                style={{ borderColor: 'var(--color-border)' }}
                alt="Logo"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, var(--color-brand-blue))` }}
              >
                {org?.name?.charAt(0)?.toUpperCase() ?? 'F'}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <Icons.Loader size={16} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <label className="btn-secondary text-xs h-8 cursor-pointer flex items-center gap-1.5">
              <Icons.Upload size={13} />
              {uploading ? 'Uploading...' : 'Upload logo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
            </label>
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
              JPG, PNG, WebP or SVG · Max 2MB · Recommended 200×200px
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Primary color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-9 h-9 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--color-border)', padding: 2 }}
            />
            <input
              className="input-field font-mono text-xs flex-1"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#9d16f1"
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>Used on QR codes and bio pages.</p>
        </div>
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Default QR style</label>
          <select className="input-field" value={qrStyle} onChange={(e) => setQrStyle(e.target.value)}>
            <option value="classic">Classic squares</option>
            <option value="rounded">Rounded dots</option>
            <option value="branded">Branded (with logo)</option>
          </select>
        </div>
      </div>

      {error && <p className="text-xs mb-2" style={{ color: 'var(--color-danger-fg)' }}>{error}</p>}
      <SaveBar saving={saving} success={success} error="" onSave={save} />
    </div>
  );
}

// ── PROFILE ───────────────────────────────────────────────
function ProfileSection({ profile }) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setError('Only JPG, PNG or WebP images are supported.');
      return;
    }

    setUploading(true);
    setError('');

    const fileName = `${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) { setError(uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl + '?t=' + Date.now();

    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', profile.id);
    setAvatarUrl(publicUrl);
    setUploading(false);
  }

  async function save() {
    setSaving(true); setError(''); setSuccess(false);
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { setError(error.message); }
    else { setSuccess(true); setTimeout(() => setSuccess(false), 2000); }
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-4">Profile</p>

      {/* avatar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              className="w-14 h-14 rounded-full object-cover"
              alt="Avatar"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
            >
              {fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <Icons.Loader size={16} className="animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <label className="btn-secondary text-xs h-8 cursor-pointer flex items-center gap-1.5">
            <Icons.Upload size={13} />
            {uploading ? 'Uploading...' : 'Upload photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </label>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
            JPG, PNG or WebP · Max 2MB · Recommended 200×200px
          </p>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Full name</label>
        <input
          className="input-field"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
        />
      </div>

      <div className="mb-3">
        <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Email address</label>
        <input
          className="input-field"
          value={profile?.email ?? ''}
          disabled
          style={{ opacity: 0.6 }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
          Email changes require re-authentication. Contact support.
        </p>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: 'var(--color-danger-fg)' }}>{error}</p>
      )}

      <SaveBar saving={saving} success={success} error="" onSave={save} />
    </div>
  );
}
// ── SECURITY ──────────────────────────────────────────────
function SecuritySection({ signOut }) {
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('4 hours');

  async function handleChangePassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(
      (await supabase.auth.getUser()).data.user?.email ?? '',
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    if (!error) alert('Password reset email sent. Check your inbox.');
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-4">Security</p>

      <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-sm">Two-factor authentication</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>Require 2FA for all workspace members. Coming soon.</p>
        </div>
        <Toggle on={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
      </div>

      <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-sm">Session timeout</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>Auto sign-out after inactivity.</p>
        </div>
        <select className="input-field w-28 h-8 text-xs" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
          <option>4 hours</option>
          <option>8 hours</option>
          <option>24 hours</option>
        </select>
      </div>

      <div className="flex justify-between items-center py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-sm">Change password</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>Send a password reset link to your email.</p>
        </div>
        <button onClick={handleChangePassword} className="btn-secondary text-xs h-8">Send reset link</button>
      </div>

      <div className="flex justify-between items-center py-3">
        <div>
          <p className="text-sm">Sign out</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>Sign out of your account on this device.</p>
        </div>
        <button onClick={signOut} className="btn-secondary text-xs h-8" style={{ color: 'var(--color-danger-fg)' }}>Sign out</button>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────
function NotificationsSection({ profile }) {
  const [prefs, setPrefs] = useState({
    notification_scan_milestones: profile?.notification_scan_milestones ?? true,
    notification_weekly_summary: profile?.notification_weekly_summary ?? true,
    notification_team_changes: profile?.notification_team_changes ?? false,
    notification_link_expiring: profile?.notification_link_expiring ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const labels = [
    { key: 'notification_scan_milestones', label: 'New scan milestones (every 1,000 scans)' },
    { key: 'notification_weekly_summary',  label: 'Weekly performance summary email' },
    { key: 'notification_team_changes',    label: 'Team member joins or leaves' },
    { key: 'notification_link_expiring',   label: 'Link expiring soon' },
  ];

  async function save() {
    setSaving(true);
    await supabase.from('users').update(prefs).eq('id', profile.id);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-1">Notifications</p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
        Choose which email notifications you receive.
      </p>
      <div className="flex flex-col gap-3 mb-4">
        {labels.map(({ key, label }) => (
          <div key={key} className="flex justify-between items-center gap-4">
            <span className="text-sm">{label}</span>
            <Toggle
              on={prefs[key]}
              onChange={() => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))}
            />
          </div>
        ))}
      </div>
      <SaveBar saving={saving} success={success} error="" onSave={save} />
    </div>
  );
}

// ── DOMAINS ───────────────────────────────────────────────
function DomainsSection({ org }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-1">Custom domains</p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
        Use your own domain for short links instead of {SHORT_LINK_BASE_URL.replace('https://', '')}.
      </p>
      <div className="rounded-xl border border-dashed p-4 flex items-center justify-between" style={{ borderColor: 'var(--color-border-strong)' }}>
        <div className="flex items-center gap-2.5">
          <Icons.Globe size={18} style={{ color: 'var(--color-ink-tertiary)' }} />
          <div>
            <p className="text-sm font-medium">Custom domain</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Currently using {SHORT_LINK_BASE_URL.replace('https://', '')}</p>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-fg)' }}>Pro</span>
      </div>
    </div>
  );
}

// ── BILLING ───────────────────────────────────────────────
function BillingSection() {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium mb-1">Billing & plans</p>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
        Manage your subscription and billing details.
      </p>
      <div
        className="rounded-2xl border border-dashed p-5 flex justify-between items-center"
        style={{ borderColor: 'var(--color-border-strong)', background: 'repeating-linear-gradient(45deg, var(--color-canvas), var(--color-canvas) 10px, white 10px, white 20px)' }}
      >
        <div className="flex items-center gap-2.5">
          <Icons.CreditCard size={18} style={{ color: 'var(--color-ink-tertiary)' }} />
          <div>
            <p className="text-sm font-medium">Billing & plans</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Not yet built — coming soon.</p>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-fg)' }}>TODO</span>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
const NAV_TOP = [
  { key: 'general',       icon: 'Settings2',   label: 'General' },
  { key: 'branding',      icon: 'Palette',      label: 'Branding' },
  { key: 'domains',       icon: 'Globe2',       label: 'Domains' },
  { key: 'notifications', icon: 'Bell',         label: 'Notifications' },
];
const NAV_BOTTOM = [
  { key: 'profile',  icon: 'User',        label: 'Profile' },
  { key: 'security', icon: 'ShieldCheck', label: 'Security' },
  { key: 'billing',  icon: 'CreditCard',  label: 'Billing & plans' },
];

export default function Settings() {
  const { profile, membership, signOut, can } = useAuth();
  const [org, setOrg] = useState(membership?.organizations ?? null);
  const [activeSection, setActiveSection] = useState(membership?.organizations ? 'general' : 'profile');

  useEffect(() => {
    setOrg(membership?.organizations ?? null);
  }, [membership]);

  function handleOrgUpdate(updates) {
    setOrg((prev) => ({ ...prev, ...updates }));
  }

  function renderSection() {
  switch (activeSection) {
    case 'general':       return can('workspace.edit_branding') 
                            ? <GeneralSection org={org} onUpdate={handleOrgUpdate} />
                            : <ReadOnlySection title="General" message="You don't have permission to edit workspace settings." />;
    case 'branding':      return can('workspace.edit_branding')
                            ? <BrandingSection org={org} onUpdate={handleOrgUpdate} />
                            : <ReadOnlySection title="Branding" message="You don't have permission to edit branding." />;
    case 'domains':       return <DomainsSection org={org} />;
    case 'notifications': return <NotificationsSection profile={profile} />;
    case 'profile':       return <ProfileSection profile={profile} />;
    case 'security':      return <SecuritySection signOut={signOut} />;
    case 'billing':       return <BillingSection />;
    default:              return <GeneralSection org={org} onUpdate={handleOrgUpdate} />;
  }
}
  function NavItem({ item }) {
    const Icon = Icons[item.icon] ?? Icons.Circle;
    const active = activeSection === item.key;
    return (
      <button
        onClick={() => setActiveSection(item.key)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
        style={active ? { background: 'var(--color-info-bg)', color: 'var(--color-info-fg)' } : { color: 'var(--color-ink-secondary)' }}
      >
        <Icon size={14} />
        <span className="flex-1">{item.label}</span>
      </button>
    );
  }

  return (
    <div className="flex gap-6">
      {/* sidebar nav */}
      <div className="w-44 shrink-0">
        {org && (
          <>
            <p className="text-xs uppercase tracking-wide mb-2 px-2" style={{ color: 'var(--color-ink-tertiary)' }}>Workspace</p>
            <div className="flex flex-col gap-0.5 mb-4">
              {NAV_TOP.map((item) => <NavItem key={item.key} item={item} />)}
            </div>
          </>
        )}
        <p className="text-xs uppercase tracking-wide mb-2 px-2" style={{ color: 'var(--color-ink-tertiary)' }}>Account</p>
        <div className="flex flex-col gap-0.5">
          {NAV_BOTTOM.map((item) => <NavItem key={item.key} item={item} />)}
        </div>
      </div>

      {/* section content */}
      <div className="flex-1 max-w-2xl">
        {renderSection()}
      </div>
    </div>
  );
}