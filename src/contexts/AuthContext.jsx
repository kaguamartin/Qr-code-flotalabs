import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [assistOrg, setAssistOrg] = useState(null);
  const [assistSessionId, setAssistSessionId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfileAndMembership(session.user.id);
      } else {
        setLoading(false);
        setMembershipLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setMembershipLoading(true);
        fetchProfileAndMembership(session.user.id);
      } else {
        setProfile(null);
        setMembership(null);
        setAssistOrg(null);
        setAssistSessionId(null);
        setLoading(false);
        setMembershipLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfileAndMembership(userId) {
    const [profileResult, membershipResult] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase
        .from('memberships')
        .select('*, organizations(*), roles(name, is_locked, role_permissions(enabled, permissions(key)))')
        .eq('user_id', userId)
        .in('status', ['active', 'invited'])
        .limit(1)
        .maybeSingle(),
    ]);
    if (!profileResult.error) setProfile(profileResult.data);
    if (!membershipResult.error) setMembership(membershipResult.data);
    setLoading(false);
    setMembershipLoading(false);
  }

  async function refreshMembership() {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('memberships')
      .select('*, organizations(*), roles(name, is_locked, role_permissions(enabled, permissions(key)))')
      .eq('user_id', session.user.id)
      .in('status', ['active', 'invited'])
      .limit(1)
      .maybeSingle();
    if (!error) setMembership(data);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password, fullName) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }

  async function startAssistMode(orgId) {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data: sessionData, error: sessionError } = await supabase
      .from('assist_sessions')
      .insert({
        admin_user_id: session?.user?.id,
        org_id: orgId,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to start assist session:', sessionError.message);
      return false;
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError) {
      console.error('Failed to load org:', orgError.message);
      return false;
    }

    setAssistOrg(orgData);
    setAssistSessionId(sessionData.id);
    return true;
  }

  async function endAssistMode() {
    if (assistSessionId) {
      await supabase
        .from('assist_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', assistSessionId);
    }
    setAssistOrg(null);
    setAssistSessionId(null);
  }

  async function logAssistAction(action, targetTable, targetId, metadata) {
    if (!assistOrg || !assistSessionId) return;
    await supabase.from('audit_log').insert({
      org_id: assistOrg.id,
      actor_user_id: session?.user?.id,
      acting_as_admin: true,
      action,
      target_table: targetTable,
      target_id: targetId,
      metadata,
    });
  }

  function can(permissionKey) {
    if (profile?.is_super_admin) return true;
    if (membership?.roles?.is_locked) return true;
    const rolePermissions = membership?.roles?.role_permissions ?? [];
    return rolePermissions.some(
      (rp) => rp.permissions?.key === permissionKey && rp.enabled === true
    );
  }

  const effectiveMembership = assistOrg
    ? {
        ...membership,
        organizations: assistOrg,
        roles: { name: 'Super Admin', is_locked: true, role_permissions: [] },
      }
    : membership;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    membership: effectiveMembership,
    loading: loading || membershipLoading,
    isSuperAdmin: profile?.is_super_admin ?? false,
    hasOrg: membership?.status === 'active',
    isInvited: membership?.status === 'invited',
    isSuspended: membership?.status === 'suspended',
    isAssistMode: !!assistOrg,
    assistOrg,
    can,
    signIn,
    signOut,
    signUp,
    requestPasswordReset,
    updatePassword,
    refreshMembership,
    startAssistMode,
    endAssistMode,
    logAssistAction,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
