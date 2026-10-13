import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * The design shows three of these side by side, all expanded, each in its own
 * white card. They collapse independently.
 */
export default function Accordion({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="rounded-card bg-white p-8 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span className="text-lg font-semibold text-ink-900">{title}</span>
          <span className="text-brand" aria-hidden>
            {open ? <Minus size={18} /> : <Plus size={18} />}
          </span>
        </button>
      </h2>

      <div id={panelId} hidden={!open} className="mt-6">
        {children}
      </div>
    </section>
  );
}
