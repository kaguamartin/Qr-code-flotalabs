import * as Icons from 'lucide-react';

export default function StepIndicator({ current }) {
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
              <span
                className="text-xs"
                style={{
                  color: active ? 'var(--color-ink-primary)' : 'var(--color-ink-tertiary)',
                  fontWeight: active ? 500 : 400,
                }}
              >
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
