import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Truck, Zap, ShieldCheck, RefreshCw, Award, ImageOff } from 'lucide-react';

import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getCheckoutOptions, placeOrder } from '../lib/api.js';
import { openCashfreeCheckout } from '../lib/cashfree.js';
import { formatPrice } from '../lib/format.js';
import { Shell } from '../components/layout/Layout.jsx';
import OrderSummary from '../components/cart/OrderSummary.jsx';

const ASSURANCES = [
  { Icon: ShieldCheck, title: 'Secure Payment', subtitle: '100% secure & trusted' },
  { Icon: RefreshCw, title: 'Easy Returns', subtitle: 'Within 7 days' },
  { Icon: Award, title: 'Best Quality', subtitle: 'Premium products' },
];

const SHIPPING_ICONS = { standard: Truck, express: Zap };

function Step({ n, title, children }) {
  return (
    <section className="rounded-card bg-white p-8 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <h2 className="mb-7 flex items-center gap-3.5 text-lg font-semibold text-ink-900">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand text-sm font-semibold text-brand">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, name, value, onChange, error, optional, type = 'text', children, ...rest }) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-ink-600">
        {label} {optional && <span className="text-ink-400">(Optional)</span>}
      </label>

      {children || (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-400 ${
            error ? 'border-brand' : 'border-ink-200 focus:border-brand'
          }`}
          {...rest}
        />
      )}

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-brand">
          {error}
        </p>
      )}
    </div>
  );
}

function RadioCard({ selected, onSelect, Icon, title, subtitle, right, badge }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-start gap-3.5 rounded-card border p-5 text-left transition-colors ${
        selected ? 'border-brand bg-brand/[0.03]' : 'border-ink-200 hover:border-ink-400'
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border-2 ${
          selected ? 'border-brand' : 'border-ink-300'
        }`}
        style={{ height: 18, width: 18 }}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>

      {Icon && <Icon size={19} className="mt-0.5 shrink-0 text-ink-600" aria-hidden />}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-900">{title}</span>
          {badge && (
            <span className="rounded-sm bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              {badge}
            </span>
          )}
        </span>
        {subtitle && <span className="mt-0.5 block text-xs text-ink-500">{subtitle}</span>}
      </span>

      {right && <span className="shrink-0 text-sm font-semibold text-ink-900">{right}</span>}
    </button>
  );
}

const EMPTY_ADDRESS = {
  fullName: '',
  email: '',
  phone: '',
  pincode: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
};

