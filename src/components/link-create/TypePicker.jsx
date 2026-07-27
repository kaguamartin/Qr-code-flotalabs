import * as Icons from 'lucide-react';
import { groupIcon, groupColor } from './linkCreateHelpers';

export default function TypePicker({ destinationGroups, socialPlatforms, onSelectType, onSelectPlatform, onHover, onHoverEnd }) {
  return (
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
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink-secondary)' }}>
                  {group.label}
                </span>
              </div>

              {isSocialGroup ? (
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                  {socialPlatforms.map((platform) => {
                    const faviconDomain = platform.url_prefix?.replace('https://', '').replace(/\/$/, '') || platform.key + '.com';
                    const socialType = group.types.find((t) => t.key === 'social') ?? group.types[0];
                    return (
                      <button
                        key={platform.key}
                        onClick={() => { onSelectType(socialType); onSelectPlatform(platform); }}
                        onMouseEnter={() => onHover(socialType)}
                        onMouseLeave={onHoverEnd}
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
                      onClick={() => onSelectType(t)}
                      onMouseEnter={() => onHover(t)}
                      onMouseLeave={onHoverEnd}
                      className="flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all hover:shadow-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `var(--color-type-${color}-bg)` }}
                      >
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
  );
}
