import { useEffect, useRef, useState } from 'react';
import { UploadCloud, Trash2, Loader2, ImageOff } from 'lucide-react';

import { mediaUrl } from '../../lib/api.js';

/**
 * A single banner slot: preview, upload, remove.
 *
 * The upload returns a URL rather than attaching the file to a row, so the
 * parent form can hold it in state and save it alongside everything else.
 * That is what lets artwork be chosen while *creating* a category, before the
 * row exists.
 */
export default function BannerSlot({ label, hint, aspect, url, onUpload, onClear, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setBroken(false), [url]);

  const take = async (files) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-800">{label}</p>

      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragOver(false);
          take(e.dataTransfer.files);
        }}
        className={`relative overflow-hidden rounded-card border-2 border-dashed transition-colors ${aspect} ${
          dragOver ? 'border-brand bg-brand/5' : 'border-ink-200 bg-ink-50'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {url && !broken ? (
          <img
            src={mediaUrl(url)}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-center text-ink-400">
            <div>
              {busy ? (
                <Loader2 size={20} className="mx-auto animate-spin text-brand" aria-hidden />
              ) : (
                <ImageOff size={20} className="mx-auto" aria-hidden />
              )}
              <p className="mt-1.5 text-[11px]">{broken ? 'Image not found' : 'No image'}</p>
            </div>
          </div>
        )}

        {!disabled && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-input bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink-900 shadow hover:bg-white disabled:opacity-50"
            >
              <UploadCloud size={12} aria-hidden />
              {url ? 'Replace' : 'Upload'}
            </button>
            {url && (
              <button
                type="button"
                onClick={onClear}
                disabled={busy}
                aria-label={`Remove ${label}`}
                className="rounded-input bg-white/95 p-1 text-ink-700 shadow hover:bg-white hover:text-brand disabled:opacity-50"
              >
                <Trash2 size={12} />
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

      <p className="mt-1.5 text-[11px] leading-4 text-ink-500">{hint}</p>
      {error && <p className="mt-1 text-[11px] text-brand">{error}</p>}
    </div>
  );
}