export default function Checkout() {
  const { cart, loading, shippingCode, setShippingCode, refresh } = useCart();
  const { customer, addresses } = useAuth();
  const navigate = useNavigate();

  const [options, setOptions] = useState(null);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [touched, setTouched] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // True while the Cashfree modal is open over this page.
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    getCheckoutOptions().then(setOptions).catch(() => setOptions(null));
  }, []);

  // Prefill from the account's default address. Only while the form is still
  // untouched, so this cannot overwrite something the shopper has typed.
  useEffect(() => {
    if (!customer || touched) return;
    const saved = addresses.find((a) => a.isDefault) || addresses[0];
    setAddress((prev) => ({
      ...prev,
      fullName: saved?.contactName || customer.fullName || '',
      email: customer.email || '',
      phone: saved?.contactPhone || customer.phone || '',
      line1: saved?.line1 || '',
      line2: saved?.line2 || '',
      city: saved?.city || '',
      state: saved?.state || '',
      pincode: saved?.pincode || '',
    }));
  }, [customer, addresses, touched]);

  const setField = (name, value) => {
    setTouched(true);
    setAddress((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  const method = options?.shippingMethods.find((m) => m.code === shippingCode);
  const codBlocked = method && !method.isCodSupported;

  // Switching to a delivery option that cannot carry COD must not leave COD
  // selected — the server would reject the order.
  useEffect(() => {
    if (codBlocked && paymentMethod === 'cod') setPaymentMethod('upi');
  }, [codBlocked, paymentMethod]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const order = await placeOrder({
        address,
        shippingMethod: shippingCode,
        paymentMethod,
        saveAddress,
      });
      await refresh();

      // Online methods: the order exists now, payment-pending. Open the gateway
      // over this page; whatever happens in the modal — paid, closed, bank
      // redirect — the confirmation page verifies with the server and offers
      // a retry if money is still owed. So every path leads there.
      // `outcome` only picks the order page's first words — "cancelled" when
      // the shopper closed the modal without paying. The page still verifies
      // with the server before showing anything as paid.
      let outcome = 'return';
      if (order.payment?.paymentSessionId) {
        setPaying(true);
        try {
          const result = await openCashfreeCheckout(order.payment);
          // A bank redirect takes the whole window; Cashfree returns the shopper
          // to /order/:number itself, so navigating now would fight it.
          if (result.redirect) return;
          if (result.error && !result.paymentDetails) outcome = 'cancelled';
        } catch {
          // SDK failed to load or open. The order page will offer Pay Now.
        }
      }
      navigate(`/order/${order.orderNumber}?payment=${outcome}`, { replace: true });
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      else setSubmitError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
      setPaying(false);
    }
  };

  const selectedMethod = options?.paymentMethods.find((p) => p.code === paymentMethod);
  const payingOnline = Boolean(selectedMethod?.online && options?.paymentGateway);

  if (loading || !options) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">Loading checkout…</p>
      </Shell>
    );
  }

  if (!cart?.items.length) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">Your cart is empty.</p>
        <p className="mt-4 text-center">
          <Link to="/cart" className="text-sm font-semibold text-brand hover:opacity-80">
            Back to cart
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell className="py-10">
      <h1 className="text-3xl font-bold text-ink-900">Checkout</h1>
      <p className="mt-1 text-sm text-ink-500">Fill in your details and complete your order</p>

      {/* Guest checkout still works; an account just saves the retyping and
          keeps the order in the shopper's history. */}
      {!customer && (
        <p className="mt-6 rounded-card border border-ink-200 bg-ink-50 px-5 py-4 text-sm text-ink-700">
          <Link to="/login?next=/checkout" className="font-semibold text-brand hover:opacity-80">
            Sign in with your mobile number
          </Link>{' '}
          to prefill your details and track this order — or carry on as a guest.
        </p>
      )}

      {submitError && (
        <p className="mt-6 rounded-card bg-brand/10 px-5 py-4 text-sm text-brand">{submitError}</p>
      )}

      <form onSubmit={submit} className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_463px]">
        <div className="space-y-8">
          <Step n={1} title="Shipping Address">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Full Name" name="fullName" value={address.fullName} onChange={setField} error={fieldErrors.fullName} autoComplete="name" placeholder="Rohit Sharma" />
              <Field label="Email Address" name="email" type="email" value={address.email} onChange={setField} error={fieldErrors.email} autoComplete="email" placeholder="rohit.sharma@email.com" />
              <Field label="Phone Number" name="phone" type="tel" value={address.phone} onChange={setField} error={fieldErrors.phone} autoComplete="tel" placeholder="+91 98765 43210" />
              <Field label="Pincode" name="pincode" value={address.pincode} onChange={setField} error={fieldErrors.pincode} autoComplete="postal-code" inputMode="numeric" placeholder="110008" />
              <Field label="Address Line 1" name="line1" value={address.line1} onChange={setField} error={fieldErrors.line1} autoComplete="address-line1" placeholder="23, Patel Nagar, New Delhi" />
              <Field label="Address Line 2" name="line2" value={address.line2} onChange={setField} error={fieldErrors.line2} optional autoComplete="address-line2" placeholder="Near Metro Station" />
              <Field label="City" name="city" value={address.city} onChange={setField} error={fieldErrors.city} autoComplete="address-level2" placeholder="New Delhi" />

              <Field label="State" name="state" value={address.state} onChange={setField} error={fieldErrors.state}>
                <select
                  id="field-state"
                  name="state"
                  value={address.state}
                  onChange={(e) => setField('state', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.state)}
                  className={`w-full rounded-input border bg-white px-4 py-3 text-sm outline-none transition-colors ${
                    fieldErrors.state ? 'border-brand' : 'border-ink-200 focus:border-brand'
                  } ${address.state ? 'text-ink-900' : 'text-ink-400'}`}
                >
                  <option value="">Select a state</option>
                  {options.states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="mt-6 flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              Save this address for future use
            </label>
          </Step>

          <Step n={2} title="Shipping Method">
            <div className="grid gap-5 sm:grid-cols-2" role="radiogroup" aria-label="Shipping method">
              {options.shippingMethods.map((m) => {
                const free = m.freeAboveAmount != null && cart.totals.subtotal - cart.totals.discount >= m.freeAboveAmount;
                return (
                  <RadioCard
                    key={m.code}
                    selected={shippingCode === m.code}
                    onSelect={() => setShippingCode(m.code)}
                    Icon={SHIPPING_ICONS[m.code] || Truck}
                    title={m.name}
                    subtitle={m.description}
                    right={free || m.baseRate === 0 ? <span className="text-success">FREE</span> : formatPrice(m.baseRate)}
                  />
                );
              })}
            </div>
            {fieldErrors.shippingMethod && (
              <p className="mt-3 text-xs text-brand">{fieldErrors.shippingMethod}</p>
            )}
          </Step>

          <Step n={3} title="Payment Method">
            <div className="grid gap-5 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              {options.paymentMethods.map((p) => {
                const disabled = p.code === 'cod' && codBlocked;
                return (
                  <div key={p.code} className={disabled ? 'opacity-45' : undefined}>
                    <RadioCard
                      selected={paymentMethod === p.code}
                      onSelect={() => !disabled && setPaymentMethod(p.code)}
                      title={p.label}
                      subtitle={
                        disabled ? `Not available with ${method?.name}` : p.description
                      }
                      badge={p.recommended ? 'Recommended' : null}
                    />
                  </div>
                );
              })}
            </div>
            {fieldErrors.paymentMethod && (
              <p className="mt-3 text-xs text-brand">{fieldErrors.paymentMethod}</p>
            )}
          </Step>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-between gap-4 rounded-card bg-brand px-8 py-5 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <Lock size={18} aria-hidden />
              {paying
                ? 'Complete payment in the window…'
                : submitting
                  ? 'Placing order…'
                  : payingOnline
                    ? 'Place Order & Pay'
                    : 'Place Order'}
            </span>
            <span className="text-lg">{formatPrice(cart.totals.total)}</span>
          </button>
          {payingOnline && (
            <p className="-mt-4 text-center text-xs text-ink-500">
              You&rsquo;ll be taken to our secure payment partner Cashfree to complete the payment.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <OrderSummary showCoupon={false}>
            <div className="border-t border-ink-200 pt-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-brand">
                  {cart.lineCount} {cart.lineCount === 1 ? 'Item' : 'Items'} in Cart
                </p>
                <Link to="/cart" className="text-sm text-brand underline hover:opacity-80">
                  Edit Cart
                </Link>
              </div>

              <ul className="space-y-4">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex gap-3.5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-input bg-ink-100">
                      <ImageOff size={16} className="text-ink-400" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                      {item.options.map((o) => (
                        <p key={o.label} className="text-xs text-ink-500">
                          {o.label}: {o.value}
                        </p>
                      ))}
                      <p className="mt-0.5 text-xs font-medium text-ink-700">Qty: {item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink-900">{formatPrice(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </OrderSummary>

          <ul className="space-y-4">
            {ASSURANCES.map(({ Icon, title, subtitle }) => (
              <li
                key={title}
                className="flex items-center gap-3.5 rounded-card bg-white px-5 py-4 shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <Icon size={18} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{title}</span>
                  <span className="block text-xs text-ink-500">{subtitle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </form>
    </Shell>
  );
}
