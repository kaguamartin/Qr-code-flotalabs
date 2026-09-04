import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Minimal branded fallback page — used for both "doesn't exist" and
// "no longer active" cases. Kept intentionally plain for now (logo + one
// line); revisit styling later if needed.
function infoPage(message) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flota Labs</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fafafa;
      color: #1a1a1a;
      text-align: center;
      padding: 24px;
    }
    h1 { font-size: 18px; font-weight: 600; margin: 0; }
    p { font-size: 14px; color: #666; margin: 0; }
    a { color: #9d16f1; text-decoration: none; font-size: 13px; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Flota Labs</h1>
  <p>${message}</p>
  <a href="https://www.flotalabs.co.ke">www.flotalabs.co.ke</a>
</body>
</html>`,
    // Status is 404 (this genuinely is a "not found" case). Content-Type
    // here doesn't actually matter for real visitors - middleware.js hardcodes
    // text/html on its pass-through regardless of what this function sends,
    // because Supabase's gateway was found to override this header unpredictably.
    { status: 404, headers: { 'content-type': 'text/html' } }
  );
}

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

    // look up the link WITHOUT filtering on archived_at, so we can tell
    // "never existed" apart from "existed but was archived" and show a
    // different message for each, instead of a single generic 404.
    const { data: link, error } = await supabase
      .from('links')
      .select(`
        id,
        short_code,
        archived_at,
        destination_data,
        destination_types(key, encoding_mode, supports_funnel),
        campaigns(name, corridor)
      `)
      .eq('short_code', shortCode)
      .single();

    if (error || !link) {
      return infoPage("This link doesn't exist.");
    }

    if (link.archived_at) {
      return infoPage('This link is no longer active.');
    }

    // parse request metadata for scan logging
    const userAgent = req.headers.get('user-agent') ?? '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    const referrer = req.headers.get('referer') ?? null;

    // geo data forwarded by middleware.js (read from Vercel's edge geolocation,
    // which only exists on the Vercel hop - not visible here otherwise)
    const rawCity = req.headers.get('x-scan-city') ?? '';
    const city = rawCity ? decodeURIComponent(rawCity) : null;
    const country = req.headers.get('x-scan-country') || null;

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
      city,
      country,
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