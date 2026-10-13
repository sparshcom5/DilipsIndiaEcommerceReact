import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
  User,
  Check,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import {
  changePassword,
  createAddress,
  deleteAddress,
  getCheckoutOptions,
  getMyOrders,
  saveSession,
  updateAddress,
  updateProfile,
} from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { formatPrice } from '../lib/format.js';
import { Shell } from '../components/layout/Layout.jsx';
import PageHero from '../components/common/PageHero.jsx';

const inputClass = (error) =>
  `w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-400 ${
    error ? 'border-brand' : 'border-ink-200 focus:border-brand'
  }`;

function Field({ label, name, error, optional, children, className = '' }) {
  const id = `acct-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm text-ink-600">
        {label} {optional && <span className="text-ink-400">(Optional)</span>}
      </label>
      {children(id)}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-brand">
          {error}
        </p>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, action, children }) {
  return (
    <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 text-lg font-semibold text-ink-900">
          <Icon size={18} className="text-brand" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const EMPTY_ADDRESS = {
  label: 'home',
  contactName: '',
  contactPhone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

function AddressForm({ initial, states, onCancel, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_ADDRESS, ...initial });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const change = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErrors((err) => (err[name] ? { ...err, [name]: undefined } : err));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await onSave(form);
    } catch (err) {
      setErrors(err.fieldErrors || { line1: err.message });
    } finally {
      setSaving(false);
    }
  };

  const text = (name, props = {}) => (id) => (
    <input id={id} name={name} value={form[name] ?? ''} onChange={change} className={inputClass(errors[name])} {...props} />
  );

  return (
    <form onSubmit={submit} className="rounded-card border border-ink-200 p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact name" name="contactName" error={errors.contactName}>
          {text('contactName', { placeholder: 'Full name' })}
        </Field>
        <Field label="Contact number" name="contactPhone" error={errors.contactPhone}>
          {text('contactPhone', { inputMode: 'numeric', maxLength: 10, placeholder: '10-digit mobile number' })}
        </Field>

        <Field label="Address" name="line1" error={errors.line1} className="sm:col-span-2">
          {text('line1', { placeholder: 'Flat / House no., Building, Street' })}
        </Field>
        <Field label="Area / Landmark" name="line2" error={errors.line2} optional className="sm:col-span-2">
          {text('line2', { placeholder: 'Colony, Area, Landmark' })}
        </Field>

        <Field label="City" name="city" error={errors.city}>
          {text('city', { placeholder: 'City' })}
        </Field>
        <Field label="Pincode" name="pincode" error={errors.pincode}>
          {text('pincode', { inputMode: 'numeric', maxLength: 6, placeholder: '6-digit pincode' })}
        </Field>

        <Field label="State" name="state" error={errors.state}>
          {(id) => (
            <select id={id} name="state" value={form.state} onChange={change} className={inputClass(errors.state)}>
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Address type" name="label" error={errors.label}>
          {(id) => (
            <select id={id} name="label" value={form.label} onChange={change} className={inputClass()}>
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="other">Other</option>
            </select>
          )}
        </Field>
      </div>

      <label className="mt-5 flex items-center gap-2.5 text-sm text-ink-600">
        <input
          type="checkbox"
          name="isDefault"
          checked={form.isDefault}
          onChange={change}
          className="h-4 w-4 accent-brand"
        />
        Use as my default delivery address
      </label>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-input bg-brand px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
          Save address
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-input border border-ink-200 px-6 text-sm text-ink-700 transition-colors hover:border-ink-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Profile() {
  const { customer, setCustomer } = useAuth();
  const [form, setForm] = useState({
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: customer.email || '',
    phone: customer.phone || '',
  });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => (err[name] ? { ...err, [name]: undefined } : err));
    setSaved(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      // `phone` is display-only here — never send it back.
      const { phone, ...editable } = form;
      const res = await updateProfile(editable);
      setCustomer(res.customer);
      setSaved(true);
    } catch (err) {
      setErrors(err.fieldErrors || { email: err.message });
    } finally {
      setSaving(false);
    }
  };

  const text = (name, props = {}) => (id) => (
    <input id={id} name={name} value={form[name]} onChange={change} className={inputClass(errors[name])} {...props} />
  );

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      {/* Signing in only proves the mobile number, so a new account arrives
          here with no name and no email. */}
      {customer.profileComplete === false && (
        <p className="sm:col-span-2 rounded-card bg-brand/10 px-5 py-4 text-sm text-brand">
          Welcome! Add your name and email address below so we can send order updates and
          receipts.
        </p>
      )}

      <Field label="First name" name="firstName" error={errors.firstName}>
        {text('firstName', { autoComplete: 'given-name' })}
      </Field>
      <Field label="Last name" name="lastName" error={errors.lastName}>
        {text('lastName', { autoComplete: 'family-name' })}
      </Field>
      <Field label="Email address" name="email" error={errors.email}>
        {text('email', { type: 'email', autoComplete: 'email' })}
      </Field>
      {/* Read-only: the mobile number is the only way back into the account,
          so a typo here would lock the customer out for good. Changing it
          needs a verify-the-new-number flow, which does not exist yet. */}
      <Field label="Mobile number" name="phone">
        {(id) => (
          <div>
            <input
              id={id}
              value={form.phone ? `+91 ${form.phone}` : ''}
              readOnly
              disabled
              className={`${inputClass()} cursor-not-allowed bg-ink-50 text-ink-500`}
            />
            <p className="mt-1.5 text-xs text-ink-400">
              You sign in with this number. Contact support to change it.
            </p>
          </div>
        )}
      </Field>

      <div className="flex items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-input bg-brand px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
          Save changes
        </button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check size={15} aria-hidden />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => (err[name] ? { ...err, [name]: undefined } : err));
    setSaved(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      // The server revokes every existing refresh token, so the response
      // carries a fresh pair that has to replace the stored one.
      saveSession(await changePassword(form));
      setForm({ currentPassword: '', password: '', confirmPassword: '' });
      setSaved(true);
    } catch (err) {
      setErrors(err.fieldErrors || { currentPassword: err.message });
    } finally {
      setSaving(false);
    }
  };

  const pw = (name) => (id) => (
    <input
      id={id}
      name={name}
      type="password"
      value={form[name]}
      onChange={change}
      autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
      className={inputClass(errors[name])}
    />
  );

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-3">
      <Field label="Current password" name="currentPassword" error={errors.currentPassword}>
        {pw('currentPassword')}
      </Field>
      <Field label="New password" name="password" error={errors.password}>
        {pw('password')}
      </Field>
      <Field label="Confirm new password" name="confirmPassword" error={errors.confirmPassword}>
        {pw('confirmPassword')}
      </Field>

      <div className="flex items-center gap-4 sm:col-span-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center gap-2 rounded-input border border-ink-200 px-7 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-400 disabled:opacity-60"
        >
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
          Update password
        </button>
        {saved && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check size={15} aria-hidden />
            Password updated — other devices were signed out.
          </span>
        )}
      </div>
    </form>
  );
}

function AddressBook() {
  const { addresses, setAddresses } = useAuth();
  const { data: options } = useApi(() => getCheckoutOptions(), []);
  const states = options?.states ?? [];

  const [editing, setEditing] = useState(null); // 'new' | address id
  const [busyId, setBusyId] = useState(null);

  const save = async (form) => {
    const res = editing === 'new' ? await createAddress(form) : await updateAddress(editing, form);
    setAddresses(res.addresses);
    setEditing(null);
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      const res = await deleteAddress(id);
      setAddresses(res.addresses);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card
      icon={MapPin}
      title="Address Book"
      action={
        editing === null && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:opacity-80"
          >
            <Plus size={15} aria-hidden />
            Add address
          </button>
        )
      }
    >
      {editing === 'new' && (
        <AddressForm states={states} onCancel={() => setEditing(null)} onSave={save} />
      )}

      {addresses.length === 0 && editing !== 'new' && (
        <p className="text-sm text-ink-500">No addresses saved yet.</p>
      )}

      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="sm:col-span-2">
              <AddressForm
                initial={a}
                states={states}
                onCancel={() => setEditing(null)}
                onSave={save}
              />
            </li>
          ) : (
            <li
              key={a.id}
              className={`rounded-card border p-5 ${a.isDefault ? 'border-brand' : 'border-ink-200'}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {a.label}
                </span>
                {a.isDefault && (
                  <span className="rounded-sm bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    Default
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-ink-900">{a.contactName}</p>
              <p className="mt-1 text-sm leading-6 text-ink-600">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}
                <br />
                {a.city}, {a.state} {a.pincode}
                <br />
                {a.contactPhone}
              </p>

              <div className="mt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setEditing(a.id)}
                  className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand"
                >
                  <Pencil size={14} aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={busyId === a.id}
                  className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-brand disabled:opacity-50"
                >
                  <Trash2 size={14} aria-hidden />
                  Remove
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </Card>
  );
}

