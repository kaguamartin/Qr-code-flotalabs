import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import StepIndicator from '../components/link-create/StepIndicator';
import PhonePreview from '../components/link-create/PhonePreview';
import TypePicker from '../components/link-create/TypePicker';
import ContentForm from '../components/link-create/ContentForm';
import QRCustomizer from '../components/link-create/QRCustomizer';
import { getRawQrValue, downloadQR } from '../components/link-create/linkCreateHelpers';

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
    if (!validateFields()) return;
    if (activeType?.encoding_mode === 'redirect') {
      if (!shortCodeSuffix.trim()) { setError('Please enter a short link code.'); return; }
      if (shortCodeAvailable === false) { setError('This short code is already taken.'); return; }
    }
    setError('');
    setStep(3);
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

    let shortCode = activeType?.encoding_mode === 'redirect'
      ? `${orgSlug}-${shortCodeSuffix}`.trim()
      : `${orgSlug}-${activeType.key}`;

    if (activeType?.encoding_mode !== 'redirect') {
      // raw types don't collect a suffix from the user, so check for a
      // collision and only append a short random suffix if actually needed -
      // same pattern already used for bio page short codes.
      const { data: existing } = await supabase
        .from('links')
        .select('id')
        .eq('short_code', shortCode)
        .maybeSingle();
      if (existing) {
        shortCode = `${orgSlug}-${activeType.key}-${Math.floor(Math.random() * 900 + 100)}`;
      }
    }

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

    // trigger download before navigating
    downloadQR({ qrBgColor, orgSlug, shortCodeSuffix, activeType });
    navigate('/app/links');
  }

  const qrValue = getRawQrValue({ activeType, fieldValues, orgSlug, shortCodeSuffix });
  const previewType = hoveredType ?? activeType;

  if (loading) {
    return (
      <div>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

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
        {/* main content */}
        <div>
          {step === 1 && (
            <TypePicker
              destinationGroups={destinationGroups}
              socialPlatforms={socialPlatforms}
              onSelectType={selectType}
              onSelectPlatform={selectPlatform}
              onHover={setHoveredType}
              onHoverEnd={() => setHoveredType(null)}
            />
          )}

          {step === 2 && activeType && (
            <ContentForm
              activeType={activeType}
              selectedPlatform={selectedPlatform}
              onSelectPlatform={selectPlatform}
              socialPlatforms={socialPlatforms}
              fieldValues={fieldValues}
              fieldErrors={fieldErrors}
              onFieldChange={handleFieldChange}
              shortCodeSuffix={shortCodeSuffix}
              onShortCodeChange={setShortCodeSuffix}
              shortCodeAvailable={shortCodeAvailable}
              checkingCode={checkingCode}
              orgSlug={orgSlug}
              campaignId={campaignId}
              onCampaignChange={setCampaignId}
              campaignName={campaignName}
              onCampaignNameChange={setCampaignName}
              corridor={corridor}
              onCorridorChange={setCorridor}
              campaigns={campaigns}
            />
          )}

          {step === 3 && (
            <QRCustomizer
              activeType={activeType}
              orgSlug={orgSlug}
              shortCodeSuffix={shortCodeSuffix}
              qrColor={qrColor}
              qrBgColor={qrBgColor}
              onQrColorChange={setQrColor}
              onQrBgColorChange={setQrBgColor}
            />
          )}
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
          qrValue={qrValue}
          onDownload={() => downloadQR({ qrBgColor, orgSlug, shortCodeSuffix, activeType })}
        />
      </div>

      {/* navigation */}
      <div className="flex justify-between mt-6">
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
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-60"
          >
            {submitting ? 'Creating...' : <><Icons.Check size={15} /> Create link &amp; download QR</>}
          </button>
        )}
      </div>
    </div>
  );
}
