import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';

import { adminApi, tokens } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Card, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select, StatusPill,
  Textarea, dateTime, money, useToast,
} from '../components/ui.jsx';

const STATUSES = [
  'pending', 'confirmed', 'processing', 'packed', 'shipped',
  'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
];

function OrderDetail({ id, onBack, onChanged }) {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const { data: order, loading } = useApi(() => adminApi.order(id), [id, reloadKey]);

  const [statusModal, setStatusModal] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [comment, setComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);

  if (loading) return <p className="text-sm text-ink-500">Loading order…</p>;
  if (!order) return <p className="text-sm text-ink-500">Order not found.</p>;

  const applyStatus = async () => {
    setSaving(true);
    try {
      await adminApi.setOrderStatus(order.id, {
        status: nextStatus,
        comment: comment || undefined,
        cancelReason: nextStatus === 'cancelled' ? cancelReason : undefined,
      });
      toast.success(`Order moved to ${nextStatus.replace(/_/g, ' ')}.`);
      setStatusModal(false);
      setComment('');
      setCancelReason('');
      setReloadKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    try {
      await adminApi.setOrderNote(order.id, note ?? order.adminNote ?? '');
      toast.success('Internal note saved.');
      setNote(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title={order.orderNumber} subtitle={`Placed ${dateTime(order.placedAt)}`}>
        <Button tone="secondary" onClick={onBack}>
          <ArrowLeft size={15} /> Back to list
        </Button>
        {can('order.update') && order.allowedTransitions.length > 0 && (
          <Button
            onClick={() => {
              setNextStatus(order.allowedTransitions[0]);
              setStatusModal(true);
            }}
          >
            Change status
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Items">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="pb-3">Product</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Unit (ex-tax)</th>
                  <th className="pb-3 text-right">Tax</th>
                  <th className="pb-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-3">
                      <p className="font-medium text-ink-900">{i.productName}</p>
                      <p className="text-xs text-ink-500">
                        {i.sku}
                        {i.hsnCode && ` · HSN ${i.hsnCode}`}
                      </p>
                    </td>
                    <td className="py-3 text-right">{i.quantity}</td>
                    <td className="py-3 text-right">{money(i.unitPrice)}</td>
                    <td className="py-3 text-right">
                      {money(i.tax)}
                      <span className="block text-[11px] text-ink-400">
                        {i.igst > 0 ? 'IGST' : 'CGST+SGST'} @ {i.taxRate}%
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-ink-900">{money(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-6 space-y-2 border-t border-ink-200 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd>{money(order.totals.subtotal)}</dd>
              </div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Discount {order.couponCode && `(${order.couponCode})`}</dt>
                  <dd className="text-success">− {money(order.totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Shipping</dt>
                <dd>{order.totals.shipping === 0 ? 'Free' : money(order.totals.shipping)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">GST (included)</dt>
                <dd className="text-ink-500">{money(order.totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd className="text-brand">{money(order.totals.total)}</dd>
              </div>
              {order.totals.amountRefunded > 0 && (
                <div className="flex justify-between text-xs">
                  <dt className="text-ink-500">Refunded</dt>
                  <dd className="text-brand">{money(order.totals.amountRefunded)}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Status history">
            <ol className="space-y-4">
              {order.history.map((h, i) => (
                <li key={i} className="flex gap-4">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="text-sm font-medium capitalize text-ink-900">
                      {h.from ? `${h.from.replace(/_/g, ' ')} → ` : ''}
                      {h.to.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-ink-500">
                      {dateTime(h.at)} · {h.by}
                    </p>
                    {h.comment && <p className="mt-1 text-sm text-ink-600">{h.comment}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Order</span>
                <StatusPill value={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Payment</span>
                <StatusPill value={order.paymentStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Fulfilment</span>
                <StatusPill value={order.fulfillmentStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">Method</span>
                <span className="font-medium uppercase text-ink-900">{order.paymentMethod}</span>
              </div>
            </div>

            {can('order.update') && (
              <div className="mt-5 border-t border-ink-200 pt-5">
                <Field label="Mark payment as">
                  <Select
                    value={order.paymentStatus}
                    onChange={async (e) => {
                      try {
                        await adminApi.setOrderPayment(order.id, e.target.value);
                        toast.success('Payment status updated.');
                        setReloadKey((k) => k + 1);
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                  >
                    {['pending', 'authorized', 'paid', 'partially_paid', 'failed', 'refunded', 'partially_refunded'].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      )
                    )}
                  </Select>
                </Field>
              </div>
            )}
          </Card>

          {order.addresses.map((a) => (
            <Card key={a.id} title={`${a.address_type === 'shipping' ? 'Shipping' : 'Billing'} address`}>
              <address className="text-sm not-italic leading-6 text-ink-600">
                <span className="block font-semibold text-ink-900">{a.contact_name}</span>
                {a.line1}
                {a.line2 && <>, {a.line2}</>}
                <br />
                {a.city}, {a.state} - {a.pincode}
                <br />
                {a.contact_phone}
              </address>
              <p className="mt-3 border-t border-ink-100 pt-3 text-sm text-ink-600">
                {order.customer.email}
              </p>
            </Card>
          ))}

          <Card title="Internal note">
            <Textarea
              rows={4}
              value={note ?? order.adminNote ?? ''}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Only visible to admins."
            />
            <Button className="mt-3 w-full" size="sm" disabled={note === null} onClick={saveNote}>
              Save note
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={statusModal}
        title="Change order status"
        onClose={() => setStatusModal(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={applyStatus} disabled={saving || !nextStatus}>
              {saving ? 'Saving…' : 'Apply'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="New status" required hint={`Current status: ${order.status.replace(/_/g, ' ')}`}>
            <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              {order.allowedTransitions.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </Field>

          {nextStatus === 'cancelled' && (
            <>
              <Field label="Cancellation reason" required>
                <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </Field>
              <p className="rounded-input bg-accent/20 px-4 py-3 text-xs text-ink-700">
                Cancelling releases the reserved stock for every line on this order.
              </p>
            </>
          )}

          <Field label="Comment" hint="Shown to the customer on their tracking page.">
            <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export default function Orders() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);

  const { data, loading } = useApi(
    () => adminApi.orders({ status, q, page, perPage: 20 }),
    [status, q, page, reloadKey]
  );

  const patch = useCallback(
    (updates) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(updates)) {
        if (!v) next.delete(k);
        else next.set(k, String(v));
      }
      if (!('page' in updates)) next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const exportCsv = async () => {
    try {
      const res = await adminApi.exportOrders({ status, q });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (selectedId) {
    return (
      <OrderDetail
        id={selectedId}
        onBack={() => setSelectedId(null)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const columns = [
    { key: 'orderNumber', label: 'Order', render: (r) => <span className="font-semibold text-ink-900">{r.orderNumber}</span> },
    {
      key: 'customer',
      label: 'Customer',
      render: (r) => (
        <div>
          <p className="text-ink-900">{r.customer.name || 'Guest'}</p>
          <p className="text-xs text-ink-500">{r.customer.email}</p>
        </div>
      ),
    },
    { key: 'placedAt', label: 'Placed', render: (r) => dateTime(r.placedAt) },
    { key: 'lineCount', label: 'Items', align: 'right' },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'paymentStatus', label: 'Payment', render: (r) => <StatusPill value={r.paymentStatus} /> },
    { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-semibold text-ink-900">{money(r.total)}</span> },
  ];

  return (
    <>
      <PageHeader title="Orders" subtitle="Every order placed on the storefront.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Order no, email, phone…" />
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-44">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
        {can('order.export') && (
          <Button tone="secondary" onClick={exportCsv}>
            <Download size={15} /> Export CSV
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No orders match these filters."
        onRowClick={(r) => setSelectedId(r.id)}
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />
    </>
  );
}
