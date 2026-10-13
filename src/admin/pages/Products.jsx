import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Pencil } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import CategoryPicker, { categoryIncomplete } from '../components/CategoryPicker.jsx';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import {
  Button, DataTable, Field, Input, Modal, PageHeader, SearchInput, Select, StatusPill,
  Textarea, Checkbox, money, useToast,
} from '../components/ui.jsx';

const EMPTY = {
  name: '', shortName: '', sku: '', status: 'draft', type: 'simple',
  brandId: '', primaryCategoryId: '', taxClassId: '', hsnCode: '',
  shortDescription: '', description: '', isFeatured: false,
  minOrderQty: 1, maxOrderQty: 10, returnWindowDays: 7,
  mrp: '', sellingPrice: '',
};

function ProductForm({ open, product, onClose, onSaved }) {
  const toast = useToast();
  const { data: cats } = useApi(() => adminApi.categories(), []);
  const { data: brands } = useApi(() => adminApi.brands(), []);
  const { data: taxes } = useApi(() => adminApi.taxClasses(), []);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);
  // Files chosen before the product exists; uploaded straight after creation.
  const [stagedImages, setStagedImages] = useState([]);

  // Hydrate once per opened product rather than on every render.
  if (open && loadedFor !== (product?.id ?? 'new')) {
    setLoadedFor(product?.id ?? 'new');
    setStagedImages([]);
    setForm(
      product
        ? {
            ...EMPTY,
            name: product.name ?? '',
            shortName: product.shortName ?? '',
            sku: product.sku ?? '',
            status: product.status ?? 'draft',
            isFeatured: Boolean(product.isFeatured),
            // Without this the picker opened empty and every save cleared the
            // product's category.
            primaryCategoryId: product.primaryCategoryId == null ? '' : String(product.primaryCategoryId),
            mrp: product.mrp ?? '',
            sellingPrice: product.sellingPrice ?? '',
          }
        : EMPTY
    );
    setErrors({});
  }

  // Each variant carries its own price once there is more than one, so the
  // single price box here would be ambiguous.
  const pricePerVariant = Boolean(product) && product.variantCount > 1;
  // Created before the form collected a price: no variant, so no price, and the
  // storefront shows it as unavailable until one is set here.
  const needsPrice = Boolean(product) && product.variantCount === 0;

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Every visible level is required, so a product cannot be filed against a
    // branch that still has categories under it.
    if (categoryIncomplete(cats?.data ?? [], form.primaryCategoryId)) {
      setErrors({
        primaryCategoryId: form.primaryCategoryId
          ? 'Choose the sub-category as well.'
          : 'Category is required.',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        brandId: form.brandId || null,
        primaryCategoryId: form.primaryCategoryId || null,
        taxClassId: form.taxClassId || null,
      };
      if (pricePerVariant) {
        // Leave the variants' own prices alone.
        delete payload.mrp;
        delete payload.sellingPrice;
      }
      if (product) {
        await adminApi.updateProduct(product.id, payload);
        toast.success('Product updated.');
      } else {
        const created = await adminApi.createProduct(payload);

        // Upload happens after creation because images need a product row to
        // attach to. A failed upload must not read as a failed product save.
        if (stagedImages.length) {
          try {
            const res = await adminApi.uploadProductImages(created.id, stagedImages);
            toast.success(`Product created with ${res.uploaded} image${res.uploaded === 1 ? '' : 's'}.`);
          } catch (uploadErr) {
            toast.error(`Product created, but the images failed to upload: ${uploadErr.message}`);
          }
        } else {
          toast.success('Product created.');
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={product ? `Edit ${product.name}` : 'New product'}
      onClose={onClose}
      width="max-w-[760px]"
      footer={
        <>
          <Button tone="secondary" onClick={onClose}>Cancel</Button>
          <Button form="product-form" type="submit" disabled={saving}>
            {saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name" required error={errors.name}>
            <Input value={form.name} onChange={set('name')} error={errors.name} placeholder="Prime Series Basin Faucet" />
          </Field>
          <Field label="Short name" error={errors.shortName} hint="Shown on cart lines, e.g. DILIPS Prime">
            <Input value={form.shortName} onChange={set('shortName')} />
          </Field>
          <Field label="SKU" required error={errors.sku}>
            <Input value={form.sku} onChange={set('sku')} error={errors.sku} placeholder="DI-PRM-BF" disabled={Boolean(product)} />
          </Field>
          <Field label="HSN code" error={errors.hsnCode} hint="Required on GST invoices">
            <Input value={form.hsnCode} onChange={set('hsnCode')} placeholder="84818020" />
          </Field>

          <Field label="Status" error={errors.status}>
            <Select value={form.status} onChange={set('status')}>
              {['draft', 'active', 'inactive', 'archived'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Type" error={errors.type} hint="Variable products carry Finish / Mount Type options">
            <Select value={form.type} onChange={set('type')} disabled={Boolean(product)}>
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
            </Select>
          </Field>

          {/* One dropdown per level — a deeper one appears only when the
              selection above it has children. */}
          <CategoryPicker
            categories={cats?.data ?? []}
            value={form.primaryCategoryId}
            onChange={(id) => {
              setForm((prev) => ({ ...prev, primaryCategoryId: id }));
              // The message names one level; once the chain moves it no longer fits.
              setErrors((prev) => {
                if (!prev.primaryCategoryId) return prev;
                const { primaryCategoryId, ...rest } = prev;
                return rest;
              });
            }}
            error={errors.primaryCategoryId}
          />
          <Field label="Brand">
            <Select value={form.brandId} onChange={set('brandId')}>
              <option value="">— none —</option>
              {(brands?.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Tax class">
            <Select value={form.taxClassId} onChange={set('taxClassId')}>
              <option value="">— none —</option>
              {(taxes?.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Max order quantity">
            <Input type="number" min={1} value={form.maxOrderQty} onChange={set('maxOrderQty')} />
          </Field>
        </div>

        <div className="border-t border-ink-200 pt-6">
          <h3 className="mb-1 text-sm font-bold text-ink-900">Pricing</h3>
          <p className="mb-4 text-xs text-ink-500">
            {pricePerVariant
              ? 'This product has several variants, each with its own price. Edit them under Variants.'
              : 'Prices are GST-inclusive. MRP shows struck through on the storefront when it is above the selling price.'}
          </p>

          {needsPrice && (
            <p className="mb-4 rounded-input bg-brand/10 px-4 py-3 text-xs text-brand">
              This product has no price yet, so the storefront shows it as <strong>Unavailable</strong>.
              Set both fields below to make it buyable.
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="MRP (₹)" required={!pricePerVariant} error={errors.mrp}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.mrp}
                onChange={set('mrp')}
                error={errors.mrp}
                disabled={pricePerVariant}
                placeholder="4250.00"
              />
            </Field>
            <Field
              label="Selling price (₹)"
              required={!pricePerVariant}
              error={errors.sellingPrice}
              hint="What the customer actually pays. Cannot be more than MRP."
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.sellingPrice}
                onChange={set('sellingPrice')}
                error={errors.sellingPrice}
                disabled={pricePerVariant}
                placeholder="3999.00"
              />
            </Field>
          </div>
        </div>

        <Field label="Short description" error={errors.shortDescription}>
          <Textarea rows={2} value={form.shortDescription} onChange={set('shortDescription')} />
        </Field>

        <Field label="Description" hint="HTML is allowed — it renders on the product page.">
          <Textarea rows={5} value={form.description} onChange={set('description')} />
        </Field>

        <Checkbox label="Feature this product (shows the Bestseller badge)" checked={form.isFeatured} onChange={set('isFeatured')} />

        <div className="border-t border-ink-200 pt-6">
          <h3 className="mb-1 text-sm font-bold text-ink-900">Images</h3>
          <p className="mb-4 text-xs text-ink-500">
            {product
              ? 'Uploads save immediately. The first image becomes the primary one.'
              : 'Pick as many as you like — they upload as soon as the product is created.'}
          </p>
          <ImageUploader
            productId={product?.id ?? null}
            altText={form.name}
            onStagedChange={setStagedImages}
          />
        </div>

        {!product && (
          <p className="rounded-input bg-accent/20 px-4 py-3 text-xs text-ink-700">
            Creating the product also creates its default option at this price, so it is ready to
            sell straight away. Add finishes or mount types later from Variants on the product row.
          </p>
        )}
      </form>
    </Modal>
  );
}

function VariantsModal({ product, onClose, onSaved }) {
  const toast = useToast();
  const { data, loading } = useApi(() => adminApi.product(product.id), [product.id]);
  const [form, setForm] = useState({ sku: '', name: '', mrp: '', sellingPrice: '', weightGrams: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const add = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await adminApi.createVariant(product.id, {
        ...form,
        mrp: Number(form.mrp),
        sellingPrice: Number(form.sellingPrice),
        weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
      });
      toast.success('Variant added.');
      setForm({ sku: '', name: '', mrp: '', sellingPrice: '', weightGrams: '' });
      onSaved();
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={`Variants — ${product.name}`} onClose={onClose} width="max-w-[820px]">
      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="pb-3">SKU</th>
                <th className="pb-3">Name</th>
                <th className="pb-3 text-right">MRP</th>
                <th className="pb-3 text-right">Selling</th>
                <th className="pb-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {(data?.variants ?? []).map((v) => (
                <tr key={v.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-3 font-medium text-ink-900">{v.sku}</td>
                  <td className="py-3">{v.name || '—'}</td>
                  <td className="py-3 text-right">{money(v.mrp)}</td>
                  <td className="py-3 text-right">{money(v.selling_price)}</td>
                  <td className="py-3 text-right">{v.available_quantity}</td>
                </tr>
              ))}
              {!data?.variants?.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-ink-500">
                    No variants yet — this product cannot be sold until one exists.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <form onSubmit={add} className="mt-7 border-t border-ink-200 pt-6">
            <h3 className="mb-4 text-sm font-bold text-ink-900">Add a variant</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="SKU" required error={errors.sku}>
                <Input value={form.sku} onChange={set('sku')} error={errors.sku} placeholder="DI-PRM-BF-CHR-DK" />
              </Field>
              <Field label="Name" hint="e.g. Chrome / Deck Mounted">
                <Input value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Weight (g)">
                <Input type="number" value={form.weightGrams} onChange={set('weightGrams')} />
              </Field>
              <Field label="MRP" required error={errors.mrp}>
                <Input type="number" step="0.01" value={form.mrp} onChange={set('mrp')} error={errors.mrp} />
              </Field>
              <Field label="Selling price" required error={errors.sellingPrice}>
                <Input type="number" step="0.01" value={form.sellingPrice} onChange={set('sellingPrice')} error={errors.sellingPrice} />
              </Field>
            </div>
            <Button type="submit" className="mt-4" disabled={saving}>
              <Plus size={15} /> {saving ? 'Adding…' : 'Add variant'}
            </Button>
          </form>
        </>
      )}
    </Modal>
  );
}

export default function Products() {
  const { can, features } = useAdminAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [variantsFor, setVariantsFor] = useState(null);

  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 1);

  const { data, loading } = useApi(
    () => adminApi.products({ q, status, page, perPage: 20 }),
    [q, status, page, reloadKey]
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

  const remove = async (row) => {
    if (!window.confirm(`Archive "${row.name}"? It will be hidden from the storefront but kept for existing orders.`)) return;
    try {
      await adminApi.deleteProduct(row.id);
      toast.success('Product archived.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.shortName || r.name}</p>
          <p className="text-xs text-ink-500">{r.sku} · {r.category || 'Uncategorised'}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusPill value={r.status} /> },
    { key: 'price', label: 'Price', align: 'right', render: (r) => money(r.price) },
    {
      key: 'variantCount',
      label: 'Variants',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setVariantsFor(r);
          }}
          className={`font-semibold ${r.variantCount === 0 ? 'text-brand' : 'text-ink-900 hover:text-brand'}`}
        >
          {r.variantCount === 0 ? 'none' : r.variantCount}
        </button>
      ),
    },
    // Stock only earns a column when the server is actually tracking it.
    ...(features.trackInventory
      ? [
          {
            key: 'availableQuantity',
            label: 'Stock',
            align: 'right',
            render: (r) => (
              <span className={r.availableQuantity === 0 ? 'font-semibold text-brand' : ''}>
                {r.availableQuantity}
              </span>
            ),
          },
        ]
      : []),
    { key: 'soldCount', label: 'Sold', align: 'right' },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {can('product.update') && (
            <button
              type="button"
              aria-label={`Edit ${r.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(r);
                setFormOpen(true);
              }}
              className="text-ink-500 hover:text-brand"
            >
              <Pencil size={15} />
            </button>
          )}
          {can('product.delete') && (
            <button
              type="button"
              aria-label={`Archive ${r.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(r);
              }}
              className="text-ink-500 hover:text-brand"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Products" subtitle="Catalog across every category.">
        <SearchInput value={q} onSearch={(v) => patch({ q: v })} placeholder="Name or SKU…" />
        <Select value={status} onChange={(e) => patch({ status: e.target.value })} className="!w-40">
          <option value="">All statuses</option>
          {['draft', 'active', 'inactive', 'archived'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        {can('product.create') && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> New product
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={loading}
        empty="No products match these filters."
        pagination={data?.pagination}
        onPage={(p) => patch({ page: p })}
      />

      <ProductForm
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      {variantsFor && (
        <VariantsModal
          product={variantsFor}
          onClose={() => setVariantsFor(null)}
          onSaved={() => setReloadKey((k) => k + 1)}
        />
      )}
    </>
  );
}
