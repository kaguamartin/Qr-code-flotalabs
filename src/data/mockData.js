// Mock data layer — shaped to mirror the Supabase schema (see flota_labs_schema.md)
// so swapping this for real queries later is mostly a find-and-replace.

export const currentUser = {
  id: 'u1',
  name: 'Martin',
  email: 'martin@www.flotalabs.co.ke',
  isSuperAdmin: true,
};

export const destinationGroups = [
  {
    label: 'Web destinations', color: 'blue', icon: 'Globe',
    types: [
      { key: 'website', name: 'Website / landing page', supportsFunnel: true },
      { key: 'catalog', name: 'Product catalog', supportsFunnel: true },
      { key: 'video', name: 'Promotional video', supportsFunnel: true },
      { key: 'pdf', name: 'PDF, brochure or menu', supportsFunnel: true },
    ],
  },
  {
    label: 'App & store', color: 'teal', icon: 'Smartphone',
    types: [{ key: 'app', name: 'App download (Play Store / App Store)', supportsFunnel: true }],
  },
  {
    label: 'Social & messaging', color: 'pink', icon: 'MessageCircle',
    types: [
      { key: 'social', name: 'Social media profile', supportsFunnel: true },
      { key: 'whatsapp', name: 'WhatsApp channel or group', supportsFunnel: true },
    ],
  },
  {
    label: 'Direct actions', color: 'coral', icon: 'Phone',
    types: [
      { key: 'call', name: 'Phone call', supportsFunnel: false },
      { key: 'email', name: 'Send an email', supportsFunnel: false },
      { key: 'sms', name: 'Send an SMS', supportsFunnel: false },
    ],
  },
  {
    label: 'Location', color: 'green', icon: 'MapPin',
    types: [{ key: 'map', name: 'Map & directions', supportsFunnel: false }],
  },
  {
    label: 'Contact data', color: 'amber', icon: 'IdCard',
    types: [
      { key: 'vcard', name: 'Save contact (vCard)', supportsFunnel: false },
      { key: 'save_number', name: 'Save phone number', supportsFunnel: false },
    ],
  },
  {
    label: 'Connectivity', color: 'purple', icon: 'Wifi',
    types: [{ key: 'wifi', name: 'Wi-Fi credentials', supportsFunnel: false }],
  },
  {
    label: 'Event & ticketing', color: 'indigo', icon: 'CalendarPlus',
    types: [
      { key: 'calendar', name: 'Add to calendar', supportsFunnel: false },
      { key: 'rsvp', name: 'Event registration / RSVP', supportsFunnel: true },
    ],
  },
  {
    label: 'Multi-link', color: 'violet', icon: 'ListTree',
    types: [{ key: 'bio_page', name: 'Link-in-bio landing page', supportsFunnel: true }],
  },
  {
    label: 'Coupon & loyalty', color: 'rose', icon: 'Ticket',
    types: [
      { key: 'coupon', name: 'Discount code / coupon', supportsFunnel: true },
      { key: 'loyalty', name: 'Loyalty program signup', supportsFunnel: true },
    ],
  },
  {
    label: 'Reviews & feedback', color: 'lime', icon: 'Star',
    types: [
      { key: 'review', name: 'Google review', supportsFunnel: false },
      { key: 'survey', name: 'Customer feedback / survey', supportsFunnel: true },
    ],
  },
];

export const organizations = [
  { id: 'org-bidco', name: 'Bidco Africa', industry: 'FMCG', status: 'active', links: 6, scans30d: 14820, lastActivity: '2 hours ago', team: 5 },
  { id: 'org-airtel', name: 'Airtel Kenya', industry: 'Telecom', status: 'active', links: 11, scans30d: 38440, lastActivity: 'Just now', team: 8 },
  { id: 'org-ncba', name: 'NCBA Bank', industry: 'Banking', status: 'active', links: 9, scans30d: 22110, lastActivity: '1 day ago', team: 4 },
  { id: 'org-mwalimu', name: 'Mwalimu National Sacco', industry: 'Finance', status: 'attention', links: 3, scans30d: 1204, lastActivity: '18 days ago', team: 2 },
  { id: 'org-gomycode', name: 'GoMyCode Kenya', industry: 'Education', status: 'active', links: 4, scans30d: 6780, lastActivity: '3 hours ago', team: 3 },
  { id: 'org-odibets', name: 'Odibets Kenya', industry: 'Gaming', status: 'attention', links: 5, scans30d: 2940, lastActivity: '21 days ago', team: 2 },
  { id: 'org-kcb', name: 'KCB Bank', industry: 'Banking', status: 'active', links: 14, scans30d: 41500, lastActivity: '5 hours ago', team: 6 },
];

