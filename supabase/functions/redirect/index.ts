import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // short code is the last path segment e.g. /redirect/fl-instagramf
    const shortCode = url.pathname.split('/').pop();

    if (!shortCode) {
      return new Response('Missing short code', { status: 400 });
    }

    // create supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // look up the link
    const { data: link, error } = await supabase
      .from('links')
      .select(`
        id,
        short_code,
        destination_data,
        destination_types(key, encoding_mode, supports_funnel),
        campaigns(name, corridor)
      `)
      .eq('short_code', shortCode)
      .is('archived_at', null)
      .single();

    if (error || !link) {
      return new Response('Link not found', { status: 404 });
    }

    // parse request metadata for scan logging
    const userAgent = req.headers.get('user-agent') ?? '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    const referrer = req.headers.get('referer') ?? null;

    const deviceType = userAgent.includes('Mobile') ? 'mobile'
      : userAgent.includes('Tablet') ? 'tablet'
      : 'desktop';

    const os = userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS'
      : userAgent.includes('Android') ? 'Android'
      : userAgent.includes('Windows') ? 'Windows'
      : userAgent.includes('Mac') ? 'macOS'
      : 'Other';

    // log the scan — fire and forget, don't block the redirect
    supabase.from('clicks').insert({
      link_id: link.id,
      ip_hash: ip ? btoa(ip).slice(0, 32) : null,
      device_type: deviceType,
      os,
      referrer,
      is_unique: true, // simplified for now — dedup handled by scheduled job
    }).then(() => {});

    // determine redirect destination
    const destinationType = link.destination_types?.key;
    const data = link.destination_data ?? {};

    // for bio pages — redirect to the React app's public bio page route
    if (destinationType === 'bio_page') {
      const bioUrl = `${Deno.env.get('APP_URL') ?? 'https://www.flotalabs.co.ke'}/p/${shortCode}`;
      return Response.redirect(bioUrl, 302);
    }

    // for redirect types — go to the destination URL
    if (link.destination_types?.encoding_mode === 'redirect') {
      const destinationUrl = data.url ?? data.android_url ?? data.ios_url ?? null;
      if (!destinationUrl) {
        return new Response('No destination URL configured', { status: 404 });
      }
      return Response.redirect(destinationUrl, 302);
    }

    // for raw types — these shouldn't normally hit this endpoint
    // but if they do, return a simple info page
    return new Response(
      `<html><body><p>This QR code contains direct data and should be scanned with a QR reader.</p></body></html>`,
      { headers: { 'content-type': 'text/html' } }
    );

  } catch (err) {
    console.error('Redirect error:', err);
    return new Response('Internal server error', { status: 500 });
  }
});