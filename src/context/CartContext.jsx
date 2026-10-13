import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // Signing in or out changes *which* cart this is — the account's rather than
  // the guest one, and the two have just been merged server-side — so the cart
  // is re-read whenever the customer changes.
  const { customer } = useAuth();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Selecting a shipping method re-prices the cart server-side, so it is part
  // of cart state rather than local checkout state.
  const [shippingCode, setShippingCode] = useState('standard');

  const run = useCallback(async (fn) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setCart(next);
      return next;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getCart(shippingCode)
      .then((data) => {
        if (!cancelled) setCart(data);
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
  }, [shippingCode, customer?.id]);

  /**
   * Cart lines indexed by product, so a listing card can ask "how many of me
   * are in the cart?" without a request of its own. The catalog API answers
   * the same question on first load; this keeps the answer live afterwards,
   * when adding from one card would otherwise leave every other card stale.
   *
   * A product with two variants in the cart has no single line to drive, so
   * `line` is null and only `quantity` is meaningful — the card links to the
   * product page rather than pretending a stepper could work.
   */
  const linesByProduct = useMemo(() => {
    const map = new Map();
    for (const item of cart?.items || []) {
      const seen = map.get(item.productId);
      if (seen) {
        seen.quantity += item.quantity;
        seen.line = null;
      } else {
        map.set(item.productId, { quantity: item.quantity, line: item });
      }
    }
    return map;
  }, [cart]);

  const value = useMemo(() => {
    const addItem = (variantId, quantity = 1) =>
      run(() => api.addCartItem(variantId, quantity, shippingCode));
    const updateItem = (itemId, quantity) =>
      run(() => api.updateCartItem(itemId, quantity, shippingCode));
    const removeItem = (itemId) => run(() => api.removeCartItem(itemId, shippingCode));

    return {
      cart,
      loading,
      busy,
      error,
      shippingCode,
      setShippingCode,
      // How many distinct things are in the cart -- three products at any
      // quantity is a 3. This is the number the badge and the page headings
      // show; `unitCount` is the total number of units.
      lineCount: cart?.lineCount ?? 0,
      unitCount: cart?.unitCount ?? 0,
      itemCount: cart?.lineCount ?? 0,

      /** { quantity, line } for a product, or a zero-state. */
      cartStateFor: (productId) =>
        linesByProduct.get(productId) || { quantity: 0, line: null },

      addItem,
      updateItem,
      removeItem,

      /**
       * The whole stepper in one call: adds the first unit, updates the line
       * after that, and removes it on the way back down to zero. Callers do
       * not have to know which of the three a given tap is.
       *
       * Refuses the multi-variant case rather than guessing: with two options
       * of the same product in the cart there is no line this could mean, and
       * defaulting to one of them would silently edit the wrong thing.
       */
      setProductQuantity: (product, quantity) => {
        const entry = linesByProduct.get(product.id);
        if (entry && !entry.line) return Promise.resolve(cart);
        if (!entry) {
          if (quantity <= 0 || !product.defaultVariantId) return Promise.resolve(cart);
          return addItem(product.defaultVariantId, quantity);
        }
        return quantity <= 0 ? removeItem(entry.line.id) : updateItem(entry.line.id, quantity);
      },

      applyCoupon: (code) => run(() => api.applyCoupon(code, shippingCode)),
      clearCoupon: () => run(() => api.clearCoupon(shippingCode)),
      // After an order converts the cart, the next GET lazily creates an empty
      // one under the same session token.
      refresh: () => run(() => api.getCart(shippingCode)),
      /** Lets the wishlist push the cart it got back instead of refetching. */
      adoptCart: (next) => setCart(next),
    };
  }, [cart, loading, busy, error, shippingCode, run, linesByProduct]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>.');
  return ctx;
}
