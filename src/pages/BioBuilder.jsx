import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const QUICK_TYPES = [
  { key: 'website',   label: 'Website / URL',  icon: 'Globe',          color: 'blue',   fields: [{ key: 'url', label: 'URL', type: 'url', placeholder: 'https://...' }] },
  { key: 'call',      label: 'Phone call',      icon: 'Phone',          color: 'green',  fields: [{ key: 'phone', label: 'Phone number', type: 'tel', placeholder: '+254 70 000 000' }] },
  { key: 'whatsapp',  label: 'WhatsApp',        icon: 'MessageCircle',  color: 'pink',   fields: [{ key: 'url', label: 'WhatsApp link', type: 'url', placeholder: 'https://wa.me/254700000000' }] },
  { key: 'email',     label: 'Email',           icon: 'Mail',           color: 'amber',  fields: [{ key: 'to', label: 'Email address', type: 'email', placeholder: 'you@example.com' }] },
  { key: 'social',    label: 'Social media',    icon: 'Share2',         color: 'teal',   fields: [{ key: 'url', label: 'Profile URL', type: 'url', placeholder: 'https://instagram.com/...' }] },
  { key: 'pdf',       label: 'PDF / brochure',  icon: 'FileText',       color: 'coral',  fields: [{ key: 'url', label: 'PDF URL', type: 'url', placeholder: 'https://...' }] },
];

