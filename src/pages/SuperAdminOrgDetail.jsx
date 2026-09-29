import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { StatCard, StatusBadge, TypeChip } from '../components/Shared';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { OrgActionsModal } from './SuperAdmin';

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

export default function SuperAdminOrgDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { startAssistMode } = useAuth();

  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [links, setLinks] = useState([]);
  const [bioPageCount, setBioPageCount] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [membersError, setMembersError] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    loadAll();
  }, [orgId]);

  async function loadAll() {
    setLoading(true);
    setError('');
    setMembersError(false);

    const [orgResult, membersResult, linksResult, bioPageResult] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase
        .from('memberships')
        .select('id, status, users(full_name, email), roles(name)')
        .eq('org_id', orgId),
      supabase
        .from('links')
        .select('id, short_code, created_at, destination_types(display_name, key), clicks(count)')
        .eq('org_id', orgId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('links')
        .select('id, destination_types!inner(key)', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('destination_types.key', 'bio_page'),
    ]);

    if (orgResult.error) { setError(orgResult.error.message); setLoading(false); return; }
    setOrg(orgResult.data);

    // A "super admins can view all memberships" SELECT policy exists
    // (confirmed via pg_policies), so an empty result here genuinely means
    // no team members - only an actual query error is treated as a failure.
    if (membersResult.error) {
      setMembersError(true);
      setMembers([]);
    } else {
      setMembers(membersResult.data ?? []);
    }

    if (!linksResult.error) {
      setLinks(linksResult.data ?? []);
      setTotalScans((linksResult.data ?? []).reduce((sum, l) => sum + (l.clicks?.[0]?.count ?? 0), 0));
    }
    if (!bioPageResult.error) setBioPageCount(bioPageResult.count ?? 0);

    setLoading(false);
  }

  async function handleAssist() {
    const ok = await startAssistMode(orgId);
    if (ok) navigate('/app');
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-8 py-7"><p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p></div>;
  }
  if (error || !org) {
    return <div className="max-w-5xl mx-auto px-8 py-7"><p className="text-sm" style={{ color: 'var(--color-danger-fg)' }}>Error: {error || 'Workspace not found'}</p></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-7">
      {showActions && (
        <OrgActionsModal
          org={org}
          onClose={() => setShowActions(false)}
          onAction={loadAll}
          onAssist={handleAssist}
        />
      )}

      <button
        onClick={() => navigate('/admin')}
        className="text-xs flex items-center gap-1 mb-4"
        style={{ color: 'var(--color-ink-secondary)' }}
      >
        <ChevronLeft size={13} /> All clients
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium">{org.name}</h1>
              <StatusBadge status={org.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
              {org.industry ?? 'No industry set'} · Created {new Date(org.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button onClick={() => setShowActions(true)} className="p-2 rounded-lg hover:bg-[var(--color-canvas)]" style={{ color: 'var(--color-ink-secondary)' }}>
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Active links" value={links.length} sublabel="Not archived" />
        <StatCard label="Total scans" value={totalScans.toLocaleString()} sublabel="Across active links" />
        <StatCard label="Bio pages" value={bioPageCount} sublabel="Link-in-bio pages" />
        <StatCard label="Team members" value={membersError ? '—' : members.length} sublabel={membersError ? 'Could not load' : 'All statuses'} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card p-4">
          <p className="text-sm font-medium mb-3">Team</p>
          {membersError ? (
            <p className="text-xs" style={{ color: 'var(--color-danger-fg)' }}>
              Couldn't load team members — this may be a permissions issue worth checking.
            </p>
          ) : members.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>No team members yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium">{m.users?.full_name ?? 'Invited'}</p>
                    <p style={{ color: 'var(--color-ink-tertiary)' }}>{m.users?.email ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: 'var(--color-ink-secondary)' }}>{m.roles?.name ?? '—'}</p>
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <p className="text-sm font-medium mb-3">Recent links</p>
          {links.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>No links yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {links.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-mono truncate">{l.short_code}</p>
                    <p style={{ color: 'var(--color-ink-tertiary)' }}>{formatRelativeTime(l.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <TypeChip color="blue">{l.destination_types?.display_name ?? '—'}</TypeChip>
                    <span className="font-medium">{l.clicks?.[0]?.count ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}