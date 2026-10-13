import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearSession,
  getProfile,
  loadSession,
  loginCustomer,
  logoutCustomer,
  onAuthChange,
  requestOtp,
  saveSession,
  verifyOtp,
} from '../lib/api.js';

const AuthContext = createContext(null);

/**
 * Customer session.
 *
 * Tokens live in localStorage (see lib/api.js); this holds the profile that
 * goes with them. `loading` is true only while the initial /auth/me is in
 * flight, so the header can avoid flashing "Sign In" at a signed-in shopper.
 */
export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(Boolean(loadSession()));

  const refreshProfile = useCallback(async () => {
    if (!loadSession()) {
      setCustomer(null);
      setAddresses([]);
      return null;
    }
    try {
      const res = await getProfile();
      setCustomer(res.customer);
      setAddresses(res.addresses);
      return res.customer;
    } catch {
      // A rejected token has already been cleared by the API client.
      setCustomer(null);
      setAddresses([]);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));

    // A refresh token rejected mid-request clears the session from inside the
    // API client, which has no way back into React except this callback.
    return onAuthChange((signedIn) => {
      if (signedIn) return;
      setCustomer(null);
      setAddresses([]);
    });
  }, [refreshProfile]);

  const adopt = (res) => {
    saveSession(res);
    setCustomer(res.customer);
    setAddresses(res.addresses ?? []);
    return res.customer;
  };

  const value = useMemo(
    () => ({
      customer,
      addresses,
      loading,
      isSignedIn: Boolean(customer),
      // True once the code is verified but the name/email are still missing —
      // an OTP account starts as a bare mobile number.
      profileComplete: customer ? customer.profileComplete !== false : true,
      requestOtp,
      /** Verifying an unknown number creates the account, so this covers signup too. */
      signInWithOtp: async (phone, otp) => {
        const res = await verifyOtp(phone, otp);
        adopt(res);
        return res;
      },
      login: async (identifier, password) => adopt(await loginCustomer(identifier, password)),
      signOut: async () => {
        await logoutCustomer();
        clearSession();
        setCustomer(null);
        setAddresses([]);
      },
      setAddresses,
      setCustomer,
      refreshProfile,
    }),
    [customer, addresses, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
