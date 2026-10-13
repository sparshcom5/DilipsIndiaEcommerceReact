import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';

export default function Layout({ children }) {
  // lineCount, not the unit total: three products at any quantity is a 3 on
  // the badge, the way every storefront counts a cart.
  const { lineCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <Header cartCount={lineCount} wishlistCount={wishlistCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Centres content in the 1471px column measured off the Figma frame. */
export function Shell({ className = '', children }) {
  return <div className={`mx-auto max-w-shell px-6 ${className}`}>{children}</div>;
}
