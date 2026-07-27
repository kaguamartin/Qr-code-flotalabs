import { noFunnelNote } from './linkCreateHelpers';

const presets = [
  { fg: '#1a1a1a', bg: '#ffffff', label: 'Classic' },
  { fg: '#9d16f1', bg: '#ffffff', label: 'Brand' },
  { fg: '#1877F2', bg: '#ffffff', label: 'Blue' },
  { fg: '#ffffff', bg: '#1a1a1a', label: 'Inverted' },
  { fg: '#16a34a', bg: '#f0fdf4', label: 'Green' },
];

export default function QRCustomizer({
  activeType,
  orgSlug,
  shortCodeSuffix,
  qrColor,
  qrBgColor,
  onQrColorChange,
  onQrBgColorChange,
}) {
  return (
    <div className="card p-6">
      <p className="text-sm font-medium mb-4">Customize your QR code</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>QR color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={qrColor}
              onChange={(e) => onQrColorChange(e.target.value)}
              className="w-9 h-9 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--color-border)', padding: 2 }}
            />
            <input
              className="input-field font-mono text-xs flex-1"
              value={qrColor}
              onChange={(e) => onQrColorChange(e.target.value)}
              placeholder="#1a1a1a"
            />
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>Background color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={qrBgColor}
              onChange={(e) => onQrBgColorChange(e.target.value)}
              className="w-9 h-9 rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--color-border)', padding: 2 }}
            />
            <input
              className="input-field font-mono text-xs flex-1"
              value={qrBgColor}
              onChange={(e) => onQrBgColorChange(e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>Presets</p>
      <div className="flex gap-2 mb-6">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => { onQrColorChange(preset.fg); onQrBgColorChange(preset.bg); }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-8 h-8 rounded-lg border flex items-center justify-center"
              style={{ background: preset.bg, borderColor: 'var(--color-border)' }}
            >
              <div className="w-4 h-4 rounded-sm" style={{ background: preset.fg }} />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-ink-tertiary)' }}>{preset.label}</span>
          </button>
        ))}
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        {activeType?.encoding_mode === 'redirect' && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-ink-secondary)' }}>
            Short link:{' '}
            <span className="font-mono">flota.ke/{orgSlug}-{shortCodeSuffix}</span>
          </p>
        )}
        {activeType && !activeType.supports_funnel && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-tertiary)' }}>
            {noFunnelNote}
          </p>
        )}
      </div>
    </div>
  );
}
