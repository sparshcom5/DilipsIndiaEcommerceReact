import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check, Package, Truck, ArrowLeft, MapPin, Phone, MailIcon, MessageSquare, Search, ImageOff,
} from 'lucide-react';

import { trackOrder } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';
import { Shell } from '../components/layout/Layout.jsx';

const SUPPORT = [
  { Icon: Phone, label: '+91 1800 123 4567', sub: 'Mon - Sat (9AM - 6PM)', href: 'tel:+9118001234567' },
  { Icon: MailIcon, label: 'support@dilipsindia.com', sub: 'We reply within 24 hours', href: 'mailto:support@dilipsindia.com' },
  { Icon: MessageSquare, label: 'Live Chat', sub: 'Chat with our team', href: '#' },
];

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

function Lookup({ initial = '', error }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();

  return (
    <Shell className="py-20">
      <div className="mx-auto max-w-[560px] rounded-card bg-white p-10 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <Package size={40} className="mx-auto text-brand" aria-hidden />
        <h1 className="mt-5 text-2xl font-bold text-ink-900">Track Order</h1>
        <p className="mt-2 text-sm text-ink-500">Enter your order number to see the latest update.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) navigate(`/track-order/${encodeURIComponent(value.trim())}`);
          }}
          className="mt-7 flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder="DI-2026-000001"
              aria-label="Order number"
              className="w-full rounded-input border border-ink-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-input bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Track
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      </div>
    </Shell>
  );
}

