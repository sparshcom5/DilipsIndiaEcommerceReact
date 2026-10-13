import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, History } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Checkbox, DataTable, Field, Input, Modal, PageHeader, SearchInput, Textarea,
  dateTime, useToast,
} from '../components/ui.jsx';

function MovementsModal({ onClose }) {
  const { data, loading } = useApi(() => adminApi.stockMovements({ perPage: 50 }), []);

  return (
    <Modal open title="Stock movement ledger" onClose={onClose} width="max-w-[900px]">
      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="pb-3">When</th>
              <th className="pb-3">Product</th>
              <th className="pb-3">Type</th>
              <th className="pb-3 text-right">Change</th>
              <th className="pb-3 text-right">After</th>
              <th className="pb-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data ?? []).map((m) => (
              <tr key={m.id} className="border-b border-ink-100 last:border-0">
                <td className="py-3 text-xs text-ink-500">{dateTime(m.created_at)}</td>
                <td className="py-3">
                  <p className="text-ink-900">{m.product_name}</p>
                  <p className="text-xs text-ink-500">{m.sku}</p>
                </td>
                <td className="py-3 capitalize">{m.movement_type.replace(/_/g, ' ')}</td>
                <td className={`py-3 text-right font-semibold ${m.quantity_change < 0 ? 'text-brand' : 'text-success'}`}>
                  {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                </td>
                <td className="py-3 text-right">{m.quantity_after}</td>
                <td className="py-3 text-xs text-ink-500">
                  {m.note || '—'}
                  {m.performed_by_name && <span className="block">by {m.performed_by_name}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export default function Inventory() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ quantity: '', lowStockThreshold: '', note: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  const q = params.get('q') || '';
  const lowStock = params.get('lowStock') === 'true';
  const page = Number(params.get('page') || 1);

  const { data, loading } = useApi(
    () => adminApi.inventory({ q, lowStock: lowStock || undefined, page, perPage: 25 }),
    [q, lowStock, page, reloadKey]
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

  const startEdit = (row) => {
    setEditing(row);
    setForm({ quantity: row.quantity, lowStockThreshold: row.low_stock_threshold, note: '' });
    setErrors({});
  };

  const save = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await adminApi.updateInventory(editing.id, {
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        note: form.note || undefined,
      });
      toast.success('Stock updated and recorded in the ledger.');
      setEditing(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'product_name',
      label: 'Product',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.product_name}</p>
          <p className="text-xs text-ink-500">{r.sku}{r.variant_name && ` · ${r.variant_name}`}</p>
        </div>
      ),
    },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'quantity', label: 'On hand', align: 'right' },
    { key: 'reserved_quantity', label: 'Reserved', align: 'right' },
    {
      key: 'available_quantity',
      label: 'Available',
      align: 'right',
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold ${
            r.available_quantity <= r.low_stock_threshold ? 'text-brand' : 'text-ink-900'
          }`}
        >
          {r.available_quantity <= r.low_stock_threshold && <AlertTriangle size={13} aria-hidden />}
          {r.available_quantity}
        </span>
      ),
    },
    { key: 'low_stock_threshold', label: 'Threshold', align: 'right' },
    { key: 'updated_at', label: 'Updated', render: (r) => dateTime(r.updated_at) },
  ];

  if (can('inventory.update')) {
    columns.push({
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <Button tone="secondary" size="sm" onClick={() => startEdit(r)}>
          Adjust
        </Button>
      ),
    });
  }

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock on hand, reservations and adjustments.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Product or SKU…" />
        <Checkbox
          label="Low stock only"
          checked={lowStock}
          onChange={(e) => patch({ lowStock: e.target.checked ? 'true' : '' })}
        />
        <Button tone="secondary" onClick={() => setShowLedger(true)}>
          <History size={15} /> Ledger
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No stock records match."
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />

      <Modal
        open={Boolean(editing)}
        title={editing ? `Adjust stock — ${editing.product_name}` : ''}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="inv-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save adjustment'}
            </Button>
          </>
        }
      >
        {editing && (
          <form id="inv-form" onSubmit={save} className="space-y-5">
            <p className="rounded-input bg-ink-50 px-4 py-3 text-xs text-ink-600">
              {editing.reserved_quantity} unit(s) are reserved by open orders. Stock on hand cannot be set
              below that.
            </p>

            <Field label="Quantity on hand" required error={errors.quantity}>
              <Input
                type="number"
                min={editing.reserved_quantity}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                error={errors.quantity}
              />
            </Field>

            <Field label="Low stock threshold" hint="Triggers the dashboard alert.">
              <Input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              />
            </Field>

            <Field label="Reason" hint="Recorded in the stock movement ledger.">
              <Textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Stock count correction, damaged goods, new delivery…"
              />
            </Field>
          </form>
        )}
      </Modal>

      {showLedger && <MovementsModal onClose={() => setShowLedger(false)} />}
    </>
  );
}
