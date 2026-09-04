import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';

const DOMAIN_MAP = {
  facebook: 'facebook.com', instagram: 'instagram.com', tiktok: 'tiktok.com',
  twitter: 'x.com', youtube: 'youtube.com', whatsapp: 'whatsapp.com',
  linkedin: 'linkedin.com', spotify: 'open.spotify.com', telegram: 'telegram.org',
  snapchat: 'snapchat.com', pinterest: 'pinterest.com', discord: 'discord.com',
  bereal: 'bere.al', threads: 'threads.net',
};

function getBlockDisplay(block) {
  const typeKey = block.destination_types?.key ?? '';
  const data = block.destination_data ?? {};
  const platform = data.platform;

  if (typeKey === 'social' || typeKey === 'whatsapp') {
    let domain = 'globe.com';
    if (platform && platform !== 'custom' && DOMAIN_MAP[platform]) {
      domain = DOMAIN_MAP[platform];
    } else if (typeKey === 'whatsapp') {
      domain = 'whatsapp.com';
    } else if (data.url) {
      try { domain = new URL(data.url).hostname; } catch {}
    }
    return {
      type: 'favicon',
      src: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    };
  }

  const iconName = block.icon ?? 'Globe';
  const colorMap = {
    call: ['#dcfce7', '#16a34a'],
    save_number: ['#dcfce7', '#16a34a'],
    email: ['#fef3c7', '#d97706'],
    pdf: ['#fee2e2', '#dc2626'],
    website: ['#dbeafe', '#2563eb'],
  };
  const colors = colorMap[typeKey] ?? ['#dbeafe', '#2563eb'];
  return { type: 'icon', iconName, bg: colors[0], fg: colors[1] };
}

function getBlockHref(block) {
  const typeKey = block.destination_types?.key ?? '';
  const data = block.destination_data ?? {};
  if (typeKey === 'call' || typeKey === 'save_number') return 'tel:' + (data.phone ?? '');
  if (typeKey === 'sms') return 'smsto:' + (data.phone ?? '');
  if (typeKey === 'email') return 'mailto:' + (data.to ?? '');
  return data.url ?? '#';
}

export default function PublicBioPage() {
  const [orgLogoUrl, setOrgLogoUrl] = useState(null);
  const { shortCode } = useParams();
  const [bioPage, setBioPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shortCode) return;
    loadBioPage();
  }, [shortCode]);

  async function loadBioPage() {
    setLoading(true);

    const { data: link, error: linkError } = await supabase
  .from('links')
  .select('id, short_code, org_id, destination_types(key)')
  .eq('short_code', shortCode)
  .is('archived_at', null)
  .single();

    if (linkError || !link || link.destination_types?.key !== 'bio_page') {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: pageData, error: pageError } = await supabase
      .from('bio_pages')
      .select('*')
      .eq('link_id', link.id)
      .single();

    if (pageError || !pageData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setBioPage(pageData);

    const { data: blockData } = await supabase
      .from('bio_page_blocks')
      .select('*, destination_types(key, display_name)')
      .eq('bio_page_id', pageData.id)
      .order('sort_order', { ascending: true });

setBlocks(blockData ?? []);

    // fetch org logo via RPC — anon visitors have no direct SELECT policy on
    // organizations (deliberately, to avoid exposing the whole row publicly),
    // so this goes through a security definer function that only returns logo_url
    if (link.org_id) {
      const { data: logoUrl } = await supabase
        .rpc('get_public_org_logo', { p_org_id: link.org_id });
      if (logoUrl) setOrgLogoUrl(logoUrl);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f9fafb' }}>
        <div className="flex items-center gap-2">
          <Icons.Loader size={16} className="animate-spin" style={{ color: '#9ca3af' }} />
          <p className="text-sm" style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ background: '#f9fafb' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#f3f4f6' }}>
          <Icons.QrCode size={22} style={{ color: '#9ca3af' }} />
        </div>
        <p className="font-medium mb-1">Page not found</p>
        <p className="text-sm" style={{ color: '#6b7280' }}>
          This link may have been removed or does not exist.
        </p>
        <p className="text-xs mt-4" style={{ color: '#9ca3af' }}>Powered by Flota Labs</p>
      </div>
    );
  }

  const initial = bioPage?.header_title?.charAt(0)?.toUpperCase() ?? 'F';

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10" style={{ background: '#f9fafb' }}>
      <div className="w-full max-w-sm">
        {/* header */}
        <div className="flex flex-col items-center text-center mb-6">
          {orgLogoUrl ? (
  <img
    src={orgLogoUrl}
    className="w-20 h-20 rounded-full object-cover mb-4"
    alt="Logo"
  />
) : (
  <div
    className="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-white text-2xl font-bold"
    style={{ background: 'linear-gradient(135deg, #9d16f1, #1877F2)' }}
  >
    {initial}
  </div>
)}
          <h1 className="text-lg font-semibold mb-1">{bioPage?.header_title || ''}</h1>
          {bioPage?.header_subtitle && (
            <p className="text-sm" style={{ color: '#6b7280' }}>{bioPage.header_subtitle}</p>
          )}
        </div>

        {/* buttons */}
        <div className="flex flex-col gap-3">
          {blocks.map((block) => {
            const display = getBlockDisplay(block);
            const href = getBlockHref(block);
            const isExternal = href.startsWith('http');
            const bg = display.type === 'icon' ? display.bg : '#f3f4f6';
            const fg = display.type === 'icon' ? display.fg : '#374151';

            return (
              <a
                key={block.id}
                href={href}
                target={isExternal ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-sm transition-transform active:scale-95"
                style={{ background: bg, color: fg }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.6)' }}
                >
                  {display.type === 'favicon' ? (
                    <img
                      src={display.src}
                      className="rounded object-contain"
                      style={{ width: 18, height: 18 }}
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    (() => {
                      const Icon = Icons[display.iconName] ?? Icons.Globe;
                      return <Icon size={16} style={{ color: fg }} />;
                    })()
                  )}
                </div>
                <span className="flex-1">
                  {block.label || block.destination_types?.display_name || 'Button'}
                </span>
                <Icons.ChevronRight size={16} style={{ color: fg, opacity: 0.6 }} />
              </a>
            );
          })}
        </div>

        {/* footer */}
        <p className="text-xs text-center mt-8" style={{ color: '#9ca3af' }}>
          Powered by{' '}
          <a href="https://www.flotalabs.co.ke" style={{ color: '#9d16f1', fontWeight: 500 }}>
            Flota Labs
          </a>
        </p>
      </div>
    </div>
  );
}
