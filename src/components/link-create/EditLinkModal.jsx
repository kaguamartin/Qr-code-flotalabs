import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import ContentForm from './ContentForm';
import { supabase } from '../../lib/supabaseClient';

// Simple single-screen edit for an existing link's destination content,
// campaign, and corridor. Deliberately does NOT allow changing the
// destination type or short code — changing the type would mean a
// different encoding_mode/field set entirely (effectively a new link), and
// the short code is locked after creation to avoid breaking already-printed
// QR codes or shared links.
export default function EditLinkModal({ link, orgId, orgSlug, onClose, onSaved }) {
  const activeType = link.destination_types;
  const isSocial = activeType?.key === 'social';

  const [socialPlatforms, setSocialPlatforms] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [fieldValues, setFieldValues] = useState(link.destination_data ?? {});
  const [fieldErrors, setFieldErrors] = useState({});
  const [campaignId, setCampaignId] = useState(link.campaign_id ?? '');
  const [campaignName, setCampaignName] = useState('');
  const [corridor, setCorridor] = useState(link.campaigns?.corridor ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [platformsResult, campaignsResult] = await Promise.all([
      isSocial ? supabase.from('social_platforms').select('*').order('sort_order') : Promise.resolve({ data: [] }),
      supabase.from('campaigns').select('*').eq('org_id', orgId).order('name'),
    ]);
    if (platformsResult.data) {
      setSocialPlatforms(platformsResult.data);
      if (isSocial) {
        const currentPlatformKey = link.destination_data?.platform;
        const match = platformsResult.data.find((p) => p.key === currentPlatformKey);
        if (match) setSelectedPlatform(match);
      }
    }
    if (campaignsResult.data) setCampaigns(campaignsResult.data);
    setLoading(false);
  }

  function handleFieldChange(key, value) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function selectPlatform(platform) {
    setSelectedPlatform(platform);
    setFieldErrors({});
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
    if (isSocial) {
      if (!selectedPlatform) errors.platform = 'Please select a platform';
      if (selectedPlatform && !fieldValues.url?.trim()) errors.url = 'URL is required';
      if (selectedPlatform?.key === 'custom' && !fieldValues.custom_name?.trim()) {
        errors.custom_name = 'Display name is required for custom links';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (activeType?.key !== 'bio_page' && !validateFields()) return;
    setError('');
    setSaving(true);

    let resolvedCampaignId = (campaignId && campaignId !== '__new__') ? campaignId : null;
    if (campaignId === '__new__' && campaignName.trim()) {
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({ org_id: orgId, name: campaignName.trim(), corridor: corridor || null })
        .select()
        .single();
      if (campaignError) { setError(campaignError.message); setSaving(false); return; }
      resolvedCampaignId = newCampaign.id;
    }

    const destinationData = isSocial
      ? { ...fieldValues, platform: selectedPlatform?.key }
      : fieldValues;

    const { error: updateError } = await supabase
      .from('links')
      .update({
        destination_data: destinationData,
        campaign_id: resolvedCampaignId,
      })
      .eq('id', link.id);

    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-medium">Edit link</h2>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}>
            <Icons.X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Icons.Loader size={18} className="animate-spin" style={{ color: 'var(--color-ink-tertiary)' }} />
            </div>
          ) : activeType?.key === 'bio_page' ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
              This link's content is managed in the Link-in-bio builder, not here.
            </p>
          ) : (
            <>
              {error && (
                <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-fg)' }}>
                  {error}
                </p>
              )}
              <ContentForm
                activeType={activeType}
                selectedPlatform={selectedPlatform}
                onSelectPlatform={selectPlatform}
                socialPlatforms={socialPlatforms}
                fieldValues={fieldValues}
                fieldErrors={fieldErrors}
                onFieldChange={handleFieldChange}
                shortCodeSuffix={link.short_code.replace(`${orgSlug}-`, '')}
                onShortCodeChange={() => {}}
                shortCodeAvailable={null}
                checkingCode={false}
                orgSlug={orgSlug}
                campaignId={campaignId}
                onCampaignChange={setCampaignId}
                campaignName={campaignName}
                onCampaignNameChange={setCampaignName}
                corridor={corridor}
                onCorridorChange={setCorridor}
                campaigns={campaigns}
                editMode
              />
            </>
          )}
        </div>

        {!loading && activeType?.key !== 'bio_page' && (
          <div className="flex gap-2 px-5 pb-5">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}