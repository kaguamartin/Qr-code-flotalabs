import { useState, useEffect } from 'react';
import { UserPlus, Plus, MoreHorizontal, X, Pencil, Check } from 'lucide-react';
import { StatusBadge, ConfirmDialog, Toast } from '../components/Shared';
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
  const { membership, can } = useAuth();
  const orgId = membership?.organizations?.id;

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [deleteRoleTarget, setDeleteRoleTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [newRoleError, setNewRoleError] = useState('');

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
  .select(`
    *,
    users(full_name, email),
    roles(id, name)
  `)
  .eq('org_id', orgId)
  .order('invited_at', { ascending: true }),
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

  async function handleInvite() {
    if (!inviteEmail.trim()) { setInviteError('Email is required.'); return; }
    if (!inviteRoleId) { setInviteError('Please select a role.'); return; }

    setInviting(true);
    setInviteError('');

    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          org_id: orgId,
          role_id: inviteRoleId,
        }),
      }
    );

    const result = await response.json();
    setInviting(false);

    if (!response.ok) {
      setInviteError(result.error ?? 'Failed to send invite.');
    } else {
      setInviteSuccess(
        result.existing_user
          ? `${inviteEmail} has been added to the workspace.`
          : `Invite sent to ${inviteEmail}.`
      );
      await loadAll();
    }
  }
  async function handleChangeRole(membershipId, newRoleId) {
    const { error } = await supabase
      .from('memberships')
      .update({ role_id: newRoleId })
      .eq('id', membershipId);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    await loadAll();
  }

  async function handleCancelInvite(membershipId) {
    const { data, error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', membershipId)
      .select('id');
    setCancelTarget(null);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    if (!data || data.length === 0) {
      // RLS can silently match zero rows and still return success with no
      // error - .select() after delete is the only way to tell the two
      // apart. If we get here, something is blocking this specific delete
      // at the policy level, not a real client-side bug.
      setToast({ message: "Couldn't cancel this invite — you may not have permission to remove it.", type: 'error' });
      return;
    }
    await loadAll();
  }

  async function handleResendInvite(email, roleId) {
    if (!email || !roleId) return;
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-member`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email,
          org_id: orgId,
          role_id: roleId,
        }),
      }
    );
    const result = await response.json();
    if (response.ok) {
      setToast({
        message: result.email_resent === false
          ? `${email} already has an account — added to this workspace, no new email needed.`
          : `Invite resent to ${email}.`,
        type: 'success',
      });
    } else {
      setToast({ message: result.error ?? 'Failed to resend invite.', type: 'error' });
    }
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) { setNewRoleError('Role name is required.'); return; }
    setCreatingRole(true);
    setNewRoleError('');

    const { data: newRole, error: roleError } = await supabase
      .from('roles')
      .insert({ org_id: orgId, name: newRoleName.trim(), is_locked: false })
      .select()
      .single();

    if (roleError) { setNewRoleError(roleError.message); setCreatingRole(false); return; }

    // seed all permissions as disabled
    await supabase.from('role_permissions').insert(
      permissions.map((p) => ({
        role_id: newRole.id,
        permission_id: p.id,
        enabled: false,
      }))
    );

    setCreatingRole(false);
    setShowNewRoleModal(false);
    setNewRoleName('');
    await loadAll();
    setActiveRoleId(newRole.id);
  }

  async function handleDeleteRole(roleId) {
    const role = roles.find((r) => r.id === roleId);
    if (!role || role.is_locked) return;
    setDeleteRoleTarget(role);
  }

  async function confirmDeleteRole() {
    const role = deleteRoleTarget;
    setDeleteRoleTarget(null);
    if (!role) return;
    await supabase.from('roles').delete().eq('id', role.id);
    await loadAll();
  }

  function startEditingRole(role) {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
  }

  async function saveRoleName() {
    const name = editingRoleName.trim();
    const role = roles.find((r) => r.id === editingRoleId);
    if (!name || !role || name === role.name) {
      setEditingRoleId(null);
      return;
    }
    const { data, error } = await supabase
      .from('roles')
      .update({ name })
      .eq('id', editingRoleId)
      .select('id');
    setEditingRoleId(null);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    if (!data || data.length === 0) {
      setToast({ message: "Couldn't rename this role — you may not have permission.", type: 'error' });
      return;
    }
    await loadAll();
  }

  const activeRole = roles.find((r) => r.id === activeRoleId);

  const permissionGroups = permissions.reduce((groups, p) => {
    const group = groups.find((g) => g.label === p.group_label);
    if (group) {
      group.keys.push([p.id, p.key, p.description]);
    } else {
      groups.push({ label: p.group_label, keys: [[p.id, p.key, p.description]] });
    }
    return groups;
  }, []);

  function memberCountForRole(roleId) {
    return members.filter((m) => m.roles?.id === roleId && m.status === 'active').length;
  }

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
      {/* invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">Invite team member</p>
              <button onClick={() => setShowInviteModal(false)} style={{ color: 'var(--color-ink-tertiary)' }}>
                <X size={16} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--color-success-bg)' }}>
                  <Plus size={20} style={{ color: 'var(--color-success-fg)' }} />
                </div>
                <p className="text-sm font-medium mb-1">Done!</p>
                <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>{inviteSuccess}</p>
                <button onClick={() => setShowInviteModal(false)} className="btn-primary w-full justify-center">Close</button>
              </div>
            ) : (
              <>
                {inviteError && (
                  <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
                    {inviteError}
                  </p>
                )}
                <div className="flex flex-col gap-3 mb-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Email address</label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="colleague@company.co.ke"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Role</label>
                    <select
                      className="input-field"
                      value={inviteRoleId}
                      onChange={(e) => setInviteRoleId(e.target.value)}
                    >
                      <option value="">Select a role...</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowInviteModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button onClick={handleInvite} disabled={inviting} className="btn-primary flex-1 justify-center disabled:opacity-60">
                    {inviting ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* new role modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">New custom role</p>
              <button onClick={() => setShowNewRoleModal(false)} style={{ color: 'var(--color-ink-tertiary)' }}>
                <X size={16} />
              </button>
            </div>
            {newRoleError && (
              <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
                {newRoleError}
              </p>
            )}
            <div className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Role name</label>
              <input
                className="input-field"
                placeholder="e.g. Campaign Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                All permissions will be off by default — you can toggle them after creating.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewRoleModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleCreateRole} disabled={creatingRole} className="btn-primary flex-1 justify-center disabled:opacity-60">
                {creatingRole ? 'Creating...' : 'Create role'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Team & roles</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'} &middot; {roles.length} {roles.length === 1 ? 'role' : 'roles'}
          </p>
        </div>
        {can('team.invite') && (
        <button
          className="btn-primary"
          onClick={() => {
            setInviteEmail('');
            setInviteRoleId(roles.find((r) => !r.is_locked)?.id ?? roles[0]?.id ?? '');
            setInviteError('');
            setInviteSuccess('');
            setShowInviteModal(true);
          }}
        >
          <UserPlus size={16} /> Invite member
        </button>
        )}
      </div>

      <div className="card overflow-hidden mb-7">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {['Member', 'Role', 'Status', 'Joined / Invited', ''].map((h) => (
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
              members.map((m, i) => {
                const isInvited = m.status === 'invited';
                const invitedAt = m.invited_at ? new Date(m.invited_at) : null;
                const hoursAgo = invitedAt ? Math.floor((Date.now() - invitedAt.getTime()) / 3600000) : null;
                const hoursLeft = invitedAt ? Math.max(0, 24 - hoursAgo) : null;
                const expired = hoursLeft === 0;

                return (
                  <tr key={m.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-5 py-2.5">
  <p>{m.users?.full_name ?? m.invited_email ?? '—'}</p>
  <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
    {m.users?.email ?? m.invited_email ?? '—'}
  </p>
  {!m.users && m.invited_email && (
    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>
      Awaiting signup
    </p>
  )}
</td>
                    <td className="py-2.5">
                      {can('team.manage_roles') ? (
                        <select
                          className="input-field w-auto text-xs h-7 py-0"
                          value={m.roles?.id ?? ''}
                          onChange={(e) => handleChangeRole(m.id, e.target.value)}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge roleName={m.roles?.name ?? '—'} index={i} />
                      )}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-2.5" style={{ color: 'var(--color-ink-secondary)' }}>
                      {isInvited ? (
                        <div>
                          {hoursAgo !== null && (
                            <p className="text-xs" style={{ color: expired ? 'var(--color-danger-fg)' : 'var(--color-ink-secondary)' }}>
                              {expired
                                ? 'Invite expired'
                                : `Invited ${hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`} · ${hoursLeft}h left`
                              }
                            </p>
                          )}
                        </div>
                      ) : (
                        m.joined_at
                          ? new Date(m.joined_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : m.last_active_at
                            ? new Date(m.last_active_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'
                      )}
                    </td>
                    <td className="py-2.5 px-5 text-right">
                      {isInvited ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                           onClick={() => handleResendInvite(m.invited_email ?? m.users?.email, m.roles?.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border transition-colors hover:bg-[var(--color-canvas)]"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-secondary)' }}
                          >
                            Resend
                          </button>
                          {can('team.manage_roles') && (
                            <button
                              onClick={() => setCancelTarget(m)}
                              className="text-xs px-2.5 py-1 rounded-lg border transition-colors hover:bg-[var(--color-canvas)]"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-danger-fg)' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ) : (
                        <MoreHorizontal size={16} style={{ color: 'var(--color-ink-secondary)' }} />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Roles</p>
        {can('team.manage_roles') && (
        <button
          onClick={() => { setNewRoleName(''); setNewRoleError(''); setShowNewRoleModal(true); }}
          className="text-xs h-7 px-2.5 rounded-md border flex items-center gap-1.5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Plus size={13} /> New custom role
        </button>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '160px 1fr' }}>
        <div className="flex flex-col gap-0.5">
          {roles.map((r) => (
            editingRoleId === r.id ? (
              <div key={r.id} className="flex items-center gap-1 px-2.5 py-1.5">
                <input
                  autoFocus
                  className="input-field text-sm flex-1 h-7 py-0"
                  value={editingRoleName}
                  onChange={(e) => setEditingRoleName(e.target.value)}
                  onBlur={saveRoleName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') setEditingRoleId(null);
                  }}
                />
                <Check size={13} style={{ color: 'var(--color-ink-tertiary)' }} />
              </div>
            ) : (
              <button
                key={r.id}
                onClick={() => setActiveRoleId(r.id)}
                className="flex justify-between items-center px-2.5 py-2 rounded-lg text-left text-sm transition-colors group"
                style={activeRoleId === r.id ? { background: 'var(--color-info-bg)', color: 'var(--color-info-fg)' } : {}}
              >
                <span>{r.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: activeRoleId === r.id ? 'var(--color-info-fg)' : 'var(--color-ink-tertiary)' }}>
                    {memberCountForRole(r.id)}
                  </span>
                  {!r.is_locked && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditingRole(r); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        style={{ color: activeRoleId === r.id ? 'var(--color-info-fg)' : 'var(--color-ink-tertiary)' }}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-danger-fg)' }}
                      >
                        <X size={11} />
                      </button>
                    </>
                  )}
                </div>
              </button>
            )
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

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this invite?"
          message={`The pending invite for ${cancelTarget.invited_email ?? cancelTarget.users?.email} will be removed. To fix a typo'd email, cancel it here, then send a fresh invite with the correct address from the Invite button above.`}
          confirmLabel="Cancel invite"
          danger
          onConfirm={() => handleCancelInvite(cancelTarget.id)}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      {deleteRoleTarget && (
        <ConfirmDialog
          title="Delete this role?"
          message={`"${deleteRoleTarget.name}" will be removed. Members with this role will need to be reassigned.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDeleteRole}
          onCancel={() => setDeleteRoleTarget(null)}
        />
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}