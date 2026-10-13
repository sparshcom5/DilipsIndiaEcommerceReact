/** Coupons, Content (banners / blog / FAQs / enquiries) and Notifications. */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil, Send } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Card, Checkbox, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select,
  StatusPill, Textarea, dateOnly, dateTime, money, useToast,
} from '../components/ui.jsx';

/* ------------------------------- Coupons ------------------------------- */

const EMPTY_COUPON = {
  code: '', name: '', description: '', discountType: 'percentage', discountValue: 10,
  maxDiscountAmount: '', minOrderAmount: 0, usageLimitTotal: '', usageLimitPerUser: 1,
  startsAt: '', expiresAt: '', isActive: true, isVisible: true,
};

export function Coupons() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const { data, loading } = useApi(() => adminApi.coupons({ q, status, perPage: 50 }), [q, status, reloadKey]);

  const patch = (updates) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (!v) next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace: true });
  };

  const toLocal = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_COUPON);
    setErrors({});
    setOpen(true);
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description ?? '',
      discountType: c.discount_type,
      discountValue: Number(c.discount_value),
      maxDiscountAmount: c.max_discount_amount ?? '',
      minOrderAmount: Number(c.min_order_amount),
      usageLimitTotal: c.usage_limit_total ?? '',
      usageLimitPerUser: c.usage_limit_per_user,
      startsAt: toLocal(c.starts_at),
      expiresAt: toLocal(c.expires_at),
      isActive: Boolean(c.is_active),
      isVisible: Boolean(c.is_visible),
    });
    setErrors({});
    setOpen(true);
  };

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount),
        usageLimitTotal: form.usageLimitTotal === '' ? null : Number(form.usageLimitTotal),
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || null,
      };
      if (editing) await adminApi.updateCoupon(editing.id, payload);
      else await adminApi.createCoupon(payload);
      toast.success(editing ? 'Coupon updated.' : 'Coupon created.');
      setOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}? Existing orders keep their record of it.`)) return;
    try {
      await adminApi.deleteCoupon(c.id);
      toast.success('Coupon deleted.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Code',
      render: (r) => (
        <div>
          <p className="font-bold text-ink-900">{r.code}</p>
          <p className="text-xs text-ink-500">{r.name}</p>
        </div>
      ),
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (r) =>
        r.discount_type === 'percentage'
          ? `${Number(r.discount_value)}%${r.max_discount_amount ? ` (max ${money(r.max_discount_amount)})` : ''}`
          : r.discount_type === 'fixed_amount'
            ? money(r.discount_value)
            : 'Free shipping',
    },
    { key: 'min_order_amount', label: 'Min order', align: 'right', render: (r) => money(r.min_order_amount) },
    {
      key: 'used_count',
      label: 'Used',
      align: 'right',
      render: (r) => `${r.used_count}${r.usage_limit_total ? ` / ${r.usage_limit_total}` : ''}`,
    },
    { key: 'discount_given', label: 'Given away', align: 'right', render: (r) => money(r.discount_given) },
    { key: 'expires_at', label: 'Expires', render: (r) => (r.expires_at ? dateOnly(r.expires_at) : 'Never') },
    { key: 'is_active', label: 'Status', render: (r) => <StatusPill value={r.is_active ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {can('coupon.update') && (
            <button type="button" aria-label={`Edit ${r.code}`} onClick={() => startEdit(r)} className="text-ink-500 hover:text-brand">
              <Pencil size={15} />
            </button>
          )}
          {can('coupon.delete') && (
            <button type="button" aria-label={`Delete ${r.code}`} onClick={() => remove(r)} className="text-ink-500 hover:text-brand">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes shoppers can apply at checkout.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Code or name…" />
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-40">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </Select>
        {can('coupon.create') && (
          <Button onClick={startCreate}>
            <Plus size={16} /> New coupon
          </Button>
        )}
      </PageHeader>

      <DataTable columns={columns} rows={data?.data} loading={loading} empty="No coupons yet." />

      <Modal
        open={open}
        title={editing ? `Edit ${editing.code}` : 'New coupon'}
        onClose={() => setOpen(false)}
        width="max-w-[720px]"
        footer={
          <>
            <Button tone="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="coupon-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
            </Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Code" required error={errors.code}>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                error={errors.code}
                disabled={Boolean(editing)}
                placeholder="DILIP10"
              />
            </Field>
            <Field label="Name" required error={errors.name}>
              <Input value={form.name} onChange={set('name')} error={errors.name} placeholder="Flat 10% off" />
            </Field>

            <Field label="Discount type" required error={errors.discountType}>
              <Select value={form.discountType} onChange={set('discountType')} disabled={Boolean(editing)}>
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
              </Select>
            </Field>
            <Field
              label={form.discountType === 'percentage' ? 'Percentage off' : 'Amount off'}
              error={errors.discountValue}
            >
              <Input
                type="number"
                step="0.01"
                value={form.discountValue}
                onChange={set('discountValue')}
                error={errors.discountValue}
                disabled={form.discountType === 'free_shipping'}
              />
            </Field>

            <Field label="Maximum discount" hint="Caps a percentage coupon. Blank = uncapped.">
              <Input type="number" step="0.01" value={form.maxDiscountAmount} onChange={set('maxDiscountAmount')} />
            </Field>
            <Field label="Minimum order value">
              <Input type="number" step="0.01" value={form.minOrderAmount} onChange={set('minOrderAmount')} />
            </Field>

            <Field label="Total usage limit" hint="Blank = unlimited.">
              <Input type="number" value={form.usageLimitTotal} onChange={set('usageLimitTotal')} />
            </Field>
            <Field label="Per-customer limit">
              <Input type="number" value={form.usageLimitPerUser} onChange={set('usageLimitPerUser')} />
            </Field>

            <Field label="Starts" error={errors.startsAt}>
              <Input type="date" value={form.startsAt} onChange={set('startsAt')} />
            </Field>
            <Field label="Expires" error={errors.expiresAt} hint="Blank = never expires.">
              <Input type="date" value={form.expiresAt} onChange={set('expiresAt')} error={errors.expiresAt} />
            </Field>
          </div>

          <Field label="Description" hint="Shown on the Coupons page.">
            <Textarea rows={2} value={form.description} onChange={set('description')} />
          </Field>

          <div className="space-y-3">
            <Checkbox label="Active" checked={form.isActive} onChange={set('isActive')} />
            <Checkbox label="List publicly on the Coupons page" checked={form.isVisible} onChange={set('isVisible')} />
          </div>

          <p className="rounded-input bg-accent/20 px-4 py-3 text-xs text-ink-700">
            Per-customer limits cannot be enforced yet — guest checkout has no customer to count against.
          </p>
        </form>
      </Modal>
    </>
  );
}

/* ------------------------------- Content ------------------------------- */

const TABS = [
  { key: 'blog', label: 'Blog' },
  { key: 'banners', label: 'Banners' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'subscribers', label: 'Subscribers' },
];

export function Content() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'blog';
  const [reloadKey, setReloadKey] = useState(0);

  const [postOpen, setPostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [postForm, setPostForm] = useState({ title: '', excerpt: '', content: '', status: 'draft' });
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({ category: 'General', question: '', answer: '', sortOrder: 0 });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const posts = useApi(() => (tab === 'blog' ? adminApi.blogPosts({ perPage: 50 }) : Promise.resolve(null)), [tab, reloadKey]);
  const banners = useApi(() => (tab === 'banners' ? adminApi.banners() : Promise.resolve(null)), [tab, reloadKey]);
  const faqs = useApi(() => (tab === 'faqs' ? adminApi.faqs() : Promise.resolve(null)), [tab, reloadKey]);
  const enquiries = useApi(() => (tab === 'enquiries' ? adminApi.enquiries({ perPage: 50 }) : Promise.resolve(null)), [tab, reloadKey]);
  const subs = useApi(() => (tab === 'subscribers' ? adminApi.subscribers({ perPage: 100 }) : Promise.resolve(null)), [tab, reloadKey]);

  const savePost = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      if (editingPost) await adminApi.updateBlogPost(editingPost.id, postForm);
      else await adminApi.createBlogPost(postForm);
      toast.success(editingPost ? 'Post updated.' : 'Post created.');
      setPostOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveFaq = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await adminApi.createFaq(faqForm);
      toast.success('FAQ added.');
      setFaqOpen(false);
      setFaqForm({ category: 'General', question: '', answer: '', sortOrder: 0 });
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Content" subtitle="Everything editorial on the storefront.">
        {can('cms.update') && tab === 'blog' && (
          <Button
            onClick={() => {
              setEditingPost(null);
              setPostForm({ title: '', excerpt: '', content: '', status: 'draft' });
              setPostOpen(true);
            }}
          >
            <Plus size={16} /> New post
          </Button>
        )}
        {can('cms.update') && tab === 'faqs' && (
          <Button onClick={() => setFaqOpen(true)}>
            <Plus size={16} /> New FAQ
          </Button>
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'blog' && (
        <DataTable
          loading={posts.loading}
          rows={posts.data?.data}
          empty="No posts yet."
          columns={[
            { key: 'title', label: 'Title', render: (r) => <span className="font-semibold text-ink-900">{r.title}</span> },
            { key: 'category_name', label: 'Category', render: (r) => r.category_name || '—' },
            { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'view_count', label: 'Views', align: 'right' },
            { key: 'published_at', label: 'Published', render: (r) => dateOnly(r.published_at) },
            {
              key: 'actions',
              label: '',
              align: 'right',
              render: (r) =>
                can('cms.update') ? (
                  <button
                    type="button"
                    aria-label={`Edit ${r.title}`}
                    onClick={() => {
                      setEditingPost(r);
                      setPostForm({
                        title: r.title,
                        excerpt: r.excerpt ?? '',
                        content: r.content ?? '',
                        status: r.status,
                      });
                      setPostOpen(true);
                    }}
                    className="text-ink-500 hover:text-brand"
                  >
                    <Pencil size={15} />
                  </button>
                ) : null,
            },
          ]}
        />
      )}

      {tab === 'banners' && (
        <DataTable
          loading={banners.loading}
          rows={banners.data?.data}
          empty="No banners configured."
          columns={[
            { key: 'title', label: 'Title', render: (r) => <span className="font-semibold text-ink-900">{r.title || '—'}</span> },
            { key: 'placement', label: 'Placement', render: (r) => <span className="capitalize">{String(r.placement).replace(/_/g, ' ')}</span> },
            { key: 'link_value', label: 'Links to', render: (r) => r.link_value || '—' },
            { key: 'is_active', label: 'Status', render: (r) => <StatusPill value={r.is_active ? 'active' : 'inactive'} /> },
          ]}
        />
      )}

      {tab === 'faqs' && (
        <DataTable
          loading={faqs.loading}
          rows={faqs.data?.data}
          empty="No FAQs yet."
          columns={[
            { key: 'category', label: 'Tab' },
            { key: 'question', label: 'Question', render: (r) => <span className="font-medium text-ink-900">{r.question}</span> },
            { key: 'answer', label: 'Answer', render: (r) => <span className="line-clamp-2 max-w-[380px] text-xs text-ink-500">{r.answer}</span> },
            { key: 'is_active', label: 'Status', render: (r) => <StatusPill value={r.is_active ? 'active' : 'inactive'} /> },
            {
              key: 'actions',
              label: '',
              align: 'right',
              render: (r) =>
                can('cms.update') ? (
                  <button
                    type="button"
                    aria-label="Delete FAQ"
                    onClick={async () => {
                      if (!window.confirm('Delete this FAQ?')) return;
                      await adminApi.deleteFaq(r.id);
                      toast.success('FAQ deleted.');
                      setReloadKey((k) => k + 1);
                    }}
                    className="text-ink-500 hover:text-brand"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null,
            },
          ]}
        />
      )}

      {tab === 'enquiries' && (
        <DataTable
          loading={enquiries.loading}
          rows={enquiries.data?.data}
          empty="No enquiries received."
          columns={[
            {
              key: 'name',
              label: 'From',
              render: (r) => (
                <div>
                  <p className="font-semibold text-ink-900">{r.name}</p>
                  <p className="text-xs text-ink-500">{r.email}{r.phone && ` · ${r.phone}`}</p>
                </div>
              ),
            },
            { key: 'message', label: 'Message', render: (r) => <span className="line-clamp-2 max-w-[420px] text-xs text-ink-600">{r.message}</span> },
            { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
            { key: 'created_at', label: 'Received', render: (r) => dateTime(r.created_at) },
            {
              key: 'actions',
              label: '',
              align: 'right',
              render: (r) =>
                can('cms.update') && r.status === 'new' ? (
                  <Button
                    size="sm"
                    tone="secondary"
                    onClick={async () => {
                      await adminApi.updateEnquiry(r.id, { status: 'resolved' });
                      toast.success('Marked resolved.');
                      setReloadKey((k) => k + 1);
                    }}
                  >
                    Resolve
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      {tab === 'subscribers' && (
        <DataTable
          loading={subs.loading}
          rows={subs.data?.data}
          empty="No newsletter subscribers."
          columns={[
            { key: 'email', label: 'Email', render: (r) => <span className="font-medium text-ink-900">{r.email}</span> },
            { key: 'is_subscribed', label: 'Status', render: (r) => <StatusPill value={r.is_subscribed ? 'active' : 'inactive'} /> },
            { key: 'subscribed_at', label: 'Subscribed', render: (r) => dateTime(r.subscribed_at) },
          ]}
        />
      )}

      <Modal
        open={postOpen}
        title={editingPost ? `Edit ${editingPost.title}` : 'New blog post'}
        onClose={() => setPostOpen(false)}
        width="max-w-[760px]"
        footer={
          <>
            <Button tone="secondary" onClick={() => setPostOpen(false)}>Cancel</Button>
            <Button form="post-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save post'}
            </Button>
          </>
        }
      >
        <form id="post-form" onSubmit={savePost} className="space-y-5">
          <Field label="Title" required error={errors.title}>
            <Input value={postForm.title} onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} error={errors.title} />
          </Field>
          <Field label="Excerpt" hint="Shown on the blog index card.">
            <Textarea rows={2} value={postForm.excerpt} onChange={(e) => setPostForm((f) => ({ ...f, excerpt: e.target.value }))} />
          </Field>
          <Field label="Content" hint="HTML is allowed.">
            <Textarea rows={10} value={postForm.content} onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={postForm.status} onChange={(e) => setPostForm((f) => ({ ...f, status: e.target.value }))}>
              {['draft', 'published', 'archived'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={faqOpen}
        title="New FAQ"
        onClose={() => setFaqOpen(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setFaqOpen(false)}>Cancel</Button>
            <Button form="faq-form" type="submit" disabled={saving}>Save FAQ</Button>
          </>
        }
      >
        <form id="faq-form" onSubmit={saveFaq} className="space-y-5">
          <Field label="Tab" hint="Groups the question on the category pages.">
            <Select value={faqForm.category} onChange={(e) => setFaqForm((f) => ({ ...f, category: e.target.value }))}>
              {['General', 'Products', 'Installation', 'Warranty'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Question" required error={errors.question}>
            <Input value={faqForm.question} onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))} error={errors.question} />
          </Field>
          <Field label="Answer" required error={errors.answer}>
            <Textarea rows={4} value={faqForm.answer} onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))} error={errors.answer} />
          </Field>
        </form>
      </Modal>
    </>
  );
}

/* ---------------------------- Notifications ---------------------------- */

export function Notifications() {
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ channel: 'email', recipient: '', subject: '', body: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const { data, loading } = useApi(() => adminApi.notificationLogs({ perPage: 30 }), [reloadKey]);
  const { data: templates } = useApi(() => adminApi.notificationTemplates(), []);

  const send = async (e) => {
    e.preventDefault();
    setErrors({});
    setSending(true);
    try {
      const res = await adminApi.sendNotification(form);
      toast.success(res.message);
      setForm({ channel: 'email', recipient: '', subject: '', body: '' });
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="Transactional and campaign messages." />

      <p className="mb-6 rounded-card bg-accent/20 px-5 py-3.5 text-sm text-ink-700">
        No email, SMS or push provider is configured. Messages are queued into the log below and
        <strong> not actually delivered</strong>.
      </p>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="Send a message">
          <form onSubmit={send} className="space-y-5">
            <Field label="Channel" required error={errors.channel}>
              <Select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                {['email', 'sms', 'push', 'whatsapp'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Recipient" hint="Leave blank to queue as a broadcast.">
              <Input value={form.recipient} onChange={(e) => setForm((f) => ({ ...f, recipient: e.target.value }))} />
            </Field>
            <Field label="Subject" required error={errors.subject}>
              <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} error={errors.subject} />
            </Field>
            <Field label="Message" required error={errors.body}>
              <Textarea rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} error={errors.body} />
            </Field>
            <Button type="submit" className="w-full" disabled={sending}>
              <Send size={15} /> {sending ? 'Queueing…' : 'Queue message'}
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <DataTable
            loading={loading}
            rows={data?.data}
            empty="Nothing queued yet."
            columns={[
              { key: 'channel', label: 'Channel', render: (r) => <span className="uppercase">{r.channel}</span> },
              { key: 'recipient', label: 'To' },
              { key: 'subject', label: 'Subject', render: (r) => <span className="font-medium text-ink-900">{r.subject}</span> },
              { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
              { key: 'created_at', label: 'Queued', render: (r) => dateTime(r.created_at) },
            ]}
          />

          {templates?.data?.length > 0 && (
            <Card title="Templates">
              <ul className="divide-y divide-ink-100">
                {templates.data.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink-900">{t.event_key}</span>
                    <span className="text-xs uppercase text-ink-500">{t.channel}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
