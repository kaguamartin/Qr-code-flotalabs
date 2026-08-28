import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Link2, ListTree, Users, Plug, Settings, ArrowLeftRight, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const navigate = useNavigate();
  const { profile, membership, isSuperAdmin, can, isAssistMode, assistOrg, endAssistMode } = useAuth();

  const org = membership?.organizations;
  const orgName = org?.name ?? 'Workspace';
  const userInitial = profile?.full_name?.charAt(0)?.toUpperCase() ?? '?';
  const userName = profile?.full_name ?? profile?.email ?? '—';
  const roleName = membership?.roles?.name ?? 'Member';


  // build nav items based on permissions
  const navItems = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true, show: true },
    { to: '/app/links', label: 'Links & QR codes', icon: Link2, show: can('links.view') },
    { to: '/app/bio', label: 'Link-in-bio', icon: ListTree, show: can('links.view') },
    { to: '/app/team', label: 'Team & roles', icon: Users, show: can('team.invite') || can('team.manage_roles') },
    { to: '/app/integrations', label: 'Integrations', icon: Plug, show: can('workspace.manage_integrations') },
    { to: '/app/settings', label: 'Settings', icon: Settings, show: true },
  ].filter((item) => item.show);

return (
  <div className="flex min-h-screen flex-col">
    {/* assist mode banner */}
    {isAssistMode && (
      <div className="flex items-center justify-between px-6 py-2 text-sm font-medium" style={{ background: '#f59e0b', color: 'white' }}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={15} />
          Assist mode — editing <strong className="ml-1">{assistOrg?.name}</strong> on behalf of Flota Labs
        </div>
        <button
          onClick={async () => { await endAssistMode(); window.location.href = '/admin'; }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(0,0,0,0.2)' }}
        >
          <X size={13} /> Exit assist mode
        </button>
      </div>
    )}
    <div className="flex flex-1 min-h-0">
      <aside className="w-60 shrink-0 border-r bg-white flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
        {/* org header */}
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

        {/* nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'font-medium' : 'hover:bg-[var(--color-canvas)]'
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

        {/* bottom user area */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-canvas)] transition-colors mb-1"
              style={{ color: 'var(--color-ink-secondary)' }}
            >
              <ArrowLeftRight size={16} />
              Switch to super admin
            </button>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-7 h-7 rounded-full object-cover shrink-0"
                alt={userName}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-blue))' }}
              >
                {userInitial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{userName}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-ink-tertiary)' }}>{roleName}</p>
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
    </div>
  );
}
