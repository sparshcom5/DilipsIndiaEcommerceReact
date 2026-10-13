import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Search, Inbox, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/* ------------------------------------------------------------------ *
 * Toast
 * ------------------------------------------------------------------ */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const push = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(
    () => ({ success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[340px] flex-col gap-3">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-card px-4 py-3 text-sm shadow-lg ${
              t.tone === 'error' ? 'bg-brand text-white' : 'bg-ink-900 text-white'
            }`}
          >
            {t.tone === 'error' ? (
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>.');
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Buttons, pills, cards
 * ------------------------------------------------------------------ */

const BUTTON_TONES = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-ink-200 bg-white text-ink-700 hover:border-ink-400',
  ghost: 'text-ink-600 hover:bg-ink-100',
  danger: 'border border-brand text-brand hover:bg-brand hover:text-white',
};

export function Button({ tone = 'primary', size = 'md', className = '', children, ...rest }) {
  const sizes = { sm: 'h-9 px-3.5 text-xs', md: 'h-10 px-5 text-sm', lg: 'h-11 px-6 text-sm' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-input font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${BUTTON_TONES[tone]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// Status vocabulary is shared across orders, returns, payments and products, so
// the colour mapping lives in one place.
const PILL_TONES = {
  green: 'bg-success/10 text-success',
  red: 'bg-brand/10 text-brand',
  amber: 'bg-accent/25 text-ink-800',
  blue: 'bg-blue-50 text-blue-700',
  gray: 'bg-ink-100 text-ink-600',
};

const STATUS_TONE = {
  active: 'green', approved: 'green', delivered: 'green', captured: 'green', paid: 'green',
  completed: 'green', matched: 'green', published: 'green', received: 'green', sent: 'green',
  pending: 'amber', requested: 'amber', processing: 'amber', queued: 'amber', draft: 'amber',
  partially_paid: 'amber', unsettled: 'amber', authorized: 'amber',
  confirmed: 'blue', packed: 'blue', shipped: 'blue', out_for_delivery: 'blue',
  picked_up: 'blue', pickup_scheduled: 'blue', in_progress: 'blue', new: 'blue',
  cancelled: 'red', rejected: 'red', failed: 'red', blocked: 'red', mismatch: 'red',
  refunded: 'red', returned: 'red', bounced: 'red', spam: 'red',
  inactive: 'gray', archived: 'gray', unfulfilled: 'gray',
};

export function StatusPill({ value, tone }) {
  const resolved = tone || STATUS_TONE[value] || 'gray';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${PILL_TONES[resolved]}`}
    >
      {String(value ?? '—').replace(/_/g, ' ')}
    </span>
  );
}

export function Card({ title, action, className = '', children }) {
  return (
    <section className={`rounded-card bg-white shadow-[0_1px_3px_rgba(17,24,39,0.06)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-ink-200 px-6 py-4">
          {title && <h2 className="text-sm font-bold text-ink-900">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form fields
 * ------------------------------------------------------------------ */

const FIELD_BASE =
  'w-full rounded-input border px-3.5 py-2.5 text-sm outline-none transition-colors disabled:bg-ink-50';

export function Field({ label, error, hint, required: req, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm text-ink-600">
        {label}
        {req && <span className="ml-0.5 text-brand">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-brand">{error}</span>}
    </label>
  );
}

export const Input = ({ error, className = '', ...rest }) => (
  <input
    className={`${FIELD_BASE} ${error ? 'border-brand' : 'border-ink-200 focus:border-brand'} ${className}`}
    {...rest}
  />
);

export const Textarea = ({ error, className = '', ...rest }) => (
  <textarea
    className={`${FIELD_BASE} ${error ? 'border-brand' : 'border-ink-200 focus:border-brand'} ${className}`}
    {...rest}
  />
);

export const Select = ({ error, className = '', children, ...rest }) => (
  <select
    className={`${FIELD_BASE} bg-white ${error ? 'border-brand' : 'border-ink-200 focus:border-brand'} ${className}`}
    {...rest}
  >
    {children}
  </select>
);

export const Checkbox = ({ label, ...rest }) => (
  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
    <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" {...rest} />
    {label}
  </label>
);

export function SearchInput({ value, onSearch, placeholder = 'Search…' }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => setLocal(value || ''), [value]);

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(local)}
        onBlur={() => local !== value && onSearch(local)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-60 rounded-input border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Modal
 * ------------------------------------------------------------------ */

export function Modal({ open, title, onClose, children, footer, width = 'max-w-[640px]' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-8 w-full ${width} rounded-card bg-white shadow-xl`}
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-200 px-6 py-4">
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-400 hover:text-ink-900">
            <X size={19} />
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto p-6">{children}</div>

        {footer && <footer className="flex justify-end gap-3 border-t border-ink-200 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * DataTable
 * ------------------------------------------------------------------ */

/**
 * `columns` entries: { key, label, render?, align?, width? }
 * `render(row)` takes precedence over `row[key]`.
 */
export function DataTable({ columns, rows, loading, empty = 'Nothing here yet.', onRowClick, pagination, onPage }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-card bg-white py-20 text-sm text-ink-500 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <Loader2 size={18} className="animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="rounded-card bg-white py-20 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <Inbox size={32} className="mx-auto text-ink-300" aria-hidden />
        <p className="mt-3 text-sm text-ink-500">{empty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink-500 ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-ink-100 last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-ink-50' : ''
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-5 py-3.5 align-middle text-ink-700 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.render ? c.render(row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 border-t border-ink-200 px-5 py-3.5">
          <p className="text-xs text-ink-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              tone="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
            >
              <ChevronLeft size={14} /> Prev
            </Button>
            <Button
              tone="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Rupee formatting shared by every admin table. */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
export const money = (v) => (v == null ? '—' : inr.format(Number(v)));

export const dateTime = (v) =>
  v
    ? new Date(v).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const dateOnly = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
