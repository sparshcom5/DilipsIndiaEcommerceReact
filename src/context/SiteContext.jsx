import { createContext, useContext, useMemo } from 'react';
import { getNavigation, getPageBanners } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';

const SiteContext = createContext(null);

// Used until the API responds, so the header never renders empty on first paint.
const FALLBACK_NAV = [
  { label: 'Home', to: '/', children: [] },
  { label: 'Who We Are', to: '/who-we-are', children: [] },
  { label: 'Blog', to: '/blog', children: [] },
  { label: 'Contact Us', to: '/contact-us', children: [] },
];

/**
 * Menu and page heroes are admin-editable, so both are fetched once here and
 * shared, rather than each page issuing its own request.
 */
export function SiteProvider({ children }) {
  const { data: nav } = useApi(() => getNavigation(), []);
  const { data: banners } = useApi(() => getPageBanners(), []);

  const value = useMemo(
    () => ({
      navItems: nav?.items?.length ? nav.items : FALLBACK_NAV,
      banners: banners?.banners ?? {},
      /** Hero config for a page key, or null when the admin switched it off. */
      banner: (key) => banners?.banners?.[key] ?? null,
    }),
    [nav, banners]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>.');
  return ctx;
}
