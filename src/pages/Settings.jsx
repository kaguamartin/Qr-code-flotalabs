import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const navTop = [
  { icon: 'Settings2', label: 'General', active: true },
  { icon: 'Palette', label: 'Branding' },
  { icon: 'Globe2', label: 'Domains' },
  { icon: 'Users', label: 'Team & roles' },
  { icon: 'Plug', label: 'Integrations' },
  { icon: 'Bell', label: 'Notifications' },
];
const navBottom = [
  { icon: 'User', label: 'Profile' },
  { icon: 'ShieldCheck', label: 'Security' },
  { icon: 'CreditCard', label: 'Billing & plans', todo: true },
];

const industries = [
  'FMCG', 'Banking', 'Telecom', 'Finance', 'Education',
  'Gaming', 'Retail', 'Healthcare', 'Hospitality', 'Other',
];

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      className="w-9 h-5 rounded-full relative transition-colors"
      style={{ background: on ? 'var(--color-brand-blue)' : 'var(--color-canvas)', border: `1px solid ${on ? 'var(--color-brand-blue)' : 'var(--color-border)'}` }}
    >
      <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: on ? 18 : 2, border: on ? 'none' : '1px solid var(--color-border)' }} />
    </button>
  );
}

export default function Settings() {
  const { membership } = useAuth();
  const org = membership?.organizations;
  const orgId = org?.id;

  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notifs, setNotifs] = useState([true, true, false, false]);

  const notifLabels = [
    'New scan milestones (every 1,000 scans)',
    'Weekly performance summary email',
    'Team member joins or leaves',
    'Link expiring soon',
  ];

  useEffect(() => {
    if (!org) return;
    setOrgName(org.name ?? '');
    setIndustry(org.industry ?? '');
  }, [org]);

  async function handleSaveGeneral(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName.trim(), industry: industry || null })
      .eq('id', orgId);

    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="flex gap-6">
      <div className="w-44 shrink-0">
        <p className="text-xs uppercase tracking-wide mb-2 px-2" style={{ color: 'var(--color-ink-tertiary)' }}>Workspace</p>
        <div className="flex flex-col gap-0.5 mb-4">
          {navTop.map((item) => {
            const Icon = Icons[item.icon] ?? Icons.Circle;
            return (
              <div key={item.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer" style={item.active ? { background: 'var(--color-info-bg)', color: 'var(--color-info-fg)' } : { color: 'var(--color-ink-secondary)' }}>
                <Icon size={14} /> {item.label}
              </div>
            );
          })}
        </div>
        <p className="text-xs uppercase tracking-wide mb-2 px-2" style={{ color: 'var(--color-ink-tertiary)' }}>Account</p>
        <div className="flex flex-col gap-0.5">
          {navBottom.map((item) => {
            const Icon = Icons[item.icon] ?? Icons.Circle;
            return (
              <div key={item.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer" style={{ color: 'var(--color-ink-secondary)' }}>
                <Icon size={14} /> <span className="flex-1">{item.label}</span>
                {item.todo && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-fg)' }}>TODO</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-2xl">
        <form onSubmit={handleSaveGeneral} className="card p-5">
          <div className="flex items-center justify-between mb-3.5">
            <p className="text-sm font-medium">General</p>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs" style={{ color: 'var(--color-success-fg)' }}>✓ Saved</span>
              )}
              {saveError && (
                <span className="text-xs" style={{ color: 'var(--color-danger-fg)' }}>{saveError}</span>
              )}
              <button type="submit" disabled={saving} className="btn-primary text-xs h-8 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Workspace name</label>
              <input
                className="input-field"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Industry</label>
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
          </div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Default link domain</label>
          <select className="input-field max-w-60">
            <option>flota.ke</option>
            <option>Custom domain (Pro)</option>
          </select>
        </form>

        <div className="card p-5">
          <p className="text-sm font-medium mb-3.5">Branding</p>
          <div className="flex gap-3.5 items-center mb-3.5">
            <div className="w-12 h-12 rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
            <button className="btn-secondary text-xs h-8">Upload logo</button>
          </div>
          <div className="flex gap-3.5">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Primary color</label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md border" style={{ background: 'var(--color-brand-purple)', borderColor: 'var(--color-border)' }} />
                <input className="input-field font-mono text-xs w-24" defaultValue="#9d16f1" />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>QR code style</label>
              <select className="input-field w-36">
                <option>Classic squares</option>
                <option>Rounded dots</option>
                <option>Branded (with logo)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-3">Notifications</p>
          <div className="flex flex-col gap-2.5">
            {notifLabels.map((label, i) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm">{label}</span>
                <Toggle on={notifs[i]} onChange={() => setNotifs(notifs.map((n, j) => (j === i ? !n : n)))} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-3">Security</p>
          <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p className="text-sm">Two-factor authentication</p>
              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Require 2FA for all workspace members</p>
            </div>
            <Toggle on={false} onChange={() => {}} />
          </div>
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="text-sm">Session timeout</p>
              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Auto sign-out after inactivity</p>
            </div>
            <select className="input-field w-28 h-8 text-xs">
              <option>4 hours</option>
              <option>8 hours</option>
              <option>24 hours</option>
            </select>
          </div>
        </div>

        <div
          className="rounded-2xl border border-dashed p-5 flex justify-between items-center"
          style={{ borderColor: 'var(--color-border-strong)', background: 'repeating-linear-gradient(45deg, var(--color-canvas), var(--color-canvas) 10px, white 10px, white 20px)' }}
        >
          <div className="flex items-center gap-2.5">
            <Icons.CreditCard size={18} style={{ color: 'var(--color-ink-tertiary)' }} />
            <div>
              <p className="text-sm font-medium">Billing & plans</p>
              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Not yet built</p>
            </div>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-fg)' }}>TO DO</span>
        </div>
      </div>
    </div>
  );
}