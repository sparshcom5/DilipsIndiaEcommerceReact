/** Reports and Settings. */
import { useState } from 'react';

import { adminApi } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Card, Checkbox, DataTable, Field, Input, PageHeader, StatusPill,
  dateOnly, dateTime, money, useToast,
} from '../components/ui.jsx';

/* ------------------------------- Reports ------------------------------- */

function Bars({ rows, labelKey, valueKey, format = money }) {
  if (!rows?.length) return <p className="text-sm text-ink-500">No data for this period.</p>;
  const max = Math.max(...rows.map((r) => Number(r[valueKey])), 1);

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r[labelKey]}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="capitalize text-ink-700">{String(r[labelKey] ?? '—').replace(/_/g, ' ')}</span>
            <span className="font-semibold text-ink-900">{format(r[valueKey])}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(Number(r[valueKey]) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Reports() {
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, loading } = useApi(() => adminApi.reports(range), [range.from, range.to]);

  if (loading) return <p className="text-sm text-ink-500">Building reports…</p>;

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales, catalog and search performance.">
        <Field label="" className="!mb-0">
          <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} aria-label="From date" />
        </Field>
        <Field label="" className="!mb-0">
          <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} aria-label="To date" />
        </Field>
        {(range.from || range.to) && (
          <Button tone="secondary" onClick={() => setRange({ from: '', to: '' })}>Clear</Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Revenue by category">
          <Bars rows={data?.byCategory} labelKey="category" valueKey="revenue" />
        </Card>

        <Card title="Revenue by payment method">
          <Bars rows={data?.byPaymentMethod} labelKey="method" valueKey="revenue" />
        </Card>

        <Card title="Coupon usage">
          {data?.couponUsage?.length ? (
            <ul className="divide-y divide-ink-100">
              {data.couponUsage.map((c) => (
                <li key={c.code} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="font-medium text-ink-900">{c.code}</span>
                  <span className="text-ink-600">
                    {c.uses} use{c.uses === 1 ? '' : 's'} · {money(c.discount)} given away
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">No coupons redeemed yet.</p>
          )}
        </Card>

        <Card title="Abandoned carts">
          <p className="text-2xl font-bold text-ink-900">{data?.abandonedCarts.count ?? 0}</p>
          <p className="mt-1 text-sm text-ink-500">
            worth {money(data?.abandonedCarts.value ?? 0)} · inactive for more than 24 hours
          </p>
        </Card>

        <Card title="Top searches" className="lg:col-span-2">
          {data?.topSearches?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="pb-3">Query</th>
                  <th className="pb-3 text-right">Searches</th>
                  <th className="pb-3 text-right">No results</th>
                </tr>
              </thead>
              <tbody>
                {data.topSearches.map((s) => (
                  <tr key={s.query} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 text-ink-900">{s.query}</td>
                    <td className="py-2.5 text-right">{s.count}</td>
                    <td className={`py-2.5 text-right ${s.zeroResults > 0 ? 'font-semibold text-brand' : ''}`}>
                      {s.zeroResults}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink-500">
              No searches logged yet — storefront search does not write to <code>search_queries</code> yet.
            </p>
          )}
        </Card>

        <Card title="Daily sales" className="lg:col-span-2">
          {data?.salesByDay?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="pb-3">Day</th>
                  <th className="pb-3 text-right">Orders</th>
                  <th className="pb-3 text-right">Revenue</th>
                  <th className="pb-3 text-right">Discount</th>
                  <th className="pb-3 text-right">GST included</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByDay.map((d) => (
                  <tr key={d.day} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 text-ink-900">{dateOnly(d.day)}</td>
                    <td className="py-2.5 text-right">{d.orders}</td>
                    <td className="py-2.5 text-right font-semibold text-ink-900">{money(d.revenue)}</td>
                    <td className="py-2.5 text-right text-success">{money(d.discount)}</td>
                    <td className="py-2.5 text-right text-ink-500">{money(d.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink-500">No sales in this period.</p>
          )}
        </Card>
      </div>
    </>
  );
}

/* ------------------------------- Settings ------------------------------ */

export function Settings() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading } = useApi(() => adminApi.settings(), [reloadKey]);
  const { data: logs } = useApi(() => adminApi.auditLogs({ perPage: 25 }), [reloadKey]);

  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState({});

  const editable = can('setting.update');

  const saveSettings = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings(dirty);
      toast.success('Settings saved.');
      setDirty({});
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveShipping = async (id) => {
    try {
      await adminApi.updateShippingMethod(id, shipping[id]);
      toast.success('Delivery option updated.');
      setShipping((s) => ({ ...s, [id]: undefined }));
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <p className="text-sm text-ink-500">Loading settings…</p>;

  const groups = data?.settings ?? {};

  return (
    <>
      <PageHeader title="Settings" subtitle="Store configuration, delivery and integrations.">
        {editable && Object.keys(dirty).length > 0 && (
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving…' : `Save ${Object.keys(dirty).length} change(s)`}
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(groups).map(([group, items]) => (
          <Card key={group} title={group.replace(/_/g, ' ')} className="capitalize">
            <div className="space-y-5">
              {items.map((s) => {
                const key = `${s.group_name}.${s.key_name}`;
                const value = dirty[key] ?? s.value ?? '';
                return (
                  <Field key={s.id} label={s.key_name.replace(/_/g, ' ')} hint={s.description}>
                    {s.value_type === 'boolean' ? (
                      <Checkbox
                        label={String(value) === '1' || value === 'true' ? 'Enabled' : 'Disabled'}
                        checked={String(value) === '1' || value === 'true'}
                        disabled={!editable}
                        onChange={(e) => setDirty((d) => ({ ...d, [key]: e.target.checked ? '1' : '0' }))}
                      />
                    ) : (
                      <Input
                        value={value}
                        disabled={!editable}
                        type={s.value_type === 'number' ? 'number' : 'text'}
                        onChange={(e) => setDirty((d) => ({ ...d, [key]: e.target.value }))}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </Card>
        ))}

        <Card title="Delivery options" className="lg:col-span-2">
          <ul className="divide-y divide-ink-100">
            {(data?.shippingMethods ?? []).map((m) => {
              const pending = shipping[m.id];
              return (
                <li key={m.id} className="grid gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_140px_140px_120px_auto] sm:items-end">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{m.name}</p>
                    <p className="text-xs text-ink-500">{m.description}</p>
                  </div>

                  <Field label="Base rate" className="!mb-0">
                    <Input
                      type="number"
                      step="0.01"
                      disabled={!editable}
                      value={pending?.baseRate ?? m.base_rate}
                      onChange={(e) => setShipping((s) => ({ ...s, [m.id]: { ...s[m.id], baseRate: e.target.value } }))}
                    />
                  </Field>

                  <Field label="Free above" className="!mb-0">
                    <Input
                      type="number"
                      step="0.01"
                      disabled={!editable}
                      value={pending?.freeAboveAmount ?? m.free_above_amount ?? ''}
                      onChange={(e) => setShipping((s) => ({ ...s, [m.id]: { ...s[m.id], freeAboveAmount: e.target.value } }))}
                    />
                  </Field>

                  <div className="pb-2.5">
                    <Checkbox
                      label="COD"
                      disabled={!editable}
                      checked={pending?.isCodSupported ?? Boolean(m.is_cod_supported)}
                      onChange={(e) => setShipping((s) => ({ ...s, [m.id]: { ...s[m.id], isCodSupported: e.target.checked } }))}
                    />
                  </div>

                  {editable && (
                    <Button size="sm" tone="secondary" disabled={!pending} onClick={() => saveShipping(m.id)}>
                      Save
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Payment gateways">
          {data?.gateways?.length ? (
            <ul className="divide-y divide-ink-100">
              {data.gateways.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="text-ink-900">{g.name}</span>
                  <StatusPill value={g.is_active ? 'active' : 'inactive'} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">
              No gateways configured. Checkout records the chosen method but does not capture payment.
            </p>
          )}
        </Card>

        <Card title="Warehouses">
          <ul className="divide-y divide-ink-100">
            {(data?.warehouses ?? []).map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span>
                  <span className="block text-ink-900">{w.name}</span>
                  <span className="text-xs text-ink-500">{w.code}</span>
                </span>
                <StatusPill value={w.is_active ? 'active' : 'inactive'} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recent admin activity" className="mt-6">
        <DataTable
          rows={logs?.data}
          empty="No activity recorded yet."
          columns={[
            { key: 'created_at', label: 'When', render: (r) => dateTime(r.created_at) },
            { key: 'admin_name', label: 'Who', render: (r) => r.admin_name || 'System' },
            { key: 'action', label: 'Action', render: (r) => <span className="capitalize">{String(r.action).replace(/_/g, ' ')}</span> },
            {
              key: 'entity_type',
              label: 'On',
              render: (r) => (
                <span className="capitalize">
                  {String(r.entity_type).replace(/_/g, ' ')}
                  {r.entity_id ? ` #${r.entity_id}` : ''}
                </span>
              ),
            },
            { key: 'ip_address', label: 'IP', render: (r) => r.ip_address || '—' },
          ]}
        />
      </Card>
    </>
  );
}
