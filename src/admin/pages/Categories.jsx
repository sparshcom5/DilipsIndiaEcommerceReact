import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { categoryOptionLabel } from '../lib/categoryTree.js';
import BannerSlot from '../components/BannerSlot.jsx';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Card, Checkbox, Field, Input, Modal, PageHeader, Select, StatusPill, Textarea, useToast,
} from '../components/ui.jsx';

const EMPTY = {
  name: '', slug: '', parentId: '', description: '', sortOrder: 0, isActive: true, showInMenu: true,
  bannerUrl: '', mobileBannerUrl: '', mobileHomeBannerUrl: '',
};

/**
 * Artwork a top-level category carries. Sub-categories inherit their parent's,
 * so these are hidden once a parent is chosen.
 */
const BANNER_SLOTS = [
  {
    key: 'bannerUrl',
    slot: 'banner',
    column: 'banner_url',
    label: 'Banner image',
    aspect: 'aspect-[21/9]',
    hint: 'Category page hero on desktop. Upload 2400 × 800. Keep the subject centred — the sides are cropped on narrow screens.',
  },
  {
    key: 'mobileBannerUrl',
    slot: 'mobileBanner',
    column: 'mobile_banner_url',
    label: 'Mobile banner image',
    aspect: 'aspect-[4/3]',
    hint: 'Same hero on phones. Upload 1080 × 810. Falls back to the desktop banner if left empty.',
  },
  {
    key: 'mobileHomeBannerUrl',
    slot: 'mobileHomeBanner',
    column: 'mobile_home_banner_url',
    label: 'Mobile home banner image',
    aspect: 'aspect-[16/9]',
    hint: 'The category tile on the phone home page. Upload 1080 × 608.',
  },
];

