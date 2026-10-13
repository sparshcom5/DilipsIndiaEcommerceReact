import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, ImageOff } from 'lucide-react';

import { mediaUrl } from '../../lib/api.js';

function Placeholder({ label }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-ink-100 text-ink-400">
      <ImageOff size={28} aria-hidden />
      <span className="px-4 text-center text-xs">{label}</span>
    </div>
  );
}

function Frame({ image, className = '', showPlaceholder }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [image?.url]);

  if (!image || broken || showPlaceholder) {
    return (
      <div className={className}>
        <Placeholder label={image?.altText || 'Product image'} />
      </div>
    );
  }

  return (
    <img
      src={mediaUrl(image.url)}
      alt={image.altText}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}

export default function ProductGallery({ images = [], badge }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const active = images[index];
  const go = (delta) => setIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div>
      <div className="relative overflow-hidden rounded-card bg-white">
        <div className="aspect-[662/620]">
          <Frame image={active} className="h-full w-full object-contain" />
        </div>

        {badge && (
          <span className="absolute bottom-5 left-5 rounded-sm bg-brand px-3 py-1.5 text-xs font-semibold text-white">
            {badge}
          </span>
        )}

        <button
          type="button"
          aria-label="Zoom image"
          className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white text-ink-700 shadow-md transition-colors hover:text-brand"
        >
          <Maximize2 size={18} />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink-700 shadow-md transition-colors hover:text-brand"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink-700 shadow-md transition-colors hover:text-brand"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-4">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}: ${img.altText}`}
                aria-current={i === index}
                className={`block w-full overflow-hidden rounded-card border-2 bg-white transition-colors ${
                  i === index ? 'border-brand' : 'border-ink-200 hover:border-ink-400'
                }`}
              >
                <div className="aspect-square">
                  <Frame
                    image={{ ...img, url: img.thumbnailUrl }}
                    className="h-full w-full object-contain"
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
