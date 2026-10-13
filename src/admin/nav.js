import {
  LayoutDashboard, Package, FolderTree, Warehouse, ShoppingBag, RotateCcw, IndianRupee,
  CreditCard, Users, Ticket, Star, FileText, Bell, BarChart3, Settings, Palette,
} from 'lucide-react';

/**
 * Sidebar definition.
 *
 * `permission` is the slug that gates each entry — the sidebar is rendered from
 * the signed-in user's actual permissions, so a Catalog Manager never sees
 * Orders or Settings at all.
 *
 * `feature` additionally gates an entry on a server-side switch, so a module
 * the API is not honouring is not offered at all.
 */
export const NAV_SECTIONS = [
  {
    label: null,
    items: [{ to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, permission: 'dashboard.view', end: true }],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', Icon: Package, permission: 'product.view' },
      { to: '/admin/categories', label: 'Categories', Icon: FolderTree, permission: 'category.view' },
      {
        to: '/admin/inventory',
        label: 'Inventory',
        Icon: Warehouse,
        permission: 'inventory.view',
        feature: 'trackInventory',
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', Icon: ShoppingBag, permission: 'order.view' },
      { to: '/admin/returns', label: 'Returns', Icon: RotateCcw, permission: 'return.view' },
      { to: '/admin/refunds', label: 'Refunds', Icon: IndianRupee, permission: 'refund.view' },
      { to: '/admin/payments', label: 'Payments', Icon: CreditCard, permission: 'payment.view' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/admin/customers', label: 'Customers', Icon: Users, permission: 'customer.view' },
      { to: '/admin/reviews', label: 'Reviews', Icon: Star, permission: 'review.view' },
    ],
  },
  {
    label: 'Storefront',
    items: [
      { to: '/admin/appearance', label: 'Appearance', Icon: Palette, permission: 'cms.view' },
      { to: '/admin/content', label: 'Content', Icon: FileText, permission: 'cms.view' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/admin/coupons', label: 'Coupons', Icon: Ticket, permission: 'coupon.view' },
      { to: '/admin/notifications', label: 'Notifications', Icon: Bell, permission: 'notification.send' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/reports', label: 'Reports', Icon: BarChart3, permission: 'report.view' },
      { to: '/admin/settings', label: 'Settings', Icon: Settings, permission: 'setting.view' },
    ],
  },
];

/** True when the entry passes both its permission and its feature gate. */
export const navItemVisible = (item, can, features = {}) =>
  can(item.permission) && (!item.feature || features[item.feature]);

/** First route the user is actually allowed to see, for post-login redirect. */
export function firstAllowedRoute(can, features) {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (navItemVisible(item, can, features)) return item.to;
    }
  }
  return null;
}