export const links = [
  { id: 'link-1', orgId: 'org-bidco', name: 'www.flotalabs.co.ke/bidco-data', type: 'website', typeLabel: 'Website', corridor: 'Thika Road', campaign: 'Bidco — Awareness Q3', scans: 5210, conv: 11.4 },
  { id: 'link-2', orgId: 'org-bidco', name: 'www.flotalabs.co.ke/bidco-app', type: 'app', typeLabel: 'Play Store', corridor: 'Mombasa Road', campaign: 'Bidco — Awareness Q3', scans: 4330, conv: 6.8 },
  { id: 'link-3', orgId: 'org-bidco', name: 'www.flotalabs.co.ke/bidco-win', type: 'rsvp', typeLabel: 'Signup form', corridor: 'Waiyaki Way', campaign: 'Bidco — Win promo', scans: 3140, conv: 14.2 },
  { id: 'link-4', orgId: 'org-bidco', name: 'www.flotalabs.co.ke/bidco-promo', type: 'website', typeLabel: 'Website', corridor: 'Thika Road', campaign: 'Bidco — Awareness Q3', scans: 1640, conv: 8.1 },
  { id: 'link-5', orgId: 'org-bidco', name: 'www.flotalabs.co.ke/bidco-app2', type: 'app', typeLabel: 'Play Store', corridor: 'Mombasa Road', campaign: 'Bidco — Awareness Q3', scans: 410, conv: 5.3 },
  { id: 'link-6', orgId: 'org-bidco', name: 'www.flotalabs.co.ke/bidco-launch', type: 'rsvp', typeLabel: 'Signup form', corridor: 'Waiyaki Way', campaign: 'Bidco — Win promo', scans: 90, conv: 2.1 },
];

export const roles = [
  {
    id: 'role-owner', name: 'Owner', locked: true, memberCount: 1,
    permissions: { 'links.view': true, 'links.create': true, 'links.edit': true, 'links.delete': true, 'reports.export': true, 'reports.funnel': true, 'team.invite': true, 'team.manage': true, 'workspace.branding': true, 'workspace.integrations': true },
  },
  {
    id: 'role-admin', name: 'Admin', locked: false, memberCount: 1,
    permissions: { 'links.view': true, 'links.create': true, 'links.edit': true, 'links.delete': true, 'reports.export': true, 'reports.funnel': true, 'team.invite': true, 'team.manage': false, 'workspace.branding': true, 'workspace.integrations': true },
  },
  {
    id: 'role-editor', name: 'Editor', locked: false, memberCount: 1,
    permissions: { 'links.view': true, 'links.create': true, 'links.edit': true, 'links.delete': false, 'reports.export': true, 'reports.funnel': true, 'team.invite': false, 'team.manage': false, 'workspace.branding': false, 'workspace.integrations': false },
  },
  {
    id: 'role-analyst', name: 'Analyst', locked: false, memberCount: 2,
    permissions: { 'links.view': true, 'links.create': false, 'links.edit': false, 'links.delete': false, 'reports.export': true, 'reports.funnel': true, 'team.invite': false, 'team.manage': false, 'workspace.branding': false, 'workspace.integrations': false },
  },
  {
    id: 'role-viewer', name: 'Viewer', locked: false, memberCount: 0,
    permissions: { 'links.view': true, 'links.create': false, 'links.edit': false, 'links.delete': false, 'reports.export': false, 'reports.funnel': false, 'team.invite': false, 'team.manage': false, 'workspace.branding': false, 'workspace.integrations': false },
  },
];

export const permissionGroups = [
  { label: 'Links & QR codes', keys: [['links.view', 'View links and analytics'], ['links.create', 'Create new links'], ['links.edit', 'Edit existing links'], ['links.delete', 'Delete links']] },
  { label: 'Reports', keys: [['reports.export', 'Export analytics (CSV/PDF)'], ['reports.funnel', 'View funnel & conversion data']] },
  { label: 'Team', keys: [['team.invite', 'Invite team members'], ['team.manage', 'Manage roles & permissions']] },
  { label: 'Workspace', keys: [['workspace.branding', 'Edit branding & settings'], ['workspace.integrations', 'Manage integrations']] },
];

