import { next, geolocation } from '@vercel/edge';

// Enable at the edge by default.
const FEATURE_ENABLED = process.env.SHORT_LINK_REDIRECT_ENABLED !== 'false';

// Base URL of the Supabase project's edge functions.
// Prefer the env var. If unset, fall back to the linked Supabase project ref.
const SUPABASE_FUNCTIONS_URL =
  process.env.SUPABASE_FUNCTIONS_URL ??
  'https://wiwlzrnlvsquszhfzaqk.supabase.co/functions/v1';

// App-level routes and assets that must always reach the SPA/API, never the
// short-link proxy. Anything else is treated as a short code to resolve.
const APP_ROUTE_PREFIXES = [
  '/app/',
  '/admin/',
  '/auth/',
  '/p/',
  '/signup',
  '/login',
  '/onboarding',
  '/forgot-password',
  '/reset-password',
];

const APP_ROUTE_EXACT = new Set(['/signup', '/login', '/onboarding', '/forgot-password', '/reset-password']);

function isAppPath(pathname) {
  if (APP_ROUTE_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (APP_ROUTE_EXACT.has(pathname)) return true;
  return false;
}

// Files with an extension (JS/CSS/PNG/...), or Vite's hashed asset bundle dir,
// must never be treated as short codes because slug-like short codes don't
// contain file extensions.
function isAssetPath(pathname) {
  if (pathname.startsWith('/assets/')) return true;
  const lastSegment = pathname.split('/').pop() ?? '';
  return /\.[a-zA-Z0-9]{2,}$/.test(lastSegment);
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Let all app routes and static assets through untouched.
  if (FEATURE_ENABLED === false || isAppPath(pathname) || isAssetPath(pathname) || pathname === '/') {
    return next();
  }

  // A bare root-level path like /fl-instagramf or /bidco-win is a short code.
  // Proxy it to the Supabase redirect edge function, which looks up the link,
  // logs the scan, and 302-redirects (or 404s for an unknown code).
  const shortCode = pathname.slice(1);

  const target = `${SUPABASE_FUNCTIONS_URL}/redirect/${encodeURIComponent(shortCode)}`;

  // Vercel's edge network attaches geolocation to every request automatically
  // (derived from the visitor's IP) - geolocation() just reads it off the
  // x-vercel-ip-* headers already present. It's not present on the Supabase
  // side of this proxy hop unless we forward it ourselves below.
  const geo = geolocation(request);

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': request.headers.get('user-agent') ?? '',
        'x-forwarded-for': request.headers.get('x-forwarded-for') ?? '',
        'x-real-ip': request.headers.get('x-real-ip') ?? '',
        // Custom headers carrying geo data through to the redirect function.
        // encodeURIComponent guards against non-ASCII city names (accents etc),
        // since raw header values must stay ASCII-safe.
        'x-scan-city': geo.city ? encodeURIComponent(geo.city) : '',
        'x-scan-country': geo.country ?? '',
      },
    });

    if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get('location')) {
      // Preserve the edge function's redirect (tracking already logged upstream).
      // Built manually rather than via Response.redirect(), because that helper
      // throws for any status outside 301/302/303/307/308 - constructing the
      // Response directly works for any 3xx status without needing to guess
      // what the upstream function will ever return.
      return new Response(null, {
        status: upstream.status,
        headers: { location: upstream.headers.get('location') },
      });
    }

    // Pass through any other status (404 for unknown link, 400, 500, ...).
    // Response is a standard Web API - no framework package needed for this part.
    // NOTE: deliberately NOT forwarding upstream's content-type header here.
    // Supabase's edge gateway appears to override it to text/plain regardless
    // of what the redirect function explicitly sets (confirmed on both 404
    // and 200 responses, directly against the *.supabase.co URL, bypassing
    // middleware entirely) - root cause undocumented, but everything this
    // endpoint's pass-through branch ever returns is HTML, so hardcoding it
    // here sidesteps the issue at the one layer we actually control.
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': 'text/html',
      },
    });
  } catch (err) {
    // If the upstream cannot be reached, fail gracefully rather than hard-error.
    console.error('Short-link proxy error:', err);
    return new Response('Short link could not be resolved.', { status: 502 });
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};