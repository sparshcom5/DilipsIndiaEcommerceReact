import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext.jsx';
import { ToastProvider } from './components/ui.jsx';
import AdminLayout, { RequirePermission } from './AdminLayout.jsx';

import AdminLogin from './pages/AdminLogin.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import Products from './pages/Products.jsx';
import Categories from './pages/Categories.jsx';
import Inventory from './pages/Inventory.jsx';
import { Returns, Refunds, Payments } from './pages/Sales.jsx';
import { Customers, Reviews } from './pages/People.jsx';
import { Coupons, Content, Notifications } from './pages/Marketing.jsx';
import { Reports, Settings } from './pages/System.jsx';
import Appearance from './pages/Appearance.jsx';
import Account from './pages/Account.jsx';

/** Blocks the admin tree until a session is confirmed. */
function RequireAuth({ children }) {
  const { session, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50 text-ink-500">
        <Loader2 size={22} className="animate-spin" aria-hidden />
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

const guarded = (permission, element) => <RequirePermission permission={permission}>{element}</RequirePermission>;

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="login" element={<AdminLogin />} />

          <Route
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={guarded('dashboard.view', <Dashboard />)} />
            <Route path="products" element={guarded('product.view', <Products />)} />
            <Route path="categories" element={guarded('category.view', <Categories />)} />
            <Route path="inventory" element={guarded('inventory.view', <Inventory />)} />
            <Route path="orders" element={guarded('order.view', <Orders />)} />
            <Route path="returns" element={guarded('return.view', <Returns />)} />
            <Route path="refunds" element={guarded('refund.view', <Refunds />)} />
            <Route path="payments" element={guarded('payment.view', <Payments />)} />
            <Route path="customers" element={guarded('customer.view', <Customers />)} />
            <Route path="reviews" element={guarded('review.view', <Reviews />)} />
            <Route path="coupons" element={guarded('coupon.view', <Coupons />)} />
            <Route path="appearance" element={guarded('cms.view', <Appearance />)} />
            <Route path="content" element={guarded('cms.view', <Content />)} />
            <Route path="notifications" element={guarded('notification.send', <Notifications />)} />
            <Route path="reports" element={guarded('report.view', <Reports />)} />
            <Route path="settings" element={guarded('setting.view', <Settings />)} />
            {/* Single-admin deployment: no user list, just the signed-in account. */}
            <Route path="account" element={<Account />} />
            <Route path="users" element={<Navigate to="/admin/account" replace />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AdminAuthProvider>
  );
}
