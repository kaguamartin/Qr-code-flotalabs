import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Builds a standard vCard 3.0 file from the link's destination_data and
// triggers a download - same <a download> pattern already used for QR
// downloads elsewhere in the app.
function downloadVCard(data) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${data.name ?? ''}`,
  ];
  if (data.company) lines.push(`ORG:${data.company}`);
  if (data.job_title) lines.push(`TITLE:${data.job_title}`);
  if (data.phone) lines.push(`TEL:${data.phone}`);
  if (data.to || data.email) lines.push(`EMAIL:${data.to ?? data.email}`);
  if (data.website) lines.push(`URL:${data.website}`);
  if (data.photo_url) lines.push(`PHOTO;VALUE=URI:${data.photo_url}`);
  lines.push('END:VCARD');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' });
  const a = document.createElement('a');
  a.download = `${(data.name || 'contact').replace(/\s+/g, '-')}.vcf`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function PublicContactCard() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [linkStatus, setLinkStatus] = useState(null); // null | 'not_found' | 'archived'
  const [data, setData] = useState(null);
  const [orgLogoUrl, setOrgLogoUrl] = useState(null);

  useEffect(() => {
    loadContact();
  }, [shortCode]);

  async function loadContact() {
    setLoading(true);

    const { data: link, error: linkError } = await supabase
      .from('links')
      .select('id, org_id, destination_data, destination_types(key)')
      .eq('short_code', shortCode)
      .is('archived_at', null)
      .single();

    if (linkError || !link || link.destination_types?.key !== 'digital_vcard') {
      // Same pattern as PublicBioPage.jsx - an archived link is invisible
      // to this RLS-gated query just like a nonexistent one, so ask the
      // security definer function which case it actually is.
      const { data: status } = await supabase
        .rpc('get_public_link_status', { p_short_code: shortCode });
      setLinkStatus(status === 'archived' ? 'archived' : 'not_found');
      setLoading(false);
      return;
    }

    setData(link.destination_data ?? {});

    if (link.org_id) {
      const { data: logoUrl } = await supabase
        .rpc('get_public_org_logo', { p_org_id: link.org_id });
      if (logoUrl) setOrgLogoUrl(logoUrl);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.Loader size={20} className="animate-spin" style={{ color: 'var(--color-ink-tertiary)' }} />
      </div>
    );
  }

  if (linkStatus) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: '#f9fafb' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#f3f4f6' }}>
          <Icons.User size={22} style={{ color: '#9ca3af' }} />
        </div>
        <p className="font-medium mb-1">Contact card not found</p>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          {linkStatus === 'archived'
            ? 'This contact card is no longer active.'
            : "This contact card doesn't exist."}
        </p>
        <p className="text-xs mt-4" style={{ color: '#9ca3af' }}>Powered by Flota Labs</p>
      </div>
    );
  }

  const actions = [
    data.phone && { icon: 'Phone', label: 'Call', href: `tel:${data.phone}` },
    data.phone && { icon: 'MessageCircle', label: 'WhatsApp', href: `https://wa.me/${data.phone.replace(/[^0-9]/g, '')}` },
    (data.to || data.email) && { icon: 'Mail', label: 'Email', href: `mailto:${data.to ?? data.email}` },
    data.website && { icon: 'Globe', label: 'Website', href: data.website, external: true },
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: '#f9fafb' }}>
      {data.photo_url ? (
        <img src={data.photo_url} alt="" className="w-24 h-24 rounded-full object-cover mb-4" />
      ) : (
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ background: '#e5e7eb' }}>
          <Icons.User size={36} style={{ color: '#9ca3af' }} />
        </div>
      )}

      <h1 className="text-lg font-medium">{data.name}</h1>
      {data.job_title && <p className="text-sm" style={{ color: '#6b7280' }}>{data.job_title}{data.company ? ` · ${data.company}` : ''}</p>}
      {!data.job_title && data.company && <p className="text-sm" style={{ color: '#6b7280' }}>{data.company}</p>}

      <button
        onClick={() => downloadVCard(data)}
        className="mt-6 w-full max-w-xs flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm text-white"
        style={{ background: '#9d16f1' }}
      >
        <Icons.UserPlus size={16} /> Save Contact
      </button>

      {actions.length > 0 && (
        <div className="grid gap-2 mt-3 w-full max-w-xs" style={{ gridTemplateColumns: `repeat(${Math.min(actions.length, 4)}, 1fr)` }}>
          {actions.map((a) => {
            const Icon = Icons[a.icon];
            return (
              <a
                key={a.label}
                href={a.href}
                target={a.external ? '_blank' : undefined}
                rel={a.external ? 'noopener noreferrer' : undefined}
                className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs"
                style={{ background: 'white', border: '1px solid #e5e7eb', color: '#374151' }}
              >
                <Icon size={16} />
                {a.label}
              </a>
            );
          })}
        </div>
      )}

      {orgLogoUrl && (
        <img src={orgLogoUrl} alt="" className="w-8 h-8 rounded-lg object-cover mt-10 opacity-60" />
      )}
      <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>Powered by Flota Labs</p>
    </div>
  );
}