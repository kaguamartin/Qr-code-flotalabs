import { useState } from 'react';
import * as Icons from 'lucide-react';
import { bioBlocks as initialBlocks } from '../data/mockData';

export default function BioBuilder() {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [title, setTitle] = useState('Bidco Africa');
  const [subtitle, setSubtitle] = useState('Win big with our Thika Road promo');
  const [dragIndex, setDragIndex] = useState(null);

  function handleDrop(targetIndex) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setBlocks(next);
    setDragIndex(null);
  }

  function removeBlock(id) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }

  function updateLabel(id, label) {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, label } : b)));
  }

  function addBlock() {
    const id = `b${Date.now()}`;
    setBlocks([...blocks, { id, label: 'New button', icon: 'Link', color: 'blue' }]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">Link-in-bio page</h1>
          <p className="text-sm font-mono" style={{ color: 'var(--color-ink-secondary)' }}>flota.ke/bidco-hub</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary"><Icons.QrCode size={15} /> View QR</button>
          <button className="btn-primary">Publish</button>
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1.4fr 0.8fr' }}>
        <div>
          <div className="card p-4 mb-3.5">
            <p className="text-sm font-medium mb-2.5">Page header</p>
            <div className="flex gap-2.5 items-center">
              <div className="w-11 h-11 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <input className="input-field text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input className="input-field text-xs" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Buttons</p>
            <span className="text-xs" style={{ color: 'var(--color-ink-tertiary)' }}>Drag to reorder</span>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            {blocks.map((b, i) => {
              const Icon = Icons[b.icon] ?? Icons.Link;
              return (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className="card flex items-center gap-2.5 px-3 py-2.5 cursor-grab"
                >
                  <Icons.GripVertical size={15} style={{ color: 'var(--color-ink-tertiary)' }} />
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `var(--color-type-${b.color}-bg)` }}
                  >
                    <Icon size={14} style={{ color: `var(--color-type-${b.color}-fg)` }} />
                  </div>
                  <input
                    className="flex-1 text-sm bg-transparent outline-none"
                    value={b.label}
                    onChange={(e) => updateLabel(b.id, e.target.value)}
                  />
                  <Icons.BarChart3 size={14} style={{ color: 'var(--color-ink-tertiary)' }} />
                  <button onClick={() => removeBlock(b.id)}>
                    <Icons.Trash2 size={14} style={{ color: 'var(--color-ink-tertiary)' }} />
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={addBlock} className="w-full h-9 rounded-lg border border-dashed text-sm flex items-center justify-center gap-1.5" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-secondary)' }}>
            <Icons.Plus size={15} /> Add button
          </button>
        </div>

        <div className="flex justify-center">
          <div className="w-60 rounded-3xl border-6 bg-white p-5 shadow-lg" style={{ borderColor: '#1a1a1a' }}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-full mb-2.5" style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }} />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs mt-1" style={{ color: '#666' }}>{subtitle}</p>
            </div>
            <div className="flex flex-col gap-2">
              {blocks.map((b) => {
                const Icon = Icons[b.icon] ?? Icons.Link;
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: `var(--color-type-${b.color}-bg)` }}
                  >
                    <Icon size={14} style={{ color: `var(--color-type-${b.color}-fg)` }} />
                    <span className="text-xs font-medium" style={{ color: `var(--color-type-${b.color}-fg)` }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
