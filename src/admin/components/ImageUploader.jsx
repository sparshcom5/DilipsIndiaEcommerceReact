import { useEffect, useRef, useState } from 'react';
import { UploadCloud, X, Star, GripVertical, Loader2, ImageOff, AlertCircle } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { mediaUrl } from '../../lib/api.js';
import { Button, useToast } from './ui.jsx';

const MAX_MB = 5;
const MAX_FILES = 12;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

const isImage = (file) => ACCEPT.split(',').includes(file.type);

/** Client-side pre-check so obvious rejects never leave the browser. */
function partition(files) {
  const ok = [];
  const rejected = [];
  for (const file of files) {
    if (!isImage(file)) rejected.push(`${file.name} — not a supported image type`);
    else if (file.size > MAX_MB * 1024 * 1024) rejected.push(`${file.name} — larger than ${MAX_MB} MB`);
    else ok.push(file);
  }
  return { ok, rejected };
}

function Thumb({ src, alt }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  if (!src || broken) {
    return (
      <div className="grid h-full w-full place-items-center bg-ink-100 text-ink-400">
        <ImageOff size={20} aria-hidden />
      </div>
    );
  }
  return <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setBroken(true)} />;
}

/**
 * Multi-image uploader.
 *
 * Two modes, because uploads need a product row to attach to:
 *  - `productId` set  → files upload immediately.
 *  - `productId` null → files are staged in memory and handed back through
 *    `onStagedChange`, so the parent can upload them after the product is
 *    created.
 */
export default function ImageUploader({ productId, onStagedChange, altText }) {
  const toast = useToast();
  const inputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [staged, setStaged] = useState([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    adminApi
      .productImages(productId)
      .then((res) => {
        if (!cancelled) setImages(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Object URLs must be revoked or the previews leak memory.
  useEffect(
    () => () => {
      staged.forEach((s) => URL.revokeObjectURL(s.preview));
    },
    [staged]
  );

  const accept = async (fileList) => {
    const { ok, rejected } = partition(Array.from(fileList || []));
    setWarnings(rejected);

    if (!ok.length) return;
    if (ok.length > MAX_FILES) {
      setWarnings((w) => [...w, `Only the first ${MAX_FILES} images were taken.`]);
    }
    const batch = ok.slice(0, MAX_FILES);

    if (!productId) {
      const next = [...staged, ...batch.map((file) => ({ file, preview: URL.createObjectURL(file) }))];
      setStaged(next);
      onStagedChange?.(next.map((s) => s.file));
      return;
    }

    setUploading(true);
    try {
      const res = await adminApi.uploadProductImages(productId, batch, { altText });
      setImages(res.data);
      toast.success(`${res.uploaded} image${res.uploaded === 1 ? '' : 's'} uploaded.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    accept(e.dataTransfer.files);
  };

  const removeStaged = (index) => {
    const next = staged.filter((_, i) => i !== index);
    URL.revokeObjectURL(staged[index].preview);
    setStaged(next);
    onStagedChange?.(next.map((s) => s.file));
  };

  const remove = async (image) => {
    try {
      const res = await adminApi.deleteProductImage(image.id);
      setImages(res.data);
      toast.success('Image removed.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const makePrimary = async (image) => {
    try {
      const res = await adminApi.updateProductImage(image.id, { isPrimary: true });
      setImages(res.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onDragStartCard = (index) => setDragIndex(index);

  const onDropCard = async (index) => {
    if (dragIndex === null || dragIndex === index) return setDragIndex(null);

    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setImages(next);
    setDragIndex(null);

    try {
      const res = await adminApi.reorderProductImages(productId, next.map((i) => i.id));
      setImages(res.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const count = productId ? images.length : staged.length;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragOver ? 'border-brand bg-brand/5' : 'border-ink-200 bg-ink-50'
        }`}
      >
        {uploading ? (
          <Loader2 size={26} className="mx-auto animate-spin text-brand" aria-hidden />
        ) : (
          <UploadCloud size={26} className="mx-auto text-ink-400" aria-hidden />
        )}

        <p className="mt-3 text-sm text-ink-700">
          {uploading ? 'Uploading…' : (
            <>
              Drag images here, or{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-semibold text-brand hover:opacity-80"
              >
                browse
              </button>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-400">
          JPG, PNG, WebP, AVIF or GIF · up to {MAX_MB} MB each · {MAX_FILES} at a time
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            accept(e.target.files);
            // Reset so re-picking the same file fires change again.
            e.target.value = '';
          }}
        />
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 text-xs text-brand">
              <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="mt-4 text-sm text-ink-500">Loading images…</p>}

      {count > 0 && (
        <>
          <p className="mt-5 mb-3 text-xs text-ink-500">
            {productId
              ? 'Drag to reorder. The starred image is the one shown first on the storefront.'
              : `${count} image${count === 1 ? '' : 's'} ready — they upload once the product is created.`}
          </p>

          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4">
            {productId
              ? images.map((image, index) => (
                  <li
                    key={image.id}
                    draggable
                    onDragStart={() => onDragStartCard(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropCard(index)}
                    className={`group relative overflow-hidden rounded-card border bg-white ${
                      image.isPrimary ? 'border-brand' : 'border-ink-200'
                    } ${dragIndex === index ? 'opacity-40' : ''}`}
                  >
                    <div className="aspect-square">
                      <Thumb src={mediaUrl(image.thumbnailUrl)} alt={image.altText} />
                    </div>

                    <span className="absolute left-1.5 top-1.5 cursor-grab rounded bg-black/45 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical size={13} aria-hidden />
                    </span>

                    <button
                      type="button"
                      onClick={() => makePrimary(image)}
                      aria-label={image.isPrimary ? 'Primary image' : 'Make primary image'}
                      title={image.isPrimary ? 'Primary image' : 'Make primary'}
                      className={`absolute right-1.5 top-1.5 rounded p-1 transition-colors ${
                        image.isPrimary ? 'bg-brand text-white' : 'bg-black/45 text-white hover:bg-brand'
                      }`}
                    >
                      <Star size={13} className={image.isPrimary ? 'fill-current' : ''} aria-hidden />
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(image)}
                      aria-label="Remove image"
                      className="absolute bottom-1.5 right-1.5 rounded bg-black/45 p-1 text-white opacity-0 transition-opacity hover:bg-brand group-hover:opacity-100"
                    >
                      <X size={13} aria-hidden />
                    </button>

                    {image.isPrimary && (
                      <span className="absolute bottom-0 left-0 right-0 bg-brand py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                        Primary
                      </span>
                    )}
                  </li>
                ))
              : staged.map((s, index) => (
                  <li key={s.preview} className="group relative overflow-hidden rounded-card border border-ink-200 bg-white">
                    <div className="aspect-square">
                      <Thumb src={s.preview} alt={s.file.name} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStaged(index)}
                      aria-label={`Remove ${s.file.name}`}
                      className="absolute right-1.5 top-1.5 rounded bg-black/45 p-1 text-white transition-colors hover:bg-brand"
                    >
                      <X size={13} aria-hidden />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-ink-900/80 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                        Will be primary
                      </span>
                    )}
                  </li>
                ))}
          </ul>
        </>
      )}

      {!loading && count === 0 && productId && (
        <p className="mt-4 text-sm text-ink-500">
          No images yet. The storefront shows a placeholder until you add one.
        </p>
      )}
    </div>
  );
}
