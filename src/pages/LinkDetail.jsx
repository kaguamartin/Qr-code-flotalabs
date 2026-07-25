import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Download, Pencil, Apple, Smartphone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { TypeChip } from '../components/Shared';
import { links, weeklyScans, deviceBreakdown, topLocations, recentScans } from '../data/mockData';

const typeColorMap = { website: 'blue', app: 'teal', rsvp: 'purple' };

export default function LinkDetail() {
  const { id } = useParams();
  const link = links.find((l) => l.id === id) ?? links[2];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-5 text-xs">
        <Link to="/app/links" style={{ color: 'var(--color-ink-secondary)' }}>Links</Link>
        <ChevronRight size={12} style={{ color: 'var(--color-ink-tertiary)' }} />
        <span className="font-mono">{link.name}</span>
      </div>

      <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '0.85fr 1fr' }}>
        <div className="card p-5 flex flex-col items-center text-center">
          <div
            className="w-36 h-36 rounded-lg border mb-3.5"
            style={{ backgroundImage: 'repeating-conic-gradient(#1a1a1a 0% 25%, #fff 0% 50%)', backgroundSize: '18px 18px', borderColor: 'var(--color-border)' }}
          />
          <p className="font-mono text-sm mb-1.5">{link.name}</p>
          <TypeChip color={typeColorMap[link.type]}>{link.typeLabel}</TypeChip>
          <div className="flex gap-1.5 w-full mt-3.5">
            <button className="btn-secondary flex-1 justify-center text-xs h-8"><Download size={13} /> QR</button>
            <button className="btn-secondary flex-1 justify-center text-xs h-8"><Pencil size={13} /> Edit</button>
          </div>
          <div className="w-full text-left border-t mt-3.5 pt-2.5" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Corridor</p>
            <p className="text-sm mb-2">{link.corridor}</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Campaign</p>
            <p className="text-sm">{link.campaign}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2.5">
            <div className="card p-3.5">
              <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Total scans</p>
              <p className="text-xl font-medium">{link.scans.toLocaleString()}</p>
            </div>
            <div className="card p-3.5">
              <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Unique scans</p>
              <p className="text-xl font-medium">{Math.round(link.scans * 0.765).toLocaleString()}</p>
            </div>
            <div className="card p-3.5">
              <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Conversion</p>
              <p className="text-xl font-medium">{link.conv}%</p>
            </div>
            <div className="card p-3.5">
              <p className="text-xs mb-1" style={{ color: 'var(--color-ink-secondary)' }}>Peak hour</p>
              <p className="text-xl font-medium">7–8am</p>
            </div>
          </div>

          <div className="card p-4 flex-1">
            <p className="text-sm font-medium mb-2">Scans over time</p>
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyScans} margin={{ left: -20, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-tertiary)' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }} />
                  <Bar dataKey="scans" fill="var(--color-brand-blue)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1.4fr' }}>
        <div className="card p-4">
          <p className="text-sm font-medium mb-2.5">Devices</p>
          <div className="flex flex-col gap-2">
            {deviceBreakdown.map((d) => (
              <div key={d.label}>
                <div className="flex justify-between text-xs mb-1"><span>{d.label}</span><span className="font-medium">{d.pct}%</span></div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--color-canvas)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-medium mb-2.5">Top locations</p>
          <div className="flex flex-col gap-2">
            {topLocations.map((l) => {
              const max = Math.max(...topLocations.map((x) => x.count));
              return (
                <div key={l.label}>
                  <div className="flex justify-between text-xs mb-1"><span>{l.label}</span><span className="font-medium">{l.count}</span></div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--color-canvas)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${(l.count / max) * 100}%`, background: 'var(--color-brand-blue)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-medium mb-2.5">Recent scans</p>
          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
            {recentScans.map((s, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  {s.device === 'iPhone' ? <Apple size={13} style={{ color: 'var(--color-ink-secondary)' }} /> : <Smartphone size={13} style={{ color: 'var(--color-ink-secondary)' }} />}
                  <span>{s.loc}</span>
                </div>
                <span style={{ color: 'var(--color-ink-tertiary)' }}>{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
