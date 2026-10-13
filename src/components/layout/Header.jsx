import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  MapPin,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  Search,
  Package,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

import { useSite } from '../../context/SiteContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const SOCIALS = [
  { Icon: Facebook, label: 'Facebook', href: '#' },
  { Icon: Twitter, label: 'Twitter', href: '#' },
  { Icon: Instagram, label: 'Instagram', href: '#' },
  { Icon: Linkedin, label: 'LinkedIn', href: '#' },
  { Icon: Youtube, label: 'YouTube', href: '#' },
];

const navLinkClass = ({ isActive }) =>
  `text-sm transition-colors hover:text-brand ${isActive ? 'text-brand' : 'text-white'}`;

/**
 * Type and width per level. Each step down is small on purpose — enough that a
 * sub-category reads as subordinate to the row that opened it, not so much
 * that the deepest level becomes hard to read.
 */
const MENU_LEVELS = [
  { panel: 'min-w-[248px] max-w-[320px]', row: 'px-5 py-2.5 text-[13px] tracking-[0.05em]', chevron: 14 },
  { panel: 'min-w-[220px] max-w-[300px]', row: 'px-4 py-2 text-[12px] tracking-[0.04em]', chevron: 13 },
  { panel: 'min-w-[196px] max-w-[280px]', row: 'px-4 py-2 text-[11px] tracking-[0.03em]', chevron: 12 },
];

const menuLevel = (depth) => MENU_LEVELS[Math.min(depth, MENU_LEVELS.length - 1)];

/**
 * A dropdown panel. `depth` 0 is the panel under a top-level menu item.
 *
 * Each level is its own card, hung off the row that opened it, rather than a
 * column of one shared surface — that is what lets a long list of categories
 * stay readable while its children sit alongside instead of below.
 */
function MenuPanel({ items, onNavigate, depth = 0, className = '' }) {
  // Which row's flyout is showing. Held by the panel, not the row, so opening
  // one closes its siblings.
  const [openKey, setOpenKey] = useState(null);
  const { panel } = menuLevel(depth);

  return (
    <ul
      data-menu-panel=""
      className={`${panel} border border-ink-100 bg-white py-2 shadow-[0_14px_38px_-8px_rgba(15,23,42,0.35)] ${className}`}
    >
      {items.map((item) => (
        <MenuRow
          key={item.to}
          item={item}
          depth={depth}
          onNavigate={onNavigate}
          isOpen={openKey === item.to}
          // Hovering a leaf sets a key no branch matches, which closes
          // whichever flyout was showing.
          onHover={() => setOpenKey(item.to)}
        />
      ))}
    </ul>
  );
}

/** One row. With children, hovering hangs the next panel off its right edge. */
function MenuRow({ item, depth = 0, onNavigate, isOpen, onHover }) {
  const hasChildren = item.children?.length > 0;
  const open = Boolean(isOpen && hasChildren);
  const { row, chevron } = menuLevel(depth);

  return (
    <li className="relative" onMouseEnter={onHover}>
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          [
            'group flex items-center justify-between gap-4 whitespace-nowrap',
            'font-display font-medium uppercase transition-colors',
            row,
            // Colour alone marks the open row — a filled bar would fight with
            // the panel hanging off it.
            open || isActive ? 'text-brand' : 'text-ink-700 hover:text-brand',
          ].join(' ')
        }
      >
        <span className="truncate">{item.label}</span>
        {hasChildren && (
          <ChevronRight
            size={chevron}
            aria-hidden
            className={`shrink-0 transition-colors ${open ? 'text-brand' : 'text-ink-300 group-hover:text-brand'}`}
          />
        )}
      </NavLink>

      {open && (
        // -mt-2 cancels the parent's top padding, so the child's first row
        // lines up with the row that opened it.
        <MenuPanel
          items={item.children}
          depth={depth + 1}
          onNavigate={onNavigate}
          className="absolute left-full top-0 z-50 -mt-2"
        />
      )}
    </li>
  );
}

// Mobile has no hover, so depth is shown by indent and a step down in type —
// the same idea as the desktop cascade.
const MOBILE_LEVELS = ['py-2 text-sm text-white/75', 'py-1.5 text-xs text-white/60', 'py-1.5 text-[11px] text-white/50'];

