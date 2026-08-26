import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);

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
        setLoading(false);
        setMembershipLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfileAndMembership(userId) {
    const [profileResult, membershipResult] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single(),
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

  function can(permissionKey) {
    // super admins can do everything
    if (profile?.is_super_admin) return true;
    // owners have all permissions (is_locked role)
    if (membership?.roles?.is_locked) return true;
    // check role_permissions for this specific key
    const rolePermissions = membership?.roles?.role_permissions ?? [];
    return rolePermissions.some(
      (rp) => rp.permissions?.key === permissionKey && rp.enabled === true
    );
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    membership,
    loading: loading || membershipLoading,
    isSuperAdmin: profile?.is_super_admin ?? false,
    hasOrg: membership?.status === 'active',
    isInvited: membership?.status === 'invited',
    can,
    signIn,
    signOut,
    signUp,
    requestPasswordReset,
    updatePassword,
    refreshMembership,
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
