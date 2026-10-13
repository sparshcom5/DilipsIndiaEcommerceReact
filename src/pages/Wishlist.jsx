import { Link } from 'react-router-dom';
import { Heart, ImageOff, ShoppingCart, Trash2 } from 'lucide-react';

import { formatPrice, percentOff } from '../lib/format.js';
import { mediaUrl } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { Shell } from '../components/layout/Layout.jsx';
import StarRating from '../components/ui/StarRating.jsx';

function Thumb({ item }) {
  return (
    <Link
      to={`/product/${item.slug}`}
      className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-card bg-ink-100"
    >
      {item.imageUrl ? (
        <img
          src={mediaUrl(item.imageUrl)}
          alt={item.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.removeAttribute('hidden');
          }}
        />
      ) : null}
      <ImageOff
        size={22}
        className="col-start-1 row-start-1 text-ink-400"
        hidden={Boolean(item.imageUrl)}
        aria-hidden
      />
    </Link>
  );
}

function WishlistLine({ item }) {
  const { moveToCart, remove, busy } = useWishlist();
  const { cartStateFor } = useCart();

  const discount = percentOff(item.mrp, item.price);
  // Moving something already in the cart adds to the line rather than
  // replacing it, so the card says so instead of implying a fresh add.
  const inCart = cartStateFor(item.id).quantity;

  return (
    <li className="rounded-card bg-white p-6 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="flex flex-wrap items-center gap-6">
        <Thumb item={item} />

        <div className="min-w-[200px] flex-1">
          <Link
            to={`/product/${item.slug}`}
            className="text-base font-semibold text-ink-900 hover:text-brand"
          >
            {item.shortName || item.name}
          </Link>
          <p className="mt-0.5 text-sm text-ink-500">{item.name}</p>

          <div className="mt-2 flex items-center gap-3">
            <StarRating value={item.rating.average} size={13} />
            <span className="text-xs text-ink-500">({item.rating.average.toFixed(1)})</span>
          </div>

          {!item.inStock && (
            <p className="mt-2.5 inline-block rounded-sm bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
              Out of stock
            </p>
          )}
          {inCart > 0 && (
            <p className="mt-2.5 text-xs text-ink-500">
              {inCart} already in your cart
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-base font-bold text-ink-900">{formatPrice(item.price)}</p>
          {discount > 0 && (
            <p className="text-sm text-ink-400">
              <span className="line-through">{formatPrice(item.mrp)}</span>{' '}
              <span className="font-semibold text-success">{discount}% OFF</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => moveToCart(item.wishlistItemId).catch(() => {})}
            disabled={busy || !item.inStock || !item.defaultVariantId}
            className="inline-flex h-11 items-center gap-2 rounded-control bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingCart size={16} aria-hidden />
            Move to Cart
          </button>

          <button
            type="button"
            onClick={() => remove(item.wishlistItemId).catch(() => {})}
            disabled={busy}
            aria-label={`Remove ${item.name} from wishlist`}
            className="text-brand transition-opacity hover:opacity-70 disabled:opacity-40"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </li>
  );
}

function Empty({ title, body, cta }) {
  return (
    <div className="mt-10 rounded-card bg-white px-6 py-20 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <Heart size={40} className="mx-auto text-ink-300" aria-hidden />
      <p className="mt-4 text-lg font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-sm text-ink-500">{body}</p>
      {cta}
    </div>
  );
}

export default function Wishlist() {
  const { isSignedIn, loading: authLoading } = useAuth();
  const { items, loading, error } = useWishlist();

  return (
    <Shell className="py-10">
      <div>
        <h1 className="text-3xl font-bold text-ink-900">
          My Wishlist <span className="text-ink-400">({items.length})</span>
        </h1>
        <p className="mt-1 text-sm text-ink-500">Everything you saved for later</p>
      </div>

      {authLoading || (isSignedIn && loading) ? (
        <p className="mt-10 text-center text-ink-500">Loading your wishlist…</p>
      ) : !isSignedIn ? (
        <Empty
          title="Sign in to see your wishlist"
          body="Saved items follow your account, so they are there on any device."
          cta={
            <Link
              to="/login"
              className="mt-6 inline-flex h-12 items-center rounded-control bg-brand px-7 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Sign In
            </Link>
          }
        />
      ) : error ? (
        <p className="mt-10 text-center text-ink-500">
          We couldn&rsquo;t load your wishlist: {error.message}
        </p>
      ) : !items.length ? (
        <Empty
          title="Your wishlist is empty"
          body="Tap the heart on any product to save it here."
          cta={
            <Link
              to="/products"
              className="mt-6 inline-flex h-12 items-center rounded-control bg-brand px-7 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Browse products
            </Link>
          }
        />
      ) : (
        <ul className="mt-8 space-y-5">
          {items.map((item) => (
            <WishlistLine key={item.wishlistItemId} item={item} />
          ))}
        </ul>
      )}
    </Shell>
  );
}
