import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const corridors = ['Thika Road', 'Mombasa Road', 'Waiyaki Way', 'Ngong Road', 'Kiambu Road'];

const noFunnelNote = 'This QR encodes data directly — phones act on it natively. We still log the scan, but there is no click-through destination to report on.';

function groupIcon(label) {
  const l = (label ?? '').toLowerCase();
  if (l.includes('web')) return 'Globe';
  if (l.includes('app') || l.includes('store')) return 'Smartphone';
  if (l.includes('social') || l.includes('messaging')) return 'MessageCircle';
  if (l.includes('direct') || l.includes('action')) return 'Phone';
  if (l.includes('location')) return 'MapPin';
  if (l.includes('contact')) return 'IdCard';
  if (l.includes('connect')) return 'Wifi';
  if (l.includes('event') || l.includes('ticket')) return 'CalendarPlus';
  if (l.includes('multi') || l.includes('bio')) return 'ListTree';
  if (l.includes('coupon') || l.includes('loyalty')) return 'Ticket';
  if (l.includes('review') || l.includes('feedback')) return 'Star';
  return 'Circle';
}

function groupColor(label) {
  const l = (label ?? '').toLowerCase();
  if (l.includes('web')) return 'blue';
  if (l.includes('app')) return 'teal';
  if (l.includes('social')) return 'pink';
  if (l.includes('direct')) return 'coral';
  if (l.includes('location')) return 'green';
  if (l.includes('contact')) return 'amber';
  if (l.includes('connect')) return 'purple';
  if (l.includes('event')) return 'indigo';
  if (l.includes('multi') || l.includes('bio')) return 'violet';
  if (l.includes('coupon') || l.includes('loyalty')) return 'rose';
  if (l.includes('review') || l.includes('feedback')) return 'lime';
  return 'blue';
}

