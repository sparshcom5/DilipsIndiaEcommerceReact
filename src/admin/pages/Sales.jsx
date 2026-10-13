/**
 * Returns, Refunds and Payments. They share the same shape — a filtered table
 * plus one action modal — so they live together rather than in three
 * near-identical files.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select, StatusPill,
  Textarea, dateTime, money, useToast, Card,
} from '../components/ui.jsx';

/* ------------------------------- Returns ------------------------------- */

export function Returns() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [detailId, setDetailId] = useState(null);

  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);

  const { data, loading } = useApi(
    () => adminApi.returns({ status, q, page, perPage: 20 }),
    [status, q, page, reloadKey]
  );
  const { data: detail } = useApi(
    () => (detailId ? adminApi.returnRequest(detailId) : Promise.resolve(null)),
    [detailId, reloadKey]
  );

  const [nextStatus, setNextStatus] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const patch = (updates) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in updates)) next.delete('page');
    setParams(next, { replace: true });
  };

  const apply = async () => {
    setSaving(true);
    try {
      await adminApi.updateReturn(detailId, {
        status: nextStatus,
        rejectionReason: nextStatus === 'rejected' ? reason : undefined,
        inspectionNote: note || undefined,
      });
      toast.success(`Return moved to ${nextStatus.replace(/_/g, ' ')}.`);
      setReloadKey((k) => k + 1);
      setNextStatus('');
      setReason('');
      setNote('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'return_number', label: 'Return', render: (r) => <span className="font-semibold text-ink-900">{r.return_number}</span> },
    { key: 'order_number', label: 'Order' },
    { key: 'customer_name', label: 'Customer', render: (r) => r.customer_name || 'Guest' },
    { key: 'type', label: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
    { key: 'reason', label: 'Reason', render: (r) => <span className="capitalize">{String(r.reason).replace(/_/g, ' ')}</span> },
    { key: 'item_count', label: 'Items', align: 'right' },
    { key: 'refund_amount', label: 'Refund', align: 'right', render: (r) => money(r.refund_amount) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'requested_at', label: 'Requested', render: (r) => dateTime(r.requested_at) },
  ];

  return (
    <>
      <PageHeader title="Returns" subtitle="Return, replacement and exchange requests.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Return or order no…" />
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-48">
          <option value="">All statuses</option>
          {['requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'completed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No return requests yet."
        onRowClick={can('return.approve') ? (r) => setDetailId(r.id) : undefined}
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />

      <Modal
        open={Boolean(detailId)}
        title={detail ? `Return ${detail.return_number}` : 'Return'}
        onClose={() => setDetailId(null)}
        footer={
          detail?.allowedTransitions?.length ? (
            <>
              <Button tone="secondary" onClick={() => setDetailId(null)}>Close</Button>
              <Button onClick={apply} disabled={saving || !nextStatus}>
                {saving ? 'Saving…' : 'Apply'}
              </Button>
            </>
          ) : (
            <Button tone="secondary" onClick={() => setDetailId(null)}>Close</Button>
          )
        }
      >
        {!detail ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-ink-500">Order</dt><dd className="font-medium text-ink-900">{detail.order_number}</dd></div>
              <div><dt className="text-ink-500">Status</dt><dd><StatusPill value={detail.status} /></dd></div>
              <div><dt className="text-ink-500">Reason</dt><dd className="capitalize text-ink-900">{String(detail.reason).replace(/_/g, ' ')}</dd></div>
              <div><dt className="text-ink-500">Refund mode</dt><dd className="capitalize text-ink-900">{String(detail.refund_mode).replace(/_/g, ' ')}</dd></div>
            </dl>

            {detail.reason_detail && (
              <p className="rounded-input bg-ink-50 px-4 py-3 text-sm text-ink-700">{detail.reason_detail}</p>
            )}

            <div>
              <h3 className="mb-3 text-sm font-bold text-ink-900">Items</h3>
              <ul className="divide-y divide-ink-100">
                {detail.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4 py-2.5 text-sm">
                    <span>
                      <span className="block text-ink-900">{i.product_name}</span>
                      <span className="text-xs text-ink-500">{i.sku}</span>
                    </span>
                    <span className="shrink-0 text-ink-600">× {i.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {detail.allowedTransitions.length > 0 && (
              <div className="space-y-5 border-t border-ink-200 pt-6">
                <Field label="Move to" required>
                  <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                    <option value="">— choose —</option>
                    {detail.allowedTransitions.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </Select>
                </Field>

                {nextStatus === 'rejected' && (
                  <Field label="Rejection reason" required hint="Shown to the customer.">
                    <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </Field>
                )}

                <Field label="Inspection note" hint="Internal only.">
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------- Refunds ------------------------------- */

export function Refunds() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ orderId: '', amount: '', mode: 'original_payment', reason: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading } = useApi(() => adminApi.refunds({ perPage: 25 }), [reloadKey]);
  const { data: orders } = useApi(() => adminApi.orders({ perPage: 100 }), []);

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const res = await adminApi.createRefund({ ...form, amount: Number(form.amount) });
      toast.success(`Refund ${res.refundNumber} recorded as pending.`);
      setOpen(false);
      setForm({ orderId: '', amount: '', mode: 'original_payment', reason: '' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // One transition at a time; the row's status decides which are offered.
  // `processing` is the one that moves money for gateway-paid orders.
  const [busyId, setBusyId] = useState(null);
  const transition = async (r, status) => {
    let failureReason;
    if (status === 'failed') {
      failureReason = window.prompt(`Why did refund ${r.refund_number} fail?`, 'Bank rejected the transfer');
      if (failureReason == null) return;
    }
    if (status === 'processing' && !window.confirm(
      `Process refund ${r.refund_number} for ${money(r.amount)}?\n\n` +
      'If the order was paid online this asks Cashfree to return the money now.'
    )) return;

    setBusyId(r.id);
    try {
      const res = await adminApi.updateRefund(r.id, { status, failureReason });
      if (res.gatewayRequested) {
        toast.success(
          res.status === 'completed'
            ? `Cashfree refunded ${r.refund_number} instantly.`
            : `Cashfree accepted ${r.refund_number} (ref ${res.gatewayRefundId}). It completes on their webhook.`
        );
      } else {
        toast.success(`Refund ${r.refund_number} marked ${res.status}.`);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    { key: 'refund_number', label: 'Refund', render: (r) => <span className="font-semibold text-ink-900">{r.refund_number}</span> },
    { key: 'order_number', label: 'Order' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
    { key: 'mode', label: 'Mode', render: (r) => <span className="capitalize">{String(r.mode).replace(/_/g, ' ')}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className="flex flex-col gap-0.5">
          <StatusPill value={r.status} />
          {r.gateway_refund_id && <span className="text-[11px] text-ink-500">Cashfree #{r.gateway_refund_id}</span>}
          {r.status === 'failed' && r.failure_reason && (
            <span className="text-[11px] text-brand">{r.failure_reason}</span>
          )}
        </span>
      ),
    },
    { key: 'initiated_by_name', label: 'By', render: (r) => r.initiated_by_name || 'System' },
    { key: 'created_at', label: 'Created', render: (r) => dateTime(r.created_at) },
    ...(can('refund.create')
      ? [
          {
            key: 'actions',
            label: '',
            align: 'right',
            render: (r) => {
              const busy = busyId === r.id;
              if (r.status === 'pending') {
                return (
                  <span className="flex justify-end gap-2">
                    <Button size="sm" disabled={busy} onClick={() => transition(r, 'processing')}>
                      {busy ? 'Processing…' : 'Process'}
                    </Button>
                    <Button size="sm" tone="secondary" disabled={busy} onClick={() => transition(r, 'completed')}>
                      Mark completed
                    </Button>
                  </span>
                );
              }
              if (r.status === 'processing') {
                return (
                  <span className="flex justify-end gap-2">
                    <Button size="sm" tone="secondary" disabled={busy} onClick={() => transition(r, 'completed')}>
                      Mark completed
                    </Button>
                    <Button size="sm" tone="danger" disabled={busy} onClick={() => transition(r, 'failed')}>
                      Mark failed
                    </Button>
                  </span>
                );
              }
              if (r.status === 'failed') {
                return (
                  <Button size="sm" tone="secondary" disabled={busy} onClick={() => transition(r, 'pending')}>
                    Retry
                  </Button>
                );
              }
              return null;
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Refunds" subtitle="Money returned against orders.">
        {can('refund.create') && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New refund
          </Button>
        )}
      </PageHeader>

      <p className="mb-5 rounded-card bg-accent/20 px-5 py-3.5 text-sm text-ink-700">
        Refunds start as <strong>pending</strong>. <strong>Process</strong> sends the money back through
        Cashfree when the order was paid online — it then completes automatically on Cashfree&rsquo;s
        confirmation. COD and bank-transfer refunds are settled by hand: use <strong>Mark completed</strong>{' '}
        once the transfer is done.
      </p>

      <DataTable columns={columns} rows={data?.data} loading={loading} empty="No refunds issued yet." />

      <Modal
        open={open}
        title="Record a refund"
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="refund-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Record refund'}
            </Button>
          </>
        }
      >
        <form id="refund-form" onSubmit={submit} className="space-y-5">
          <Field label="Order" required error={errors.orderId}>
            <Select value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}>
              <option value="">— choose an order —</option>
              {(orders?.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {money(o.total)} ({o.paymentStatus})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Amount" required error={errors.amount} hint="Cannot exceed what is still refundable on the order.">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              error={errors.amount}
            />
          </Field>

          <Field label="Mode">
            <Select value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
              <option value="original_payment">Original payment method</option>
              <option value="wallet">Store wallet</option>
              <option value="bank_transfer">Bank transfer</option>
            </Select>
          </Field>

          <Field label="Reason">
            <Textarea rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </Field>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------ Payments ------------------------------- */

export function Payments() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);

  const { data, loading } = useApi(
    () => adminApi.payments({ status, q, page, perPage: 25 }),
    [status, q, page]
  );

  const patch = (updates) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in updates)) next.delete('page');
    setParams(next, { replace: true });
  };

  const columns = [
    { key: 'order_number', label: 'Order', render: (r) => <span className="font-semibold text-ink-900">{r.order_number}</span> },
    { key: 'method', label: 'Method', render: (r) => <span className="uppercase">{r.method}</span> },
    { key: 'gateway_name', label: 'Gateway', render: (r) => r.gateway_name || '—' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
    { key: 'gateway_fee', label: 'Fee', align: 'right', render: (r) => money(r.gateway_fee) },
    { key: 'amount_refunded', label: 'Refunded', align: 'right', render: (r) => money(r.amount_refunded) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'created_at', label: 'Created', render: (r) => dateTime(r.created_at) },
  ];

  const s = data?.summary;

  return (
    <>
      <PageHeader title="Payments" subtitle="Transactions recorded against orders.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Order or gateway ref…" />
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-44">
          <option value="">All statuses</option>
          {['created', 'pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded'].map((x) => (
            <option key={x} value={x}>{x}</option>
          ))}
        </Select>
      </PageHeader>

      {s && (
        <div className="mb-6 grid gap-5 sm:grid-cols-4">
          {[
            ['Captured', s.captured],
            ['Refunded', s.refunded],
            ['Gateway fees', s.fees],
            ['Net', s.net],
          ].map(([label, value]) => (
            <Card key={label}>
              <p className="text-sm text-ink-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-ink-900">{money(value)}</p>
            </Card>
          ))}
        </div>
      )}

      <p className="mb-5 rounded-card bg-accent/20 px-5 py-3.5 text-sm text-ink-700">
        Checkout does not capture payment yet — no gateway is connected — so this table only fills once
        one is wired up.
      </p>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No payments recorded yet."
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />
    </>
  );
}
