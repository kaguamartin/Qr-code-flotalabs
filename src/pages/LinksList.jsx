import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, QrCode, Search } from 'lucide-react';
import { TypeChip } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

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

export default function LinksList() {
  const { membership } = useAuth();
  const orgId = membership?.organizations?.id;

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!orgId) return;
    loadLinks();
  }, [orgId]);

  async function loadLinks() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('links')
      .select(`
        id,
        short_code,
        created_at,
        destination_types(key, display_name),
        campaigns(name, corridor)
      `)
      .eq('org_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setLinks(data);
    }
    setLoading(false);
  }

  const filtered = links.filter((l) => {
    const term = search.toLowerCase();
    return (
      l.short_code?.toLowerCase().includes(term) ||
      l.destination_types?.display_name?.toLowerCase().includes(term) ||
      l.campaigns?.name?.toLowerCase().includes(term) ||
      l.campaigns?.corridor?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="text-sm" style={{ color: 'var(--color-danger-fg)' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Links & QR codes</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
            {links.length} {links.length === 1 ? 'link' : 'links'} in your workspace
          </p>
        </div>
        <Link to="/app/links/new" className="btn-primary">
          <Plus size={16} /> New link
        </Link>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }} />
        <input
          className="input-field pl-9"
          placeholder="Search links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {['Link', 'Type', 'Corridor', 'Campaign', 'Scans', 'Conv.', ''].map((h, i) => (
                <th key={h + i} className={`text-left px-5 py-2.5 text-xs font-normal ${i >= 4 ? 'text-right' : ''}`} style={{ color: 'var(--color-ink-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                  {search ? 'No links match your search.' : 'No links yet — create your first QR code to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-[var(--color-canvas)]" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-5 py-3 font-mono text-xs">
                    <Link to={`/app/links/${l.id}`} className="hover:underline">
                      flota.ke/{l.short_code}
                    </Link>
                  </td>
                  <td className="py-3">
                    <TypeChip color={typeColorMap[l.destination_types?.key] ?? 'blue'}>
                      {l.destination_types?.display_name ?? '—'}
                    </TypeChip>
                  </td>
                  <td className="py-3" style={{ color: 'var(--color-ink-secondary)' }}>
                    {l.campaigns?.corridor ?? '—'}
                  </td>
                  <td className="py-3" style={{ color: 'var(--color-ink-secondary)' }}>
                    {l.campaigns?.name ?? '—'}
                  </td>
                  <td className="py-3 text-right font-medium">—</td>
                  <td className="py-3 text-right" style={{ color: 'var(--color-ink-secondary)' }}>—</td>
                  <td className="py-3 px-5 text-right">
                    <Link to={`/app/links/${l.id}`}>
                      <QrCode size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}