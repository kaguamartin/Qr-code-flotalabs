import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { StatCard, StatusBadge } from '../components/Shared';
import { supabase } from '../lib/supabaseClient';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrgs();
  }, []);

  async function loadOrgs() {
    setLoading(true);
    setError('');

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (orgsError) {
      setError(orgsError.message);
      setLoading(false);
      return;
    }

    const { data: stats, error: statsError } = await supabase.rpc('get_org_stats');

    if (statsError) {
      setError(statsError.message);
      setLoading(false);
      return;
    }

    const statsByOrgId = Object.fromEntries(stats.map((s) => [s.org_id, s]));

    const merged = orgs.map((org) => {
      const s = statsByOrgId[org.id] ?? {};
      return {
        ...org,
        links: s.links_count ?? 0,
        scans30d: s.scans_30d ?? 0,
        lastActivity: s.last_activity ? formatRelativeTime(s.last_activity) : 'No activity yet',
        team: s.team_count ?? 0,
      };
    });

    setOrganizations(merged);
    setLoading(false);
  }

  function formatRelativeTime(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const totalScans = organizations.reduce((sum, o) => sum + o.scans30d, 0);
  const totalLinks = organizations.reduce((sum, o) => sum + o.links, 0);
  const needsAttention = organizations.filter((o) => o.status === 'attention').length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-7">
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-7">
        <p className="text-sm" style={{ color: 'var(--color-danger-fg)' }}>Error loading organizations: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-7">

      {/* invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-6 w-full max-w-sm relative">

            {copied && (
              <div
                className="absolute top-[-40px] left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-fg)', whiteSpace: 'nowrap' }}
              >
                ✓ Link copied to clipboard
              </div>
            )}

            <h2 className="text-sm font-medium mb-1">Invite a client</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
              Share this link with your client — they'll sign up and set up their own workspace.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                readOnly
                className="input-field flex-1 font-mono text-xs"
                value={`${window.location.origin}/signup`}
              />
              <button
                className="btn-secondary text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/signup`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                Copy
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>
              Email invite coming soon — this will send directly from Flota Labs once configured.
            </p>
            <button
              className="btn-secondary w-full justify-center"
              onClick={() => {
                setShowInviteModal(false);
                setCopied(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
          <div>
            <p className="text-sm font-medium">Flota Labs</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>Platform overview &middot; Super admin</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
          <Plus size={16} /> Add client
        </button>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="Active clients" value={organizations.length} />
        <StatCard label="Total links" value={totalLinks} />
        <StatCard label="Scans (30d)" value={totalScans.toLocaleString()} />
        <StatCard label="Active campaigns" value="—" />
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Needs attention</p>
          <p className="text-2xl font-medium" style={{ color: 'var(--color-warning-fg)' }}>{needsAttention}</p>
        </div>
      </div>

      {/* client table */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 flex justify-between items-center">
          <p className="text-sm font-medium">Client workspaces</p>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }} />
            <input className="input-field pl-8 h-8 w-44 text-xs" placeholder="Search clients..." />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t" style={{ borderColor: 'var(--color-border)' }}>
              {['Client', 'Status', 'Links', 'Scans (30d)', 'Last activity', 'Team', ''].map((h, i) => (
                <th key={h + i} className={`text-left px-5 py-2 text-xs font-normal ${i === 2 || i === 3 ? 'text-right' : ''}`} style={{ color: 'var(--color-ink-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                  No client workspaces yet — invite your first client to get started.
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} className="border-t hover:bg-[var(--color-canvas)] cursor-pointer" style={{ borderColor: 'var(--color-border)' }} onClick={() => navigate('/app')}>
                  <td className="px-5 py-2.5">
                    <p>{org.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>{org.industry ?? '—'}</p>
                  </td>
                  <td className="py-2.5"><StatusBadge status={org.status} /></td>
                  <td className="py-2.5 text-right">{org.links}</td>
                  <td className="py-2.5 text-right font-medium">{org.scans30d.toLocaleString()}</td>
                  <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>{org.lastActivity}</td>
                  <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>{org.team} members</td>
                  <td className="py-2.5 px-5 text-right">→</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}