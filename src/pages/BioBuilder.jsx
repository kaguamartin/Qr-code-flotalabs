import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';
import { ConfirmDialog } from '../components/Shared';

const QUICK_TYPES = [
  { key: 'website',  label: 'Website / URL', icon: 'Globe',         color: 'blue',  fields: [{ key: 'url',   label: 'URL',           type: 'url',   placeholder: 'https://...' }] },
  { key: 'call',     label: 'Phone call',    icon: 'Phone',         color: 'green', fields: [{ key: 'phone', label: 'Phone number',  type: 'tel',   placeholder: '+254 700 000 000' }] },
  { key: 'whatsapp', label: 'WhatsApp',      icon: 'MessageCircle', color: 'pink',  fields: [{ key: 'url',   label: 'WhatsApp link', type: 'url',   placeholder: 'https://wa.me/254700000000' }] },
  { key: 'email',    label: 'Email',         icon: 'Mail',          color: 'amber', fields: [{ key: 'to',    label: 'Email address', type: 'email', placeholder: 'you@example.com' }] },
  { key: 'social',   label: 'Social media',  icon: 'Share2',        color: 'teal',  fields: [] },
  { key: 'pdf',      label: 'PDF / brochure',icon: 'FileText',      color: 'coral', fields: [{ key: 'url',   label: 'PDF URL',       type: 'url',   placeholder: 'https://...' }] },
];

