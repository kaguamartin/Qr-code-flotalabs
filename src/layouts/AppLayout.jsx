import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Link2, ListTree, Users, Plug, Settings, ArrowLeftRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/links', label: 'Links & QR codes', icon: Link2 },
  { to: '/app/bio', label: 'Link-in-bio', icon: ListTree },
  { to: '/app/team', label: 'Team & roles', icon: Users },
  { to: '/app/integrations', label: 'Integrations', icon: Plug },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { profile, membership, isSuperAdmin } = useAuth();

  const org = membership?.organizations;
  const orgName = org?.name ?? 'Workspace';
  const userInitial = profile?.full_name?.charAt(0)?.toUpperCase() ?? '?';
  const userName = profile?.full_name ?? profile?.email ?? '—';

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r bg-white flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              className="w-8 h-8 rounded-lg object-contain border shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
              alt={orgName}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
            >
              {orgName?.charAt(0)?.toUpperCase() ?? 'F'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{orgName}</p>
            <p className="text-xs leading-tight" style={{ color: 'var(--color-ink-secondary)' }}>Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'font-medium' : 'hover:bg-[var(--color-canvas)]'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'var(--color-info-bg)', color: 'var(--color-info-fg)' }
                  : { color: 'var(--color-ink-secondary)' }
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-canvas)] transition-colors"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              <ArrowLeftRight size={16} />
              Switch to super admin
            </button>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
            <div
              className="w-7 h-7 rounded-full bg-[var(--color-canvas)] border flex items-center justify-center text-xs font-medium shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{userName}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-ink-tertiary)' }}>
                {membership?.roles?.name ?? 'Member'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}