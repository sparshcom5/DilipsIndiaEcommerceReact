import { Link } from 'react-router-dom';
import { ShoppingBag, IndianRupee, Users, Package, AlertTriangle, ArrowRight } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { Card, PageHeader, StatusPill, money, dateTime } from '../components/ui.jsx';

function Kpi({ Icon, label, value, sub }) {
  return (
    <div className="rounded-card bg-white p-6 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-500">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-card bg-brand/10 text-brand">
          <Icon size={17} aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

function QueueLink({ label, count, to }) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-input px-4 py-3 text-sm transition-colors ${
        count > 0 ? 'bg-brand/5 text-ink-900 hover:bg-brand/10' : 'text-ink-500 hover:bg-ink-50'
      }`}
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <span className={`font-bold ${count > 0 ? 'text-brand' : 'text-ink-400'}`}>{count}</span>
        <ArrowRight size={14} className="text-ink-400" aria-hidden />
      </span>
    </Link>
  );
}

/** Inline bar chart — avoids pulling a charting library for one sparkline. */
function SalesBars({ data }) {
  if (!data?.length) return <p className="text-sm text-ink-500">No sales in the last 14 days.</p>;
  const max = Math.max(...data.map((d) => d.revenue), 1);

  // Cap the bar width so a single day of data renders as one bar rather than
  // stretching across the whole card.
  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.day} className="group relative flex max-w-[64px] flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-sm bg-brand/70 transition-colors group-hover:bg-brand"
            style={{ height: `${Math.max(4, (d.revenue / max) * 130)}px` }}
          />
          <span className="text-[10px] text-ink-400">
            {new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric' })}
          </span>
          <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-[11px] text-white group-hover:block">
            {money(d.revenue)} · {d.orders} orders
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useApi(() => adminApi.dashboard(), []);

  if (loading) return <p className="text-sm text-ink-500">Loading dashboard…</p>;
  if (!data) return <p className="text-sm text-ink-500">Dashboard unavailable.</p>;

  const k = data.kpis;
  const q = data.actionQueue;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Everything that needs attention, at a glance." />

      {/*
        The API omits sections the signed-in role may not see, so each block is
        rendered only when its data actually arrived.
      */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {k.revenueTotal !== undefined && (
          <Kpi Icon={IndianRupee} label="Revenue" value={money(k.revenueTotal)} sub={`${money(k.revenueLast30)} in the last 30 days`} />
        )}
        {k.ordersTotal !== undefined && (
          <Kpi Icon={ShoppingBag} label="Orders" value={k.ordersTotal} sub={`${k.ordersToday} today · ${k.ordersLast30} in 30 days`} />
        )}
        {k.productsTotal !== undefined && (
          <Kpi Icon={Package} label="Products" value={k.productsTotal} sub={`${k.productsActive} active · ${k.productsDraft} draft`} />
        )}
        {k.customers !== undefined && <Kpi Icon={Users} label="Customers" value={k.customers} sub="Registered accounts" />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {data.salesByDay.length > 0 && (
          <Card title="Revenue — last 14 days">
            <SalesBars data={data.salesByDay} />
          </Card>
        )}

        {Object.keys(q).length > 0 && (
          <Card title="Needs attention">
            <div className="space-y-1">
              {q.pendingOrders !== undefined && (
                <QueueLink label="Orders awaiting confirmation" count={q.pendingOrders} to="/admin/orders?status=pending" />
              )}
              {q.pendingReturns !== undefined && (
                <QueueLink label="Return requests" count={q.pendingReturns} to="/admin/returns?status=requested" />
              )}
              {q.pendingReviews !== undefined && (
                <QueueLink label="Reviews to moderate" count={q.pendingReviews} to="/admin/reviews?status=pending" />
              )}
              {q.newEnquiries !== undefined && (
                <QueueLink label="New enquiries" count={q.newEnquiries} to="/admin/content?tab=enquiries" />
              )}
            </div>
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data.recentOrders.length > 0 && (
        <Card title="Recent orders" action={<Link to="/admin/orders" className="text-xs font-semibold text-brand">View all</Link>}>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-ink-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.recentOrders.map((o) => (
                <li key={o.orderNumber} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link to="/admin/orders" className="text-sm font-semibold text-ink-900 hover:text-brand">
                      {o.orderNumber}
                    </Link>
                    <p className="truncate text-xs text-ink-500">
                      {o.customer || 'Guest'} · {dateTime(o.placedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill value={o.status} />
                    <span className="text-sm font-semibold text-ink-900">{money(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}

        {/* Only meaningful while the server is tracking stock. */}
        {data.lowStock && (
        <Card
          title="Low stock"
          action={<Link to="/admin/inventory?lowStock=true" className="text-xs font-semibold text-brand">Manage</Link>}
        >
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-ink-500">Nothing is below its threshold.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.lowStock.map((s) => (
                <li key={s.sku} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{s.name}</p>
                    <p className="text-xs text-ink-500">{s.sku}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand">
                    <AlertTriangle size={14} aria-hidden />
                    {s.available} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}
      </div>

      {data.topSellers.length > 0 && (
        <Card title="Best sellers" className="mt-6">
          <ul className="divide-y divide-ink-100">
            {data.topSellers.map((p) => (
              <li key={p.slug} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                <p className="shrink-0 text-sm text-ink-600">
                  <span className="font-semibold text-ink-900">{p.units}</span> units · {money(p.revenue)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
