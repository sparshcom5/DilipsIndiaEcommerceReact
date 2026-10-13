import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value, onChange, min = 1, max = 10 }) {
  const clamp = (n) => Math.min(max, Math.max(min, n));

  return (
    <div className="inline-flex h-12 items-stretch rounded-input border border-ink-200">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="grid w-10 place-items-center text-ink-600 transition-colors hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={16} />
      </button>

      <input
        type="number"
        inputMode="numeric"
        aria-label="Quantity"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(clamp(next));
        }}
        className="w-10 border-x border-ink-200 text-center text-sm font-medium outline-none [appearance:textfield] focus:ring-1 focus:ring-brand/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="grid w-10 place-items-center text-ink-600 transition-colors hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
