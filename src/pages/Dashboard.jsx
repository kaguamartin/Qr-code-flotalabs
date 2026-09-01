import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, QrCode } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { StatCard, TypeChip } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';

const typeColorMap = {
  website: 'blue', catalog: 'blue', video: 'blue', pdf: 'blue',
  app: 'teal', social: 'pink', whatsapp: 'pink',
  rsvp: 'purple', bio_page: 'violet',
  coupon: 'rose', loyalty: 'rose',
  review: 'lime', survey: 'lime',
};

export default function Dashboard() {
  const { membership, can } = useAuth();
  const org = membership?.organizations;
  const orgId = org?.id;

  const [stats, setStats] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    loadDashboard();
  }, [orgId]);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    const [statsResult, linksResult] = await Promise.all([
      supabase.rpc('get_dashboard_stats', { org_id_input: orgId }),
      supabase
        .from('links')
        .select(`
          id,
          short_code,
          destination_data,
          created_at,
          destination_types(key, display_name),
          campaigns(name, corridor)
        `)
        .eq('org_id', orgId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (statsResult.error) {
      setError(statsResult.error.message);
      setLoading(false);
      return;
    }
    if (linksResult.error) {
      setError(linksResult.error.message);
      setLoading(false);
      return;
    }

    setStats(statsResult.data);
    setLinks(linksResult.data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="text-sm" style={{ color: 'var(--color-danger-fg)' }}>Error: {error}</p>
      </div>
    );
  }

  const totalScans = stats?.total_scans ?? 0;
  const uniqueScans = stats?.unique_scans ?? 0;
  const activeLinks = stats?.active_links ?? 0;
  const scansOverTime = stats?.scans_over_time ?? [];
  const funnel = stats?.funnel ?? {};

  const uniquePct = totalScans > 0
    ? ((uniqueScans / totalScans) * 100).toFixed(1)
    : 0;

  const funnelSteps = [
    { label: 'Scanned', value: funnel.scanned ?? 0, color: 'var(--color-brand-blue)' },
    { label: 'Reached destination', value: funnel.reached_destination ?? 0, color: 'var(--color-brand-blue)' },
    { label: 'Signup started', value: funnel.signup_started ?? 0, color: 'var(--color-brand-purple)' },
    { label: 'Signup completed', value: funnel.signup_completed ?? 0, color: 'var(--color-brand-purple)' },
  ].map((step) => ({
    ...step,
    pct: funnel.scanned > 0 ? Math.round((step.value / funnel.scanned) * 100) : 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
            {org?.name ?? '—'} &middot; last 30 days
          </p>
        </div>
        <div className="flex gap-2">
          <select className="input-field w-auto">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Campaign to date</option>
          </select>
          {can('links.create') && (
  <Link to="/app/links/new" className="btn-primary">
    <Plus size={16} /> New link
  </Link>
)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total scans" value={totalScans.toLocaleString()} sublabel="Last 30 days" />
        <StatCard label="Unique visitors" value={uniqueScans.toLocaleString()} sublabel={`${uniquePct}% of scans`} />
        <StatCard label="Active links" value={activeLinks} sublabel="Excluding archived" />
        <StatCard label="Conversion rate" value="—" sublabel="Requires tracking pixel" />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div className="card p-5">
          <p className="text-sm font-medium mb-3">Scans over time</p>
          {scansOverTime.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <p className="text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                No scan data yet — share your QR codes to start tracking.
              </p>
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scansOverTime} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand-blue)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--color-brand-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                  <Area type="monotone" dataKey="scans" stroke="var(--color-brand-blue)" strokeWidth={2} fill="url(#scanFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium mb-3">Conversion funnel</p>
          {funnel.scanned === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 120 }}>
              <p className="text-sm text-center" style={{ color: 'var(--color-ink-tertiary)' }}>
                No funnel data yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {funnelSteps.map((step) => (
                <div key={step.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--color-ink-secondary)' }}>{step.label}</span>
                    <span className="font-medium">{step.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--color-canvas)' }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${step.pct}%`, background: step.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs mt-3 pt-2 border-t" style={{ color: 'var(--color-ink-tertiary)', borderColor: 'var(--color-border)' }}>
            Signup steps require the tracking pixel to be connected in Integrations.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <p className="text-sm font-medium">Links</p>
          <span className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>{links.length} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
              {['Link', 'Type', 'Corridor', 'Scans', 'Conv.', ''].map((h, i) => (
                <th key={h + i} className={`text-left px-5 py-2 text-xs font-normal ${i >= 3 ? 'text-right' : ''}`} style={{ color: 'var(--color-ink-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                  No links yet — create your first QR code to get started.
                </td>
              </tr>
            ) : (
              links.map((l) => (
                <tr key={l.id} className="border-t hover:bg-[var(--color-canvas)] cursor-pointer" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-5 py-2.5 font-mono text-xs">
                    <Link to={`/app/links/${l.id}`} className="hover:underline">
                      {SHORT_LINK_BASE_URL.replace('https://', '')}/{l.short_code}
                    </Link>
                  </td>
                  <td className="py-2.5">
                    <TypeChip color={typeColorMap[l.destination_types?.key] ?? 'blue'}>
                      {l.destination_types?.display_name ?? '—'}
                    </TypeChip>
                  </td>
                  <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>
                    {l.campaigns?.corridor ?? '—'}
                  </td>
                  <td className="py-2.5 text-right font-medium">—</td>
                  <td className="py-2.5 text-right" style={{ color: 'var(--color-ink-secondary)' }}>—</td>
                  <td className="py-2.5 px-5 text-right">
                    <Link to={`/app/links/${l.id}`}>
                      <QrCode size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}