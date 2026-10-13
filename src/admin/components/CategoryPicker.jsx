import { Field, Select } from './ui.jsx';

/**
 * Cascading category picker, laid out across a row.
 *
 * One dropdown per level: pick a nav menu and, if it has categories, a second
 * appears beside it; pick one of those and, if it has sub-categories, a third
 * appears, to any depth.
 *
 * **Every visible level is required.** A deeper dropdown only appears when the
 * choice above it has children, so requiring each one is the same as saying a
 * product must be filed at the deepest level that exists — never against a
 * branch that still has categories beneath it.
 *
 * `value` is the id of the deepest selection. Choosing a level clears the
 * levels below it.
 */

// Matches how the business names the levels: a category with no parent is a
// nav menu, its children are categories, and theirs are sub-categories.
const LEVEL_LABELS = ['Category', 'Sub-category', 'Sub-category'];
const labelFor = (depth) =>
  depth < LEVEL_LABELS.length ? LEVEL_LABELS[depth] : `Sub-category (level ${depth + 1})`;

/** The chain of ids from the root down to `value`, so the row can be rebuilt. */
export function categoryChain(categories, value) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chain = [];
  let node = value ? byId.get(Number(value)) : null;
  while (node) {
    chain.unshift(node.id);
    node = node.parent_id ? byId.get(node.parent_id) : null;
  }
  return chain;
}

/**
 * True when the selection still has categories under it — i.e. a further
 * dropdown is showing and has not been answered. Used by the form to block
 * saving a half-finished choice.
 */
export function categoryIncomplete(categories, value) {
  if (!value) return true;
  const node = categories.find((c) => c.id === Number(value));
  return Boolean(node?.hasChildren);
}

export default function CategoryPicker({ categories = [], value, onChange, error }) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenOf = (parentId) =>
    categories.filter((c) => (c.parent_id ?? null) === (parentId ?? null));

  const chain = categoryChain(categories, value);

  // One dropdown per level that has something to offer; stops once the current
  // selection is a leaf.
  const rows = [];
  let parentId = null;
  for (let depth = 0; ; depth += 1) {
    const options = childrenOf(parentId);
    if (!options.length) break;
    rows.push({ depth, options, selected: chain[depth] ?? '' });
    if (!chain[depth]) break;
    parentId = chain[depth];
  }

  // Clearing a level drops back to nothing selected at that level, which also
  // clears everything below because the chain is rebuilt from `value`.
  const pick = (depth, raw) => onChange(raw ? String(raw) : depth === 0 ? '' : String(chain[depth - 1] ?? ''));

  const selected = value ? byId.get(Number(value)) : null;
  const incomplete = categoryIncomplete(categories, value);

  return (
    <div className="sm:col-span-2">
      <div className="flex flex-col gap-5 sm:flex-row">
        {rows.map((row) => (
          <Field
            key={row.depth}
            label={labelFor(row.depth)}
            required
            className="flex-1"
            // The message belongs on the dropdown still waiting for an answer.
            error={error && !row.selected ? error : undefined}
          >
            <Select value={row.selected} onChange={(e) => pick(row.depth, e.target.value)}>
              <option value="">— select —</option>
              {row.options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.hasChildren ? ' ›' : ''}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </div>

      {selected && !incomplete && (
        <p className="mt-2 text-xs text-ink-500">
          Filed under <strong className="text-ink-700">{selected.name}</strong>
          {chain.length > 1 && (
            <span className="text-ink-400">
              {'  ·  '}
              {chain.map((id) => byId.get(id)?.name).join(' › ')}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
