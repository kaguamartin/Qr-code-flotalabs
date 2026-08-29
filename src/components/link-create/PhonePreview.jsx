import * as Icons from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { groupIcon } from './linkCreateHelpers';

export default function PhonePreview({
  step,
  activeType,
  fieldValues,
  selectedPlatform,
  shortCode,
  orgSlug,
  qrColor,
  qrValue,
  onDownload,
}) {
  const shortUrl = `flotalabs.co.ke/${orgSlug ? orgSlug + '-' : ''}${shortCode || '...'}`;

  function renderContent() {
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
  const hasValidQr = qrValue && qrValue.length > 10;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
      <div className="w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
      {hasValidQr ? (
        <>
          <QRCodeSVG
            id="qr-preview-svg"
            value={qrValue}
            size={120}
            fgColor={qrColor}
            bgColor="#ffffff"
            level="M"
          />
          <p className="font-mono text-[10px] text-center" style={{ color: 'var(--color-ink-secondary)' }}>
            {activeType?.encoding_mode === 'redirect' ? `flotalabs.co.ke/${orgSlug}-${shortCode}` : activeType?.display_name}
          </p>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white w-full justify-center"
            style={{ background: 'var(--color-brand-blue)' }}
          >
            <Icons.Download size={12} /> Download QR
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center px-2">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center" style={{ borderColor: 'var(--color-border)' }}>
            <Icons.QrCode size={28} style={{ color: 'var(--color-ink-tertiary)' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
            Fill in the required fields to generate your QR code.
          </p>
        </div>
      )}
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
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#1877F2' }}>Join</button>
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
      const isCall = activeType.key !== 'sms';
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
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white mt-2" style={{ background: '#d97706' }}>Compose Email</button>
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
            <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#16a34a' }}>Open in Maps</button>
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

    // default — browser bar for redirect types
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
      <div
        className="mx-auto w-52 rounded-3xl border-4 overflow-hidden shadow-xl flex flex-col"
        style={{ borderColor: '#1a1a1a', height: 400, background: '#f9fafb' }}
      >
        <div className="flex justify-between items-center px-4 py-1.5 shrink-0" style={{ background: '#1a1a1a' }}>
          <span className="text-[9px] text-white">9:41</span>
          <div className="flex gap-1 items-center">
            <Icons.Signal size={8} color="white" />
            <Icons.Wifi size={8} color="white" />
            <Icons.Battery size={8} color="white" />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