export default function Categories() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading } = useApi(() => adminApi.categories(), [reloadKey]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const rows = data?.data ?? [];

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      parentId: c.parent_id ?? '',
      description: c.description ?? '',
      sortOrder: c.sort_order,
      isActive: Boolean(c.is_active),
      showInMenu: Boolean(c.show_in_menu),
      bannerUrl: c.banner_url ?? '',
      mobileBannerUrl: c.mobile_banner_url ?? '',
      mobileHomeBannerUrl: c.mobile_home_banner_url ?? '',
    });
    setErrors({});
    setOpen(true);
  };

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  // When editing, the parent is fixed and comes from the row; when creating it
  // is whatever the picker currently says.
  const parentId = editing ? editing.parent_id : form.parentId;
  const isTopLevel = !parentId;
  const parentName = rows.find((c) => c.id === Number(parentId))?.name;

  /**
   * Clearing a saved banner deletes the stored file too, so the uploads folder
   * does not accumulate orphans. On an unsaved category there is no row yet —
   * dropping the URL from the form is all that is needed.
   */
  const clearBanner = async (s) => {
    if (editing && editing[s.column]) {
      try {
        await adminApi.deleteCategoryBanner(editing.id, s.slot);
      } catch (err) {
        toast.error(err.message);
        return;
      }
    }
    setForm((f) => ({ ...f, [s.key]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, parentId: form.parentId || null };
      if (editing) await adminApi.updateCategory(editing.id, payload);
      else await adminApi.createCategory(payload);
      toast.success(editing ? 'Category updated.' : 'Category created.');
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
    if (!window.confirm(`Delete "${c.name}"? Products stay, but the category is removed from navigation.`)) return;
    try {
      await adminApi.deleteCategory(c.id);
      toast.success('Category deleted.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="The navigation tree behind the storefront.">
        {can('category.create') && (
          <Button onClick={startCreate}>
            <Plus size={16} /> New category
          </Button>
        )}
      </PageHeader>

      <Card>
        {loading ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-500">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                {/* Rows arrive depth-first, so indentation alone reads as the
                    tree. Deeper levels step down in weight and size, matching
                    the storefront's cascading menu. */}
                <div className="flex min-w-0 items-baseline" style={{ paddingLeft: (c.depth ?? 0) * 24 }}>
                  {(c.depth ?? 0) > 0 && (
                    <span aria-hidden className="mr-2 select-none text-ink-300">
                      └
                    </span>
                  )}
                  <div className="min-w-0">
                    <p
                      className={
                        c.depth === 0
                          ? 'text-sm font-semibold text-ink-900'
                          : c.depth === 1
                            ? 'text-[13px] font-medium text-ink-800'
                            : 'text-xs font-medium text-ink-700'
                      }
                    >
                      {c.name}
                      <span className="ml-2 text-xs font-normal text-ink-400">/{c.slug}</span>
                      {c.orphaned && (
                        <span className="ml-2 rounded-sm bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                          parent deleted
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      {c.product_count} product{Number(c.product_count) === 1 ? '' : 's'}
                      {c.hasChildren && ' · has sub-categories'}
                      {!c.show_in_menu && ' · hidden from menu'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill value={c.is_active ? 'active' : 'inactive'} />
                  {can('category.update') && (
                    <button type="button" aria-label={`Edit ${c.name}`} onClick={() => startEdit(c)} className="text-ink-500 hover:text-brand">
                      <Pencil size={15} />
                    </button>
                  )}
                  {can('category.delete') && (
                    <button type="button" aria-label={`Delete ${c.name}`} onClick={() => remove(c)} className="text-ink-500 hover:text-brand">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        title={editing ? `Edit ${editing.name}` : 'New category'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button tone="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="cat-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="cat-form" onSubmit={submit} className="space-y-5">
          <Field label="Name" required error={errors.name}>
            <Input value={form.name} onChange={set('name')} error={errors.name} />
          </Field>

          <Field label="Slug" error={errors.slug} hint="Leave blank to derive it from the name.">
            <Input value={form.slug} onChange={set('slug')} error={errors.slug} />
          </Field>

          {!editing && (
            <Field label="Parent category" error={errors.parentId} hint="Leave blank for a top-level category.">
              <Select value={form.parentId} onChange={set('parentId')}>
                <option value="">— top level —</option>
                {rows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryOptionLabel(c)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={set('description')} />
          </Field>

          <Field label="Sort order" hint="Lower numbers appear first.">
            <Input type="number" value={form.sortOrder} onChange={set('sortOrder')} />
          </Field>

          <div className="space-y-3">
            <Checkbox label="Active" checked={form.isActive} onChange={set('isActive')} />
            <Checkbox label="Show in site navigation" checked={form.showInMenu} onChange={set('showInMenu')} />
          </div>

          {/* Artwork belongs to top-level categories; a sub-category shows its
              parent's, so offering these would only create dead images. */}
          {isTopLevel ? (
            <div className="border-t border-ink-200 pt-6">
              <h3 className="mb-1 text-sm font-bold text-ink-900">Banner artwork</h3>
              <p className="mb-4 text-xs text-ink-500">
                Images are saved with the category, so you can add them now. JPG, PNG, WebP, AVIF or
                GIF, under 5&nbsp;MB. Don&apos;t put text in the image — headings are drawn over it.
              </p>

              <div className="grid gap-5 sm:grid-cols-3">
                {BANNER_SLOTS.map((s) => (
                  <BannerSlot
                    key={s.key}
                    label={s.label}
                    hint={s.hint}
                    aspect={s.aspect}
                    url={form[s.key]}
                    onUpload={async (file) => {
                      const res = await adminApi.uploadCategoryBanner(file, s.slot);
                      setForm((f) => ({ ...f, [s.key]: res.imageUrl }));
                    }}
                    onClear={() => clearBanner(s)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-input bg-accent/20 px-4 py-3 text-xs text-ink-700">
              Banner artwork is set on the top-level category. This one uses{' '}
              <strong>{parentName || 'its parent'}</strong>&apos;s images.
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
