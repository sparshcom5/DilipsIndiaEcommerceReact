/**
 * A row of pill buttons for one variant-defining attribute (Finish, Mount Type).
 *
 * `unavailable` marks value ids that no in-stock variant offers given the other
 * selections. Those stay clickable — the shopper can still pivot to them — but
 * render struck through so the combination reads as sold out rather than broken.
 */
export default function OptionSelector({ label, values, selectedId, onSelect, unavailable }) {
  const groupId = `option-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <fieldset>
      <legend id={groupId} className="mb-3 text-sm font-semibold text-ink-900">
        {label}
      </legend>

      <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby={groupId}>
        {values.map((v) => {
          const selected = v.id === selectedId;
          const soldOut = unavailable?.has(v.id);

          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(v.id)}
              className={[
                'inline-flex items-center gap-2 rounded-input border px-4 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors',
                selected
                  ? 'border-brand text-brand'
                  : 'border-ink-200 text-ink-600 hover:border-ink-400',
                soldOut && 'line-through opacity-55',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {v.hexColor && (
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: v.hexColor }}
                />
              )}
              {v.value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
