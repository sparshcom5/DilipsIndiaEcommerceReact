import { Star } from 'lucide-react';

/**
 * Five stars with a clipped overlay so half-star averages (4.3, 3.7) render
 * accurately rather than rounding to the nearest whole star.
 */
export default function StarRating({ value = 0, count, size = 16 }) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  const label = `${clamped.toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ''}`;

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-flex" role="img" aria-label={label}>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={size} className="fill-ink-200 text-ink-200" aria-hidden />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-0 flex gap-0.5 overflow-hidden"
          style={{ width: `${(clamped / 5) * 100}%` }}
          aria-hidden
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={size} className="shrink-0 fill-brand text-brand" />
          ))}
        </div>
      </div>

      {count != null && (
        <span className="text-sm text-ink-500">
          ({count} {count === 1 ? 'Review' : 'Reviews'})
        </span>
      )}
    </div>
  );
}
