import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { SiteProvider } from './context/SiteContext.jsx';
import Layout from './components/layout/Layout.jsx';

// The admin console is a separate concern from the storefront and is loaded on
// demand, so shoppers never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import CategoryLanding from './pages/CategoryLanding.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Cart from './pages/Cart.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
import WhoWeAre from './pages/WhoWeAre.jsx';
import ContactUs from './pages/ContactUs.jsx';
import Blog from './pages/Blog.jsx';
import BlogPost from './pages/BlogPost.jsx';
import Coupons from './pages/Coupons.jsx';
import Login from './pages/Login.jsx';
import Account from './pages/Account.jsx';
import NotFound from './pages/NotFound.jsx';

/** Route changes should start at the top, as a full page load would. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  // AuthProvider wraps everything below the admin console: the standalone
  // login/register screens need it just as much as the storefront does.
  return (
    <Routes>
      {/* The admin console renders its own chrome — no storefront header/footer.
          It has its own, separate session. */}
      <Route
        path="/admin/*"
        element={
          <Suspense
            fallback={<div className="grid min-h-screen place-items-center bg-ink-50 text-sm text-ink-500">Loading…</div>}
          >
            <AdminApp />
          </Suspense>
        }
      />

      <Route
        path="/*"
        element={
          <AuthProvider>
            <Routes>
              {/* Login is a standalone full-screen page in the design (frame
                  1586:17203) — no site header or footer. It covers signing up
                  too: verifying a code on an unknown number creates the
                  account, so there is no separate registration route. */}
              <Route
                path="/login"
                element={
                  <>
                    <ScrollToTop />
                    <Login />
                  </>
                }
              />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/*" element={<Storefront />} />
            </Routes>
          </AuthProvider>
        }
      />
    </Routes>
  );
}

function Storefront() {
  return (
    <SiteProvider>
      <CartProvider>
        {/* Inside CartProvider on purpose: move-to-cart returns a cart payload
            the wishlist hands straight to cart state, so it needs useCart. */}
        <WishlistProvider>
        <ScrollToTop />
        <Layout>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/products" element={<Products />} />
          <Route
            path="/bath-products"
            element={
              <CategoryLanding
                slug="bath-products"
                title="Bath"
                titleAccent="Products"
                subtitle="Premium bath fittings that blend style, performance and durability"
                heroImage="/images/banners/bath-products-hero.jpg"
              />
            }
          />
          <Route
            path="/hardware-products"
            element={
              <CategoryLanding
                slug="hardware-products"
                title="Hardware"
                titleAccent="Products"
                subtitle="Door and glass hardware built from solid brass to last"
                heroImage="/images/banners/hardware-products-hero.jpg"
              />
            }
          />
          <Route path="/product/:slug" element={<ProductDetails />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/track-order/:orderNumber" element={<TrackOrder />} />

          <Route path="/who-we-are" element={<WhoWeAre />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/coupons" element={<Coupons />} />

          <Route path="/account" element={<Account />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Layout>
        </WishlistProvider>
      </CartProvider>
    </SiteProvider>
  );
}
