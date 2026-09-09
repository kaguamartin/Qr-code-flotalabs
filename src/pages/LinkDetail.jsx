import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Download, Smartphone, Apple, Bot, Monitor, Loader, ExternalLink, Copy, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { TypeChip } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';
import EditLinkModal from '../components/link-create/EditLinkModal';

const typeColorMap = {
  website: 'blue', catalog: 'blue', video: 'blue', pdf: 'blue',
  app: 'teal', social: 'pink', whatsapp: 'pink',
  rsvp: 'purple', bio_page: 'violet',
  coupon: 'rose', loyalty: 'rose',
  review: 'lime', survey: 'lime',
  call: 'coral', email: 'coral', sms: 'coral',
  map: 'green', vcard: 'amber', save_number: 'amber',
  wifi: 'purple', calendar: 'indigo',
};

function downloadQR(shortCode) {
  const svg = document.querySelector('#link-detail-qr');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);
    ctx.drawImage(img, 0, 0, 400, 400);
    const a = document.createElement('a');
    a.download = `flota-qr-${shortCode}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function getQrValue(link) {
  if (!link) return '';
  const mode = link.destination_types?.encoding_mode;
  const data = link.destination_data ?? {};
  if (mode === 'redirect') return `${SHORT_LINK_BASE_URL}/${link.short_code}`;
  switch (link.destination_types?.key) {
    case 'wifi': return `WIFI:T:WPA;S:${data.ssid ?? ''};P:${data.password ?? ''};;`;
    case 'call':
    case 'save_number': return `tel:${data.phone ?? ''}`;
    case 'sms': return `smsto:${data.phone ?? ''}`;
    case 'email': return `mailto:${data.to ?? ''}`;
    case 'map': return `geo:0,0?q=${encodeURIComponent(data.address ?? '')}`;
    case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nFN:${data.name ?? ''}\nTEL:${data.phone ?? ''}\nORG:${data.company ?? ''}\nEND:VCARD`;
    default: return `${SHORT_LINK_BASE_URL}/${link.short_code}`;
  }
}

