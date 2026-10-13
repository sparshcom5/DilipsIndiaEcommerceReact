import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Copy, Check, Calendar, CreditCard, ShieldCheck, Lock, RefreshCw, Headphones,
} from 'lucide-react';

import { getOffers, subscribeNewsletter } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { formatPrice } from '../lib/format.js';
import { Shell } from '../components/layout/Layout.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

const ASSURANCES = [
  { Icon: ShieldCheck, title: 'Best Prices', subtitle: 'Guaranteed' },
  { Icon: Lock, title: 'Secure Payments', subtitle: '100% Protected' },
  { Icon: RefreshCw, title: 'Easy Returns', subtitle: 'Within 7 Days' },
  { Icon: Headphones, title: 'Customer Support', subtitle: "We're Here to Help" },
];

const TONES = {
  'Sitewide Offer': 'text-success bg-success/10',
  Cashback: 'text-ink-900 bg-accent/25',
  'Free Shipping': 'text-brand bg-brand/10',
};

function OfferCard({ offer }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(offer.code);
    } catch {
      // Clipboard can be blocked; the code is visible on screen regardless.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const tone = TONES[offer.kind] || 'text-ink-700 bg-ink-100';

  return (
    <article className="flex flex-col overflow-hidden rounded-card bg-white shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="flex-1 p-6">
        <span className={`inline-block rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
          {offer.kind}
        </span>

        <div className="mt-5 flex items-start gap-4">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-card text-center leading-tight ${tone}`}>
            <span className="text-base font-bold">{offer.badge}</span>
            <span className="text-[9px] uppercase">off</span>
          </span>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink-900">{offer.name}</h3>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              {offer.description}
              {offer.minOrderAmount > 0 && ` Minimum order ${formatPrice(offer.minOrderAmount)}.`}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-input border border-dashed border-ink-300 bg-ink-50 py-3 text-center">
          <p className="text-[11px] text-ink-500">Code:</p>
          <p className="text-base font-bold tracking-wide text-ink-900">{offer.code}</p>
        </div>

        {offer.expiresAt && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
            <Calendar size={12} aria-hidden />
            Valid till{' '}
            {new Date(offer.expiresAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={copy}
        className="flex items-center justify-center gap-2 border-t border-ink-200 py-4 text-xs font-semibold uppercase tracking-wide text-brand transition-colors hover:bg-brand/5"
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? 'Copied' : 'Copy Code'}
      </button>
    </article>
  );
}

export default function Coupons() {
  const { data, loading } = useApi(() => getOffers(), []);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState('All');

  const offers = data?.offers ?? [];
  const kinds = ['All', ...new Set(offers.map((o) => o.kind))];
  const shown = filter === 'All' ? offers : offers.filter((o) => o.kind === filter);

  const subscribe = async (e) => {
    e.preventDefault();
    setNotice(null);
    try {
      const res = await subscribeNewsletter(email);
      setNotice(res.message);
      setEmail('');
    } catch (err) {
      setNotice(err.fieldErrors?.email || err.message);
    }
  };

  return (
    <>
      <Shell className="py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_620px]">
          <div>
            <h1 className="text-3xl font-bold text-ink-900">Coupons &amp; Offers</h1>
            <p className="mt-2 text-base text-ink-500">Grab the best deals on premium bathroom fittings.</p>
          </div>

          <form onSubmit={subscribe} className="flex flex-wrap items-center gap-5 rounded-card bg-brand/5 p-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-brand">
              <Mail size={19} aria-hidden />
            </span>
            <div className="min-w-[180px] flex-1">
              <p className="text-sm font-bold text-ink-900">Exclusive Offers in Your Inbox!</p>
              <p className="text-xs text-ink-500">Subscribe to get special offers and updates.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address"
                className="w-52 rounded-input border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                className="rounded-input bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Subscribe
              </button>
            </div>
            {notice && (
              <p role="status" className="w-full text-xs text-ink-700">
                {notice}
              </p>
            )}
          </form>
        </div>

        {/* Hero offer strip */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_470px]">
          <div className="relative isolate flex min-h-[300px] flex-col justify-center overflow-hidden rounded-card bg-ink-900 p-12 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Summer</p>
            <p className="mt-3 text-4xl font-bold sm:text-5xl">SPECIAL SALE</p>
            <p className="mt-2 text-2xl">
              Up to <span className="text-4xl font-bold text-brand">25%</span> OFF
            </p>
            <p className="mt-7 inline-flex w-fit items-center gap-3 rounded-sm border border-dashed border-white/50 px-5 py-3 text-sm">
              Use Code: <span className="font-bold text-brand">SUMMER25</span>
            </p>
          </div>

          <div className="relative isolate overflow-hidden rounded-card bg-brand p-10 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-card bg-white/20">
              <CreditCard size={20} aria-hidden />
            </span>
            <p className="mt-7 text-sm">Exclusive Bank Offer</p>
            <p className="mt-2 text-2xl font-bold">10% Instant Discount*</p>
            <p className="mt-2 text-sm text-white/85">on HDFC Bank Credit Cards</p>
            <Link
              to="/products"
              className="mt-7 inline-flex h-11 items-center rounded-input bg-white px-6 text-sm font-semibold text-brand transition-opacity hover:opacity-90"
            >
              Shop Now
            </Link>
            <p className="mt-4 text-[11px] text-white/70">*T&amp;C Apply</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full border px-6 py-2.5 text-sm font-medium transition-colors ${
                  filter === k
                    ? 'border-brand bg-brand text-white'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
                }`}
              >
                {k} ({k === 'All' ? offers.length : offers.filter((o) => o.kind === k).length})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-ink-500">Loading offers…</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((o) => (
              <OfferCard key={o.code} offer={o} />
            ))}
          </div>
        )}

        <ul className="mt-14 grid gap-8 border-t border-ink-200 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {ASSURANCES.map(({ Icon, title, subtitle }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <Icon size={19} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-900">{title}</span>
                <span className="block text-xs text-ink-500">{subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      </Shell>

      <BrochureCta />
    </>
  );
}
