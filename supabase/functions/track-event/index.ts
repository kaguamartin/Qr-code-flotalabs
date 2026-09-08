import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Public, unauthenticated endpoint - called directly from client websites
// (the pixel script), which have no Flota Labs session at all. CORS must
// stay permissive since we don't know in advance which domains will embed
// the pixel. Every write here is validated against a real, recent click row
// before anything is inserted, since anyone can POST here with no auth.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_STEPS = new Set(['reached_destination', 'signup_started', 'signup_completed']);
const MAX_CLICK_AGE_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const clickId = body?.click_id;
    const stepKey = body?.step_key;

    if (!clickId || !VALID_STEPS.has(stepKey)) {
      return new Response(JSON.stringify({ error: 'Invalid click_id or step_key' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Validate this click_id is real and recent - prevents anyone from
    // spamming funnel_events for made-up or ancient click ids. Also pulls
    // the link's pixel config so the response can hand pixel.js its
    // tracking method (js_call vs goal_url) and goal URLs in one round trip.
    const { data: click, error: clickError } = await supabase
      .from('clicks')
      .select(`
        id,
        occurred_at,
        link_id,
        links(pixel_enabled, pixel_method, pixel_goal_started_url, pixel_goal_completed_url)
      `)
      .eq('id', clickId)
      .single();

    if (clickError || !click) {
      return new Response(JSON.stringify({ error: 'Unknown click_id' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const clickAgeMs = Date.now() - new Date(click.occurred_at).getTime();
    if (clickAgeMs > MAX_CLICK_AGE_DAYS * 24 * 60 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'Click too old to track' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    if (!click.links?.pixel_enabled) {
      return new Response(JSON.stringify({ error: 'Pixel not enabled for this link' }), {
        status: 403,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    // on conflict do nothing - duplicate reports (retries, re-renders) are
    // silently ignored rather than double-counted, via the unique
    // constraint on (click_id, step_key).
    await supabase
      .from('funnel_events')
      .upsert(
        {
          link_id: click.link_id,
          click_id: click.id,
          step_key: stepKey,
          occurred_at: new Date().toISOString(),
          source: 'pixel',
        },
        { onConflict: 'click_id,step_key', ignoreDuplicates: true },
      );

    // hand back this link's config so pixel.js can configure itself
    // (which method to use, which goal URLs to watch for) without a
    // second request.
    return new Response(
      JSON.stringify({
        ok: true,
        pixel_method: click.links.pixel_method,
        goal_started_url: click.links.pixel_goal_started_url,
        goal_completed_url: click.links.pixel_goal_completed_url,
      }),
      { headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  } catch (err) {
    console.error('track-event error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});