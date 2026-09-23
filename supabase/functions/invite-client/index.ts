import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Invites a brand-new client (no existing org) via a real Supabase Auth
// invite email. Distinct from invite-member: that function adds someone
// to an EXISTING org (has org_id + role_id); this one has neither, since
// the whole point is the client creates their own org during onboarding.
// Super-admin only - a new client invite isn't scoped to any org the
// caller already belongs to, so the usual has_permission(org_id, ...)
// check doesn't apply here.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // is_super_admin() checks auth.uid() internally, which needs the
    // caller's own JWT context - callerClient has that, adminClient below
    // (service role) does not.
    const { data: isSuperAdmin } = await callerClient.rpc('is_super_admin');
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Only super admins can invite new clients' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, org_name } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // org_name (if given) rides along in user_metadata so Onboarding.jsx
    // can pre-fill it - no org row is created here, since the client
    // builds their own org during onboarding same as any self-signup user.
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('APP_URL') ?? 'https://www.flotalabs.co.ke'}/onboarding`,
      data: org_name ? { invited_org_name: org_name } : {},
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('invite-client error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});