export function getBlockDisplay(block) {
  const typeKey = block.destination_types?.key ?? '';
  const data = block.destination_data ?? {};
  const platform = data.platform;

  if (typeKey === 'social' || typeKey === 'whatsapp') {
    let domain = 'globe.com';
    if (platform && platform !== 'custom') {
      const domainMap = {
        facebook: 'facebook.com', instagram: 'instagram.com', tiktok: 'tiktok.com',
        twitter: 'x.com', youtube: 'youtube.com', whatsapp: 'whatsapp.com',
        linkedin: 'linkedin.com', spotify: 'open.spotify.com', telegram: 'telegram.org',
        snapchat: 'snapchat.com', pinterest: 'pinterest.com', discord: 'discord.com',
        bereal: 'bere.al', threads: 'threads.net',
      };
      domain = domainMap[platform] ?? platform + '.com';
    } else if (typeKey === 'whatsapp') {
      domain = 'whatsapp.com';
    } else if (data.url) {
      try { domain = new URL(data.url).hostname; } catch {}
    }
    return { type: 'favicon', src: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`, bg: '#f3f4f6', fg: '#374151' };
  }

  const iconName = block.icon ?? 'Globe';
  const colorMap = {
    call: ['#dcfce7', '#16a34a'], save_number: ['#dcfce7', '#16a34a'],
    email: ['#fef3c7', '#d97706'], pdf: ['#fee2e2', '#dc2626'],
    website: ['#dbeafe', '#2563eb'],
  };
  const colors = colorMap[typeKey] ?? ['#dbeafe', '#2563eb'];
  return { type: 'icon', iconName, bg: colors[0], fg: colors[1] };
}

function BlockIcon({ display, size = 14 }) {
  if (display.type === 'favicon') {
    return (
      <img
        src={display.src}
        className="rounded object-contain"
        style={{ width: size + 2, height: size + 2 }}
        alt=""
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  const Icon = Icons[display.iconName] ?? Icons.Globe;
  return <Icon size={size} style={{ color: display.fg }} />;
}

function QRModal({ shortCode, onClose }) {
  function downloadQR() {
    const svg = document.querySelector('#bio-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
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

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-xs flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <p className="text-sm font-medium">QR Code</p>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}><Icons.X size={16} /></button>
        </div>
        <QRCodeSVG id="bio-qr-svg" value={`${SHORT_LINK_BASE_URL}/p/${shortCode}`} size={180} level="M" />
        <p className="font-mono text-xs text-center" style={{ color: 'var(--color-ink-secondary)' }}>
          {SHORT_LINK_BASE_URL.replace('https://', '')}/p/{shortCode}
        </p>
        <div className="flex gap-2 w-full">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-xs">Close</button>
          <button onClick={downloadQR} className="btn-primary flex-1 justify-center text-xs">
            <Icons.Download size={13} /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBlockModal({ onAdd, onSave, onClose, socialPlatforms, editingBlock = null }) {
  const isEditing = !!editingBlock;

  const initialType = isEditing ? QUICK_TYPES.find((t) => t.key === editingBlock.destination_types?.key) : null;
  const initialPlatform = isEditing && initialType?.key === 'social'
    ? socialPlatforms.find((p) => p.key === editingBlock.destination_data?.platform) ?? null
    : null;

  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedPlatform, setSelectedPlatform] = useState(initialPlatform);
  const [label, setLabel] = useState(editingBlock?.label ?? '');
  const [fieldValues, setFieldValues] = useState(editingBlock?.destination_data ?? {});
  const [error, setError] = useState('');

  function handleTypeSelect(type) {
    setSelectedType(type);
    setSelectedPlatform(null);
    setLabel(type.label);
    setFieldValues({});
    setError('');
  }

  function handlePlatformSelect(platform) {
    setSelectedPlatform(platform);
    setLabel(platform.name);
    setFieldValues({});
  }

  function handleSubmit() {
    if (!selectedType) { setError('Please select a type.'); return; }
    if (!label.trim()) { setError('Please enter a button label.'); return; }

    if (selectedType.key === 'social') {
      if (!selectedPlatform) { setError('Please select a platform.'); return; }
      if (!fieldValues.url?.trim()) { setError('URL is required.'); return; }
      const payload = {
        type_key: 'social',
        label: label.trim(),
        icon: 'Share2',
        color: 'teal',
        destination_data: { ...fieldValues, platform: selectedPlatform.key },
      };
      isEditing ? onSave(payload) : onAdd(payload);
      return;
    }

    const firstField = selectedType.fields[0];
    if (firstField && !fieldValues[firstField.key]?.trim()) {
      setError(firstField.label + ' is required.');
      return;
    }
    const payload = {
      type_key: selectedType.key,
      label: label.trim(),
      icon: selectedType.icon,
      color: selectedType.color,
      destination_data: fieldValues,
    };
    isEditing ? onSave(payload) : onAdd(payload);
  }

  const isSocial = selectedType?.key === 'social';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">{isEditing ? 'Edit button' : 'Add button'}</p>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}><Icons.X size={16} /></button>
        </div>

        {error && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </p>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-canvas)' }}>
            {(() => {
              const Icon = Icons[selectedType?.icon] ?? Icons.Link;
              return <Icon size={14} style={{ color: 'var(--color-ink-secondary)' }} />;
            })()}
            <span className="text-xs font-medium">{selectedType?.label}</span>
            <span className="text-[11px] ml-auto" style={{ color: 'var(--color-ink-tertiary)' }}>Type can't be changed</span>
          </div>
        ) : (
          <>
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
                      borderColor: selected ? 'var(--color-brand-blue)' : 'var(--color-border)',
                      borderWidth: selected ? 2 : 1,
                      background: selected ? 'var(--color-info-bg)' : 'transparent',
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-type-' + t.color + '-bg)' }}>
                      <Icon size={13} style={{ color: 'var(--color-type-' + t.color + '-fg)' }} />
                    </div>
                    <span className="text-[10px] leading-tight" style={{ color: 'var(--color-ink-secondary)' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* social platform picker */}
        {isSocial && !selectedPlatform && (
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>Choose platform</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
              {socialPlatforms.map((platform) => {
                const faviconDomain = platform.url_prefix?.replace('https://', '').replace(/\/$/, '') || platform.key + '.com';
                return (
                  <button
                    key={platform.key}
                    onClick={() => handlePlatformSelect(platform)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:shadow-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {platform.key === 'custom' ? (
                      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                        <Icons.Plus size={12} style={{ color: '#6b7280' }} />
                      </div>
                    ) : (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
                        className="w-6 h-6 rounded object-contain"
                        alt={platform.name}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <span className="text-[10px] leading-tight" style={{ color: 'var(--color-ink-secondary)' }}>{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* social platform selected */}
        {isSocial && selectedPlatform && (
          <div className="mb-4">
            <button
              onClick={() => setSelectedPlatform(null)}
              className="flex items-center gap-1 text-xs mb-3 w-fit"
              style={{ color: 'var(--color-brand-blue)' }}
            >
              <Icons.ChevronLeft size={13} /> Change platform
            </button>
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-canvas)' }}>
              {selectedPlatform.key !== 'custom' && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${selectedPlatform.url_prefix?.replace('https://', '').replace(/\/$/, '') || selectedPlatform.key + '.com'}&sz=32`}
                  className="w-5 h-5 rounded object-contain"
                  alt={selectedPlatform.name}
                />
              )}
              <span className="text-xs font-medium">{selectedPlatform.name}</span>
            </div>
            <div className="mb-3">
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                {selectedPlatform.name} URL <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
              </label>
              <input
                className="input-field"
                type="url"
                placeholder={selectedPlatform.url_placeholder ?? 'https://...'}
                value={fieldValues.url ?? ''}
                onChange={(e) => setFieldValues((prev) => ({ ...prev, url: e.target.value }))}
              />
              {selectedPlatform.url_hint && (
                <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                  <Icons.Info size={10} /> {selectedPlatform.url_hint}
                </p>
              )}
            </div>
          </div>
        )}

        {/* regular fields */}
        {selectedType && !isSocial && (
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
                {f.type === 'url' && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}><Icons.Info size={10} /> Must start with https://</p>}
                {f.type === 'tel' && <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}><Icons.Info size={10} /> Include country code e.g. +254 700 000 000</p>}
              </div>
            ))}
          </div>
        )}

        {/* label field for social after platform selected */}
        {isSocial && selectedPlatform && (
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Button label</label>
            <input className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Follow us on Instagram" />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1 justify-center"
            disabled={!selectedType || (isSocial && !selectedPlatform)}
          >
            {isEditing ? 'Save changes' : 'Add button'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewBioPageModal({ orgId, orgSlug, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim()) { setError('Please enter a page name.'); return; }
    setSubmitting(true);
    setError('');

    const slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 15);
    // generate clean short code, check availability
let shortCode = orgSlug + '-' + slug;
const { data: existing } = await supabase
  .from('links')
  .select('id')
  .eq('short_code', shortCode)
  .maybeSingle();

if (existing) {
  // only add a number if there's a conflict
  shortCode = orgSlug + '-' + slug + '-' + Math.floor(Math.random() * 900 + 100);
}

    const { data: typeData } = await supabase
      .from('destination_types')
      .select('id')
      .eq('key', 'bio_page')
      .single();

    if (!typeData) { setError('Bio page type not found.'); setSubmitting(false); return; }

    const { data: newLink, error: linkError } = await supabase
      .from('links')
      .insert({ org_id: orgId, destination_type_id: typeData.id, short_code: shortCode, destination_data: {} })
      .select()
      .single();

    if (linkError) { setError(linkError.message); setSubmitting(false); return; }

    const { error: pageError } = await supabase
      .from('bio_pages')
      .insert({ link_id: newLink.id, header_title: name.trim(), header_subtitle: '' });

    if (pageError) { setError(pageError.message); setSubmitting(false); return; }

    onCreated(newLink.id);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">New bio page</p>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}><Icons.X size={16} /></button>
        </div>
        {error && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>{error}</p>}
        <div className="mb-4">
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Page name</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bidco Africa" />
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-ink-tertiary)' }}>
            Short link: {SHORT_LINK_BASE_URL.replace('https://', '')}/p/{orgSlug}-{name ? name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 15) : '...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleCreate} disabled={submitting} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {submitting ? 'Creating...' : 'Create page'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BioBuilder() {
  const { membership, can } = useAuth();
  const orgId = membership?.organizations?.id;
  const orgSlug = membership?.organizations?.slug ?? '';

  const [bioLinks, setBioLinks] = useState([]);
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [listFilter, setListFilter] = useState('active'); // 'active' | 'archived'
  const [confirmArchiveLink, setConfirmArchiveLink] = useState(null);
  const [bioPage, setBioPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [socialPlatforms, setSocialPlatforms] = useState([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return;
    loadBioLinks();
    loadSocialPlatforms();
  }, [orgId, listFilter]);

  useEffect(() => {
    if (!selectedLinkId || view !== 'editor') return;
    loadBioPage(selectedLinkId);
  }, [selectedLinkId, view]);

  async function loadSocialPlatforms() {
    const { data } = await supabase.from('social_platforms').select('*').order('sort_order');
    setSocialPlatforms(data ?? []);
  }

  async function loadBioLinks() {
    setLoading(true);
    setError('');
    let query = supabase
      .from('links')
      .select(`
        id,
        short_code,
        archived_at,
        created_at,
        destination_types!inner(key),
        bio_pages(header_title, header_subtitle, bio_page_blocks(count)),
        clicks(count)
      `)
      .eq('org_id', orgId)
      .eq('destination_types.key', 'bio_page')
      .order('created_at', { ascending: false });

    query = listFilter === 'active' ? query.is('archived_at', null) : query.not('archived_at', 'is', null);

    const { data, error } = await query;

    if (error) { setError(error.message); setLoading(false); return; }
    setBioLinks(data ?? []);
    setLoading(false);
  }

  async function handleArchiveBioLink(link) {
    const { error } = await supabase
      .from('links')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', link.id);
    setConfirmArchiveLink(null);
    if (error) { setError(error.message); return; }
    await loadBioLinks();
  }

  async function handleRestoreBioLink(link) {
    const { error } = await supabase
      .from('links')
      .update({ archived_at: null })
      .eq('id', link.id);
    if (error) { setError(error.message); return; }
    await loadBioLinks();
  }

  async function loadBioPage(linkId) {
    setLoading(true);
    setError('');

    const { data: pageData, error: pageError } = await supabase
      .from('bio_pages').select('*').eq('link_id', linkId).maybeSingle();

    if (pageError) { setError(pageError.message); setLoading(false); return; }

    if (!pageData) {
      const { data: newPage, error: createError } = await supabase
        .from('bio_pages')
        .insert({ link_id: linkId, header_title: '', header_subtitle: '' })
        .select().single();
      if (createError) { setError(createError.message); setLoading(false); return; }
      setBioPage(newPage);
      setTitle(''); setSubtitle(''); setBlocks([]);
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
    setSaveSuccess(false);
    const { error } = await supabase
      .from('bio_pages')
      .update({ header_title: title, header_subtitle: subtitle })
      .eq('id', bioPage.id);
    setSaving(false);
    if (!error) { setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); }
  }

  async function handleDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setBlocks(next);
    setDragIndex(null);
    await Promise.all(next.map((b, i) => supabase.from('bio_page_blocks').update({ sort_order: i }).eq('id', b.id)));
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
    const { data: typeData } = await supabase.from('destination_types').select('id').eq('key', blockData.type_key).single();
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

  async function handleUpdateBlock(blockData) {
    if (!editingBlock) return;
    const { data: updated, error } = await supabase
      .from('bio_page_blocks')
      .update({
        label: blockData.label,
        icon: blockData.icon,
        destination_data: blockData.destination_data,
      })
      .eq('id', editingBlock.id)
      .select('*, destination_types(key, display_name)')
      .single();

    if (error) { setError(error.message); return; }
    setBlocks(blocks.map((b) => (b.id === editingBlock.id ? updated : b)));
    setEditingBlock(null);
  }

  async function handleNewPageCreated(newLinkId) {
    setShowNewPageModal(false);
    await loadBioLinks();
    setSelectedLinkId(newLinkId);
    setView('editor');
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

  if (view === 'list') {
    return (
      <div>
        {confirmArchiveLink && (
          <ConfirmDialog
            title="Archive this bio page?"
            message="It will stop being accessible to visitors. You can restore it later from the Archived tab."
            confirmLabel="Archive"
            danger
            onConfirm={() => handleArchiveBioLink(confirmArchiveLink)}
            onCancel={() => setConfirmArchiveLink(null)}
          />
        )}
        {showNewPageModal && (
          <NewBioPageModal
            orgId={orgId}
            orgSlug={orgSlug}
            onCreated={handleNewPageCreated}
            onClose={() => setShowNewPageModal(false)}
          />
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium">Link-in-bio</h1>
            <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
              {bioLinks.length} {bioLinks.length === 1 ? 'page' : 'pages'} {listFilter === 'archived' ? 'archived' : ''}
            </p>
          </div>
          {can('links.create') && (
            <button onClick={() => setShowNewPageModal(true)} className="btn-primary">
              <Icons.Plus size={16} /> New page
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
            {error}
          </p>
        )}

        <div className="flex rounded-lg p-0.5 mb-4 w-fit" style={{ background: 'var(--color-canvas)' }}>
          {['active', 'archived'].map((v) => (
            <button
              key={v}
              onClick={() => setListFilter(v)}
              className="text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-all"
              style={{
                background: listFilter === v ? 'var(--color-surface)' : 'transparent',
                color: listFilter === v ? 'var(--color-ink-primary)' : 'var(--color-ink-tertiary)',
                boxShadow: listFilter === v ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {bioLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-canvas)' }}>
              <Icons.ListTree size={22} style={{ color: 'var(--color-ink-tertiary)' }} />
            </div>
            <p className="text-sm font-medium mb-1">
              {listFilter === 'archived' ? 'No archived bio pages' : 'No link-in-bio pages yet'}
            </p>
            {listFilter === 'active' && (
              <>
                <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
                  Create your first bio page to get started.
                </p>
                <button onClick={() => setShowNewPageModal(true)} className="btn-primary text-sm">
                  <Icons.Plus size={15} /> Create bio page
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {bioLinks.map((l) => (
              <div
                key={l.id}
                onClick={() => { setSelectedLinkId(l.id); setView('editor'); }}
                className="card p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-canvas)] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.bio_pages?.[0]?.header_title || l.short_code}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>
                    {SHORT_LINK_BASE_URL.replace('https://', '')}/{l.short_code}
                  </p>
                </div>
                <div className="flex items-center gap-5 shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{l.bio_pages?.[0]?.bio_page_blocks?.[0]?.count ?? 0}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>buttons</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{l.clicks?.[0]?.count ?? 0}</p>
                    <p className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>scans</p>
                  </div>
                  <Link
                    to={`/app/links/${l.id}`}
                    onClick={(e) => e.stopPropagation()}
                    title="View scans & analytics"
                  >
                    <Icons.BarChart3 size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                  </Link>
                  {can('links.delete') && (
                    listFilter === 'active' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmArchiveLink(l); }}
                        title="Archive"
                      >
                        <Icons.Archive size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestoreBioLink(l); }}
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--color-brand-blue)' }}
                      >
                        <Icons.RotateCcw size={13} /> Restore
                      </button>
                    )
                  )}
                  <Icons.ChevronRight size={16} style={{ color: 'var(--color-ink-tertiary)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {showAddModal && <AddBlockModal onAdd={handleAddBlock} onClose={() => setShowAddModal(false)} socialPlatforms={socialPlatforms} />}
      {editingBlock && (
        <AddBlockModal
          editingBlock={editingBlock}
          onSave={handleUpdateBlock}
          onClose={() => setEditingBlock(null)}
          socialPlatforms={socialPlatforms}
        />
      )}
      {confirmDeleteBlock && (
        <ConfirmDialog
          title="Delete this button?"
          message={`"${confirmDeleteBlock.label}" will be removed from your bio page. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { removeBlock(confirmDeleteBlock.id); setConfirmDeleteBlock(null); }}
          onCancel={() => setConfirmDeleteBlock(null)}
        />
      )}
      {showQRModal && selectedLink && <QRModal shortCode={selectedLink.short_code} onClose={() => setShowQRModal(false)} />}

      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <button
              onClick={() => setView('list')}
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              <Icons.ChevronLeft size={13} /> All bio pages
            </button>
            {selectedLink && (
              <Link
                to={`/app/links/${selectedLink.id}`}
                className="text-xs flex items-center gap-1"
                style={{ color: 'var(--color-ink-secondary)' }}
              >
                <Icons.BarChart3 size={13} /> View scans & analytics
              </Link>
            )}
          </div>
          <h1 className="text-lg font-medium">{bioPage?.header_title || 'Link-in-bio'}</h1>
          <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--color-ink-secondary)' }}>
            {SHORT_LINK_BASE_URL.replace('https://', '')}/p/{selectedLink?.short_code}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success-fg)' }}>
              <Icons.CheckCircle size={13} /> Saved
            </span>
          )}
          <button className="btn-secondary" onClick={() => setShowQRModal(true)}>
            <Icons.QrCode size={15} /> View QR
          </button>
          <button className="btn-secondary" onClick={() => window.open('/p/' + selectedLink?.short_code, '_blank')}>
            <Icons.ExternalLink size={15} /> Preview
          </button>
          <button className="btn-primary" onClick={saveHeader} disabled={saving}>
            {saving ? <><Icons.Loader size={14} className="animate-spin" /> Saving...</> : 'Save'}
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
              {membership?.organizations?.logo_url ? (
  <img
    src={membership.organizations.logo_url}
    className="w-11 h-11 rounded-xl object-contain border shrink-0"
    style={{ borderColor: 'var(--color-border)', background: 'white' }}
    alt="Logo"
  />
) : (
  <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white font-semibold" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}>
    {title?.charAt(0)?.toUpperCase() || 'F'}
  </div>
)}
              <div className="flex-1 flex flex-col gap-1.5">
                <input className="input-field text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" onBlur={saveHeader} />
                <input className="input-field text-xs" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short description" onBlur={saveHeader} />
              </div>
            </div>
          </div>

          {/* blocks */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Buttons</p>
            <span className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
              {blocks.length} button{blocks.length !== 1 ? 's' : ''} · Drag to reorder
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {blocks.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--color-ink-tertiary)' }}>No buttons yet — add one below.</p>
            ) : (
              blocks.map((b, i) => {
                const display = getBlockDisplay(b);
                return (
                  <div
                    key={b.id}
                    draggable={can('links.edit')}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(i)}
                    className="card flex items-center gap-2.5 px-3 py-2.5 cursor-grab active:opacity-70"
                  >
                    <Icons.GripVertical size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: display.type === 'icon' ? display.bg : '#f3f4f6' }}>
                      <BlockIcon display={display} size={14} />
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
                    {can('links.edit') && (
                    <button onClick={() => setEditingBlock(b)} className="ml-1" title="Edit">
                      <Icons.Pencil size={14} style={{ color: 'var(--color-ink-tertiary)' }} />
                    </button>
                    )}
                    {can('links.edit') && (
                    <button onClick={() => setConfirmDeleteBlock(b)} className="ml-1" title="Delete">
                      <Icons.Trash2 size={14} style={{ color: 'var(--color-ink-tertiary)' }} />
                    </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
           {can('links.edit') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full h-9 rounded-lg border border-dashed text-sm flex items-center justify-center gap-1.5 transition-colors hover:bg-[var(--color-canvas)]"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-secondary)' }}
          >
            <Icons.Plus size={15} /> Add button
          </button>
          )}
        </div>

        {/* phone preview */}
        <div className="flex justify-center">
          <div className="w-60 rounded-3xl border-4 bg-white overflow-hidden shadow-lg" style={{ borderColor: '#1a1a1a' }}>
            <div className="flex justify-between items-center px-4 py-1.5" style={{ background: '#1a1a1a' }}>
              <span className="text-[9px] text-white">9:41</span>
              <div className="flex gap-1 items-center">
                <Icons.Signal size={8} color="white" />
                <Icons.Wifi size={8} color="white" />
                <Icons.Battery size={8} color="white" />
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center text-center mb-4">
                {membership?.organizations?.logo_url ? (
  <img
  src={membership.organizations.logo_url}
  className="w-14 h-14 rounded-xl object-contain mb-2.5 border"
  style={{ borderColor: 'var(--color-border)', background: 'white' }}
  alt="Logo"
/>
) : (
  <div className="w-14 h-14 rounded-full mb-2.5 flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}>
    {title?.charAt(0)?.toUpperCase() || 'F'}
  </div>
)}
                <p className="font-semibold text-sm">{title || 'Page title'}</p>
                <p className="text-xs mt-0.5" style={{ color: '#666' }}>{subtitle || 'Short description'}</p>
              </div>
              <div className="flex flex-col gap-2">
                {blocks.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: '#999' }}>No buttons yet</p>
                ) : (
                  blocks.map((b) => {
                    const display = getBlockDisplay(b);
                    const bg = display.type === 'icon' ? display.bg : '#f3f4f6';
                    const fg = display.type === 'icon' ? display.fg : '#374151';
                    return (
                      <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: bg }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.6)' }}>
                          <BlockIcon display={display} size={12} />
                        </div>
                        <span className="text-xs font-medium truncate" style={{ color: fg }}>
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
    </div>
  );
}