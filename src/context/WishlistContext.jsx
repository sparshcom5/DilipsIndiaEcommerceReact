import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as api from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useCart } from './CartContext.jsx';

const WishlistContext = createContext(null);

/**
 * Saved items.
 *
 * Unlike the cart there is no guest wishlist — the rows are keyed on the
 * customer — so this holds an empty list until someone signs in, and clears
 * itself when they sign out. `signedIn` is exposed so a heart can send a guest
 * to /login rather than firing a request that is certain to 401.
 */
export function WishlistProvider({ children }) {
  const { customer } = useAuth();
  const { adoptCart, shippingCode } = useCart();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const signedIn = Boolean(customer);

  const run = useCallback(async (fn) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setItems([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    api
      .getWishlist()
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // Every wishlist write returns the whole list, so there is no local
  // bookkeeping to keep in step with the server.
  const wishedProductIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const value = useMemo(
    () => ({
      items,
      loading,
      busy,
      error,
      signedIn,
      itemCount: items.length,
      isWishlisted: (productId) => wishedProductIds.has(productId),

      add: (productId, variantId = null) =>
        run(async () => {
          const data = await api.addToWishlist(productId, variantId);
          setItems(data.items);
          return data;
        }),

      /** Called by the heart on a card, which knows only the product. */
      removeProduct: (productId) =>
        run(async () => {
          const data = await api.removeProductFromWishlist(productId);
          setItems(data.items);
          return data;
        }),

      remove: (wishlistItemId) =>
        run(async () => {
          const data = await api.removeFromWishlist(wishlistItemId);
          setItems(data.items);
          return data;
        }),

      toggle: (productId, variantId = null) =>
        wishedProductIds.has(productId)
          ? run(async () => {
              const data = await api.removeProductFromWishlist(productId);
              setItems(data.items);
              return data;
            })
          : run(async () => {
              const data = await api.addToWishlist(productId, variantId);
              setItems(data.items);
              return data;
            }),

      /**
       * Moves a saved item into the cart. The response carries both lists, so
       * the cart is adopted straight from it — refetching would leave the two
       * briefly disagreeing about what was just moved.
       */
      moveToCart: (wishlistItemId, { quantity = 1, keep = false } = {}) =>
        run(async () => {
          const data = await api.moveWishlistItemToCart(
            wishlistItemId,
            { quantity, keep },
            shippingCode
          );
          setItems(data.wishlist.items);
          adoptCart(data.cart);
          return data;
        }),

      refresh: () =>
        run(async () => {
          const data = await api.getWishlist();
          setItems(data.items);
          return data;
        }),
    }),
    [items, loading, busy, error, signedIn, wishedProductIds, run, adoptCart, shippingCode]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>.');
  return ctx;
}
