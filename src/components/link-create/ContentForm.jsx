import { useState } from 'react';
import * as Icons from 'lucide-react';
import { groupIcon, groupColor, noFunnelNote, corridors } from './linkCreateHelpers';
import { SHORT_LINK_BASE_URL } from '../../config';

export default function ContentForm({
  activeType,
  selectedPlatform,
  onSelectPlatform,
  socialPlatforms,
  fieldValues,
  fieldErrors,
  onFieldChange,
  shortCodeSuffix,
  onShortCodeChange,
  shortCodeAvailable,
  checkingCode,
  orgSlug,
  campaignId,
  onCampaignChange,
  campaignName,
  onCampaignNameChange,
  corridor,
  onCorridorChange,
  campaigns,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const fields = activeType?.field_schema ?? [];
  const color = groupColor(activeType?.group_label ?? '');

  return (
    <div className="card p-6">
      {/* header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `var(--color-type-${color}-bg)` }}>
          {(() => {
            if (selectedPlatform && selectedPlatform.key !== 'custom') {
              const faviconDomain = selectedPlatform.url_prefix?.replace('https://', '').replace(/\/$/, '') || selectedPlatform.key + '.com';
              return <img src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`} className="w-5 h-5 rounded object-contain" alt={selectedPlatform.name} />;
            }
            const IconComponent = Icons[groupIcon(activeType?.group_label ?? '')] ?? Icons.Circle;
            return <IconComponent size={15} style={{ color: `var(--color-type-${color}-fg)` }} />;
          })()}
        </div>
        <div>
          <p className="text-sm font-medium">
            {selectedPlatform ? selectedPlatform.name : activeType?.display_name}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
            {activeType?.supports_funnel ? 'Tracked redirect' : 'Raw QR — direct action'}
          </p>
        </div>
      </div>

      {/* raw type notice */}
      {!activeType?.supports_funnel && (
        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-tertiary)' }}>
          {noFunnelNote}
        </p>
      )}

      {/* social platform picker */}
      {activeType?.key === 'social' && !selectedPlatform && (
        <div>
          <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Choose platform</p>
          {fieldErrors.platform && <p className="text-xs mb-2" style={{ color: 'var(--color-danger-fg)' }}>{fieldErrors.platform}</p>}
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {socialPlatforms.map((platform) => {
              const faviconDomain = platform.url_prefix?.replace('https://', '').replace(/\/$/, '') || platform.key + '.com';
              return (
                <button
                  key={platform.key}
                  onClick={() => onSelectPlatform(platform)}
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
      {activeType?.key === 'social' && selectedPlatform && (
        <div className="flex flex-col gap-3 mb-4">
          <button onClick={() => onSelectPlatform(null)} className="flex items-center gap-1 text-xs w-fit" style={{ color: 'var(--color-brand-blue)' }}>
            <Icons.ChevronLeft size={13} /> Change platform
          </button>
          {selectedPlatform.key === 'custom' && (
            <div>
              <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
                Display name <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
              </label>
              <input className="input-field" placeholder="e.g. Our Linktree" value={fieldValues.custom_name ?? ''} onChange={(e) => onFieldChange('custom_name', e.target.value)} />
              {fieldErrors.custom_name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-fg)' }}>{fieldErrors.custom_name}</p>}
            </div>
          )}
          <div>
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
              {selectedPlatform.name} URL <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
            </label>
            <input className="input-field" type="url" placeholder={selectedPlatform.url_placeholder ?? 'https://...'} value={fieldValues.url ?? ''} onChange={(e) => onFieldChange('url', e.target.value)} />
            {selectedPlatform.url_hint && (
              <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--color-ink-tertiary)' }}>
                <Icons.Info size={10} /> {selectedPlatform.url_hint}
              </p>
            )}
            {fieldErrors.url && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-fg)' }}>{fieldErrors.url}</p>}
          </div>
        </div>
      )}

      {/* bio page note */}
      {activeType?.key === 'bio_page' && (
        <p className="text-sm mb-4" style={{ color: 'var(--color-ink-secondary)' }}>
          You'll build the page content in the Link-in-bio editor after creating this link.
        </p>
      )}

      {/* regular destination fields */}
      {activeType?.key !== 'social' && activeType?.key !== 'bio_page' && (
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
                    onChange={(e) => onFieldChange(f.key, e.target.value)}
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

      {/* short code — redirect types only */}
      {activeType?.encoding_mode === 'redirect' && (
        <div className="border-t pt-4 mt-2 mb-4" style={{ borderColor: 'var(--color-border)' }}>
          <label className="text-xs block mb-1.5 font-medium" style={{ color: 'var(--color-ink-secondary)' }}>Short link</label>
          <div className="flex items-center">
            <span className="font-mono text-sm px-3 py-2 rounded-l-lg border border-r-0 shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-canvas)', color: 'var(--color-ink-secondary)' }}>
              {SHORT_LINK_BASE_URL.replace('https://', '')}/{orgSlug}-
            </span>
            <div className="relative flex-1">
              <input
                className="input-field rounded-l-none w-full"
                placeholder="your-suffix"
                value={shortCodeSuffix}
                maxLength={20}
                onChange={(e) => onShortCodeChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
          <select className="input-field" value={corridor} onChange={(e) => onCorridorChange(e.target.value)}>
            <option value="">No corridor</option>
            {corridors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Campaign</label>
          <select className="input-field" value={campaignId} onChange={(e) => { onCampaignChange(e.target.value); onCampaignNameChange(''); }}>
            <option value="">No campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new__">+ New campaign...</option>
          </select>
        </div>
      </div>

      {campaignId === '__new__' && (
        <div className="mb-4">
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Campaign name</label>
          <input className="input-field" placeholder="e.g. Awareness Q3" value={campaignName} onChange={(e) => onCampaignNameChange(e.target.value)} />
        </div>
      )}
    </div>
  );
}
