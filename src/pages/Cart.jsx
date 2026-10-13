import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ShoppingCart, ShieldCheck, Truck, RefreshCw, ImageOff } from 'lucide-react';

import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../lib/format.js';
import { mediaUrl } from '../lib/api.js';
import { Shell } from '../components/layout/Layout.jsx';
import OrderSummary from '../components/cart/OrderSummary.jsx';
import QuantityStepper from '../components/ui/QuantityStepper.jsx';

const ASSURANCES = [
  { Icon: ShieldCheck, title: 'Secure Checkout', subtitle: '100% secure payment' },
  { Icon: Truck, title: 'Free Delivery', subtitle: 'On orders above ₹999' },
  { Icon: RefreshCw, title: 'Easy Returns', subtitle: 'Within 7 days' },
];

function Thumb({ item }) {
  return (
    <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-card bg-ink-100">
      {item.thumbnailUrl ? (
        <img
          src={mediaUrl(item.thumbnailUrl)}
          alt={item.subtitle}
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.removeAttribute('hidden');
          }}
        />
      ) : null}
      <ImageOff
        size={22}
        className="col-start-1 row-start-1 text-ink-400"
        hidden={Boolean(item.thumbnailUrl)}
        aria-hidden
      />
    </div>
  );
}

function CartLine({ item }) {
  const { updateItem, removeItem, busy } = useCart();

  return (
    <li className="rounded-card bg-white p-6 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="flex flex-wrap items-center gap-6">
        <Thumb item={item} />

        <div className="min-w-[200px] flex-1">
          <Link to={`/product/${item.slug}`} className="text-base font-semibold text-ink-900 hover:text-brand">
            {item.title}
          </Link>
          <p className="mt-0.5 text-sm text-ink-500">{item.subtitle}</p>

          {item.options.length > 0 && (
            <dl className="mt-2 space-y-0.5">
              {item.options.map((o) => (
                <div key={o.label} className="flex gap-1.5 text-xs">
                  <dt className="text-ink-500">{o.label}:</dt>
                  <dd className="font-medium text-ink-700">{o.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Only shown when the store is tracking stock and this line exceeds
              what is left — the API reports inStock for everything otherwise. */}
          {!item.inStock && (
            <p className="mt-2.5 inline-block rounded-sm bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
              Only {item.availableQuantity} left
            </p>
          )}
        </div>

        <p className="w-24 text-right text-base font-semibold text-ink-900">{formatPrice(item.unitPrice)}</p>

        <QuantityStepper
          value={item.quantity}
          onChange={(q) => updateItem(item.id, q)}
          min={item.minOrderQty}
          max={Math.max(item.minOrderQty, item.maxOrderQty)}
        />

        <p className="w-28 text-right text-base font-bold text-ink-900">{formatPrice(item.lineTotal)}</p>

        <button
          type="button"
          onClick={() => removeItem(item.id)}
          disabled={busy}
          aria-label={`Remove ${item.title} from cart`}
          className="text-brand transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </li>
  );
}

export default function Cart() {
  const { cart, loading, busy, error } = useCart();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">Loading your cart…</p>
      </Shell>
    );
  }

  if (error && !cart) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">We couldn&rsquo;t load your cart: {error.message}</p>
      </Shell>
    );
  }

  const empty = !cart?.items.length;

  return (
    <Shell className="py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">
            Shopping Cart <span className="text-ink-400">({cart?.lineCount ?? 0})</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">Review your items and proceed to checkout</p>
        </div>

        <Link
          to="/product/prime-series-basin-faucet"
          className="flex items-center gap-2 text-sm font-medium text-brand hover:opacity-80"
        >
          <ArrowLeft size={16} aria-hidden />
          Continue Shopping
        </Link>
      </div>

      {empty ? (
        <div className="mt-10 rounded-card bg-white px-6 py-20 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
          <ShoppingCart size={40} className="mx-auto text-ink-300" aria-hidden />
          <p className="mt-4 text-lg font-semibold text-ink-900">Your cart is empty</p>
          <p className="mt-1 text-sm text-ink-500">Add a product to get started.</p>
          <Link
            to="/product/prime-series-basin-faucet"
            className="mt-6 inline-flex h-12 items-center rounded-control bg-brand px-7 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_463px]">
          <div>
            <ul className="space-y-5">
              {cart.items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </ul>

            <ul className="mt-8 grid gap-6 sm:grid-cols-3">
              {ASSURANCES.map(({ Icon, title, subtitle }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-brand/10 text-brand">
                    <Icon size={19} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink-900">{title}</span>
                    <span className="block text-xs text-ink-500">{subtitle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <OrderSummary>
            <button
              type="button"
              onClick={() => navigate('/checkout')}
              disabled={busy || cart.hasOutOfStock}
              className="flex h-13 w-full items-center justify-center gap-2.5 rounded-control bg-brand py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShoppingCart size={18} aria-hidden />
              Proceed to Checkout
            </button>

            {cart.hasOutOfStock && (
              <p className="text-center text-sm text-brand">
                Some items exceed available stock. Adjust quantities to continue.
              </p>
            )}
          </OrderSummary>
        </div>
      )}
    </Shell>
  );
}
