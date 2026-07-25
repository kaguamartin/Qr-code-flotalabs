import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfileAndMembership(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfileAndMembership(session.user.id);
      } else {
        setProfile(null);
        setMembership(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function fetchProfileAndMembership(userId) {
    // fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError.message);
    } else {
      setProfile(profileData);
    }

    // fetch membership — check if user belongs to any active org
    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .select('*, organizations(*), roles(name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error('Failed to fetch membership:', membershipError.message);
    } else {
      setMembership(membershipData);
    }

    setLoading(false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password, fullName) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
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
  async function refreshMembership() {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('memberships')
      .select('*, organizations(*), roles(name)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!error) {
      setMembership(data);
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    membership,
    loading,
    isSuperAdmin: profile?.is_super_admin ?? false,
    hasOrg: !!membership,
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