function MobileBranch({ items, onNavigate, depth = 0 }) {
  const rowClass = MOBILE_LEVELS[Math.min(depth, MOBILE_LEVELS.length - 1)];
  return (
    <ul className="mb-1 border-l border-white/10 pl-4">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={`block hover:text-brand ${rowClass}`}
          >
            {item.label}
          </NavLink>
          {item.children?.length > 0 && depth < 3 && (
            <MobileBranch items={item.children} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * A top-level menu entry. Categories with sub-categories open a white dropdown
 * on hover, which can itself cascade further to the right.
 */
function NavItem({ item, onNavigate }) {
  const [open, setOpen] = useState(false);

  if (!item.children?.length) {
    return (
      <NavLink to={item.to} end={item.to === '/'} className={navLinkClass} onClick={onNavigate}>
        {item.label}
      </NavLink>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          `${navLinkClass({ isActive })} inline-flex items-center gap-1 ${open ? 'text-brand' : ''}`
        }
        onClick={onNavigate}
      >
        {item.label}
        <ChevronDown size={13} aria-hidden />
      </NavLink>

      {open && (
        <>
          {/* Bridges the gap between the trigger and the panel so the menu
              doesn't close as the pointer travels down. */}
          <span aria-hidden className="absolute left-0 top-full h-4 w-full" />
          <MenuPanel
            items={item.children}
            onNavigate={onNavigate}
            className="absolute left-0 top-[calc(100%+1rem)] z-50"
          />
        </>
      )}
    </div>
  );
}

/**
 * Account entry point. Signed out it goes straight to login; signed in it
 * opens a small menu with the account links and sign-out.
 */
function AccountMenu() {
  const { customer, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading || !customer) {
    return (
      <Link to="/login" className="hidden items-center gap-2 text-sm hover:text-brand sm:flex">
        <User size={16} aria-hidden />
        {loading ? 'My Account' : 'Sign In'}
      </Link>
    );
  }

  return (
    <div
      className="relative hidden sm:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link to="/account" className="flex items-center gap-2 text-sm hover:text-brand">
        <User size={16} aria-hidden />
        <span className="max-w-[110px] truncate">{customer.firstName || 'My Account'}</span>
        <ChevronDown size={13} aria-hidden />
      </Link>

      {open && (
        <>
          <span aria-hidden className="absolute right-0 top-full h-3 w-full" />
          <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 min-w-[210px] rounded-sm bg-white py-2 text-ink-800 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
            <p className="border-b border-ink-100 px-5 pb-2.5 pt-1 text-xs text-ink-500">
              {customer.email}
            </p>
            <Link to="/account" className="block px-5 py-2.5 text-sm hover:bg-ink-100 hover:text-brand">
              My Account
            </Link>
            <Link to="/track-order" className="block px-5 py-2.5 text-sm hover:bg-ink-100 hover:text-brand">
              Track Order
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="block w-full border-t border-ink-100 px-5 py-2.5 text-left text-sm hover:bg-ink-100 hover:text-brand"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Header({ cartCount = 0, wishlistCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  // Menu contents are set by the admin under Appearance → Navigation.
  const { navItems } = useSite();
  const { customer } = useAuth();

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
    setQuery('');
    setOpen(false);
  };

  return (
    <header className="bg-black text-white">
      {/* Utility strip — social links left, showroom location right. */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-shell items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm">Follow On</span>
            <span aria-hidden className="text-white/30">
              |
            </span>
            <ul className="flex items-center gap-4">
              {SOCIALS.map(({ Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className="block text-white/90 transition-colors hover:text-brand"
                  >
                    <Icon size={16} strokeWidth={2} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/track-order"
              className="hidden items-center gap-2 text-sm transition-colors hover:text-brand sm:flex"
            >
              <Package size={14} aria-hidden />
              Track Order
            </Link>
            <p className="hidden items-center gap-2 text-sm sm:flex">
              <MapPin size={14} aria-hidden />
              Jubliee Hills, Hyderabad, India
            </p>
          </div>
        </div>
      </div>

      {/* Main navigation. */}
      <div className="mx-auto flex max-w-shell items-center justify-between gap-8 px-6 py-6">
        <Link to="/" className="shrink-0">
          <img
            src="/images/brand/dilips-logo.png"
            alt="DiliPS — Elegance in Bath Fittings"
            className="h-16 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {navItems.map((item) => (
            <NavItem key={`${item.label}-${item.to}`} item={item} />
          ))}
        </nav>

        <div className="flex items-center gap-7">
          <form onSubmit={search} className="relative hidden xl:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="w-48 rounded-input border border-white/20 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-white/45 focus:border-brand"
            />
          </form>

          <Link
            to="/wishlist"
            className="relative hidden items-center gap-2 text-sm hover:text-brand sm:flex"
          >
            <Heart size={17} aria-hidden />
            Wishlist
            {wishlistCount > 0 && (
              <span className="absolute -top-2 left-[62px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none">
                {wishlistCount}
              </span>
            )}
          </Link>

          <Link to="/cart" className="relative flex items-center gap-2 text-sm hover:text-brand">
            <ShoppingCart size={17} aria-hidden />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 left-[52px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none">
                {cartCount}
              </span>
            )}
          </Link>

          <AccountMenu />

          <button
            type="button"
            className="lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 lg:hidden" aria-label="Mobile">
          <ul className="mx-auto max-w-shell px-6 py-2">
            {navItems.map((item) => (
              <li key={`${item.label}-${item.to}`}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  <span className="block py-3">{item.label}</span>
                </NavLink>

                {item.children?.length > 0 && (
                  <MobileBranch items={item.children} onNavigate={() => setOpen(false)} />
                )}
              </li>
            ))}

            {/* The account link lives in the icon row on desktop, which is
                hidden below `sm`. */}
            <li className="border-t border-white/10 sm:hidden">
              <NavLink to="/account" className={navLinkClass} onClick={() => setOpen(false)}>
                <span className="block py-3">{customer ? 'My Account' : 'Sign In'}</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
