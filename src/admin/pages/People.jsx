/** Customers, Reviews and Admin Users — all people-shaped list + modal screens. */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Star, Trash2, Pencil } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Card, Checkbox, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select,
  StatusPill, Textarea, dateTime, money, useToast,
} from '../components/ui.jsx';

/* ------------------------------ Customers ------------------------------ */

export function Customers() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [detailId, setDetailId] = useState(null);

  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 1);

  const { data, loading } = useApi(
    () => adminApi.customers({ q, status, page, perPage: 25 }),
    [q, status, page, reloadKey]
  );
  const { data: detail } = useApi(
    () => (detailId ? adminApi.customer(detailId) : Promise.resolve(null)),
    [detailId, reloadKey]
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

  const setStatus = async (id, next) => {
    try {
      await adminApi.updateCustomer(id, { status: next });
      toast.success(`Customer ${next}.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.name}</p>
          <p className="text-xs text-ink-500">{r.email || r.phone || '—'}</p>
        </div>
      ),
    },
    { key: 'orderCount', label: 'Orders', align: 'right' },
    { key: 'lifetimeValue', label: 'Lifetime value', align: 'right', render: (r) => money(r.lifetimeValue) },
    { key: 'walletBalance', label: 'Wallet', align: 'right', render: (r) => (r.walletBalance == null ? '—' : money(r.walletBalance)) },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'createdAt', label: 'Joined', render: (r) => dateTime(r.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Customers" subtitle="Registered storefront accounts.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Name, email or phone…" />
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-40">
          <option value="">All statuses</option>
          {['active', 'inactive', 'blocked'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </PageHeader>

      <p className="mb-5 rounded-card bg-accent/20 px-5 py-3.5 text-sm text-ink-700">
        Checkout currently runs as guest — customer sign-up is not built yet, so this list stays empty
        until customer authentication ships.
      </p>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No customer accounts yet."
        onRowClick={(r) => setDetailId(r.id)}
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />

      <Modal
        open={Boolean(detailId)}
        title={detail ? [detail.first_name, detail.last_name].filter(Boolean).join(' ') || 'Customer' : 'Customer'}
        onClose={() => setDetailId(null)}
        width="max-w-[720px]"
      >
        {!detail ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-ink-500">Email</dt><dd className="text-ink-900">{detail.email || '—'}</dd></div>
              <div><dt className="text-ink-500">Phone</dt><dd className="text-ink-900">{detail.phone || '—'}</dd></div>
              <div><dt className="text-ink-500">Status</dt><dd><StatusPill value={detail.status} /></dd></div>
              <div><dt className="text-ink-500">Wallet</dt><dd className="text-ink-900">{detail.wallet ? money(detail.wallet.balance) : '—'}</dd></div>
            </dl>

            {detail.orders.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-bold text-ink-900">Recent orders</h3>
                <ul className="divide-y divide-ink-100">
                  {detail.orders.map((o) => (
                    <li key={o.order_number} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="text-ink-900">{o.order_number}</span>
                      <span className="flex items-center gap-3">
                        <StatusPill value={o.status} />
                        <span className="font-semibold">{money(o.total)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {can('customer.update') && (
              <div className="flex gap-3 border-t border-ink-200 pt-5">
                {detail.status !== 'blocked' ? (
                  <Button tone="danger" onClick={() => setStatus(detail.id, 'blocked')}>Block customer</Button>
                ) : (
                  <Button onClick={() => setStatus(detail.id, 'active')}>Unblock customer</Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------- Reviews ------------------------------- */

export function Reviews() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [replyFor, setReplyFor] = useState(null);
  const [reply, setReply] = useState('');

  const status = params.get('status') || '';
  const page = Number(params.get('page') || 1);
  const { data, loading } = useApi(
    () => adminApi.reviews({ status, page, perPage: 20 }),
    [status, page, reloadKey]
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

  const moderate = async (id, next) => {
    try {
      await adminApi.updateReview(id, { status: next });
      toast.success(`Review ${next}. Product rating recalculated.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sendReply = async () => {
    try {
      await adminApi.updateReview(replyFor.id, { adminReply: reply });
      toast.success('Reply saved.');
      setReplyFor(null);
      setReply('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'product_name',
      label: 'Product',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.product_name}</p>
          <p className="text-xs text-ink-500">{r.customer_name || 'Anonymous'}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (r) => (
        <span className="flex items-center gap-1 text-ink-900">
          {r.rating} <Star size={13} className="fill-brand text-brand" aria-hidden />
        </span>
      ),
    },
    {
      key: 'comment',
      label: 'Review',
      render: (r) => (
        <div className="max-w-[340px]">
          {r.title && <p className="font-medium text-ink-900">{r.title}</p>}
          <p className="truncate text-xs text-ink-500">{r.comment}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'created_at', label: 'Posted', render: (r) => dateTime(r.created_at) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) =>
        can('review.approve') ? (
          <div className="flex justify-end gap-2">
            {r.status !== 'approved' && (
              <Button size="sm" onClick={() => moderate(r.id, 'approved')}>Approve</Button>
            )}
            {r.status !== 'rejected' && (
              <Button size="sm" tone="secondary" onClick={() => moderate(r.id, 'rejected')}>Reject</Button>
            )}
            <Button
              size="sm"
              tone="ghost"
              onClick={() => {
                setReplyFor(r);
                setReply(r.admin_reply || '');
              }}
            >
              Reply
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="Reviews" subtitle="Moderation queue. Approving recalculates the product rating.">
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-44">
          <option value="">All statuses</option>
          {['pending', 'approved', 'rejected'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No reviews submitted yet."
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />

      <Modal
        open={Boolean(replyFor)}
        title="Reply to review"
        onClose={() => setReplyFor(null)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setReplyFor(null)}>Cancel</Button>
            <Button onClick={sendReply}>Save reply</Button>
          </>
        }
      >
        {replyFor && (
          <div className="space-y-5">
            <div className="rounded-input bg-ink-50 px-4 py-3">
              <p className="text-sm font-medium text-ink-900">{replyFor.title}</p>
              <p className="mt-1 text-sm text-ink-600">{replyFor.comment}</p>
            </div>
            <Field label="Your reply" hint="Shown publicly beneath the review.">
              <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ----------------------------- Admin users ----------------------------- */

const EMPTY_USER = { fullName: '', email: '', phone: '', password: '', roleIds: [], isSuperAdmin: false };

export function AdminUsers() {
  const { can, user: me } = useAdminAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_USER);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading } = useApi(() => adminApi.users({ perPage: 50 }), [reloadKey]);
  const { data: rolesData } = useApi(() => adminApi.roles(), []);

  const roles = rolesData?.roles ?? [];
  const permissions = rolesData?.permissions ?? [];

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_USER);
    setErrors({});
    setOpen(true);
  };

  const startEdit = (u) => {
    setEditing(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone ?? '',
      password: '',
      roleIds: roles.filter((r) => u.roles.includes(r.name)).map((r) => r.id),
      isSuperAdmin: u.isSuperAdmin,
      status: u.status,
    });
    setErrors({});
    setOpen(true);
  };

  const toggleRole = (id) =>
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((x) => x !== id) : [...f.roleIds, id],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await adminApi.updateUser(editing.id, payload);
      else await adminApi.createUser(payload);
      toast.success(editing ? 'Admin updated.' : 'Admin created.');
      setOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove ${u.fullName}? Their sessions end immediately.`)) return;
    try {
      await adminApi.deleteUser(u.id);
      toast.success('Admin removed.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'fullName',
      label: 'Name',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">
            {r.fullName}
            {r.id === me?.id && <span className="ml-2 text-xs font-normal text-ink-400">(you)</span>}
          </p>
          <p className="text-xs text-ink-500">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (r) => (r.isSuperAdmin ? <StatusPill value="super admin" tone="red" /> : r.roles.join(', ') || '—'),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'lastLoginAt', label: 'Last login', render: (r) => dateTime(r.lastLoginAt) },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {can('user.update') && (
            <button type="button" aria-label={`Edit ${r.fullName}`} onClick={() => startEdit(r)} className="text-ink-500 hover:text-brand">
              <Pencil size={15} />
            </button>
          )}
          {can('user.delete') && r.id !== me?.id && (
            <button type="button" aria-label={`Remove ${r.fullName}`} onClick={() => remove(r)} className="text-ink-500 hover:text-brand">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const permsByModule = permissions.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Admin Users" subtitle="Who can sign in to this console, and what they may do.">
        {can('user.create') && (
          <Button onClick={startCreate}>
            <Plus size={16} /> New admin
          </Button>
        )}
      </PageHeader>

      <DataTable columns={columns} rows={data?.data} loading={loading} empty="No admin users." />

      <Card title="Roles & permissions" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="pb-3">Permission</th>
                {roles.map((r) => (
                  <th key={r.id} className="pb-3 text-center">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(permsByModule).map(([module, perms]) => (
                <tr key={module} className="border-b border-ink-100 last:border-0">
                  <td className="py-2.5">
                    <span className="font-medium capitalize text-ink-900">{module}</span>
                    <span className="ml-2 text-xs text-ink-400">{perms.map((p) => p.action).join(', ')}</span>
                  </td>
                  {roles.map((r) => {
                    const held = perms.filter((p) => r.permissionIds.includes(p.id)).length;
                    return (
                      <td key={r.id} className="py-2.5 text-center">
                        <span className={held === perms.length ? 'text-success' : held > 0 ? 'text-accent' : 'text-ink-300'}>
                          {held === perms.length ? '●' : held > 0 ? '◐' : '○'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-500">● full access · ◐ partial · ○ none</p>
      </Card>

      <Modal
        open={open}
        title={editing ? `Edit ${editing.fullName}` : 'New admin user'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="user-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create admin'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={errors.fullName}>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} error={errors.fullName} />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                error={errors.email}
                disabled={Boolean(editing)}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field
              label={editing ? 'New password' : 'Password'}
              required={!editing}
              error={errors.password}
              hint={editing ? 'Leave blank to keep the current one. Changing it signs them out everywhere.' : 'At least 10 characters.'}
            >
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                error={errors.password}
                autoComplete="new-password"
              />
            </Field>
          </div>

          {editing && (
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {['active', 'inactive', 'suspended'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Roles" required error={errors.roleIds}>
            <div className="space-y-2.5 rounded-input border border-ink-200 p-4">
              {roles.map((r) => (
                <Checkbox
                  key={r.id}
                  label={`${r.name} — ${r.permissionIds.length} permissions`}
                  checked={form.roleIds.includes(r.id)}
                  onChange={() => toggleRole(r.id)}
                />
              ))}
            </div>
          </Field>

          {me?.isSuperAdmin && (
            <Checkbox
              label="Super admin (bypasses all permission checks)"
              checked={form.isSuperAdmin}
              onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
            />
          )}
        </form>
      </Modal>
    </>
  );
}
