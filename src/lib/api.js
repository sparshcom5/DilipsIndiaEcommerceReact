/**
 * API base.
 *
 * Unset (the default) → '/api', which Vite proxies to the local server in dev
 * and a reverse proxy serves in production. Set VITE_API_BASE to an absolute
 * URL to point the app at a remote backend, e.g.
 *   VITE_API_BASE=https://api.example.com/api
 */
const BASE = import.meta.env.VITE_API_BASE || '/api';

/** Explicit media host (a CDN or bucket), if one is configured. */
const MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE || '').replace(/\/$/, '');

/**
 * Absolute URL for an uploaded image.
 *
 * The API stores paths relative to itself ("/uploads/products/x.jpg"), which
 * would otherwise resolve against the *frontend* and 404. They are resolved
 * against the API base — including its `/api` prefix — rather than just its
 * origin, because a reverse proxy usually forwards only `/api` to the Node
 * process. The server mounts the same files under both prefixes, so this holds
 * in dev (`/api/uploads/…` through the Vite proxy) and behind a proxy alike.
 *
 * Absolute URLs and bundled assets under /images/ are left alone.
 */
export function mediaUrl(path) {
  if (!path) return path;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  if (!path.startsWith('/uploads/')) return path; // bundled asset under /images/
  return `${MEDIA_BASE || BASE}${path}`;
}

const SESSION_KEY = 'dilips.cart.session';

/**
 * Guest carts are keyed on an opaque token the server never issues — the
 * client mints it once and reuses it, so a cart survives reloads.
 */
export function cartSession() {
  let token = localStorage.getItem(SESSION_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, token);
  }
  return token;
}

export function resetCartSession() {
  localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(message, { status, code, fieldErrors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors || null;
  }
}

// --- Customer session -----------------------------------------------------

const AUTH_KEY = 'dilips.auth';
const listeners = new Set();

/** Notified whenever the stored session appears or disappears. */
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSession({ accessToken, refreshToken }) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ accessToken, refreshToken }));
  listeners.forEach((fn) => fn(true));
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
  listeners.forEach((fn) => fn(false));
}

/** Seconds since the epoch at which this access token stops being accepted. */
function tokenExpiry(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).exp || 0;
  } catch {
    return 0;
  }
}

let refreshing = null;

/**
 * Returns a usable access token, rotating the refresh token first if the
 * current one has expired (or is about to). Concurrent callers share one
 * refresh so a page that fires several authenticated requests at once does not
 * burn several single-use refresh tokens — only the first would succeed.
 */
