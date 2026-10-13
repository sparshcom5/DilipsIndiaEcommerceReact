import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UploadCloud, Trash2, Loader2, ImageOff, Eye, EyeOff, ChevronUp, ChevronDown, ExternalLink,
} from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { mediaUrl } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import {
  Button, Card, Checkbox, Field, Input, PageHeader, StatusPill, Textarea, useToast,
} from '../components/ui.jsx';

/* ------------------------------------------------------------------ *
 * Page banners
 * ------------------------------------------------------------------ */

/**
 * Recommended upload size per slot, at roughly 2x the widest rendered box so
 * it stays sharp on a 2560px display. The home hero is taller and its copy
 * sits on the left; every other page centres its copy over a shorter band.
 */
const BANNER_SIZE = {
  home: { upload: '2560 × 900', rendered: '650px tall', note: 'Copy sits on the left — put the product on the right half.' },
  default: { upload: '2400 × 800', rendered: '424px tall', note: 'Copy is centred over the image.' },
};

const bannerSize = (pageKey) => BANNER_SIZE[pageKey] || BANNER_SIZE.default;

function BannerImage({ url, onUpload, onRemove, busy, canEdit, pageKey }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const size = bannerSize(pageKey);

  useEffect(() => setBroken(false), [url]);

  const take = (files) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer.files);
      }}
      className={`relative aspect-[21/9] overflow-hidden rounded-card border-2 border-dashed transition-colors ${
        dragOver ? 'border-brand bg-brand/5' : 'border-ink-200 bg-ink-50'
      }`}
    >
      {url && !broken ? (
        <>
          <img src={url} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          <span aria-hidden className="absolute inset-0 bg-black/35" />
        </>
      ) : (
        <div className="grid h-full w-full place-items-center text-ink-400">
          <div className="text-center">
            {busy ? (
              <Loader2 size={22} className="mx-auto animate-spin text-brand" aria-hidden />
            ) : (
              <ImageOff size={22} className="mx-auto" aria-hidden />
            )}
            <p className="mt-2 text-xs">{broken ? 'Image not found' : 'No banner image'}</p>
            <p className="mt-1 text-[11px] text-ink-400">Upload {size.upload}</p>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-input bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-900 shadow hover:bg-white disabled:opacity-50"
          >
            <UploadCloud size={13} aria-hidden />
            {url ? 'Replace' : 'Upload'}
          </button>
          {url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              aria-label="Remove banner image"
              className="rounded-input bg-white/95 p-1.5 text-ink-700 shadow hover:bg-white hover:text-brand disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function BannerCard({ banner, onChanged }) {
  const { can } = useAdminAuth();
  const toast = useToast();
  const canEdit = can('cms.update');

  const [form, setForm] = useState(banner);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(banner);
    setDirty(false);
  }, [banner]);

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    setDirty(true);
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await adminApi.updatePageBanner(banner.pageKey, {
        eyebrow: form.eyebrow,
        title: form.title,
        titleAccent: form.titleAccent,
        subtitle: form.subtitle,
        ctaText: form.ctaText,
        ctaUrl: form.ctaUrl,
        isActive: form.isActive,
      });
      toast.success(`${banner.label} banner saved.`);
      onChanged(res.data);
      setDirty(false);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file) => {
    setUploading(true);
    try {
      const res = await adminApi.uploadPageBannerImage(banner.pageKey, file);
      toast.success('Banner image updated.');
      onChanged(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    setUploading(true);
    try {
      const res = await adminApi.deletePageBannerImage(banner.pageKey);
      toast.success('Banner image removed.');
      onChanged(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card
      title={banner.label}
      action={
        <div className="flex items-center gap-3">
          <StatusPill value={form.isActive ? 'active' : 'inactive'} />
          <a
            href={banner.pageKey === 'home' ? '/' : `/${banner.pageKey}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:opacity-80"
          >
            View <ExternalLink size={12} aria-hidden />
          </a>
        </div>
      }
    >
      {/* Live preview of exactly how the hero will read on the storefront. */}
      <div className="relative">
        <BannerImage
          url={mediaUrl(form.imageUrl)}
          onUpload={upload}
          onRemove={removeImage}
          busy={uploading}
          canEdit={canEdit}
          pageKey={banner.pageKey}
        />
        {/* Without an image the dropzone is light, so the preview text has to
            flip to dark or it becomes unreadable. */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center ${
            form.imageUrl ? 'text-white drop-shadow' : 'text-ink-700'
          }`}
        >
          {form.eyebrow && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand">{form.eyebrow}</p>
          )}
          <p className="mt-1 text-2xl font-light">
            {form.title} <span className="font-bold">{form.titleAccent}</span>
          </p>
          {form.subtitle && (
            <p className={`mt-1 line-clamp-2 max-w-[46ch] text-[11px] ${form.imageUrl ? 'text-white/85' : 'text-ink-500'}`}>
              {form.subtitle}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-ink-500">
        Upload <strong className="text-ink-700">{bannerSize(banner.pageKey).upload}</strong> — the
        band renders {bannerSize(banner.pageKey).rendered} and full width, cropped to fit.{' '}
        {bannerSize(banner.pageKey).note} Keep the subject in the middle 60%: on a phone the sides
        are cropped away. Don't put text in the image — the words below are drawn over it. JPG,
        PNG, WebP, AVIF or GIF, under 5 MB.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Eyebrow" hint="Small line above the title (home page only in the design).">
          <Input value={form.eyebrow ?? ''} onChange={set('eyebrow')} disabled={!canEdit} />
        </Field>
        <Field label="Title" error={errors.title} hint="Rendered in light weight.">
          <Input value={form.title ?? ''} onChange={set('title')} error={errors.title} disabled={!canEdit} />
        </Field>
        <Field label="Title accent" hint="Rendered bold, beside the title.">
          <Input value={form.titleAccent ?? ''} onChange={set('titleAccent')} disabled={!canEdit} />
        </Field>
        <Field label="CTA label" hint="Leave blank to hide the button.">
          <Input value={form.ctaText ?? ''} onChange={set('ctaText')} disabled={!canEdit} />
        </Field>
        <Field label="CTA link">
          <Input value={form.ctaUrl ?? ''} onChange={set('ctaUrl')} disabled={!canEdit} placeholder="/products" />
        </Field>
        <div className="flex items-end pb-2.5">
          <Checkbox
            label="Show this banner"
            checked={Boolean(form.isActive)}
            onChange={set('isActive')}
            disabled={!canEdit}
          />
        </div>
      </div>

      <Field label="Subtitle" className="mt-5">
        <Textarea rows={2} value={form.subtitle ?? ''} onChange={set('subtitle')} disabled={!canEdit} />
      </Field>

      {canEdit && (
        <div className="mt-5 flex justify-end">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function PageBanners() {
  const { data, loading } = useApi(() => adminApi.pageBanners(), []);
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    if (data) setBanners(data.data);
  }, [data]);

  if (loading) return <p className="text-sm text-ink-500">Loading banners…</p>;

  return (
    <div className="space-y-6">
      <p className="rounded-card bg-white px-5 py-3.5 text-sm text-ink-600 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        Each storefront page has its own hero. Upload an image, set the two-part title, and it appears
        immediately — no deploy needed.
      </p>

      {banners.map((b) => (
        <BannerCard
          key={b.pageKey}
          banner={b}
          onChanged={(updated) =>
            setBanners((prev) => prev.map((x) => (x.pageKey === updated.pageKey ? updated : x)))
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

function Navigation() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const canEdit = can('category.update');

  const [reloadKey, setReloadKey] = useState(0);
  const { data, loading } = useApi(() => adminApi.navigation(), [reloadKey]);
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setRows(data.data);
      setDirty({});
    }
  }, [data]);

  const change = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const move = (row, delta) => {
    const siblings = rows
      .filter((r) => r.parentId === row.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((r) => r.id === row.id);
    const target = siblings[index + delta];
    if (!target) return;

    change(row.id, { sortOrder: target.sortOrder });
    change(target.id, { sortOrder: row.sortOrder });
  };

  const save = async () => {
    const items = Object.entries(dirty).map(([id, patch]) => ({ id: Number(id), ...patch }));
    if (!items.length) return;

    setSaving(true);
    try {
      await adminApi.updateNavigation(items);
      toast.success('Navigation updated. Refresh the storefront to see it.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-ink-500">Loading navigation…</p>;

  const roots = rows.filter((r) => r.level === 0).sort((a, b) => a.sortOrder - b.sortOrder);
  const childrenOf = (id) => rows.filter((r) => r.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder);

  /**
   * Mirrors the server's rule in GET /api/content/navigation: a category is in
   * the menu when it is active and flagged for the menu, whether or not it has
   * products yet. Hiding a parent hides its whole branch.
   */
  const inMenu = (node) => node.isActive && node.showInMenu;

  const visible = roots.filter(inMenu);

  const Row = ({ row, depth = 0 }) => (
    <li
      className={`flex flex-wrap items-center gap-4 py-3 ${row.isActive ? '' : 'opacity-55'}`}
      style={{ paddingLeft: depth * 34 }}
    >
      <div className="min-w-[190px] flex-1">
        <p className="text-sm font-semibold text-ink-900">
          {row.name}
          {!row.isActive && <span className="ml-2 text-xs font-normal text-ink-400">(inactive)</span>}
        </p>
        <p className="text-xs text-ink-500">
          /{row.slug} · {row.productCount} product{row.productCount === 1 ? '' : 's'}
        </p>
      </div>

      <Input
        value={row.menuLabel ?? ''}
        onChange={(e) => change(row.id, { menuLabel: e.target.value })}
        placeholder={row.name}
        disabled={!canEdit}
        className="!w-44 !py-1.5 !text-xs"
        aria-label={`Menu label for ${row.name}`}
      />

      {canEdit && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => move(row, -1)}
            aria-label={`Move ${row.name} up`}
            className="rounded border border-ink-200 p-1 text-ink-500 hover:border-ink-400 hover:text-ink-900"
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => move(row, 1)}
            aria-label={`Move ${row.name} down`}
            className="rounded border border-ink-200 p-1 text-ink-500 hover:border-ink-400 hover:text-ink-900"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => canEdit && change(row.id, { showInMenu: !row.showInMenu })}
        disabled={!canEdit}
        aria-pressed={row.showInMenu}
        className={`inline-flex w-32 items-center justify-center gap-1.5 rounded-input border px-3 py-1.5 text-xs font-semibold transition-colors ${
          row.showInMenu
            ? 'border-success/40 bg-success/10 text-success'
            : 'border-ink-200 bg-white text-ink-500'
        } ${canEdit ? '' : 'cursor-not-allowed'}`}
      >
        {row.showInMenu ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
        {row.showInMenu ? 'In menu' : 'Hidden'}
      </button>
    </li>
  );

  return (
    <div className="space-y-6">
      <Card title="Menu preview">
        <div className="overflow-x-auto rounded-card bg-black px-6 py-4">
          <ul className="flex items-center gap-7 whitespace-nowrap">
            <li className="text-sm font-semibold text-brand">Home</li>
            <li className="text-sm text-white">Who We Are</li>
            {visible.map((r) => (
              <li key={r.id} className="text-sm text-white">
                {r.menuLabel || r.name}
              </li>
            ))}
            <li className="text-sm text-white">Blog</li>
            <li className="text-sm text-white">Contact Us</li>
          </ul>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          A category appears if it is active and marked <em>In menu</em> — with or without products.
          Its sub-categories open as a dropdown, and hiding a category hides everything under it.
        </p>
      </Card>

      <Card
        title="Categories"
        action={
          canEdit && (
            <Button size="sm" onClick={save} disabled={!Object.keys(dirty).length || saving}>
              {saving ? 'Saving…' : `Save ${Object.keys(dirty).length || ''} change${Object.keys(dirty).length === 1 ? '' : 's'}`}
            </Button>
          )
        }
      >
        {/* Renders the whole tree, however deep, so third-level ranges
            (DSM LX → DSM LX-20) are manageable here too. */}
        <ul className="divide-y divide-ink-100">
          {(function renderBranch(nodes, depth = 0) {
            return nodes.flatMap((node) => [
              <Row key={node.id} row={node} depth={depth} />,
              ...(depth < 4 ? renderBranch(childrenOf(node.id), depth + 1) : []),
            ]);
          })(roots)}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TABS = [
  { key: 'banners', label: 'Page Banners' },
  { key: 'navigation', label: 'Navigation' },
];

export default function Appearance() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'banners';

  return (
    <>
      <PageHeader title="Appearance" subtitle="Page headers and the storefront menu." />

      <div className="mb-6 flex flex-wrap gap-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-brand bg-brand text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'banners' ? <PageBanners /> : <Navigation />}
    </>
  );
}