export const members = [
  { id: 'm1', name: 'James Mwangi', email: 'james@bidco.co.ke', roleId: 'role-owner', status: 'active', lastActive: 'Just now' },
  { id: 'm2', name: 'Faith Wanjiru', email: 'faith@bidco.co.ke', roleId: 'role-admin', status: 'active', lastActive: '3 hours ago' },
  { id: 'm3', name: 'Brian Otieno', email: 'brian@bidco.co.ke', roleId: 'role-editor', status: 'active', lastActive: '1 day ago' },
  { id: 'm4', name: 'Naomi Chebet', email: 'naomi@bidco.co.ke', roleId: 'role-analyst', status: 'active', lastActive: '2 days ago' },
  { id: 'm5', name: 'Dennis Kiptoo', email: 'dennis@bidco.co.ke', roleId: 'role-viewer', status: 'pending', lastActive: 'Invited 2 days ago' },
];

export const scansOverTime = [
  { day: 'Day 1', scans: 620 }, { day: '2', scans: 710 }, { day: '3', scans: 690 },
  { day: '4', scans: 820 }, { day: '5', scans: 910 }, { day: '6', scans: 880 },
  { day: '7', scans: 1020 }, { day: '8', scans: 1110 }, { day: '9', scans: 1080 },
  { day: '10', scans: 1190 }, { day: '11', scans: 1240 }, { day: '12', scans: 1200 },
  { day: '13', scans: 1290 }, { day: 'Day 14', scans: 1340 },
];

export const weeklyScans = [
  { day: 'Mon', scans: 380 }, { day: 'Tue', scans: 420 }, { day: 'Wed', scans: 310 },
  { day: 'Thu', scans: 460 }, { day: 'Fri', scans: 390 }, { day: 'Sat', scans: 510 }, { day: 'Sun', scans: 470 },
];

export const funnelSteps = [
  { label: 'Scanned', value: 14820, pct: 100, color: 'var(--color-brand-blue)' },
  { label: 'Reached destination', value: 12990, pct: 87, color: 'var(--color-brand-blue)' },
  { label: 'Signup started', value: 3402, pct: 23, color: 'var(--color-brand-purple)' },
  { label: 'Signup completed', value: 1367, pct: 9, color: 'var(--color-brand-purple)' },
];

export const deviceBreakdown = [
  { label: 'Mobile', pct: 88, color: 'var(--color-brand-blue)' },
  { label: 'Tablet', pct: 8, color: 'var(--color-brand-purple)' },
  { label: 'Desktop', pct: 4, color: '#9CA3E8' },
];

export const topLocations = [
  { label: 'Nairobi CBD', count: 1240 },
  { label: 'Westlands', count: 680 },
  { label: 'Kikuyu', count: 410 },
  { label: 'Kawangware', count: 290 },
  { label: 'Other', count: 520 },
];

export const recentScans = [
  { time: '2 min ago', device: 'iPhone', loc: 'Westlands' },
  { time: '14 min ago', device: 'Android', loc: 'Nairobi CBD' },
  { time: '31 min ago', device: 'Android', loc: 'Kikuyu' },
  { time: '52 min ago', device: 'iPhone', loc: 'Nairobi CBD' },
  { time: '1 hr ago', device: 'Android', loc: 'Kawangware' },
  { time: '1 hr ago', device: 'Android', loc: 'Westlands' },
];

export const bioBlocks = [
  { id: 'b1', label: 'Visit our website', icon: 'Globe', color: 'blue' },
  { id: 'b2', label: 'Shop the catalog', icon: 'ShoppingBag', color: 'teal' },
  { id: 'b3', label: 'Watch the promo video', icon: 'PlayCircle', color: 'coral' },
  { id: 'b4', label: 'Join our WhatsApp channel', icon: 'MessageCircle', color: 'pink' },
  { id: 'b5', label: 'Follow us on Instagram', icon: 'Instagram', color: 'rose' },
  { id: 'b6', label: 'Download the menu (PDF)', icon: 'FileText', color: 'amber' },
];

export const integrations = {
  conversionTracking: [
    { name: 'Flota tracking pixel', desc: 'Drop a snippet on your destination page to capture form submits and signups in your funnel.', status: 'connected', icon: 'Target' },
    { name: 'Google Analytics', desc: 'Forward scan events to GA4 to blend with your existing site analytics.', status: 'disconnected', icon: 'BarChart3' },
  ],
  workflow: [
    { name: 'Google Sheets', desc: 'Auto-log every scan as a new row in a connected sheet.', status: 'connected', icon: 'Table', color: 'green' },
    { name: 'Slack', desc: 'Get a Slack alert when a campaign hits a scan milestone.', status: 'disconnected', icon: 'Slack', color: 'rose' },
    { name: 'HubSpot CRM', desc: 'Push leads captured via signup-form QR links into HubSpot.', status: 'disconnected', icon: 'Building2', color: 'amber' },
    { name: 'Zapier', desc: 'Connect Flota Labs to 5,000+ apps with custom automations.', status: 'disconnected', icon: 'Zap', color: 'violet' },
  ],
};
