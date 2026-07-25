import * as Icons from 'lucide-react';
import { StatusBadge } from '../components/Shared';
import { integrations } from '../data/mockData';

function IntegrationCard({ item }) {
  const Icon = Icons[item.icon] ?? Icons.Plug;
  const connected = item.status === 'connected';
  return (
    <div className="card p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: item.color ? `var(--color-type-${item.color}-bg)` : 'var(--color-info-bg)' }}>
            <Icon size={16} style={{ color: item.color ? `var(--color-type-${item.color}-fg)` : 'var(--color-info-fg)' }} />
          </div>
          <p className="text-sm font-medium">{item.name}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--color-ink-secondary)' }}>{item.desc}</p>
      <button className={connected ? 'btn-secondary text-xs h-7' : 'btn-primary text-xs h-7'}>
        {connected ? 'Manage' : 'Connect'}
      </button>
    </div>
  );
}

export default function Integrations() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-medium">Integrations</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Connect tools to capture more of the funnel and route your data elsewhere.</p>
      </div>

      <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Conversion tracking</p>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {integrations.conversionTracking.map((item) => <IntegrationCard key={item.name} item={item} />)}
      </div>

      <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Data & workflow</p>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {integrations.workflow.map((item) => <IntegrationCard key={item.name} item={item} />)}
      </div>

      <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Developer</p>
      <div className="card p-4 flex justify-between items-center">
        <div className="flex gap-2.5 items-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
            <Icons.Code size={16} style={{ color: 'var(--color-ink-secondary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium">API & webhooks</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Pull scan data programmatically or receive real-time webhook events.</p>
          </div>
        </div>
        <button className="btn-secondary text-xs h-7">Manage keys</button>
      </div>
    </div>
  );
}
