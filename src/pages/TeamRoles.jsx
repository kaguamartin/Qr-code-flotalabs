import { useState, useEffect } from 'react';
import { UserPlus, Plus, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const roleTint = [
  ['var(--color-warning-bg)', 'var(--color-warning-fg)'],
  ['var(--color-info-bg)', 'var(--color-info-fg)'],
  ['var(--color-type-teal-bg)', 'var(--color-type-teal-fg)'],
  ['var(--color-type-purple-bg)', 'var(--color-type-purple-fg)'],
  ['var(--color-canvas)', 'var(--color-ink-secondary)'],
];

function RoleBadge({ roleName, index }) {
  const [bg, fg] = roleTint[index % roleTint.length];
  return <span className="badge" style={{ background: bg, color: fg }}>{roleName}</span>;
}

export default function TeamRoles() {
  const { membership } = useAuth();
  const orgId = membership?.organizations?.id;

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    loadAll();
  }, [orgId]);

  async function loadAll() {
    setLoading(true);
    setError('');

    const [membersResult, rolesResult, permissionsResult] = await Promise.all([
      supabase
        .from('memberships')
        .select('*, users(full_name, email), roles(id, name)')
        .eq('org_id', orgId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('roles')
        .select('*, role_permissions(enabled, permissions(id, key, group_label, description))')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true }),
      supabase
        .from('permissions')
        .select('*')
        .order('group_label', { ascending: true }),
    ]);

    if (membersResult.error) { setError(membersResult.error.message); setLoading(false); return; }
    if (rolesResult.error) { setError(rolesResult.error.message); setLoading(false); return; }
    if (permissionsResult.error) { setError(permissionsResult.error.message); setLoading(false); return; }

    setMembers(membersResult.data);
    setRoles(rolesResult.data);
    setPermissions(permissionsResult.data);
    setActiveRoleId(rolesResult.data[0]?.id ?? null);
    setLoading(false);
  }

  async function togglePermission(permissionId, currentEnabled) {
    if (!activeRoleId) return;
    const activeRole = roles.find((r) => r.id === activeRoleId);
    if (activeRole?.is_locked) return;

    setSaving(true);

    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role_id: activeRoleId,
        permission_id: permissionId,
        enabled: !currentEnabled,
      }, { onConflict: 'role_id,permission_id' });

    if (error) {
      setError(error.message);
    } else {
      // update local state optimistically
      setRoles(roles.map((r) => {
        if (r.id !== activeRoleId) return r;
        return {
          ...r,
          role_permissions: r.role_permissions.map((rp) =>
            rp.permissions.id === permissionId
              ? { ...rp, enabled: !currentEnabled }
              : rp
          ),
        };
      }));
    }
    setSaving(false);
  }

  const activeRole = roles.find((r) => r.id === activeRoleId);

  // build permission groups from real permissions data
  const permissionGroups = permissions.reduce((groups, p) => {
    const group = groups.find((g) => g.label === p.group_label);
    if (group) {
      group.keys.push([p.id, p.key, p.description]);
    } else {
      groups.push({ label: p.group_label, keys: [[p.id, p.key, p.description]] });
    }
    return groups;
  }, []);

  // count members per role
  function memberCountForRole(roleId) {
    return members.filter((m) => m.roles?.id === roleId && m.status === 'active').length;
  }

  // check if a permission is enabled for the active role
  function isPermissionEnabled(permissionId) {
    if (!activeRole) return false;
    const rp = activeRole.role_permissions?.find((rp) => rp.permissions?.id === permissionId);
    return rp?.enabled ?? false;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Team & roles</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'} &middot; {roles.length} {roles.length === 1 ? 'role' : 'roles'}
          </p>
        </div>
        <button className="btn-primary"><UserPlus size={16} /> Invite member</button>
      </div>

      <div className="card overflow-hidden mb-7">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {['Member', 'Role', 'Status', 'Last active', ''].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-xs font-normal" style={{ color: 'var(--color-ink-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                  No team members yet.
                </td>
              </tr>
            ) : (
              members.map((m, i) => (
                <tr key={m.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-5 py-2.5">
                    <p>{m.users?.full_name ?? '—'}</p>
                    <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>{m.users?.email ?? '—'}</p>
                  </td>
                  <td className="py-2.5">
                    <RoleBadge roleName={m.roles?.name ?? '—'} index={i} />
                  </td>
                  <td className="py-2.5"><StatusBadge status={m.status} /></td>
                  <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>
                    {m.last_active_at ? new Date(m.last_active_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2.5 px-5 text-right">
                    <MoreHorizontal size={16} style={{ color: 'var(--color-ink-secondary)' }} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Roles</p>
        <button className="text-xs h-7 px-2.5 rounded-md border flex items-center gap-1.5" style={{ borderColor: 'var(--color-border)' }}>
          <Plus size={13} /> New custom role
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '160px 1fr' }}>
        <div className="flex flex-col gap-0.5">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoleId(r.id)}
              className="flex justify-between items-center px-2.5 py-2 rounded-lg text-left text-sm transition-colors"
              style={activeRoleId === r.id ? { background: 'var(--color-info-bg)', color: 'var(--color-info-fg)' } : {}}
            >
              <span>{r.name}</span>
              <span className="text-xs" style={{ color: activeRoleId === r.id ? 'var(--color-info-fg)' : 'var(--color-ink-tertiary)' }}>
                {memberCountForRole(r.id)}
              </span>
            </button>
          ))}
        </div>

        {activeRole && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{activeRole.name}</p>
              <span className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
                {memberCountForRole(activeRole.id)} members
                {saving && <span className="ml-2">Saving...</span>}
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
              {activeRole.is_locked ? 'Owner permissions cannot be edited.' : 'Toggle any permission to customize this role.'}
            </p>

            {permissionGroups.map((g) => (
              <div key={g.label} className="mb-3.5">
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-tertiary)' }}>{g.label}</p>
                <div className="flex flex-col gap-2">
                  {g.keys.map(([permId, key, description]) => {
                    const on = isPermissionEnabled(permId);
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-sm">{description}</span>
                        <button
                          onClick={() => togglePermission(permId, on)}
                          disabled={activeRole.is_locked || saving}
                          className="w-9 h-5 rounded-full relative transition-colors disabled:opacity-60"
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}