// The actual destination a visitor lands on — different from getQrValue,
// which for redirect-mode types returns the *short* link, not the final
// destination. Bio pages open the public /p/ page; raw types (wifi, vcard,
// call, sms, email, map) have no single browsable URL, so return null and
// let the caller hide/disable the "Test this link" button for those.
function getDestinationUrl(link) {
  if (!link) return null;
  const mode = link.destination_types?.encoding_mode;
  const key = link.destination_types?.key;
  const data = link.destination_data ?? {};
  if (key === 'bio_page') return `${SHORT_LINK_BASE_URL}/p/${link.short_code}`;
  if (mode === 'redirect') return data.url ?? data.android_url ?? data.ios_url ?? null;
  return null;
}

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function LinkDetail() {
  const { id } = useParams();
  const { membership, can } = useAuth();
  const orgId = membership?.organizations?.id;

  const [link, setLink] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [pixelSaving, setPixelSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    navigator.clipboard.writeText(`${SHORT_LINK_BASE_URL.replace('https://', '')}/${link.short_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  const [pixelError, setPixelError] = useState('');

  useEffect(() => {
    if (!id || !orgId) return;
    loadLink();
  }, [id, orgId]);

  async function handlePixelUpdate(fields) {
    setPixelSaving(true);
    setPixelError('');
    const { error } = await supabase.from('links').update(fields).eq('id', id);
    setPixelSaving(false);
    if (error) { setPixelError(error.message); return; }
    setLink((prev) => ({ ...prev, ...fields }));
  }

  async function loadLink() {
    setLoading(true);
    setError('');

    const { data: linkData, error: linkError } = await supabase
  .from('links')
  .select(`
    *,
    destination_types(id, key, display_name, encoding_mode, supports_funnel, field_schema, group_label),
    campaigns(id, name, corridor),
    pixel_enabled,
    pixel_method,
    pixel_goal_started_url,
    pixel_goal_completed_url,
    organizations(logo_url, primary_color)
  `)
  .eq('id', id)
  .eq('org_id', orgId)
  .single();

    if (linkError) { setError(linkError.message); setLoading(false); return; }
    setLink(linkData);

    if (linkData.destination_types?.encoding_mode === 'redirect') {
      const { data: clickData } = await supabase
        .from('clicks')
        .select('*')
        .eq('link_id', id)
        .order('occurred_at', { ascending: false })
        .limit(100);
      setClicks(clickData ?? []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Loader size={16} className="animate-spin" style={{ color: 'var(--color-ink-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div>
        <p className="text-sm" style={{ color: 'var(--color-danger-fg)' }}>
          {error || 'Link not found.'}
        </p>
        <Link to="/app/links" className="text-sm mt-2 inline-block" style={{ color: 'var(--color-brand-blue)' }}>
          Back to links
        </Link>
      </div>
    );
  }
  
  const isRedirect = link.destination_types?.encoding_mode === 'redirect';
  const typeKey = link.destination_types?.key ?? '';
  const destinationUrl = getDestinationUrl(link);
  const qrValue = getQrValue(link);

  const totalScans = clicks.length;
  const uniqueScans = clicks.filter((c) => c.is_unique).length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en', { weekday: 'short' });
  });
  const scansByDay = last7Days.map((day) => ({
    day,
    scans: clicks.filter((c) => {
      const d = new Date(c.occurred_at);
      return d.toLocaleDateString('en', { weekday: 'short' }) === day;
    }).length,
  }));

  const deviceCounts = clicks.reduce((acc, c) => {
    const d = c.device_type ?? 'unknown';
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const deviceBreakdown = Object.entries(deviceCounts).map(([label, count]) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    pct: totalScans > 0 ? Math.round((count / totalScans) * 100) : 0,
    color: label === 'mobile' ? 'var(--color-brand-blue)' : label === 'tablet' ? 'var(--color-brand-purple)' : '#9CA3E8',
  }));

  const cityCounts = clicks.reduce((acc, c) => {
    const city = c.city ?? 'Unknown';
    acc[city] = (acc[city] ?? 0) + 1;
    return acc;
  }, {});
  const topLocations = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
  const maxLocation = Math.max(...topLocations.map((l) => l.count), 1);

  const recentScans = clicks.slice(0, 6);

  // lucide-react has no brand icons (Android/Windows logos etc.) — these are
  // the closest generic equivalents. Extend this if more os values appear.
  const osIconMap = {
    iOS: Apple,
    Android: Bot,
    Windows: Monitor,
    macOS: Monitor,
  };
  function getOsIcon(os) {
    return osIconMap[os] ?? Smartphone;
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-5 text-xs">
        <Link to="/app/links" style={{ color: 'var(--color-ink-secondary)' }}>Links</Link>
        <ChevronRight size={12} style={{ color: 'var(--color-ink-tertiary)' }} />
        <span className="font-mono">{SHORT_LINK_BASE_URL.replace('https://', '')}/{link.short_code}</span>
      </div>

      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '0.85fr 1fr' }}>
        <div className="card p-5 flex flex-col items-center text-center">
          <div className="w-36 h-36 flex items-center justify-center mb-3.5">
            <QRCodeSVG
  id="link-detail-qr"
  value={qrValue || SHORT_LINK_BASE_URL}
  size={144}
  level="M"
  imageSettings={link?.org?.logo_url ? {
    src: link.org.logo_url,
    height: 32,
    width: 32,
    excavate: true,
  } : undefined}
/>
          </div>
          {isRedirect ? (
            <p className="font-mono text-sm mb-1.5">{SHORT_LINK_BASE_URL.replace('https://', '')}/{link.short_code}</p>
          ) : (
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-ink-tertiary)' }}>
              This QR encodes data directly — no link involved
            </p>
          )}
          <TypeChip color={typeColorMap[typeKey] ?? 'blue'}>
            {link.destination_types?.display_name ?? '—'}
          </TypeChip>
          <div className="flex gap-1.5 w-full mt-3.5">
            {isRedirect && (
              <button
                onClick={handleCopyLink}
                className="btn-secondary flex-1 justify-center text-xs h-8"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <button
              onClick={() => downloadQR(link.short_code)}
              className="btn-secondary flex-1 justify-center text-xs h-8"
            >
              <Download size={13} /> QR
            </button>
            {can('links.edit') && (
  <button onClick={() => setShowEditModal(true)} className="btn-secondary flex-1 justify-center text-xs h-8">
    Edit
  </button>
)}
          </div>
          <div className="w-full text-left border-t mt-3.5 pt-2.5" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Corridor</p>
            <p className="text-sm mb-2">{link.campaigns?.corridor ?? '—'}</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Campaign</p>
            <p className="text-sm">{link.campaigns?.name ?? '—'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {isRedirect ? (
            <>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="card p-3.5">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Total scans</p>
                  <p className="text-xl font-medium">{totalScans.toLocaleString()}</p>
                </div>
                <div className="card p-3.5">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Unique scans</p>
                  <p className="text-xl font-medium">{uniqueScans.toLocaleString()}</p>
                </div>
                <div className="card p-3.5">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Conversion</p>
                  <p className="text-xl font-medium">—</p>
                </div>
                <div className="card p-3.5">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Peak hour</p>
                  <p className="text-xl font-medium">—</p>
                </div>
              </div>

              <div className="card p-4 flex-1">
                <p className="text-sm font-medium mb-2">Scans over time</p>
                {totalScans === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-xs text-center" style={{ color: 'var(--color-ink-tertiary)' }}>
                      No scans yet — share your QR code to start tracking.
                    </p>
                  </div>
                ) : (
                  <div style={{ height: 130 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scansByDay} margin={{ left: -20, top: 4 }}>
                        <CartesianGrid vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                        <Bar dataKey="scans" fill="var(--color-brand-blue)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-4 flex-1 flex items-center justify-center">
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
                This QR code's data is read directly off the code by the phone — it never contacts Flota Labs' servers,
                so there's nothing to log or track for {link.destination_types?.display_name} QR codes.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-medium">Destination</p>
          {destinationUrl && (
            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs h-7 px-2.5"
            >
              <ExternalLink size={12} /> Test this link
            </a>
          )}
        </div>
        {typeKey === 'bio_page' ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
            Content for this page is managed in the{' '}
            <Link to="/app/bio" style={{ color: 'var(--color-brand-blue)' }}>Link-in-bio builder</Link>.
          </p>
        ) : typeKey === 'social' ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-ink-tertiary)' }}>Platform</span>
              <span className="font-mono">{link.destination_data?.platform ?? '—'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-ink-tertiary)' }}>URL</span>
              <span className="font-mono truncate max-w-[60%]">{link.destination_data?.url ?? '—'}</span>
            </div>
          </div>
        ) : (link.destination_types?.field_schema ?? []).length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>No destination details on file.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(link.destination_types.field_schema).map((f) => {
              const value = link.destination_data?.[f.key];
              const displayValue = f.key === 'password' && value ? '••••••••' : (value || '—');
              return (
                <div key={f.key} className="flex justify-between text-xs gap-4">
                  <span style={{ color: 'var(--color-ink-tertiary)' }}>{f.label}</span>
                  <span className="font-mono truncate max-w-[60%]">{displayValue}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isRedirect && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">Conversion tracking</p>
            <button
              onClick={() => handlePixelUpdate({ pixel_enabled: !link.pixel_enabled })}
              disabled={pixelSaving}
              className="relative w-9 h-5 rounded-full transition-all shrink-0"
              style={{ background: link.pixel_enabled ? 'var(--color-brand-blue)' : 'var(--color-border)' }}
            >
              <div
                className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all"
                style={{ left: link.pixel_enabled ? 18 : 2 }}
              />
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--color-ink-tertiary)' }}>
            Adds a tracking token to the destination URL so scans can be matched to signups on your site.
            Some destinations strip unrecognized URL parameters, and single-page apps that rewrite the URL
            client-side need to read the token before doing so — test after enabling.
          </p>

          {link.pixel_enabled && (
            <div className="pt-3 border-t flex flex-col gap-3" style={{ borderColor: 'var(--color-border)' }}>
              {pixelError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
                  {pixelError}
                </p>
              )}

              <div>
                <p className="text-xs font-medium mb-1.5">How should conversions be reported?</p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      checked={link.pixel_method === 'js_call'}
                      onChange={() => handlePixelUpdate({ pixel_method: 'js_call' })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Manual JS call</span> — your site calls
                      <code className="mx-1 px-1 rounded" style={{ background: 'var(--color-canvas)' }}>flota('track', 'signup_started')</code>
                      at the right moments in your signup flow. Most accurate, needs a developer to add the calls.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      checked={link.pixel_method === 'goal_url'}
                      onChange={() => handlePixelUpdate({ pixel_method: 'goal_url' })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Goal URL</span> — we watch for visitors reaching specific
                      URLs on your site (e.g. a "thank you" page). No code needed, but only works if each step
                      has its own distinct URL.
                    </span>
                  </label>
                </div>
              </div>

              {link.pixel_method === 'goal_url' && (
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Signup started URL contains</label>
                    <input
                      className="input-field text-xs"
                      placeholder="/signup"
                      defaultValue={link.pixel_goal_started_url ?? ''}
                      onBlur={(e) => handlePixelUpdate({ pixel_goal_started_url: e.target.value.trim() || null })}
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Signup completed URL contains</label>
                    <input
                      className="input-field text-xs"
                      placeholder="/thank-you"
                      defaultValue={link.pixel_goal_completed_url ?? ''}
                      onBlur={(e) => handlePixelUpdate({ pixel_goal_completed_url: e.target.value.trim() || null })}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
                Make sure the tracking pixel is installed on your site first — see the Integrations page for the embed code.
              </p>
            </div>
          )}
        </div>
      )}

      {isRedirect && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1.4fr' }}>
          <div className="card p-4">
            <p className="text-sm font-medium mb-2.5">Devices</p>
            {deviceBreakdown.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>No data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {deviceBreakdown.map((d) => (
                  <div key={d.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{d.label}</span>
                      <span className="font-medium">{d.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--color-canvas)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="text-sm font-medium mb-2.5">Top locations</p>
            {topLocations.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>No data yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topLocations.map((l) => (
                  <div key={l.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{l.label}</span>
                      <span className="font-medium">{l.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--color-canvas)' }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${(l.count / maxLocation) * 100}%`, background: 'var(--color-brand-blue)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="text-sm font-medium mb-2.5">Recent scans</p>
            {recentScans.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>No scans yet.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                {recentScans.map((s, i) => {
                  const OsIcon = getOsIcon(s.os);
                  return (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <OsIcon size={13} style={{ color: 'var(--color-ink-secondary)' }} />
                        <span>{s.os ?? 'Unknown'} · {s.city ?? 'Unknown'}</span>
                      </div>
                      <span style={{ color: 'var(--color-ink-tertiary)' }}>
                        {formatRelativeTime(s.occurred_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && (
        <EditLinkModal
          link={link}
          orgId={orgId}
          orgSlug={membership?.organizations?.slug ?? ''}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); loadLink(); }}
        />
      )}
    </div>
  );
}