function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    getMyOrders()
      .then((res) => setOrders(res.orders))
      .catch(() => setOrders([]));
  }, []);

  return (
    <Card icon={Package} title="My Orders">
      {orders === null && <p className="text-sm text-ink-500">Loading orders…</p>}

      {orders?.length === 0 && (
        <p className="text-sm text-ink-500">
          No orders yet.{' '}
          <Link to="/products" className="font-semibold text-brand hover:opacity-80">
            Start shopping
          </Link>
          .
        </p>
      )}

      {orders?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Placed</th>
                <th className="pb-3 font-medium">Items</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Payment</th>
                <th className="pb-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                // An online order still owing money gets a way to pay from
                // here; the confirmation page owns that flow.
                const owes =
                  o.paymentMethod !== 'cod' &&
                  o.paymentStatus !== 'paid' &&
                  !['cancelled', 'returned', 'refunded'].includes(o.status);
                return (
                  <tr key={o.orderNumber} className="border-b border-ink-100">
                    <td className="py-3.5">
                      <Link
                        to={`/track-order/${o.orderNumber}`}
                        className="font-semibold text-ink-900 hover:text-brand"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 text-ink-600">
                      {o.placedAt ? new Date(o.placedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3.5 text-ink-600">{o.itemCount}</td>
                    <td className="py-3.5 capitalize text-ink-600">{o.status.replace(/_/g, ' ')}</td>
                    <td className="py-3.5">
                      {o.paymentMethod === 'cod' ? (
                        <span className="text-ink-600">Cash on Delivery</span>
                      ) : o.paymentStatus === 'paid' ? (
                        <span className="text-success">Paid</span>
                      ) : owes ? (
                        <Link
                          to={`/order/${encodeURIComponent(o.orderNumber)}`}
                          className="font-semibold text-brand hover:opacity-80"
                        >
                          {o.paymentStatus === 'failed' ? 'Payment failed · Try again' : 'Pay now'}
                        </Link>
                      ) : (
                        <span className="capitalize text-ink-600">{o.paymentStatus.replace(/_/g, ' ')}</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-ink-900">
                      {formatPrice(o.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** My Account — profile, password, address book and order history. */
export default function Account() {
  const { customer, loading, signOut } = useAuth();

  if (loading) {
    return (
      <Shell className="py-24">
        <p className="text-sm text-ink-500">Loading your account…</p>
      </Shell>
    );
  }
  if (!customer) return <Navigate to="/login?next=/account" replace />;

  return (
    <>
      <PageHero
        pageKey="account"
        title="My"
        titleAccent="Account"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'My Account' }]}
      />

      <div className="bg-ink-50 py-14">
        <Shell>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-500">Signed in as</p>
              <p className="text-lg font-semibold text-ink-900">
                {customer.fullName} · {customer.email}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-11 items-center gap-2 rounded-input border border-ink-200 bg-white px-6 text-sm font-semibold text-ink-800 transition-colors hover:border-brand hover:text-brand"
            >
              <LogOut size={15} aria-hidden />
              Sign out
            </button>
          </div>

          <div className="grid gap-6">
            <Card icon={User} title="Profile Details">
              <Profile />
              {/* Sign-in is by one-time code, so most accounts have no password
                  at all. Changing one requires the current password, which
                  those customers cannot supply — so the form is only offered to
                  accounts that actually have one. */}
              {customer.hasPassword && (
                <div className="mt-8 border-t border-ink-100 pt-7">
                  <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-ink-700">
                    Change password
                  </h3>
                  <PasswordForm />
                </div>
              )}
            </Card>

            <AddressBook />
            <Orders />
          </div>
        </Shell>
      </div>
    </>
  );
}
