import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { SHORT_LINK_BASE_URL } from '../config';

const INTEGRATION_META = {
  tracking_pixel: {
    name: 'Flota Tracking Pixel',
    icon: 'Crosshair',
    color: 'purple',
    group: 'Conversion tracking',
    desc: 'Embed a pixel on your landing pages to capture signup started and completed events.',
    setupSteps: [
      'Copy the pixel code below',
      'Paste it into the <head> of your landing page',
      'Verify by triggering a test event',
    ],
  },
  google_analytics: {
    name: 'Google Analytics',
    icon: 'BarChart2',
    color: 'blue',
    group: 'Conversion tracking',
    desc: 'Connect GA4 to automatically tag QR scan traffic with UTM parameters for campaign attribution.',
    setupSteps: [
      'Go to Google Analytics → Admin → Data Streams',
      'Select your web stream and copy the Measurement ID (starts with G-)',
      'Paste it below and click Connect',
      'Verify in GA4 Real-time reports after your next QR scan',
    ],
    field: { key: 'measurement_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' },
  },
  google_sheets: {
    name: 'Google Sheets',
    icon: 'Table',
    color: 'green',
    group: 'Data & workflow',
    desc: 'Export scan data automatically to a Google Sheet for custom reporting.',
    comingSoon: true,
  },
  slack: {
    name: 'Slack',
    icon: 'MessageSquare',
    color: 'pink',
    group: 'Data & workflow',
    desc: 'Get scan milestone alerts and weekly summaries delivered to your Slack workspace.',
    comingSoon: true,
  },
  hubspot: {
    name: 'HubSpot',
    icon: 'Layers',
    color: 'coral',
    group: 'Data & workflow',
    desc: 'Sync QR scan leads directly into HubSpot contacts and deals.',
    comingSoon: true,
  },
  zapier: {
    name: 'Zapier',
    icon: 'Zap',
    color: 'amber',
    group: 'Data & workflow',
    desc: 'Connect Flota Labs to 5,000+ apps via Zapier webhooks.',
    comingSoon: true,
  },
};

function SetupModal({ provider, integration, onClose, onSave }) {
  const meta = INTEGRATION_META[provider];
  const [fieldValue, setFieldValue] = useState(integration?.config?.[meta?.field?.key] ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const pixelCode = `<!-- Flota Labs Tracking Pixel -->
<script>
  (function(f,l,o,t,a){
    f.FloatPixel=t;f[t]=f[t]||function(){(f[t].q=f[t].q||[]).push(arguments)};
    a=l.createElement('script');a.async=1;a.src=o;l.head.appendChild(a);
  })(window,document,'${SHORT_LINK_BASE_URL}/pixel.js','flota');
</script>`;

  async function handleSave() {
    if (meta?.field && !fieldValue.trim()) { setError(meta.field.label + ' is required.'); return; }
    setSaving(true); setError('');
    const config = meta?.field ? { [meta.field.key]: fieldValue.trim() } : {};
    await onSave(provider, config);
    setSaving(false);
    onClose();
  }

  function copyPixel() {
    navigator.clipboard.writeText(pixelCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {(() => {
              const Icon = Icons[meta?.icon] ?? Icons.Plug;
              return (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-type-' + (meta.color ?? 'blue') + '-bg)' }}>
                  <Icon size={16} style={{ color: 'var(--color-type-' + (meta.color ?? 'blue') + '-fg)' }} />
                </div>
              );
            })()}
            <p className="text-sm font-medium">{meta?.name}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-ink-tertiary)' }}><Icons.X size={16} /></button>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--color-ink-secondary)' }}>{meta?.desc}</p>

        {/* setup steps */}
        <div className="mb-4">
          <p className="text-xs font-medium mb-2">Setup steps</p>
          <div className="flex flex-col gap-2">
            {meta?.setupSteps?.map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium text-white mt-0.5" style={{ background: 'var(--color-brand-blue)' }}>
                  {i + 1}
                </div>
                <p className="text-xs" style={{ color: 'var(--color-ink-secondary)' }}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* pixel code */}
        {provider === 'tracking_pixel' && (
          <div className="mb-4">
            <p className="text-xs font-medium mb-2">Pixel code</p>
            <div className="relative">
              <pre className="text-[10px] p-3 rounded-lg overflow-x-auto" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-secondary)', whiteSpace: 'pre-wrap' }}>
                {pixelCode}
              </pre>
              <button
                onClick={copyPixel}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md flex items-center gap-1"
                style={{ background: copied ? 'var(--color-success-bg)' : 'var(--color-border)', color: copied ? 'var(--color-success-fg)' : 'var(--color-ink-secondary)' }}
              >
                {copied ? <><Icons.Check size={11} /> Copied</> : <><Icons.Copy size={11} /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* config field */}
        {meta?.field && (
          <div className="mb-4">
            <label className="text-xs block mb-1.5" style={{ color: 'var(--color-ink-secondary)' }}>
              {meta.field.label} <span style={{ color: 'var(--color-danger-fg)' }}>*</span>
            </label>
            <input
              className="input-field font-mono"
              placeholder={meta.field.placeholder}
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
            />
            {error && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-fg)' }}>{error}</p>}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {saving ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ provider, integration, onConnect, onDisconnect }) {
  const meta = INTEGRATION_META[provider];
  if (!meta) return null;
  const Icon = Icons[meta.icon] ?? Icons.Plug;
  const connected = integration?.status === 'connected';

  return (
    <div className="card p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-type-' + (meta.color ?? 'blue') + '-bg)' }}>
  <Icon size={16} style={{ color: 'var(--color-type-' + (meta.color ?? 'blue') + '-fg)' }} />
</div>
          <p className="text-sm font-medium">{meta.name}</p>
        </div>
        {meta.comingSoon ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-tertiary)' }}>
            Coming soon
          </span>
        ) : connected ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-fg)' }}>
            Connected
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-canvas)', color: 'var(--color-ink-secondary)' }}>
            Not connected
          </span>
        )}
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--color-ink-secondary)' }}>{meta.desc}</p>

      {meta.comingSoon ? (
        <button className="btn-secondary text-xs h-7 opacity-50" disabled>Coming soon</button>
      ) : connected ? (
        <div className="flex gap-2">
          <button onClick={() => onConnect(provider)} className="btn-secondary text-xs h-7">Manage</button>
          <button onClick={() => onDisconnect(provider)} className="text-xs h-7 px-2.5 rounded-lg" style={{ color: 'var(--color-danger-fg)' }}>Disconnect</button>
        </div>
      ) : (
        <button onClick={() => onConnect(provider)} className="btn-primary text-xs h-7">Connect</button>
      )}
    </div>
  );
}

