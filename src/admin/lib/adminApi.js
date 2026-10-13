import { ApiError } from '../../lib/api.js';

const BASE = import.meta.env.VITE_API_BASE || '/api';
const ACCESS_KEY = 'dilips.admin.access';
const REFRESH_KEY = 'dilips.admin.refresh';

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/**
 * Concurrent 401s must not each fire their own refresh — the server rotates
 * single-use refresh tokens, so a second refresh with the same token fails and
 * would log the user out. All callers share one in-flight refresh promise.
 */
let refreshing = null;

async function refreshAccess() {
  if (refreshing) return refreshing;

  const refreshToken = tokens.refresh;
  if (!refreshToken) return null;

  refreshing = fetch(`${BASE}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) {
        tokens.clear();
        return null;
      }
      const data = await res.json();
      tokens.set(data);
      return data;
    })
    .catch(() => {
      tokens.clear();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

async function call(path, { method = 'GET', body, raw = false, retry = true, formData } = {}) {
  const headers = { Accept: 'application/json' };
  // FormData sets its own multipart boundary — setting Content-Type by hand
  // would corrupt the request.
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  const res = await fetch(`${BASE}/admin${path}`, {
    method,
    headers,
    body: formData !== undefined ? formData : body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccess();
    if (refreshed) return call(path, { method, body, raw, formData, retry: false });
  }

  if (raw) {
    if (!res.ok) throw new ApiError(res.statusText, { status: res.status });
    return res;
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // No body (204, or an upstream failure that produced HTML).
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

const qs = (params = {}) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    s.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const out = s.toString();
  return out ? `?${out}` : '';
};

export const adminApi = {
  // --- auth ---------------------------------------------------------
  login: (email, password) =>
    fetch(`${BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new ApiError(data?.message || res.statusText, {
          status: res.status,
          code: data?.error,
          fieldErrors: data?.fieldErrors,
        });
      }
      tokens.set(data);
      return data;
    }),
  me: () => call('/auth/me'),
  logout: async () => {
    const refreshToken = tokens.refresh;
    tokens.clear();
    if (refreshToken) {
      await fetch(`${BASE}/admin/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  },

  // --- dashboard & reports -----------------------------------------
  dashboard: () => call('/dashboard'),
  reports: (params) => call(`/reports${qs(params)}`),

  // --- orders -------------------------------------------------------
  orders: (params) => call(`/orders${qs(params)}`),
  order: (id) => call(`/orders/${id}`),
  setOrderStatus: (id, body) => call(`/orders/${id}/status`, { method: 'PATCH', body }),
  setOrderNote: (id, adminNote) => call(`/orders/${id}/note`, { method: 'PATCH', body: { adminNote } }),
  setOrderPayment: (id, paymentStatus) => call(`/orders/${id}/payment`, { method: 'PATCH', body: { paymentStatus } }),
  exportOrders: (params) => call(`/orders/export${qs(params)}`, { raw: true }),

  // --- catalog ------------------------------------------------------
  products: (params) => call(`/products${qs(params)}`),
  product: (id) => call(`/products/${id}`),
  createProduct: (body) => call('/products', { method: 'POST', body }),
  updateProduct: (id, body) => call(`/products/${id}`, { method: 'PATCH', body }),
  deleteProduct: (id) => call(`/products/${id}`, { method: 'DELETE' }),
  createVariant: (productId, body) => call(`/products/${productId}/variants`, { method: 'POST', body }),
  updateVariant: (id, body) => call(`/variants/${id}`, { method: 'PATCH', body }),

  // --- product images ------------------------------------------------
  productImages: (productId) => call(`/products/${productId}/images`),
  uploadProductImages: (productId, files, { altText, variantId } = {}) => {
    const fd = new FormData();
    for (const file of files) fd.append('images', file);
    if (altText) fd.append('altText', altText);
    if (variantId) fd.append('variantId', String(variantId));
    return call(`/products/${productId}/images`, { method: 'POST', formData: fd });
  },
  updateProductImage: (id, body) => call(`/images/${id}`, { method: 'PATCH', body }),
  reorderProductImages: (productId, ids) =>
    call(`/products/${productId}/images/order`, { method: 'PATCH', body: { ids } }),
  deleteProductImage: (id) => call(`/images/${id}`, { method: 'DELETE' }),

  categories: () => call('/categories'),
  createCategory: (body) => call('/categories', { method: 'POST', body }),
  updateCategory: (id, body) => call(`/categories/${id}`, { method: 'PATCH', body }),
  deleteCategory: (id) => call(`/categories/${id}`, { method: 'DELETE' }),
  brands: () => call('/brands'),
  taxClasses: () => call('/tax-classes'),
  attributes: () => call('/attributes'),

  inventory: (params) => call(`/inventory${qs(params)}`),
  updateInventory: (id, body) => call(`/inventory/${id}`, { method: 'PATCH', body }),
  stockMovements: (params) => call(`/inventory/movements${qs(params)}`),

  // --- finance ------------------------------------------------------
  payments: (params) => call(`/payments${qs(params)}`),
  settlements: (params) => call(`/settlements${qs(params)}`),
  reconcilePayment: (id, body) => call(`/payments/${id}/reconcile`, { method: 'POST', body }),
  returns: (params) => call(`/returns${qs(params)}`),
  returnRequest: (id) => call(`/returns/${id}`),
  updateReturn: (id, body) => call(`/returns/${id}`, { method: 'PATCH', body }),
  refunds: (params) => call(`/refunds${qs(params)}`),
  createRefund: (body) => call('/refunds', { method: 'POST', body }),
  // { status, gatewayRefundId?, failureReason? }. Moving to `processing` asks
  // the gateway for the money when the order was paid through it.
  updateRefund: (id, body) => call(`/refunds/${id}`, { method: 'PATCH', body }),

  // --- marketing ----------------------------------------------------
  coupons: (params) => call(`/coupons${qs(params)}`),
  createCoupon: (body) => call('/coupons', { method: 'POST', body }),
  updateCoupon: (id, body) => call(`/coupons/${id}`, { method: 'PATCH', body }),
  deleteCoupon: (id) => call(`/coupons/${id}`, { method: 'DELETE' }),
  offers: () => call('/offers'),

  // --- appearance: page banners & navigation --------------------------
  pageBanners: () => call('/page-banners'),
  updatePageBanner: (key, body) => call(`/page-banners/${encodeURIComponent(key)}`, { method: 'PATCH', body }),
  uploadPageBannerImage: (key, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return call(`/page-banners/${encodeURIComponent(key)}/image`, { method: 'POST', formData: fd });
  },
  deletePageBannerImage: (key) => call(`/page-banners/${encodeURIComponent(key)}/image`, { method: 'DELETE' }),

  /**
   * Category artwork. The upload is not tied to a category id, so a banner can
   * be chosen while *creating* one — the form holds the returned URL and saves
   * it with the rest of the fields.
   */
  uploadCategoryBanner: (file, slot) => {
    const fd = new FormData();
    fd.append('image', file);
    return call(`/categories/banner?slot=${encodeURIComponent(slot)}`, { method: 'POST', formData: fd });
  },
  deleteCategoryBanner: (id, slot) =>
    call(`/categories/${id}/banner?slot=${encodeURIComponent(slot)}`, { method: 'DELETE' }),

  navigation: () => call('/navigation'),
  updateNavigation: (items) => call('/navigation', { method: 'PATCH', body: { items } }),

  banners: () => call('/banners'),
  updateBanner: (id, body) => call(`/banners/${id}`, { method: 'PATCH', body }),
  blogPosts: (params) => call(`/blog-posts${qs(params)}`),
  createBlogPost: (body) => call('/blog-posts', { method: 'POST', body }),
  updateBlogPost: (id, body) => call(`/blog-posts/${id}`, { method: 'PATCH', body }),
  deleteBlogPost: (id) => call(`/blog-posts/${id}`, { method: 'DELETE' }),
  faqs: () => call('/faqs'),
  createFaq: (body) => call('/faqs', { method: 'POST', body }),
  updateFaq: (id, body) => call(`/faqs/${id}`, { method: 'PATCH', body }),
  deleteFaq: (id) => call(`/faqs/${id}`, { method: 'DELETE' }),
  enquiries: (params) => call(`/enquiries${qs(params)}`),
  updateEnquiry: (id, body) => call(`/enquiries/${id}`, { method: 'PATCH', body }),
  subscribers: (params) => call(`/subscribers${qs(params)}`),

  notificationTemplates: () => call('/notification-templates'),
  notificationLogs: (params) => call(`/notification-logs${qs(params)}`),
  sendNotification: (body) => call('/notifications/send', { method: 'POST', body }),

  // --- people & system ----------------------------------------------
  customers: (params) => call(`/customers${qs(params)}`),
  customer: (id) => call(`/customers/${id}`),
  updateCustomer: (id, body) => call(`/customers/${id}`, { method: 'PATCH', body }),
  reviews: (params) => call(`/reviews${qs(params)}`),
  updateReview: (id, body) => call(`/reviews/${id}`, { method: 'PATCH', body }),

  users: (params) => call(`/users${qs(params)}`),
  createUser: (body) => call('/users', { method: 'POST', body }),
  updateUser: (id, body) => call(`/users/${id}`, { method: 'PATCH', body }),
  deleteUser: (id) => call(`/users/${id}`, { method: 'DELETE' }),
  roles: () => call('/roles'),

  settings: () => call('/settings'),
  updateSettings: (values) => call('/settings', { method: 'PATCH', body: { values } }),
  updateShippingMethod: (id, body) => call(`/shipping-methods/${id}`, { method: 'PATCH', body }),
  auditLogs: (params) => call(`/audit-logs${qs(params)}`),
};
