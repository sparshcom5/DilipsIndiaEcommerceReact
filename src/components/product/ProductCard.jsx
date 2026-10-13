import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, ImageOff, ArrowUpRight, Heart, Minus, Plus } from 'lucide-react';

import { formatPrice, percentOff } from '../../lib/format.js';
import { mediaUrl } from '../../lib/api.js';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import StarRating from '../ui/StarRating.jsx';

function CardImage({ src, alt }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className="grid h-full w-full place-items-center bg-ink-100 text-ink-400">
        <ImageOff size={26} aria-hidden />
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setBroken(true)} />
  );
}

/**
 * The in-cart control: once a product is in the cart the card stops offering
 * to add it again and shows what is there instead, so a second tap on a card
 * is never an accidental second unit.
 */
function CardStepper({ quantity, onChange, disabled, max, dark }) {
  return (
    <div
      className={`mt-4 flex h-10 items-stretch overflow-hidden rounded-input border ${
        dark ? 'border-white/25 text-white' : 'border-brand text-brand'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled}
        aria-label={quantity === 1 ? 'Remove from cart' : 'Decrease quantity'}
        className="grid w-10 place-items-center transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Minus size={14} aria-hidden />
      </button>

      <span aria-live="polite" className="grid flex-1 place-items-center text-xs font-semibold">
        {quantity}
      </span>

      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled || quantity >= max}
        aria-label="Increase quantity"
        className="grid w-10 place-items-center transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}

/**
 * `variant="dark"` is the treatment used on the Bath / Hardware Products
 * frames (1880:42, 1877:15496); "light" is the Products listing grid
 * (1888:644) and the Home rails.
 */
export default function ProductCard({ product, variant = 'light' }) {
  const { cartStateFor, setProductQuantity, busy } = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const discount = percentOff(product.mrp, product.price);
  const dark = variant === 'dark';

  // The server sends cartItemQuantity with the listing; the cart context keeps
  // it live after that, so adding from one card updates every other card
  // showing the same product without refetching the grid.
  const { quantity: liveQuantity, line } = cartStateFor(product.id);
  const inCart = liveQuantity > 0;

  // Several variants of this product are in the cart, so there is no single
  // line a stepper could drive — the product page owns that case.
  const ambiguous = inCart && !line;

  // The listing already told us whether this is saved; lean on that until the
  // wishlist itself has loaded, or every heart flashes empty on first paint.
  const wished = wishlist.loading ? Boolean(product.isWishlisted) : wishlist.isWishlisted(product.id);

  const add = () => setProductQuantity(product, 1).catch(() => {});

  const changeQuantity = (next) => setProductQuantity(product, next).catch(() => {});

  const toggleWish = () => {
    // A guest has no wishlist to write to; send them to sign in rather than
    // firing a request that is certain to 401.
    if (!wishlist.signedIn) {
      // Login reads ?next=, not router state, and sending them back to the
      // grid they were browsing beats dropping them on /account.
      const back = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(back)}`);
      return;
    }
    wishlist.toggle(product.id).catch(() => {});
  };

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-card transition-shadow ${
        dark ? 'bg-ink-900 text-white' : 'bg-white shadow-[0_1px_3px_rgba(17,24,39,0.06)] hover:shadow-md'
      }`}
    >
      <div className="relative">
        <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden">
          <CardImage src={mediaUrl(product.imageUrl)} alt={product.name} />
          <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-brand text-white opacity-0 transition-opacity group-hover:opacity-100">
            <ArrowUpRight size={16} aria-hidden />
          </span>
        </Link>

        <button
          type="button"
          onClick={toggleWish}
          disabled={wishlist.busy}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full shadow-sm transition-colors disabled:opacity-50 ${
            wished ? 'bg-brand text-white' : 'bg-white/90 text-ink-500 hover:text-brand'
          }`}
        >
          <Heart size={15} fill={wished ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className={`text-sm font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>
          <Link to={`/product/${product.slug}`} className="hover:text-brand">
            {product.shortName || product.name}
          </Link>
        </h3>

        <div className="mt-2 flex items-center justify-between gap-2">
          <StarRating value={product.rating.average} size={13} />
          <span className={`text-xs ${dark ? 'text-white/60' : 'text-ink-500'}`}>
            ({product.rating.average.toFixed(1)})
          </span>
          {discount > 0 && <span className="text-xs font-semibold text-success">{discount}% OFF</span>}
        </div>

        <div className="mt-2 flex items-baseline gap-3">
          <span className={`text-base font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>
            {formatPrice(product.price)}
          </span>
          {discount > 0 && (
            <span className={`text-sm line-through ${dark ? 'text-white/45' : 'text-ink-400'}`}>
              {formatPrice(product.mrp)}
            </span>
          )}
        </div>

        <div className="mt-auto">
          {ambiguous ? (
            <Link
              to={`/product/${product.slug}`}
              className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-input text-xs font-semibold transition-colors ${
                dark ? 'bg-white/10 text-white hover:bg-brand' : 'border border-brand text-brand hover:bg-brand hover:text-white'
              }`}
            >
              <ShoppingCart size={14} aria-hidden />
              {liveQuantity} in cart · Edit
            </Link>
          ) : inCart ? (
            <CardStepper
              quantity={liveQuantity}
              onChange={changeQuantity}
              disabled={busy}
              max={line?.maxOrderQty ?? 10}
              dark={dark}
            />
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={busy || !product.inStock || !product.defaultVariantId}
              className={`mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-input text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                dark
                  ? 'bg-white/10 text-white hover:bg-brand'
                  : 'border border-brand text-brand hover:bg-brand hover:text-white'
              }`}
            >
              <ShoppingCart size={14} aria-hidden />
              {/* No default variant means the product carries no price yet — that
                  is an unfinished catalogue entry, not a sold-out one. */}
              {!product.defaultVariantId ? 'Unavailable' : !product.inStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
