import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, X, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { StatCard, StatusBadge } from '../components/Shared';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function OrgActionsModal({ org, onClose, onAction, onAssist }) {
  const [view, setView] = useState('menu');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSuspended = org.status === 'suspended';
  

  async function handleSuspend() {
    setLoading(true); setError('');
    const { error } = await supabase
      .from('organizations')
      .update({ status: isSuspended ? 'active' : 'suspended' })
      .eq('id', org.id);
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAction(); onClose();
  }

  async function handleHardDelete() {
    if (confirmText !== org.name) return;
    setLoading(true); setError('');
    const { error } = await supabase.from('organizations').delete().eq('id', org.id);
    setLoading(false);
    if (error) { setError(error.message); return; }
    onAction(); onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">{org.name}</p>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}><X size={16} /></button>
        </div>
        {error && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>{error}</p>}
         {view === 'menu' && (
  <div className="flex flex-col gap-2">
    <button
  onClick={() => onAssist(org.id)}
  className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 hover:bg-[var(--color-canvas)]"
  style={{ color: 'var(--color-brand-blue)' }}
>
  <ArrowLeftRight size={15} />
  Enter assist mode
</button>
    <button
      onClick={() => setView('suspend')} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 hover:bg-[var(--color-canvas)]" style={{ color: isSuspended ? 'var(--color-success-fg)' : 'var(--color-warning-fg)' }}>
              <AlertTriangle size={15} />
              {isSuspended ? 'Reactivate workspace' : 'Suspend workspace'}
            </button>
            <button onClick={() => setView('delete')} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 hover:bg-[var(--color-canvas)]" style={{ color: 'var(--color-danger-fg)' }}>
              <X size={15} /> Delete workspace permanently
            </button>
          </div>
        )}
      
      
        {view === 'suspend' && (
          <div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
              {isSuspended ? `Reactivating "${org.name}" will restore their access.` : `Suspending "${org.name}" will immediately block all users in this workspace.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setView('menu')} className="btn-secondary flex-1 justify-center">Back</button>
              <button onClick={handleSuspend} disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60" style={{ background: isSuspended ? 'var(--color-success-fg)' : 'var(--color-warning-fg)' }}>
                {loading ? 'Updating...' : isSuspended ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          </div>
        )}
        {view === 'delete' && (
          <div>
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg mb-4" style={{ background: 'var(--color-danger-bg)' }}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--color-danger-fg)' }} />
              <p className="text-xs" style={{ color: 'var(--color-danger-fg)' }}>This will permanently delete <strong>{org.name}</strong> and all their data. This cannot be undone.</p>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>Type <strong>{org.name}</strong> to confirm:</p>
            <input className="input-field mb-3" placeholder={org.name} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setView('menu')} className="btn-secondary flex-1 justify-center">Back</button>
              <button onClick={handleHardDelete} disabled={loading || confirmText !== org.name} className="flex-1 justify-center px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40" style={{ background: 'var(--color-danger-fg)' }}>
                {loading ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-sm relative">
        {copied && (
          <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-fg)', whiteSpace: 'nowrap' }}>
            ✓ Link copied to clipboard
          </div>
        )}
        <h2 className="text-sm font-medium mb-1">Invite a client</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>Share this link with your client — they'll sign up and set up their own workspace.</p>
        <div className="flex gap-2 mb-4">
          <input readOnly className="input-field flex-1 font-mono text-xs" value={`${window.location.origin}/signup`} />
          <button className="btn-secondary text-xs" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>Copy</button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--color-ink-tertiary)' }}>Email invite coming soon — this will send directly from Flota Labs once configured.</p>
        <button className="btn-secondary w-full justify-center" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  
  const [organizations, setOrganizations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeOrg, setActiveOrg] = useState(null);
  const { startAssistMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadOrgs(); }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(organizations.filter((o) => o.name.toLowerCase().includes(term) || (o.industry ?? '').toLowerCase().includes(term)));
  }, [search, organizations]);

  async function loadOrgs() {
    setLoading(true); setError('');
    const { data: orgs, error: orgsError } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    if (orgsError) { setError(orgsError.message); setLoading(false); return; }
    const { data: stats, error: statsError } = await supabase.rpc('get_org_stats');
    if (statsError) { setError(statsError.message); setLoading(false); return; }
    const statsByOrgId = Object.fromEntries(stats.map((s) => [s.org_id, s]));
    const merged = orgs.map((org) => {
      const s = statsByOrgId[org.id] ?? {};
      return { ...org, links: s.links_count ?? 0, scans30d: s.scans_30d ?? 0, lastActivity: s.last_activity ? formatRelativeTime(s.last_activity) : 'No activity yet', team: s.team_count ?? 0 };
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
  const suspended = organizations.filter((o) => o.status === 'suspended').length;

  if (loading) return <div className="max-w-6xl mx-auto px-8 py-7"><p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p></div>;
  if (error) return <div className="max-w-6xl mx-auto px-8 py-7"><p className="text-sm" style={{ color: 'var(--color-danger-fg)' }}>Error: {error}</p></div>;

  return (
    <div className="max-w-6xl mx-auto px-8 py-7">
      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
     {activeOrg && (
  <OrgActionsModal
    org={activeOrg}
    onClose={() => setActiveOrg(null)}
    onAction={loadOrgs}
    onAssist={async (orgId) => {
      const ok = await startAssistMode(orgId);
      if (ok) navigate('/app');
    }}
  />
)}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
          <div>
            <p className="text-sm font-medium">Flota Labs</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>Platform overview · Super admin</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowInviteModal(true)}><Plus size={16} /> Add client</button>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="Active clients" value={organizations.length - suspended} />
        <StatCard label="Total links" value={totalLinks} />
        <StatCard label="Scans (30d)" value={totalScans.toLocaleString()} />
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Suspended</p>
          <p className="text-2xl font-medium" style={{ color: suspended > 0 ? 'var(--color-warning-fg)' : 'var(--color-ink-primary)' }}>{suspended}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Needs attention</p>
          <p className="text-2xl font-medium" style={{ color: needsAttention > 0 ? 'var(--color-warning-fg)' : 'var(--color-ink-primary)' }}>{needsAttention}</p>
        </div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3.5 flex justify-between items-center">
          <p className="text-sm font-medium">Client workspaces</p>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }} />
            <input className="input-field pl-8 h-8 w-44 text-xs" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>{search ? 'No clients match your search.' : 'No client workspaces yet — invite your first client to get started.'}</td></tr>
            ) : (
              filtered.map((org) => (
                <tr key={org.id} className="border-t hover:bg-[var(--color-canvas)]" style={{ borderColor: 'var(--color-border)', opacity: org.status === 'suspended' ? 0.6 : 1 }}>
                  <td className="px-5 py-2.5">
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>{org.industry ?? '—'}</p>
                  </td>
                  <td className="py-2.5"><StatusBadge status={org.status} /></td>
                  <td className="py-2.5 text-right">{org.links}</td>
                  <td className="py-2.5 text-right font-medium">{org.scans30d.toLocaleString()}</td>
                  <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>{org.lastActivity}</td>
                  <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>{org.team} members</td>
                  <td className="py-2.5 px-5 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setActiveOrg(org); }} className="p-1 rounded-lg hover:bg-[var(--color-border)]" style={{ color: 'var(--color-ink-secondary)' }}>
                      <MoreHorizontal size={15} />
                    </button>
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
