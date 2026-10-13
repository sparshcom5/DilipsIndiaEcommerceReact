import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, CreditCard, Loader2, Package, XCircle } from 'lucide-react';

import { createPaymentSession, getOrder, getPaymentStatus } from '../lib/api.js';
import { openCashfreeCheckout } from '../lib/cashfree.js';
import { formatPrice } from '../lib/format.js';
import { Shell } from '../components/layout/Layout.jsx';

const PAYMENT_LABELS = {
  upi: 'UPI',
  netbanking: 'Net Banking',
  card: 'Credit / Debit Card',
  wallet: 'Wallet',
  emi: 'EMI',
  paylater: 'Pay Later',
  cod: 'Cash on Delivery',
};

// How long the page keeps asking after the shopper comes back from the
// gateway. The status endpoint checks with Cashfree directly, so the first
// answer is normally final; the extra polls cover a payment still settling.
const VERIFY_ATTEMPTS = 5;
const VERIFY_GAP_MS = 2500;

/** Page heading for each payment state; `line` follows "Order DI-…". */
const HEADINGS = {
  paid: { icon: CheckCircle2, tone: 'text-success', title: 'Thank you for your order', line: 'has been placed.' },
  verifying: { icon: Loader2, tone: 'text-ink-400', title: 'Confirming your payment…', line: 'is being checked with the bank. Please don’t close this page.' },
  cancelled: { icon: XCircle, tone: 'text-brand', title: 'Payment cancelled', line: 'is not confirmed — you closed the payment window before paying.' },
  failed: { icon: XCircle, tone: 'text-brand', title: 'Payment failed', line: 'is not confirmed — your payment did not go through.' },
  pending: { icon: Clock, tone: 'text-accent', title: 'Payment pending', line: 'will be confirmed once your payment is received.' },
};

/**
 * Payment panel for an online order — verifying, paid, failed, or still owed
 * with a Pay Now button. COD orders never render this.
 *
 * Reports its state through `onState` ('verifying' | 'paid' | 'failed' |
 * 'cancelled' | 'pending') so the page heading never calls an unpaid order
 * placed.
 */
