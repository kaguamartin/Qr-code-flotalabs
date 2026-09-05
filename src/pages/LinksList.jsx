import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, QrCode, Search, Archive, RotateCcw } from 'lucide-react';
import { TypeChip, ConfirmDialog } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';

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
  const { membership, can } = useAuth();
  const orgId = membership?.organizations?.id;

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('active'); // 'active' | 'archived'
  const [confirmTarget, setConfirmTarget] = useState(null); // link being archived, or null
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    loadLinks();
  }, [orgId, view]);

  async function loadLinks() {
    setLoading(true);
    setError('');

    let query = supabase
      .from('links')
      .select(`
        id,
        short_code,
        created_at,
        archived_at,
        destination_types(key, display_name),
        campaigns(name, corridor),
        clicks(count)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    query = view === 'active' ? query.is('archived_at', null) : query.not('archived_at', 'is', null);

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      setLinks(data);
    }
    setLoading(false);
  }

  async function handleArchive(link) {
    setActionError('');
    const { error } = await supabase
      .from('links')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', link.id);
    setConfirmTarget(null);
    if (error) { setActionError(error.message); return; }
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
  }

  async function handleRestore(link) {
    setActionError('');
    const { error } = await supabase
      .from('links')
      .update({ archived_at: null })
      .eq('id', link.id);
    if (error) { setActionError(error.message); return; }
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
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
      {confirmTarget && (
        <ConfirmDialog
          title="Archive this link?"
          message="It will stop redirecting and disappear from your active links. Scan history is kept, and you can restore it later from the Archived tab."
          confirmLabel="Archive"
          danger
          onConfirm={() => handleArchive(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Links & QR codes</h1>
          <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
            {links.length} {links.length === 1 ? 'link' : 'links'} {view === 'archived' ? 'archived' : 'in your workspace'}
          </p>
        </div>
        {can('links.create') && (
          <Link to="/app/links/new" className="btn-primary">
            <Plus size={16} /> New link
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }} />
          <input
            className="input-field pl-9"
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg p-0.5 shrink-0" style={{ background: 'var(--color-canvas)' }}>
          {['active', 'archived'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-all"
              style={{
                background: view === v ? 'var(--color-surface)' : 'transparent',
                color: view === v ? 'var(--color-ink-primary)' : 'var(--color-ink-tertiary)',
                boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
          {actionError}
        </p>
      )}

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
                  {search
                    ? 'No links match your search.'
                    : view === 'archived'
                      ? 'No archived links.'
                      : 'No links yet — create your first QR code to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-[var(--color-canvas)]" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-5 py-3 font-mono text-xs">
                    <Link to={`/app/links/${l.id}`} className="hover:underline">
                      {SHORT_LINK_BASE_URL.replace('https://', '')}/{l.short_code}
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
                  <td className="py-3 text-right font-medium">{l.clicks?.[0]?.count ?? 0}</td>
                  <td className="py-3 text-right" style={{ color: 'var(--color-ink-secondary)' }}>—</td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {view === 'active' ? (
                        <>
                          <Link to={`/app/links/${l.id}`}>
                            <QrCode size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                          </Link>
                          {can('links.delete') && (
                            <button onClick={() => setConfirmTarget(l)} title="Archive">
                              <Archive size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                            </button>
                          )}
                        </>
                      ) : (
                        can('links.delete') && (
                          <button onClick={() => handleRestore(l)} title="Restore" className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-brand-blue)' }}>
                            <RotateCcw size={13} /> Restore
                          </button>
                        )
                      )}
                    </div>
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