export default function Integrations() {
  const { membership } = useAuth();
  const orgId = membership?.organizations?.id;

  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    loadIntegrations();
  }, [orgId]);

  async function loadIntegrations() {
    setLoading(true);
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('org_id', orgId);

    const map = {};
    (data ?? []).forEach((i) => { map[i.provider] = i; });
    setIntegrations(map);
    setLoading(false);
  }

  async function handleSave(provider, config) {
    const existing = integrations[provider];
    if (existing) {
      await supabase.from('integrations').update({
        status: 'connected',
        config,
        connected_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('integrations').insert({
        org_id: orgId,
        provider,
        status: 'connected',
        config,
        connected_at: new Date().toISOString(),
      });
    }
    await loadIntegrations();
  }

  async function handleDisconnect(provider) {
    const existing = integrations[provider];
    if (!existing) return;
    await supabase.from('integrations').update({ status: 'disconnected', config: null }).eq('id', existing.id);
    await loadIntegrations();
  }

  const conversionProviders = ['tracking_pixel', 'google_analytics'];
  const workflowProviders = ['google_sheets', 'slack', 'hubspot', 'zapier'];

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Icons.Loader size={16} className="animate-spin" style={{ color: 'var(--color-ink-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {activeModal && (
        <SetupModal
          provider={activeModal}
          integration={integrations[activeModal]}
          onClose={() => setActiveModal(null)}
          onSave={handleSave}
        />
      )}

      <div className="mb-6">
        <h1 className="text-lg font-medium">Integrations</h1>
        <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
          Connect tools to capture more of the funnel and route your data elsewhere.
        </p>
      </div>

      <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Conversion tracking</p>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {conversionProviders.map((provider) => (
          <IntegrationCard
            key={provider}
            provider={provider}
            integration={integrations[provider]}
            onConnect={setActiveModal}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Data & workflow</p>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {workflowProviders.map((provider) => (
          <IntegrationCard
            key={provider}
            provider={provider}
            integration={integrations[provider]}
            onConnect={setActiveModal}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide mb-2.5" style={{ color: 'var(--color-ink-secondary)' }}>Developer</p>
      <div className="card p-4 flex justify-between items-center">
        <div className="flex gap-2.5 items-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
            <Icons.Code size={16} style={{ color: 'var(--color-ink-secondary)' }} />
          </div>
          <div>
            <p className="text-sm font-medium">API & webhooks</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>
              Pull scan data programmatically or receive real-time webhook events.
            </p>
          </div>
        </div>
        <button className="btn-secondary text-xs h-7">Manage keys</button>
      </div>
    </div>
  );
}
