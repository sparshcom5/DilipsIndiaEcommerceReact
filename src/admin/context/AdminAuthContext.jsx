import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { adminApi, tokens } from '../lib/adminApi.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate on load so a refresh doesn't bounce the user to /admin/login.
  useEffect(() => {
    let cancelled = false;

    if (!tokens.access && !tokens.refresh) {
      setLoading(false);
      return undefined;
    }

    adminApi
      .me()
      .then((data) => {
        if (!cancelled) setSession(data);
      })
      .catch(() => {
        tokens.clear();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await adminApi.login(email, password);
    setSession(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout();
    setSession(null);
  }, []);

  const value = useMemo(() => {
    const permissions = new Set(session?.permissions ?? []);
    return {
      session,
      user: session?.user ?? null,
      roles: session?.roles ?? [],
      // Server-side switches (see NodeJS/src/lib/features.js). Defaults match
      // the server's own defaults so the UI is right before /me lands.
      features: { trackInventory: false, ...(session?.features ?? {}) },
      loading,
      login,
      logout,
      /** Single slug, or an array meaning "any of these". */
      can: (slug) =>
        Array.isArray(slug) ? slug.some((s) => permissions.has(s)) : permissions.has(slug),
    };
  }, [session, loading, login, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>.');
  return ctx;
}