function AddBlockModal({ onAdd, onClose }) {
  const [selectedType, setSelectedType] = useState(null);
  const [label, setLabel] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [error, setError] = useState('');

  function handleTypeSelect(type) {
    setSelectedType(type);
    setLabel(type.label);
    setFieldValues({});
    setError('');
  }

  function handleSubmit() {
    if (!selectedType) { setError('Please select a type.'); return; }
    if (!label.trim()) { setError('Please enter a button label.'); return; }
    const firstField = selectedType.fields[0];
    if (firstField && !fieldValues[firstField.key]?.trim()) {
      setError(`${firstField.label} is required.`);
      return;
    }
    onAdd({
      type_key: selectedType.key,
      label: label.trim(),
      icon: selectedType.icon,
      color: selectedType.color,
      destination_data: fieldValues,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">Add button</p>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}>
            <Icons.X size={16} />
          </button>
        </div>

        {error && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </p>
        )}

        <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>Button type</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_TYPES.map((t) => {
            const Icon = Icons[t.icon] ?? Icons.Link;
            const selected = selectedType?.key === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTypeSelect(t)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all"
                style={{
                  borderColor: selected ? `var(--color-type-${t.color}-fg)` : 'var(--color-border)',
                  borderWidth: selected ? 2 : 1,
                  background: selected ? `var(--color-type-${t.color}-bg)` : 'transparent',
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `var(--color-type-${t.color}-bg)` }}>
                  <Icon size={13} style={{ color: `var(--color-type-${t.color}-fg)` }} />
                </div>
                <span className="text-[10px] leading-tight" style={{ color: 'var(--color-ink-secondary)' }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <div className="flex flex-col gap-3 mb-4">
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Button label</label>
              <input className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Visit our website" />
            </div>
            {selectedType.fields.map((f) => (
              <div key={f.key}>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>{f.label}</label>
                <input
                  className="input-field"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={fieldValues[f.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1 justify-center" disabled={!selectedType}>Add button</button>
        </div>
      </div>
    </div>
  );
}

export default function BioBuilder() {
  const { membership } = useAuth();
  const orgId = membership?.organizations?.id;

  const [bioLinks, setBioLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [bioPage, setBioPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    loadBioLinks();
  }, [orgId]);

  useEffect(() => {
    if (!selectedLinkId) return;
    loadBioPage(selectedLinkId);
  }, [selectedLinkId]);

  async function loadBioLinks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('links')
      .select('id, short_code, destination_types!inner(key)')
      .eq('org_id', orgId)
      .eq('destination_types.key', 'bio_page')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) { setError(error.message); setLoading(false); return; }
    setBioLinks(data ?? []);
    if (data?.length > 0) setSelectedLinkId(data[0].id);
    else setLoading(false);
  }

  async function loadBioPage(linkId) {
    setLoading(true);
    setError('');

    const { data: pageData, error: pageError } = await supabase
      .from('bio_pages')
      .select('*')
      .eq('link_id', linkId)
      .maybeSingle();

    if (pageError) { setError(pageError.message); setLoading(false); return; }

    if (!pageData) {
      // no bio_page row yet — create one
      const { data: newPage, error: createError } = await supabase
        .from('bio_pages')
        .insert({ link_id: linkId, header_title: '', header_subtitle: '' })
        .select()
        .single();
      if (createError) { setError(createError.message); setLoading(false); return; }
      setBioPage(newPage);
      setTitle('');
      setSubtitle('');
      setBlocks([]);
      setLoading(false);
      return;
    }

    setBioPage(pageData);
    setTitle(pageData.header_title ?? '');
    setSubtitle(pageData.header_subtitle ?? '');

    const { data: blockData, error: blockError } = await supabase
      .from('bio_page_blocks')
      .select('*, destination_types(key, display_name)')
      .eq('bio_page_id', pageData.id)
      .order('sort_order', { ascending: true });

    if (blockError) { setError(blockError.message); setLoading(false); return; }
    setBlocks(blockData ?? []);
    setLoading(false);
  }

  async function saveHeader() {
    if (!bioPage) return;
    setSaving(true);
    await supabase
      .from('bio_pages')
      .update({ header_title: title, header_subtitle: subtitle })
      .eq('id', bioPage.id);
    setSaving(false);
  }

  async function handleDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setBlocks(next);
    setDragIndex(null);

    // update sort_order in database
    await Promise.all(
      next.map((b, i) =>
        supabase.from('bio_page_blocks').update({ sort_order: i }).eq('id', b.id)
      )
    );
  }

  async function updateLabel(id, label) {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, label } : b)));
    await supabase.from('bio_page_blocks').update({ label }).eq('id', id);
  }

  async function removeBlock(id) {
    setBlocks(blocks.filter((b) => b.id !== id));
    await supabase.from('bio_page_blocks').delete().eq('id', id);
  }

  async function handleAddBlock(blockData) {
    if (!bioPage) return;

    // find the destination_type id for this block type key
    const { data: typeData } = await supabase
      .from('destination_types')
      .select('id')
      .eq('key', blockData.type_key)
      .single();

    if (!typeData) return;

    const { data: newBlock, error } = await supabase
      .from('bio_page_blocks')
      .insert({
        bio_page_id: bioPage.id,
        destination_type_id: typeData.id,
        label: blockData.label,
        icon: blockData.icon,
        destination_data: blockData.destination_data,
        sort_order: blocks.length,
      })
      .select('*, destination_types(key, display_name)')
      .single();

    if (error) { setError(error.message); return; }
    setBlocks([...blocks, newBlock]);
    setShowAddModal(false);
  }

  const selectedLink = bioLinks.find((l) => l.id === selectedLinkId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Icons.Loader size={16} className="animate-spin" style={{ color: 'var(--color-ink-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (bioLinks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-canvas)' }}>
          <Icons.ListTree size={22} style={{ color: 'var(--color-ink-tertiary)' }} />
        </div>
        <p className="text-sm font-medium mb-1">No link-in-bio pages yet</p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
          Create a new link and  choose "Link-in-bio" as the destination type to get started.
        </p>
        <a href="/app/links/new" className="btn-primary text-sm">
          <Icons.Plus size={15} /> Create bio page
        </a>
      </div>
    );
  }

  return (
    <div>
      {showAddModal && (
        <AddBlockModal
          onAdd={handleAddBlock}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Link-in-bio page</h1>
          {bioLinks.length > 1 ? (
            <select
              className="input-field mt-1 w-auto font-mono text-xs"
              value={selectedLinkId}
              onChange={(e) => setSelectedLinkId(e.target.value)}
            >
              {bioLinks.map((l) => (
                <option key={l.id} value={l.id}>flota.ke/{l.short_code}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-mono" style={{ color: 'var(--color-ink-secondary)' }}>
              flota.ke/{selectedLink?.short_code}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Icons.QrCode size={15} /> View QR</button>
          <button
            className="btn-primary"
            onClick={saveHeader}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
          {error}
        </p>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: '1.4fr 0.8fr' }}>
        <div>
          {/* header editor */}
          <div className="card p-4 mb-3.5">
            <p className="text-sm font-medium mb-2.5">Page header</p>
            <div className="flex gap-2.5 items-center">
              <div className="w-11 h-11 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  className="input-field text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Page title"
                  onBlur={saveHeader}
                />
                <input
                  className="input-field text-xs"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Short description"
                  onBlur={saveHeader}
                />
              </div>
            </div>
          </div>

          {/* blocks list */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Buttons</p>
            <span className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
              {blocks.length} button{blocks.length !== 1 ? 's' : ''} · Drag to reorder
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {blocks.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--color-ink-tertiary)' }}>
                No buttons yet — add one below.
              </p>
            ) : (
              blocks.map((b, i) => {
                const iconName = b.icon ?? 'Link';
                const Icon = Icons[iconName] ?? Icons.Link;
                const color = b.destination_types?.key === 'phone' ? 'green'
                  : b.destination_types?.key === 'email' ? 'amber'
                  : b.destination_types?.key === 'social' ? 'teal'
                  : b.destination_types?.key === 'whatsapp' ? 'pink'
                  : 'blue';

                return (
                  <div
                    key={b.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                    className="card flex items-center gap-2.5 px-3 py-2.5 cursor-grab"
                  >
                    <Icons.GripVertical size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `var(--color-type-${color}-bg)` }}
                    >
                      <Icon size={14} style={{ color: `var(--color-type-${color}-fg)` }} />
                    </div>
                    <input
                      className="flex-1 text-sm bg-transparent outline-none"
                      value={b.label ?? ''}
                      onChange={(e) => updateLabel(b.id, e.target.value)}
                      onBlur={(e) => updateLabel(b.id, e.target.value)}
                    />
                    <span className="text-xs shrink-0" style={{ color: 'var(--color-ink-tertiary)' }}>
                      {b.destination_types?.display_name ?? '—'}
                    </span>
                    <Icons.BarChart3 size={14} style={{ color: 'var(--color-ink-tertiary)' }} />
                    <button onClick={() => removeBlock(b.id)}>
                      <Icons.Trash2 size={14} style={{ color: 'var(--color-ink-tertiary)' }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full h-9 rounded-lg border border-dashed text-sm flex items-center justify-center gap-1.5"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-secondary)' }}
          >
            <Icons.Plus size={15} /> Add button
          </button>
        </div>

        {/* phone preview */}
        <div className="flex justify-center">
          <div className="w-60 rounded-3xl border-4 bg-white p-5 shadow-lg" style={{ borderColor: '#1a1a1a' }}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-full mb-2.5" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
              <p className="font-semibold text-sm">{title || 'Page title'}</p>
              <p className="text-xs mt-1" style={{ color: '#666' }}>{subtitle || 'Short description'}</p>
            </div>
            <div className="flex flex-col gap-2">
              {blocks.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: '#999' }}>No buttons yet</p>
              ) : (
                blocks.map((b) => {
                  const iconName = b.icon ?? 'Link';
                  const Icon = Icons[iconName] ?? Icons.Link;
                  const color = b.destination_types?.key === 'phone' ? 'green'
                    : b.destination_types?.key === 'email' ? 'amber'
                    : b.destination_types?.key === 'social' ? 'teal'
                    : b.destination_types?.key === 'whatsapp' ? 'pink'
                    : 'blue';
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: `var(--color-type-${color}-bg)` }}
                    >
                      <Icon size={14} style={{ color: `var(--color-type-${color}-fg)` }} />
                      <span className="text-xs font-medium" style={{ color: `var(--color-type-${color}-fg)` }}>
                        {b.label || 'Button'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
