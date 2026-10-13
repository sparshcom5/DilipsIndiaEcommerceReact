import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, ExternalLink, ShieldAlert } from 'lucide-react';

import { useAdminAuth } from './context/AdminAuthContext.jsx';
import { NAV_SECTIONS, navItemVisible } from './nav.js';

function Sidebar({ onNavigate }) {
  const { can, features } = useAdminAuth();

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => navItemVisible(i, can, features)),
  })).filter((s) => s.items.length);

  return (
    <nav className="flex h-full flex-col" aria-label="Admin">
      <div className="border-b border-white/10 px-6 py-5">
        <Link to="/admin" onClick={onNavigate} className="block">
          <img src="/images/brand/dilips-logo.png" alt="DiliPS" className="h-11 w-auto" />
        </Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/45">Admin Console</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label ?? 'root'} className="mb-6 last:mb-0">
            {section.label && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ to, label, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-input px-3 py-2.5 text-sm transition-colors ${
                        isActive ? 'bg-brand text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={17} aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-input px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink size={16} aria-hidden />
          View storefront
        </a>
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  const { user, roles, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] bg-ink-900 lg:block">
        <Sidebar />
      </aside>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] bg-ink-900 lg:hidden">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-ink-200 bg-white px-6 py-3.5">
          <button
            type="button"
            className="lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="ml-auto flex items-center gap-4">
            <Link to="/admin/account" className="group flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-ink-900 group-hover:text-brand">{user?.fullName}</p>
                <p className="text-xs text-ink-500">
                  {user?.isSuperAdmin ? 'Super Admin' : roles.map((r) => r.name).join(', ') || 'No role'}
                </p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
                {(user?.fullName || '?').charAt(0).toUpperCase()}
              </span>
            </Link>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="text-ink-500 transition-colors hover:text-brand"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Renders children only when the permission is held; otherwise explains why. */
export function RequirePermission({ permission, children }) {
  const { can } = useAdminAuth();
  if (can(permission)) return children;

  return (
    <div className="rounded-card bg-white py-20 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <ShieldAlert size={34} className="mx-auto text-ink-300" aria-hidden />
      <p className="mt-4 text-base font-semibold text-ink-900">You don&rsquo;t have access to this page</p>
      <p className="mt-1 text-sm text-ink-500">
        It needs the <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{permission}</code> permission.
        Ask a super admin to adjust your role.
      </p>
    </div>
  );
}
