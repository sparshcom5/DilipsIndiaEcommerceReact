import { useState } from 'react';
import { Tag, ChevronDown, X } from 'lucide-react';

import { formatPrice } from '../../lib/format.js';
import { useCart } from '../../context/CartContext.jsx';

function Row({ label, value, accent = false, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={muted ? 'text-ink-500' : 'text-ink-600'}>{label}</span>
      <span className={accent ? 'font-semibold text-success' : 'font-medium text-ink-900'}>{value}</span>
    </div>
  );
}

export function CouponPanel() {
  const { cart, applyCoupon, clearCoupon, busy } = useCart();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState(null);

  const applied = cart?.coupon?.applied ? cart.coupon : null;

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await applyCoupon(code.trim());
      setCode('');
      setMessage(null);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="border-t border-ink-200 pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-sm font-medium text-ink-900"
      >
        <span className="flex items-center gap-2.5">
          <Tag size={16} className="text-ink-500" aria-hidden />
          Apply Coupon Code
        </span>
        <ChevronDown
          size={18}
          className={`text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {applied && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-input bg-success/10 px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-success">{applied.code} applied</p>
            <p className="text-xs text-ink-600">{applied.name}</p>
          </div>
          <button
            type="button"
            onClick={() => clearCoupon()}
            disabled={busy}
            aria-label={`Remove coupon ${applied.code}`}
            className="text-ink-500 hover:text-brand"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {open && !applied && (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER COUPON CODE"
            aria-label="Coupon code"
            className="min-w-0 flex-1 rounded-input border border-ink-200 px-3 py-2.5 text-sm uppercase tracking-wide outline-none placeholder:text-ink-400 focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="rounded-input bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-45"
          >
            Apply
          </button>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-brand">{message}</p>}
    </div>
  );
}

export default function OrderSummary({ children, showCoupon = true }) {
  const { cart } = useCart();
  if (!cart) return null;

  const t = cart.totals;

  return (
    <aside className="rounded-card bg-white p-8 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <h2 className="text-xl font-bold text-ink-900">Order Summary</h2>

      <div className="mt-6 space-y-3.5">
        <Row label={`Subtotal (${cart.lineCount} ${cart.lineCount === 1 ? 'item' : 'items'})`} value={formatPrice(t.subtotal)} />
        {t.discount > 0 && (
          <Row label={`Discount${cart.coupon ? ` (${cart.coupon.code})` : ''}`} value={`− ${formatPrice(t.discount)}`} accent />
        )}
        <Row label="Shipping" value={t.shipping === 0 ? 'Free' : formatPrice(t.shipping)} accent={t.shipping === 0} />
        {/*
          Prices are tax-inclusive MRPs, so GST is shown as a component of the
          total rather than an addition to it. See NodeJS/src/lib/pricing.js.
        */}
        <Row
          label={t.pricesIncludeTax ? 'GST (included)' : 'GST'}
          value={formatPrice(t.tax)}
          muted={t.pricesIncludeTax}
        />
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-ink-200 pt-6">
        <span className="text-lg font-bold text-ink-900">Total Amount</span>
        <span className="text-3xl font-bold text-brand">{formatPrice(t.total)}</span>
      </div>
      <p className="mt-1 text-right text-xs text-ink-400">Inclusive of all taxes</p>

      {children && <div className="mt-6 space-y-3">{children}</div>}

      {showCoupon && (
        <div className="mt-6">
          <CouponPanel />
        </div>
      )}
    </aside>
  );
}