function PhonePreview({ step, activeType, fieldValues, selectedPlatform, shortCode, orgSlug, qrColor, qrValue }) {
  const shortUrl = `flota.ke/${orgSlug ? orgSlug + '-' : ''}${shortCode || '...'}`;

  function renderPreviewContent() {
    if (!activeType) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
            <Icons.QrCode size={24} style={{ color: 'var(--color-ink-tertiary)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
            Select a destination type to see a preview
          </p>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
          <div className="w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
          <QRCodeSVG
            value={qrValue || 'https://flota.ke'}
            size={140}
            fgColor={qrColor}
            bgColor="#ffffff"
            level="M"
          />
          <p className="font-mono text-[10px] text-center" style={{ color: 'var(--color-ink-secondary)' }}>
            {activeType.encoding_mode === 'redirect' ? shortUrl : activeType.display_name}
          </p>
        </div>
      );
    }

    if (activeType.key === 'wifi') {
      return (
        <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
          <div className="w-full rounded-2xl p-4 shadow-sm" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2 mb-3">
              <Icons.Wifi size={16} style={{ color: '#1877F2' }} />
              <span className="text-xs font-medium">Join Network</span>
            </div>
            <p className="text-sm font-medium mb-1">{fieldValues.ssid || 'Network name'}</p>
            <p className="text-xs mb-3" style={{ color: '#6b7280' }}>Password protected</p>
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#1877F2' }}>
              Join
            </button>
          </div>
        </div>
      );
    }

    if (activeType.key === 'vcard') {
      return (
        <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
          <div className="w-full rounded-2xl p-4 shadow-sm" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center text-white font-medium text-lg" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}>
              {fieldValues.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <p className="text-sm font-medium">{fieldValues.name || 'Full name'}</p>
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{fieldValues.company || 'Company'}</p>
            <p className="text-xs mb-3" style={{ color: '#374151' }}>{fieldValues.phone || '+254 700 000 000'}</p>
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}>
              Save Contact
            </button>
          </div>
        </div>
      );
    }

    if (activeType.key === 'call' || activeType.key === 'sms' || activeType.key === 'save_number') {
      const isCall = activeType.key === 'call' || activeType.key === 'save_number';
      return (
        <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
          <div className="w-full rounded-2xl p-4 shadow-sm text-center" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: isCall ? '#dcfce7' : '#dbeafe' }}>
              {isCall ? <Icons.Phone size={20} style={{ color: '#16a34a' }} /> : <Icons.MessageSquare size={20} style={{ color: '#2563eb' }} />}
            </div>
            <p className="text-xs mb-1" style={{ color: '#6b7280' }}>{isCall ? 'Call' : 'Message to'}</p>
            <p className="text-sm font-medium mb-3">{fieldValues.phone || '+254 700 000 000'}</p>
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: isCall ? '#16a34a' : '#2563eb' }}>
              {isCall ? 'Call' : 'Send Message'}
            </button>
          </div>
        </div>
      );
    }

    if (activeType.key === 'email') {
      return (
        <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
          <div className="w-full rounded-2xl p-4 shadow-sm" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#fef3c7' }}>
              <Icons.Mail size={18} style={{ color: '#d97706' }} />
            </div>
            <p className="text-xs text-center mb-1" style={{ color: '#6b7280' }}>Send email to</p>
            <p className="text-sm font-medium text-center mb-1">{fieldValues.to || 'email@example.com'}</p>
            {fieldValues.subject && <p className="text-xs text-center mb-3" style={{ color: '#6b7280' }}>Re: {fieldValues.subject}</p>}
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white mt-2" style={{ background: '#d97706' }}>
              Compose Email
            </button>
          </div>
        </div>
      );
    }

    if (activeType.key === 'map') {
      return (
        <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
          <div className="w-full rounded-2xl p-4 shadow-sm" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="w-full h-16 rounded-lg mb-3 flex items-center justify-center" style={{ background: '#e8f5e9' }}>
              <Icons.MapPin size={24} style={{ color: '#16a34a' }} />
            </div>
            <p className="text-xs text-center mb-1" style={{ color: '#6b7280' }}>Get directions to</p>
            <p className="text-sm font-medium text-center mb-3">{fieldValues.address || 'Location'}</p>
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#16a34a' }}>
              Open in Maps
            </button>
          </div>
        </div>
      );
    }

    if (activeType.key === 'social' && selectedPlatform) {
      let faviconDomain = selectedPlatform.url_prefix?.replace('https://', '').replace(/\/$/, '') || selectedPlatform.key + '.com';
      if (selectedPlatform.key === 'custom' && fieldValues.url) {
        try { faviconDomain = new URL(fieldValues.url).hostname; } catch {}
      }
      return (
        <div className="flex flex-col items-center justify-center h-full px-4 gap-3">
          <div className="w-full rounded-2xl p-4 shadow-sm" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`}
                className="w-8 h-8 rounded-lg object-contain"
                alt={selectedPlatform.name}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <p className="text-xs font-medium">{selectedPlatform.key === 'custom' ? (fieldValues.custom_name || 'Custom link') : selectedPlatform.name}</p>
                <p className="text-[10px] truncate max-w-[120px]" style={{ color: '#6b7280' }}>
                  {fieldValues.url || selectedPlatform.url_placeholder || 'Your profile URL'}
                </p>
              </div>
            </div>
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: selectedPlatform.color }}>
              Open {selectedPlatform.key === 'custom' ? (fieldValues.custom_name || 'Link') : selectedPlatform.name}
            </button>
          </div>
        </div>
      );
    }

    // default browser bar preview for redirect types
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b flex items-center gap-1.5" style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
          </div>
          <div className="flex-1 rounded px-2 py-0.5 text-[9px] font-mono truncate" style={{ background: 'white', border: '1px solid #e5e7eb', color: '#6b7280' }}>
            {shortUrl}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          {(() => {
            const IconComponent = Icons[groupIcon(activeType.group_label ?? '')] ?? Icons.Circle;
            return (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
                  <IconComponent size={20} style={{ color: 'var(--color-ink-secondary)' }} />
                </div>
                <div>
                  <p className="text-xs font-medium">{activeType.display_name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>
                    {fieldValues.url || fieldValues.android_url || 'Destination URL'}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-6">
      <p className="text-xs font-medium mb-3 text-center" style={{ color: 'var(--color-ink-secondary)' }}>Preview</p>
      <div className="mx-auto w-52 rounded-3xl border-4 overflow-hidden shadow-xl flex flex-col" style={{ borderColor: '#1a1a1a', height: 380, background: '#f9fafb' }}>
        <div className="flex justify-between items-center px-4 py-1.5 shrink-0" style={{ background: '#1a1a1a' }}>
          <span className="text-[9px] text-white">9:41</span>
          <div className="flex gap-1 items-center">
            <Icons.Signal size={8} color="white" />
            <Icons.Wifi size={8} color="white" />
            <Icons.Battery size={8} color="white" />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current }) {
  const steps = ['Choose type', 'Add content', 'Customize QR'];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                style={{
                  background: done ? 'var(--color-success-bg)' : active ? 'var(--color-brand-blue)' : 'var(--color-canvas)',
                  color: done ? 'var(--color-success-fg)' : active ? 'white' : 'var(--color-ink-tertiary)',
                  border: done || active ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {done ? <Icons.Check size={12} /> : num}
              </div>
              <span className="text-xs" style={{ color: active ? 'var(--color-ink-primary)' : 'var(--color-ink-tertiary)', fontWeight: active ? 500 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 h-px" style={{ background: done ? 'var(--color-success-fg)' : 'var(--color-border)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LinkCreate() {
  const navigate = useNavigate();
  const { membership, user } = useAuth();
  const orgId = membership?.organizations?.id;
  const orgSlug = membership?.organizations?.slug ?? '';

  const [step, setStep] = useState(1);
  const [destinationGroups, setDestinationGroups] = useState([]);
  const [socialPlatforms, setSocialPlatforms] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [hoveredType, setHoveredType] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [shortCodeSuffix, setShortCodeSuffix] = useState('');
  const [shortCodeAvailable, setShortCodeAvailable] = useState(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [corridor, setCorridor] = useState('');
  const [qrColor, setQrColor] = useState('#1a1a1a');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [orgId]);

  async function loadData() {
    setLoading(true);
    const [typesResult, platformsResult, campaignsResult] = await Promise.all([
      supabase.from('destination_types').select('*').order('group_label'),
      supabase.from('social_platforms').select('*').order('sort_order'),
      supabase.from('campaigns').select('*').eq('org_id', orgId).order('name'),
    ]);
    if (typesResult.data) {
      const groups = typesResult.data.reduce((acc, type) => {
        const group = acc.find((g) => g.label === type.group_label);
        if (group) group.types.push(type);
        else acc.push({ label: type.group_label, types: [type] });
        return acc;
      }, []);
      setDestinationGroups(groups);
    }
    if (platformsResult.data) setSocialPlatforms(platformsResult.data);
    if (campaignsResult.data) setCampaigns(campaignsResult.data);
    setLoading(false);
  }

  const checkShortCode = useCallback(async (suffix) => {
    if (!suffix || suffix.length < 2) { setShortCodeAvailable(null); return; }
    const fullCode = `${orgSlug}-${suffix}`;
    setCheckingCode(true);
    const { data } = await supabase.from('links').select('id').eq('short_code', fullCode).maybeSingle();
    setShortCodeAvailable(!data);
    setCheckingCode(false);
  }, [orgSlug]);

  useEffect(() => {
    if (activeType?.encoding_mode !== 'redirect') return;
    const timer = setTimeout(() => checkShortCode(shortCodeSuffix), 500);
    return () => clearTimeout(timer);
  }, [shortCodeSuffix, checkShortCode, activeType]);

  function selectType(type) {
    setActiveType(type);
    setFieldValues({});
    setFieldErrors({});
    setSelectedPlatform(null);
    if (type.encoding_mode === 'redirect') {
      const slug = type.display_name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 15);
      setShortCodeSuffix(slug);
    }
    setStep(2);
  }

  function selectPlatform(platform) {
    setSelectedPlatform(platform);
    setFieldValues({});
    setFieldErrors({});
    const slug = platform.key === 'custom' ? 'link' : platform.key;
    setShortCodeSuffix(slug);
  }

  function handleFieldChange(key, value) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function getRawQrValue() {
    if (!activeType) return '';
    if (activeType.encoding_mode === 'redirect') {
      return `https://flota.ke/${orgSlug}-${shortCodeSuffix}`;
    }
    switch (activeType.key) {
      case 'wifi':
        return `WIFI:T:WPA;S:${fieldValues.ssid ?? ''};P:${fieldValues.password ?? ''};;`;
      case 'call':
      case 'save_number':
        return `tel:${fieldValues.phone ?? ''}`;
      case 'sms':
        return `smsto:${fieldValues.phone ?? ''}`;
      case 'email':
        return `mailto:${fieldValues.to ?? ''}${fieldValues.subject ? `?subject=${encodeURIComponent(fieldValues.subject)}` : ''}`;
      case 'map':
        return `geo:0,0?q=${encodeURIComponent(fieldValues.address ?? '')}`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${fieldValues.name ?? ''}\nTEL:${fieldValues.phone ?? ''}\nORG:${fieldValues.company ?? ''}\nEND:VCARD`;
      case 'calendar':
        return `BEGIN:VEVENT\nSUMMARY:${fieldValues.event_title ?? ''}\nDTSTART:${(fieldValues.event_date ?? '').replace(/[-:]/g, '').slice(0, 15).replace('T', 'T')}\nEND:VEVENT`;
      default:
        return `https://flota.ke/${orgSlug}-${shortCodeSuffix}`;
    }
  }

  function validateFields() {
    const errors = {};
    const fields = activeType?.field_schema ?? [];
    fields.forEach((f) => {
      const value = fieldValues[f.key] ?? '';
      const isOptional = f.key === 'ios_url' || f.key === 'subject' || f.key === 'company';
      if (!isOptional && !value.trim()) { errors[f.key] = `${f.label} is required`; return; }
      if (value && (f.key === 'url' || f.key === 'android_url' || f.key === 'ios_url')) {
        try { new URL(value); } catch { errors[f.key] = 'Please enter a valid URL starting with https://'; }
      }
      if (value && f.key === 'phone') {
        if (!/^[0-9+\s\-]{7,15}$/.test(value)) errors[f.key] = 'Enter a valid phone number';
      }
      if (value && f.key === 'to') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[f.key] = 'Enter a valid email address';
      }
    });
    if (activeType?.key === 'social') {
      if (!selectedPlatform) errors.platform = 'Please select a platform';
      if (selectedPlatform && !fieldValues.url?.trim()) errors.url = 'URL is required';
      if (selectedPlatform?.key === 'custom' && !fieldValues.custom_name?.trim()) {
        errors.custom_name = 'Display name is required for custom links';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (step === 2) {
      if (!validateFields()) return;
      if (activeType?.encoding_mode === 'redirect') {
        if (!shortCodeSuffix.trim()) { setError('Please enter a short link code.'); return; }
        if (shortCodeAvailable === false) { setError('This short code is already taken.'); return; }
      }
      setError('');
      setStep(3);
    }
  }

  async function handleCreate() {
    setError('');
    setSubmitting(true);

    let resolvedCampaignId = (campaignId && campaignId !== '__new__') ? campaignId : null;
    if (campaignId === '__new__' && campaignName.trim()) {
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({ org_id: orgId, name: campaignName.trim(), corridor: corridor || null })
        .select()
        .single();
      if (campaignError) { setError(campaignError.message); setSubmitting(false); return; }
      resolvedCampaignId = newCampaign.id;
    }

    const destinationData = activeType?.key === 'social'
      ? { ...fieldValues, platform: selectedPlatform?.key }
      : fieldValues;

    const shortCode = activeType?.encoding_mode === 'redirect'
      ? `${orgSlug}-${shortCodeSuffix}`.trim()
      : `${orgSlug}-${activeType.key}-${Date.now()}`;

    const { error: linkError } = await supabase
      .from('links')
      .insert({
        org_id: orgId,
        destination_type_id: activeType.id,
        campaign_id: resolvedCampaignId,
        short_code: shortCode,
        destination_data: destinationData,
        created_by: user.id,
      });

    if (linkError) { setError(linkError.message); setSubmitting(false); return; }
    navigate('/app/links');
  }

  const previewType = hoveredType ?? activeType;
  const fields = activeType?.field_schema ?? [];

  if (loading) return <div><p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-medium">New link</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          Create a trackable QR code and short link for your campaign.
        </p>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
          {error}
        </div>
      )}

      <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 220px' }}>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="card p-6">
            <p className="text-sm font-medium mb-4">What should this QR code do?</p>
            <div className="flex flex-col gap-5">
              {destinationGroups.map((group) => {
                const iconName = groupIcon(group.label);
                const color = groupColor(group.label);
                const GroupIcon = Icons[iconName] ?? Icons.Circle;
                const isSocialGroup = group.label.toLowerCase().includes('social');

                return (
                  <div key={group.label}>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <GroupIcon size={13} style={{ color: `var(--color-type-${color}-fg)` }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>{group.label}</span>
                    </div>

                    {isSocialGroup ? (
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                        {socialPlatforms.map((platform) => {
                          const faviconDomain = platform.url_prefix?.replace('https://', '').replace(/\/$/, '') || platform.key + '.com';
                          return (
                            <button
                              key={platform.key}
                              onClick={() => {
                                const socialType = group.types.find((t) => t.key === 'social') ?? group.types[0];
                                selectType(socialType);
                                selectPlatform(platform);
                              }}
                              onMouseEnter={() => setHoveredType(group.types.find((t) => t.key === 'social') ?? group.types[0])}
                              onMouseLeave={() => setHoveredType(null)}
                              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all hover:shadow-sm"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              {platform.key === 'custom' ? (
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                                  <Icons.Plus size={14} style={{ color: '#6b7280' }} />
                                </div>
                              ) : (
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
                                  className="w-7 h-7 rounded-lg object-contain"
                                  alt={platform.name}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span className="text-[10px] leading-tight" style={{ color: 'var(--color-ink-secondary)' }}>
                                {platform.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                        {group.types.map((t) => (
                          <button
                            key={t.key}
                            onClick={() => selectType(t)}
                            onMouseEnter={() => setHoveredType(t)}
                            onMouseLeave={() => setHoveredType(null)}
                            className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all hover:shadow-sm"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `var(--color-type-${color}-bg)` }}>
                              <GroupIcon size={13} style={{ color: `var(--color-type-${color}-fg)` }} />
                            </div>
                            <div>
                              <p className="text-xs font-medium leading-tight">{t.display_name}</p>
                              {!t.supports_funnel && (
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-ink-tertiary)' }}>Raw QR</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && activeType && (
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `var(--color-type-${groupColor(activeType.group_label ?? '')}-bg)` }}>
                {(() => {
                  if (selectedPlatform && selectedPlatform.key !== 'custom') {
                    const faviconDomain = selectedPlatform.url_prefix?.replace('https://', '').replace(/\/$/, '') || selectedPlatform.key + '.com';
                    return <img src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`} className="w-5 h-5 rounded object-contain" alt={selectedPlatform.name} />;
                  }
                  const IconComponent = Icons[groupIcon(activeType.group_label ?? '')] ?? Icons.Circle;
                  return <IconComponent size={15} style={{ color: `var(--color-type-${groupColor(activeType.group_label ?? '')}-fg)` }} />;
                })()}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {selectedPlatform ? selectedPlatform.name : activeType.display_name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
                  {activeType.supports_funnel ? 'Tracked redirect' : 'Raw QR — direct action'}
                </p>
              </div>
            </div>

            {!activeType.supports_funnel && (
              <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-tertiary)' }}>
                {noFunnelNote}
              </p>
            )}

            {/* social platform picker */}
            {activeType.key === 'social' && !selectedPlatform && (
              <div>
                <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Choose platform</p>
                {fieldErrors.platform && <p className="text-xs mb-2" style={{ color: 'var(--color-danger-fg)' }}>{fieldErrors.platform}</p>}
                <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
                  {socialPlatforms.map((platform) => {
                    const faviconDomain = platform.url_prefix?.replace('https://', '').replace(/\/$/, '') || platform.key + '.com';
                    return (
                      <button
                        key={platform.key}
                        onClick={() => selectPlatform(platform)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:shadow-sm"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {platform.key === 'custom' ? (
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                            <Icons.Plus size={12} style={{ color: '#6b7280' }} />
                          </div>
                        ) : (
                          <img src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`} className="w-6 h-6 rounded object-contain" alt={platform.name} onError={(e) => { e.target.style.display = 'none'; }} />
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--color-ink-secondary)' }}>{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* social platform fields */}
            {activeType.key === 'social' && selectedPlatform && (
              <div className="flex flex-col gap-3 mb-4">
                <button onClick={() => setSelectedPlatform(null)} className="flex items-center gap-1 text-xs w-fit" style={{ color: 'var(--color-brand-blue)' }}>
                  <Icons.ChevronLeft size={13} /> Change platform
                </button>
                {selectedPlatform.key === 'custom' && (
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                      Display name <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
                    </label>
                    <input className="input-field" placeholder="e.g. Our Linktree" value={fieldValues.custom_name ?? ''} onChange={(e) => handleFieldChange('custom_name', e.target.value)} />
                    {fieldErrors.custom_name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-fg)' }}>{fieldErrors.custom_name}</p>}
                  </div>
                )}
                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                    {selectedPlatform.name} URL <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
                  </label>
                  <input className="input-field" type="url" placeholder={selectedPlatform.url_placeholder ?? 'https://...'} value={fieldValues.url ?? ''} onChange={(e) => handleFieldChange('url', e.target.value)} />
                  {selectedPlatform.url_hint && (
                    <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                      <Icons.Info size={10} /> {selectedPlatform.url_hint}
                    </p>
                  )}
                  {fieldErrors.url && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-fg)' }}>{fieldErrors.url}</p>}
                </div>
              </div>
            )}

            {/* regular fields */}
            {activeType.key !== 'social' && activeType.key !== 'bio_page' && (
              <div className="flex flex-col gap-4 mb-4">
                {fields.map((f) => {
                  const isOptional = f.key === 'ios_url' || f.key === 'subject' || f.key === 'company';
                  const isPhone = f.key === 'phone';
                  const isUrl = f.key === 'url' || f.key === 'android_url' || f.key === 'ios_url';
                  const isEmail = f.key === 'to';
                  const isPassword = f.key === 'password';
                  const isDatetime = f.key === 'event_date';
                  const inputType = isUrl ? 'url' : isPhone ? 'tel' : isEmail ? 'email' : isDatetime ? 'datetime-local' : isPassword ? (showPassword ? 'text' : 'password') : 'text';

                  return (
                    <div key={f.key}>
                      <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                        {f.label}
                        {isOptional
                          ? <span className="ml-1" style={{ color: 'var(--color-ink-tertiary)' }}>(optional)</span>
                          : <span className="ml-0.5" style={{ color: 'var(--color-danger-fg)' }}>*</span>
                        }
                      </label>
                      <div className="relative">
                        <input
                          className="input-field"
                          type={inputType}
                          placeholder={f.placeholder ?? ''}
                          value={fieldValues[f.key] ?? ''}
                          onChange={(e) => handleFieldChange(f.key, e.target.value)}
                          onKeyDown={isPhone ? (e) => {
                            const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                            if (!allowed.includes(e.key) && !/[0-9+\s\-]/.test(e.key)) e.preventDefault();
                          } : undefined}
                        />
                        {isPassword && (
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-ink-tertiary)' }}>
                            {showPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                          </button>
                        )}
                      </div>
                      {isPhone && (
                        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                          <Icons.Info size={10} /> Include country code, e.g. +254 700 000 000
                        </p>
                      )}
                      {isUrl && !isOptional && (
                        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                          <Icons.Info size={10} /> Must start with https://
                        </p>
                      )}
                      {fieldErrors[f.key] && (
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--color-danger-fg)' }}>
                          <Icons.AlertCircle size={11} /> {fieldErrors[f.key]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeType.key === 'bio_page' && (
              <p className="text-sm mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
                You'll build the page content in the Link-in-bio editor after creating this link.
              </p>
            )}

            {/* short code builder — redirect types only */}
            {activeType.encoding_mode === 'redirect' && (
              <div className="border-t pt-4 mt-2 mb-4" style={{ borderColor: 'var(--color-border)' }}>
                <label className="text-xs block mb-1.5 font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Short link</label>
                <div className="flex items-center">
                  <span className="font-mono text-sm px-3 py-2 rounded-l-lg border border-r-0 shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-canvas)', color: 'var(--color-ink-secondary)' }}>
                    flota.ke/{orgSlug}-
                  </span>
                  <div className="relative flex-1">
                    <input
                      className="input-field rounded-l-none w-full"
                      placeholder="your-suffix"
                      value={shortCodeSuffix}
                      maxLength={20}
                      onChange={(e) => setShortCodeSuffix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingCode && <Icons.Loader size={13} className="animate-spin" style={{ color: 'var(--color-ink-tertiary)' }} />}
                      {!checkingCode && shortCodeAvailable === true && <Icons.CheckCircle size={13} style={{ color: 'var(--color-success-fg)' }} />}
                      {!checkingCode && shortCodeAvailable === false && <Icons.XCircle size={13} style={{ color: 'var(--color-danger-fg)' }} />}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-[11px]" style={{ color: shortCodeAvailable === false ? 'var(--color-danger-fg)' : shortCodeAvailable === true ? 'var(--color-success-fg)' : 'var(--color-ink-tertiary)' }}>
                    {checkingCode ? 'Checking availability...' : shortCodeAvailable === false ? 'This code is already taken' : shortCodeAvailable === true ? '✓ Available' : 'Only lowercase letters, numbers, hyphens'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-ink-tertiary)' }}>{shortCodeSuffix.length}/20</p>
                </div>
              </div>
            )}

            {/* campaign & corridor */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Corridor</label>
                <select className="input-field" value={corridor} onChange={(e) => setCorridor(e.target.value)}>
                  <option value="">No corridor</option>
                  {corridors.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Campaign</label>
                <select className="input-field" value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setCampaignName(''); }}>
                  <option value="">No campaign</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="__new__">+ New campaign...</option>
                </select>
              </div>
            </div>

            {campaignId === '__new__' && (
              <div className="mb-4">
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Campaign name</label>
                <input className="input-field" placeholder="e.g. Awareness Q3" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div className="card p-6">
            <p className="text-sm font-medium mb-4">Customize your QR code</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>QR color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" style={{ borderColor: 'var(--color-border)', padding: 2 }} />
                  <input className="input-field font-mono text-xs flex-1" value={qrColor} onChange={(e) => setQrColor(e.target.value)} placeholder="#1a1a1a" />
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Background color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={qrBgColor} onChange={(e) => setQrBgColor(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer" style={{ borderColor: 'var(--color-border)', padding: 2 }} />
                  <input className="input-field font-mono text-xs flex-1" value={qrBgColor} onChange={(e) => setQrBgColor(e.target.value)} placeholder="#ffffff" />
                </div>
              </div>
            </div>

            <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>Presets</p>
            <div className="flex gap-2 mb-6">
              {[
                { fg: '#1a1a1a', bg: '#ffffff', label: 'Classic' },
                { fg: '#9d16f1', bg: '#ffffff', label: 'Brand' },
                { fg: '#1877F2', bg: '#ffffff', label: 'Blue' },
                { fg: '#ffffff', bg: '#1a1a1a', label: 'Inverted' },
                { fg: '#16a34a', bg: '#f0fdf4', label: 'Green' },
              ].map((preset) => (
                <button key={preset.label} onClick={() => { setQrColor(preset.fg); setQrBgColor(preset.bg); }} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ background: preset.bg, borderColor: 'var(--color-border)' }}>
                    <div className="w-4 h-4 rounded-sm" style={{ background: preset.fg }} />
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>{preset.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
              {activeType?.encoding_mode === 'redirect' && (
                <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>
                  Short link: <span className="font-mono">flota.ke/{orgSlug}-{shortCodeSuffix}</span>
                </p>
              )}
              {activeType && !activeType.supports_funnel && (
                <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-tertiary)' }}>
                  {noFunnelNote}
                </p>
              )}
            </div>
          </div>
        )}

        {/* navigation */}
        <div className="col-span-1">
          <div className="flex justify-between mt-4">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="btn-secondary flex items-center gap-1.5">
                <Icons.ChevronLeft size={15} /> Back
              </button>
            ) : <div />}
            {step === 2 && (
              <button onClick={handleNext} className="btn-primary flex items-center gap-1.5">
                Next <Icons.ChevronRight size={15} />
              </button>
            )}
            {step === 3 && (
              <button onClick={handleCreate} disabled={submitting} className="btn-primary flex items-center gap-1.5 disabled:opacity-60">
                {submitting ? 'Creating...' : <><Icons.Check size={15} /> Create link & QR</>}
              </button>
            )}
          </div>
        </div>

        {/* phone preview */}
        <PhonePreview
          step={step}
          activeType={previewType}
          fieldValues={fieldValues}
          selectedPlatform={selectedPlatform}
          shortCode={shortCodeSuffix}
          orgSlug={orgSlug}
          qrColor={qrColor}
          qrValue={getRawQrValue()}
        />
      </div>
    </div>
  );
}