function PaymentPanel({ orderNumber, order, onPaid, onState }) {
  const [searchParams] = useSearchParams();
  const returned = searchParams.get('payment') === 'return';

  const [status, setStatus] = useState(null); // payload from getPaymentStatus
  const [verifying, setVerifying] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  // The shopper closed the Cashfree window without paying.
  const [dismissed, setDismissed] = useState(searchParams.get('payment') === 'cancelled');
  const cancelled = useRef(false);

  const verify = useCallback(
    async (attempts) => {
      setVerifying(true);
      setError(null);
      for (let i = 0; i < attempts && !cancelled.current; i += 1) {
        try {
          const s = await getPaymentStatus(orderNumber);
          if (cancelled.current) return;
          setStatus(s);
          if (s.paymentStatus === 'paid') {
            onPaid?.();
            break;
          }
          // A definite failure, or nothing in flight, is not worth polling on.
          if (s.paymentStatus === 'failed' || !s.attempt) break;
        } catch (err) {
          setError(err.message);
          break;
        }
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, VERIFY_GAP_MS));
      }
      if (!cancelled.current) setVerifying(false);
    },
    [orderNumber, onPaid]
  );

  useEffect(() => {
    cancelled.current = false;
    // Coming back from the gateway is when patience pays; a plain visit to the
    // page just needs one look.
    verify(returned ? VERIFY_ATTEMPTS : 1);
    return () => {
      cancelled.current = true;
    };
  }, [verify, returned]);

  const payNow = async () => {
    setPaying(true);
    setError(null);
    try {
      const { payment } = await createPaymentSession(orderNumber);
      const result = await openCashfreeCheckout(payment);
      if (result.redirect) return; // Cashfree brings the shopper back itself
      const closedEarly = Boolean(result.error && !result.paymentDetails);
      setDismissed(closedEarly);
      // Closed without paying: one look is enough, no need to poll.
      await verify(closedEarly ? 1 : VERIFY_ATTEMPTS);
    } catch (err) {
      // 409 already_paid lands here too — a verify sorts that out.
      if (err.status === 409) await verify(1);
      else setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  const paid = order.paymentStatus === 'paid' || status?.paymentStatus === 'paid';
  const failed = !paid && (status?.paymentStatus === 'failed' || order.paymentStatus === 'failed');
  const instrument = status?.attempt?.instrument;
  const via = instrument?.upiVpa
    ? `UPI · ${instrument.upiVpa}`
    : instrument?.cardLast4
      ? `${instrument.cardNetwork || 'Card'} ending ${instrument.cardLast4}`
      : instrument?.bankName || PAYMENT_LABELS[status?.paymentMethod || order.paymentMethod] || 'online';

  const state = paid ? 'paid' : verifying ? 'verifying' : failed ? 'failed' : dismissed ? 'cancelled' : 'pending';
  useEffect(() => {
    onState?.(state);
  }, [state, onState]);

  if (paid) {
    return (
      <div className="mt-5 inline-flex items-center gap-2 rounded-input bg-success/10 px-4 py-2 text-sm text-success">
        <CheckCircle2 size={16} aria-hidden />
        Payment of {formatPrice(status?.amountPaid ?? order.totals.total)} received via {via}
      </div>
    );
  }

  // The page heading already says "Confirming your payment…".
  if (verifying) return null;

  const canRetry = status?.canRetry ?? true;

  return (
    <div className="mt-5 rounded-card border border-ink-200 bg-ink-50 p-5 text-left">
      <p className="text-sm text-ink-700">
        {failed && status?.attempt?.failureReason ? `${status.attempt.failureReason} ` : ''}
        Complete the payment of{' '}
        <span className="font-semibold text-ink-900">{formatPrice(order.totals.total)}</span> to confirm
        your order.
        {failed || dismissed ? ' No money has been taken.' : ''}
      </p>

      {error && <p className="mt-3 text-xs text-brand">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {canRetry && (
          <button
            type="button"
            onClick={payNow}
            disabled={paying}
            className="inline-flex h-11 items-center gap-2 rounded-control bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            <CreditCard size={16} aria-hidden />
            {paying ? 'Opening payment…' : failed || dismissed ? 'Try again' : 'Pay now'}
          </button>
        )}
        <button
          type="button"
          onClick={() => verify(1)}
          className="text-sm font-semibold text-brand hover:opacity-80"
        >
          I&rsquo;ve already paid — check again
        </button>
      </div>
    </div>
  );
}

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [payState, setPayState] = useState(null); // reported by PaymentPanel

  const load = useCallback(() => getOrder(orderNumber).then(setOrder).catch(setError), [orderNumber]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">We couldn&rsquo;t find order {orderNumber}.</p>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">Loading your order…</p>
      </Shell>
    );
  }

  const a = order.shippingAddress;
  const isCod = order.paymentMethod === 'cod';
  // Only a COD order or a confirmed payment counts as placed. Until the panel
  // has checked with the server, an online order reads as "confirming".
  const state = isCod || order.paymentStatus === 'paid' ? 'paid' : payState || 'verifying';
  const placed = state === 'paid';
  const head = HEADINGS[state];
  const HeadIcon = head.icon;

  return (
    <Shell className="py-14">
      <div className="mx-auto max-w-[760px]">
        <div className="rounded-card bg-white p-10 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
          <HeadIcon
            size={52}
            className={`mx-auto ${head.tone} ${state === 'verifying' ? 'animate-spin' : ''}`}
            aria-hidden
          />
          <h1 className="mt-5 text-2xl font-bold text-ink-900">{head.title}</h1>
          <p className="mt-2 text-sm text-ink-500">
            Order <span className="font-semibold text-ink-900">{order.orderNumber}</span> {head.line}
          </p>

          {isCod ? (
            <p className="mt-5 inline-block rounded-input bg-accent/15 px-4 py-2 text-xs text-ink-700">
              Cash on Delivery · Pay {formatPrice(order.totals.total)} when your order arrives
            </p>
          ) : (
            <PaymentPanel orderNumber={orderNumber} order={order} onPaid={load} onState={setPayState} />
          )}
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h2 className="mb-4 text-sm font-semibold text-ink-900">Delivering to</h2>
            <address className="text-sm not-italic leading-6 text-ink-600">
              <span className="block font-medium text-ink-900">{a.contactName}</span>
              {a.line1}
              <br />
              {a.line2 && (
                <>
                  {a.line2}
                  <br />
                </>
              )}
              {a.city}, {a.state} {a.pincode}
            </address>
            {placed && order.expectedDeliveryDate && (
              <p className="mt-4 flex items-center gap-2 text-sm text-ink-700">
                <Package size={16} className="text-brand" aria-hidden />
                Expected by {new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </section>

          <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h2 className="mb-4 text-sm font-semibold text-ink-900">Order summary</h2>
            <ul className="space-y-3">
              {order.items.map((i) => (
                <li key={i.sku} className="flex justify-between gap-4 text-sm">
                  <span className="text-ink-600">
                    {i.productName} <span className="text-ink-400">× {i.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium text-ink-900">{formatPrice(i.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-ink-200 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="text-ink-900">{formatPrice(order.totals.subtotal)}</dd>
              </div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Discount</dt>
                  <dd className="text-success">− {formatPrice(order.totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd className="text-ink-900">
                  {order.totals.shipping === 0 ? 'Free' : formatPrice(order.totals.shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">GST (included)</dt>
                <dd className="text-ink-500">{formatPrice(order.totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base">
                <dt className="font-bold text-ink-900">Total</dt>
                <dd className="font-bold text-brand">{formatPrice(order.totals.total)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <p className="mt-8 flex flex-wrap justify-center gap-3">
          {placed && (
            <Link
              to={`/track-order/${encodeURIComponent(order.orderNumber)}`}
              className="inline-flex h-12 items-center rounded-control bg-brand px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Track order
            </Link>
          )}
          <Link
            to="/"
            className="inline-flex h-12 items-center rounded-control border border-brand px-7 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
          >
            Continue shopping
          </Link>
        </p>
      </div>
    </Shell>
  );
}
