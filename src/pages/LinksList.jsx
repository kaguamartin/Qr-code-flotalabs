import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, QrCode, Search, Archive, RotateCcw, Copy } from 'lucide-react';
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
  wifi: 'purple', calendar: 'indigo', digital_vcard: 'amber',
};

export default function LinksList() {
  const { membership, can } = useAuth();
  const navigate = useNavigate();
  const orgId = membership?.organizations?.id;

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('active'); // 'active' | 'archived'
  const [confirmTarget, setConfirmTarget] = useState(null); // single link, or null
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [actionError, setActionError] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'scans' | 'alpha'
  const [typeFilter, setTypeFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [corridorFilter, setCorridorFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (!orgId) return;
    loadLinks();
  }, [orgId, view]);

  // selection doesn't carry meaning across a view switch or reload
  useEffect(() => { setSelectedIds(new Set()); }, [view]);

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
        destination_type_id,
        destination_data,
        campaign_id,
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

  async function handleBulkArchive() {
    setActionError('');
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('links')
      .update({ archived_at: new Date().toISOString() })
      .in('id', ids);
    setConfirmBulk(false);
    if (error) { setActionError(error.message); return; }
    setLinks((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    setSelectedIds(new Set());
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

  function handleDuplicate(link) {
    navigate('/app/links/new', {
      state: {
        duplicateFrom: {
          destination_type_id: link.destination_type_id,
          destination_data: link.destination_data,
          campaign_id: link.campaign_id,
          corridor: link.campaigns?.corridor ?? '',
        },
      },
    });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids) {
    setSelectedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)));
  }

  // filter option lists, derived from whatever's actually loaded
  const typeOptions = [...new Map(links.map((l) => [l.destination_types?.key, l.destination_types?.display_name]).filter(([k]) => k)).entries()];
  const campaignOptions = [...new Set(links.map((l) => l.campaigns?.name).filter(Boolean))];
  const corridorOptions = [...new Set(links.map((l) => l.campaigns?.corridor).filter(Boolean))];

  let filtered = links.filter((l) => {
    const term = search.toLowerCase();
    const matchesSearch = (
      l.short_code?.toLowerCase().includes(term) ||
      l.destination_types?.display_name?.toLowerCase().includes(term) ||
      l.campaigns?.name?.toLowerCase().includes(term) ||
      l.campaigns?.corridor?.toLowerCase().includes(term)
    );
    const matchesType = !typeFilter || l.destination_types?.key === typeFilter;
    const matchesCampaign = !campaignFilter || l.campaigns?.name === campaignFilter;
    const matchesCorridor = !corridorFilter || l.campaigns?.corridor === corridorFilter;
    return matchesSearch && matchesType && matchesCampaign && matchesCorridor;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'scans') return (b.clicks?.[0]?.count ?? 0) - (a.clicks?.[0]?.count ?? 0);
    if (sortBy === 'alpha') return a.short_code.localeCompare(b.short_code);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const visibleIds = filtered.map((l) => l.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

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
      {confirmBulk && (
        <ConfirmDialog
          title={`Archive ${selectedIds.size} link${selectedIds.size === 1 ? '' : 's'}?`}
          message="They'll stop redirecting and disappear from your active links. Scan history is kept, and you can restore them later from the Archived tab."
          confirmLabel="Archive"
          danger
          onConfirm={handleBulkArchive}
          onCancel={() => setConfirmBulk(false)}
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

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative max-w-xs flex-1 min-w-[160px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }} />
            <input
              className="input-field pl-9"
              placeholder="Search links..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input-field w-auto text-xs h-9" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {typeOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          {campaignOptions.length > 0 && (
            <select className="input-field w-auto text-xs h-9" value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}>
              <option value="">All campaigns</option>
              {campaignOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {corridorOptions.length > 0 && (
            <select className="input-field w-auto text-xs h-9" value={corridorFilter} onChange={(e) => setCorridorFilter(e.target.value)}>
              <option value="">All corridors</option>
              {corridorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select className="input-field w-auto text-xs h-9" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="scans">Most scanned</option>
            <option value="alpha">Alphabetical</option>
          </select>
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

      {view === 'active' && selectedIds.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-4 py-2 rounded-lg" style={{ background: 'var(--color-info-bg)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--color-info-fg)' }}>
            {selectedIds.size} selected
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>
              Clear
            </button>
            {can('links.delete') && (
              <button onClick={() => setConfirmBulk(true)} className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-danger-fg)' }}>
                <Archive size={12} /> Archive selected
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {view === 'active' && can('links.delete') && (
                <th className="pl-5 py-2.5 w-8">
                  <input type="checkbox" checked={allVisibleSelected} onChange={() => toggleSelectAll(visibleIds)} />
                </th>
              )}
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
                <td colSpan={8} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-ink-tertiary)' }}>
                  {search || typeFilter || campaignFilter || corridorFilter
                    ? 'No links match your filters.'
                    : view === 'archived'
                      ? 'No archived links.'
                      : 'No links yet — create your first QR code to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-[var(--color-canvas)]" style={{ borderColor: 'var(--color-border)' }}>
                  {view === 'active' && can('links.delete') && (
                    <td className="pl-5 py-3">
                      <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => toggleSelect(l.id)} />
                    </td>
                  )}
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
                          {can('links.create') && (
                            <button onClick={() => handleDuplicate(l)} title="Duplicate">
                              <Copy size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                            </button>
                          )}
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