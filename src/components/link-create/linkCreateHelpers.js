export function groupIcon(label) {
  const l = (label ?? '').toLowerCase();
  if (l.includes('web')) return 'Globe';
  if (l.includes('app') || l.includes('store')) return 'Smartphone';
  if (l.includes('social') || l.includes('messaging')) return 'MessageCircle';
  if (l.includes('direct') || l.includes('action')) return 'Phone';
  if (l.includes('location')) return 'MapPin';
  if (l.includes('contact')) return 'IdCard';
  if (l.includes('connect')) return 'Wifi';
  if (l.includes('event') || l.includes('ticket')) return 'CalendarPlus';
  if (l.includes('multi') || l.includes('bio')) return 'ListTree';
  if (l.includes('coupon') || l.includes('loyalty')) return 'Ticket';
  if (l.includes('review') || l.includes('feedback')) return 'Star';
  return 'Circle';
}

export function groupColor(label) {
  const l = (label ?? '').toLowerCase();
  if (l.includes('web')) return 'blue';
  if (l.includes('app')) return 'teal';
  if (l.includes('social')) return 'pink';
  if (l.includes('direct')) return 'coral';
  if (l.includes('location')) return 'green';
  if (l.includes('contact')) return 'amber';
  if (l.includes('connect')) return 'purple';
  if (l.includes('event')) return 'indigo';
  if (l.includes('multi') || l.includes('bio')) return 'violet';
  if (l.includes('coupon') || l.includes('loyalty')) return 'rose';
  if (l.includes('review') || l.includes('feedback')) return 'lime';
  return 'blue';
}

export function getRawQrValue({ activeType, fieldValues, orgSlug, shortCodeSuffix }) {
  if (!activeType) return '';
  if (activeType.encoding_mode === 'redirect') {
    return `https://flota.ke/${orgSlug}-${shortCodeSuffix}`;
  }
  switch (activeType.key) {
    case 'wifi':
      return `WIFI:T:WPA;S:${fieldValues.ssid ?? ''};P:${fieldValues.password ?? ''};;`;
    case 'call':
    case 'save_number':
      return `tel:${fieldValues.phone ?? ''}`;
    case 'sms':
      return `smsto:${fieldValues.phone ?? ''}`;
    case 'email':
      return `mailto:${fieldValues.to ?? ''}${fieldValues.subject ? `?subject=${encodeURIComponent(fieldValues.subject)}` : ''}`;
    case 'map':
      return `geo:0,0?q=${encodeURIComponent(fieldValues.address ?? '')}`;
    case 'vcard':
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${fieldValues.name ?? ''}\nTEL:${fieldValues.phone ?? ''}\nORG:${fieldValues.company ?? ''}\nEND:VCARD`;
    case 'calendar':
      return `BEGIN:VEVENT\nSUMMARY:${fieldValues.event_title ?? ''}\nDTSTART:${(fieldValues.event_date ?? '').replace(/[-:]/g, '').slice(0, 15)}\nEND:VEVENT`;
    default:
      return `https://flota.ke/${orgSlug}-${shortCodeSuffix}`;
  }
}

export function downloadQR({ qrBgColor, orgSlug, shortCodeSuffix, activeType }) {
  const svg = document.querySelector('#qr-preview-svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = qrBgColor;
    ctx.fillRect(0, 0, 400, 400);
    ctx.drawImage(img, 0, 0, 400, 400);
    const link = document.createElement('a');
    link.download = `flota-qr-${orgSlug}-${shortCodeSuffix || activeType?.key}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export const noFunnelNote = 'This QR encodes data directly — phones act on it natively. We still log the scan, but there is no click-through destination to report on.';

export const corridors = ['Thika Road', 'Mombasa Road', 'Waiyaki Way', 'Ngong Road', 'Kiambu Road'];