async function accessToken() {
  const session = loadSession();
  if (!session?.accessToken) return null;
  if (tokenExpiry(session.accessToken) - 30 > Date.now() / 1000) return session.accessToken;
  if (!session.refreshToken) return null;

  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const payload = await res.json();
      saveSession(payload);
      return payload.accessToken;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

async function request(path, { method = 'GET', body, cart = false, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cart) headers['X-Cart-Session'] = cartSession();
  if (auth) {
    const token = await accessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    // `auth: 'required'` callers still send the request without a token so the
    // server produces the canonical 401 rather than the client guessing.
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // A token the server rejects is not worth keeping — drop it so the UI falls
  // back to the signed-out state instead of retrying forever.
  if (res.status === 401 && auth === 'required') clearSession();

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Empty or non-JSON body.
  }

  if (!res.ok) {
    throw new ApiError(payload?.message || res.statusText, {
      status: res.status,
      code: payload?.error,
      fieldErrors: payload?.fieldErrors,
    });
  }

  return payload;
}

/*
 * Catalog reads carry the cart session and, when there is one, the customer
 * token. Neither is required — but with them the server can tell each product
 * how many are already in the cart and whether it is on the wishlist, which is
 * what lets a card show a quantity stepper instead of "Add to Cart".
 */
export const getProductBySlug = (slug) =>
  request(`/products/${encodeURIComponent(slug)}`, { cart: true, auth: true });

export const getHealth = () => request('/health');

const shippingQuery = (code) => (code ? `?shipping=${encodeURIComponent(code)}` : '');

export const getCart = (shippingCode) => request(`/cart${shippingQuery(shippingCode)}`, { cart: true });

export const addCartItem = (variantId, quantity, shippingCode) =>
  request(`/cart/items${shippingQuery(shippingCode)}`, {
    method: 'POST',
    body: { variantId, quantity },
    cart: true,
  });

export const updateCartItem = (itemId, quantity, shippingCode) =>
  request(`/cart/items/${itemId}${shippingQuery(shippingCode)}`, {
    method: 'PATCH',
    body: { quantity },
    cart: true,
  });

export const removeCartItem = (itemId, shippingCode) =>
  request(`/cart/items/${itemId}${shippingQuery(shippingCode)}`, { method: 'DELETE', cart: true });

export const applyCoupon = (code, shippingCode) =>
  request(`/cart/coupon${shippingQuery(shippingCode)}`, { method: 'POST', body: { code }, cart: true });

export const clearCoupon = (shippingCode) =>
  request(`/cart/coupon${shippingQuery(shippingCode)}`, { method: 'DELETE', cart: true });

// --- Wishlist -------------------------------------------------------------
// Signed-in only: wishlist rows are keyed on the customer, so every call here
// 401s for a guest and the UI sends them to /login instead.

export const getWishlist = () => request('/wishlist', { auth: 'required', cart: true });

export const addToWishlist = (productId, variantId = null) =>
  request('/wishlist', {
    method: 'POST',
    body: { productId, variantId },
    auth: 'required',
    cart: true,
  });

export const removeFromWishlist = (wishlistItemId) =>
  request(`/wishlist/${wishlistItemId}`, { method: 'DELETE', auth: 'required', cart: true });

/** The heart on a card knows its product, not which wishlist row backs it. */
export const removeProductFromWishlist = (productId) =>
  request(`/wishlist/product/${productId}`, { method: 'DELETE', auth: 'required', cart: true });

/**
 * Returns { cart, wishlist } — both change, and refetching the wishlist
 * separately would let the two disagree in between.
 */
export const moveWishlistItemToCart = (wishlistItemId, { quantity = 1, keep = false } = {}, shippingCode) =>
  request(`/wishlist/${wishlistItemId}/move-to-cart${shippingQuery(shippingCode)}`, {
    method: 'POST',
    body: { quantity, keep },
    auth: 'required',
    cart: true,
  });

export const getCategories = () => request('/catalog/categories');

export const getCatalogProducts = (params = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const q = qs.toString();
  return request(`/catalog/products${q ? `?${q}` : ''}`, { cart: true, auth: true });
};

export const getNavigation = () => request('/content/navigation');
export const getPageBanners = () => request('/content/page-banners');

export const getBlogPosts = () => request('/content/blog');
export const getBlogPost = (slug) => request(`/content/blog/${encodeURIComponent(slug)}`);
export const getFaqs = () => request('/content/faqs');
export const getOffers = () => request('/content/offers');
export const getBanners = (placement) =>
  request(`/content/banners${placement ? `?placement=${encodeURIComponent(placement)}` : ''}`);

/** The store's own contact details — offices, phones, email, map, hours. */
export const getContactDetails = () => request('/content/contact');

export const sendContactEnquiry = (payload) =>
  request('/content/contact', { method: 'POST', body: payload });

export const subscribeNewsletter = (email) =>
  request('/content/newsletter', { method: 'POST', body: { email } });

export const trackOrder = (orderNumber) =>
  request(`/checkout/track/${encodeURIComponent(orderNumber)}`);

export const getCheckoutOptions = () => request('/checkout/options');

// `auth: true` is optional here — guests check out too, but a signed-in
// shopper's order should be attached to their account.
export const placeOrder = (payload) =>
  request('/checkout/order', { method: 'POST', body: payload, cart: true, auth: true });

export const getOrder = (orderNumber) => request(`/checkout/order/${encodeURIComponent(orderNumber)}`);

// --- Online payment (Cashfree) ---------------------------------------------

// Verifies with the gateway before answering, so it is safe to call the moment
// the shopper lands back from checkout — no waiting on the webhook.
export const getPaymentStatus = (orderNumber) =>
  request(`/checkout/payment/${encodeURIComponent(orderNumber)}`);

// Opens, or hands back the still-open, payment session for an unpaid order.
export const createPaymentSession = (orderNumber) =>
  request(`/checkout/payment/${encodeURIComponent(orderNumber)}/session`, { method: 'POST' });

// --- Customer accounts ----------------------------------------------------

// --- OTP sign-in ----------------------------------------------------------
// Signing in and signing up are the same two calls: verifying a code on a
// number with no account creates one. There is no separate registration.

export const requestOtp = (phone) =>
  request('/auth/otp/request', { method: 'POST', body: { phone } });

/*
 * `cart: true` on the sign-in calls is what carries a guest cart into the
 * account: the server merges the cart behind this session token on the way
 * through. Without the header the shopper signs in to an empty cart.
 */
export const verifyOtp = (phone, otp) =>
  request('/auth/otp/verify', { method: 'POST', body: { phone, otp }, cart: true });

export const loginCustomer = (identifier, password) =>
  request('/auth/login', { method: 'POST', body: { identifier, password }, cart: true });

export const logoutCustomer = () => {
  const session = loadSession();
  clearSession();
  // Best effort: the local session is already gone either way.
  return session?.refreshToken
    ? request('/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken } }).catch(
        () => {}
      )
    : Promise.resolve();
};

export const getProfile = () => request('/auth/me', { auth: 'required' });

export const updateProfile = (payload) =>
  request('/auth/me', { method: 'PATCH', body: payload, auth: 'required' });

export const changePassword = (payload) =>
  request('/auth/me/password', { method: 'POST', body: payload, auth: 'required' });

export const getAddresses = () => request('/auth/addresses', { auth: 'required' });

export const createAddress = (payload) =>
  request('/auth/addresses', { method: 'POST', body: payload, auth: 'required' });

export const updateAddress = (id, payload) =>
  request(`/auth/addresses/${id}`, { method: 'PATCH', body: payload, auth: 'required' });

export const deleteAddress = (id) =>
  request(`/auth/addresses/${id}`, { method: 'DELETE', auth: 'required' });

export const getMyOrders = () => request('/auth/orders', { auth: 'required' });
