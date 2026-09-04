import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // create client with caller's token to verify their identity
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

    // parse request body
    const { email, org_id, role_id } = await req.json();
    if (!email || !org_id || !role_id) {
      return new Response(JSON.stringify({ error: 'email, org_id and role_id are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // create admin client with service role key
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // verify caller has team.invite permission for this org
    const { data: permission } = await adminClient
      .from('memberships')
      .select('roles(role_permissions(enabled, permissions(key)))')
      .eq('user_id', user.id)
      .eq('org_id', org_id)
      .eq('status', 'active')
      .single();

    const hasInvitePermission = permission?.roles?.role_permissions?.some(
      (rp: any) => rp.permissions?.key === 'team.invite' && rp.enabled
    );

    if (!hasInvitePermission) {
      return new Response(JSON.stringify({ error: 'You do not have permission to invite members' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      // user exists — check if already a member
      const { data: existingMember } = await adminClient
        .from('memberships')
        .select('id, status')
        .eq('user_id', existingUser.id)
        .eq('org_id', org_id)
        .maybeSingle();

      if (existingMember?.status === 'active') {
        return new Response(JSON.stringify({ error: 'This user is already a member of this workspace' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // add them directly as invited member
      await adminClient.from('memberships').upsert({
  user_id: existingUser.id,
  org_id,
  role_id,
  status: 'invited',
  invited_at: new Date().toISOString(),
  invited_email: email,
});

      return new Response(JSON.stringify({ success: true, existing_user: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // user doesn't exist — send invite email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${Deno.env.get('APP_URL') ?? 'https://www.www.flotalabs.co.ke'}/onboarding`,
      data: { invited_to_org: org_id, invited_role: role_id },
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // pre-create the membership row so it's ready when they accept
    await adminClient.from('memberships').insert({
  user_id: inviteData.user.id,
  org_id,
  role_id,
  status: 'invited',
  invited_at: new Date().toISOString(),
  invited_email: email,
});

    return new Response(JSON.stringify({ success: true, existing_user: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Invite error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});