export default function TrackOrder() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderNumber) return;
    setOrder(null);
    setError(null);
    trackOrder(orderNumber).then(setOrder).catch(setError);
  }, [orderNumber]);

  if (!orderNumber) return <Lookup />;
  if (error) return <Lookup initial={orderNumber} error={error.message} />;
  if (!order) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">Loading order…</p>
      </Shell>
    );
  }

  const lastComplete = order.steps.reduce((acc, s, i) => (s.complete ? i : acc), -1);
  const unitCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <Shell className="py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ink-900">Track Order</h1>
          <p className="mt-1 text-sm text-ink-500">Here&rsquo;s the latest update on your order.</p>
        </div>
        <p className="text-sm text-ink-500">
          Need help?{' '}
          <Link to="/contact-us" className="font-semibold text-brand hover:opacity-80">
            Contact Support
          </Link>
        </p>
      </div>

      {/* Online order still owing money: the confirmation page owns the Pay
          now flow, so send the shopper there rather than duplicating it. */}
      {order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' && !order.isTerminal && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-accent/60 bg-accent/15 px-5 py-4">
          <p className="text-sm text-ink-900">
            <span className="font-semibold">
              {order.paymentStatus === 'failed' ? 'Payment did not go through.' : 'Payment pending.'}
            </span>{' '}
            <span className="text-ink-600">
              Complete the payment of {formatPrice(order.totals.total)} to confirm this order.
            </span>
          </p>
          <Link
            to={`/order/${encodeURIComponent(order.orderNumber)}`}
            className="inline-flex h-10 items-center rounded-control bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {order.paymentStatus === 'failed' ? 'Try again' : 'Pay now'}
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_470px]">
        <div className="space-y-6">
          {/* Status card */}
          <section className="rounded-card bg-white p-8 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-400">Order Number</p>
                <p className="mt-1 text-xl font-bold text-brand">{order.orderNumber}</p>
                {order.placedAt && (
                  <p className="mt-1 text-xs text-ink-500">Placed on {fmtDateTime(order.placedAt)}</p>
                )}
              </div>

              <div className="text-right">
                <span className="inline-block rounded-sm bg-success/10 px-3 py-1 text-xs font-semibold uppercase text-success">
                  {order.statusLabel}
                </span>
                {order.expectedDeliveryDate && (
                  <>
                    <p className="mt-3 text-xs text-ink-500">Estimated Delivery</p>
                    <p className="text-lg font-bold text-brand">
                      {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Milestones */}
            <ol className="mt-10 flex items-start justify-between gap-2">
              {order.steps.map((s, i) => (
                <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={`absolute right-1/2 top-5 h-0.5 w-full ${
                        i <= lastComplete ? 'bg-brand' : 'bg-ink-200'
                      }`}
                    />
                  )}
                  <span
                    className={`relative grid h-10 w-10 place-items-center rounded-full border-2 bg-white ${
                      s.complete ? 'border-brand text-brand' : 'border-ink-200 text-ink-300'
                    }`}
                  >
                    {s.complete ? <Check size={17} aria-hidden /> : <Package size={16} aria-hidden />}
                  </span>
                  <span className={`mt-3 text-xs font-semibold ${s.complete ? 'text-ink-900' : 'text-ink-400'}`}>
                    {s.label}
                  </span>
                  {s.at && <span className="mt-1 text-[11px] text-ink-400">{fmtDateTime(s.at)}</span>}
                </li>
              ))}
            </ol>

            {order.shipment?.awbNumber ? (
              <div className="mt-9 flex flex-wrap items-center justify-between gap-4 rounded-card bg-ink-50 p-5">
                <div className="flex items-center gap-4">
                  <Truck size={22} className="text-brand" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      Your order is on the way. It has been shipped from our warehouse.
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">AWB Number: {order.shipment.awbNumber}</p>
                  </div>
                </div>
                {order.shipment.trackingUrl && (
                  <a
                    href={order.shipment.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-input border border-brand px-5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                  >
                    Track on Courier Partner
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-9 rounded-card bg-ink-50 p-5 text-sm text-ink-500">
                No shipment has been created for this order yet. You&rsquo;ll see courier details here as
                soon as it leaves our warehouse.
              </p>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-card bg-white p-8 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h2 className="text-base font-bold text-ink-900">Tracking Details</h2>

            <ol className="mt-6">
              {order.timeline.map((t, i) => (
                <li key={`${t.status}-${i}`} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < order.timeline.length - 1 && (
                    <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-ink-200" />
                  )}
                  <span
                    aria-hidden
                    className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      i === 0 ? 'bg-brand' : 'bg-ink-300'
                    }`}
                  />
                  <div>
                    <p className={`text-xs ${i === 0 ? 'font-semibold text-brand' : 'text-ink-500'}`}>
                      {fmtDateTime(t.at)}
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-ink-900">{t.label}</p>
                    {t.comment && <p className="mt-0.5 text-sm text-ink-500">{t.comment}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <Link
            to="/track-order"
            className="flex h-13 w-full items-center justify-center gap-2 rounded-card border border-brand py-4 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden />
            Track another order
          </Link>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h2 className="text-lg font-bold text-ink-900">Order Summary</h2>

            <ul className="mt-6 space-y-5">
              {order.items.map((i) => (
                <li key={i.sku} className="flex gap-4">
                  <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-input bg-ink-100">
                    <ImageOff size={18} className="text-ink-400" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{i.title}</p>
                    {i.options.map((o) => (
                      <p key={o.label} className="text-xs text-ink-500">
                        {o.label}: {o.value}
                      </p>
                    ))}
                    <p className="mt-0.5 text-xs font-medium text-ink-700">Qty: {i.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink-900">{formatPrice(i.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-2.5 border-t border-ink-200 pt-6 text-sm">
              <div className="flex justify-between">
                {/* Count units, not order lines — a single line with qty 2 is 2 items. */}
                <dt className="text-ink-500">
                  Subtotal ({unitCount} {unitCount === 1 ? 'item' : 'items'})
                </dt>
                <dd className="font-medium text-ink-900">{formatPrice(order.totals.subtotal)}</dd>
              </div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Discount</dt>
                  <dd className="font-medium text-success">− {formatPrice(order.totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd className={order.totals.shipping === 0 ? 'font-semibold text-success' : 'font-medium text-ink-900'}>
                  {order.totals.shipping === 0 ? 'FREE' : formatPrice(order.totals.shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">GST (included)</dt>
                <dd className="text-ink-500">{formatPrice(order.totals.tax)}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-ink-200 pt-5">
              <span className="text-base font-bold text-ink-900">Total Amount</span>
              <span className="text-2xl font-bold text-brand">{formatPrice(order.totals.total)}</span>
            </div>
            <p className="mt-1 text-right text-[11px] text-ink-400">Inclusive of all taxes</p>
          </section>

          <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <MapPin size={16} className="text-brand" aria-hidden />
              Delivery Address
            </h2>
            <address className="mt-4 text-sm not-italic leading-6 text-ink-600">
              <span className="block font-semibold text-ink-900">{order.shippingAddress.contactName}</span>
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && <>, {order.shippingAddress.line2}</>}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
              <br />
              {order.shippingAddress.contactPhone}
            </address>
          </section>

          <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h2 className="text-sm font-bold text-ink-900">Need Help?</h2>
            <p className="mt-1 text-xs text-ink-500">Our support team is here to help you.</p>

            <ul className="mt-6 grid gap-6 sm:grid-cols-3">
              {SUPPORT.map(({ Icon, label, sub, href }) => (
                <li key={label} className="text-center">
                  <a href={href} className="group block">
                    <Icon size={19} className="mx-auto text-ink-600 group-hover:text-brand" aria-hidden />
                    <span className="mt-2 block text-xs font-semibold text-ink-900 group-hover:text-brand">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-400">{sub}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
