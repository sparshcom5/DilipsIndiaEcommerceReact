/**
 * Category list helpers.
 *
 * `GET /admin/categories` returns the tree flattened depth-first, so every
 * child immediately follows its parent and carries a `depth`. These helpers
 * turn that into something readable in the two places it is shown: a native
 * <select> and the Categories list.
 */

const NBSP = ' ';

/**
 * Label for a category inside a <select>.
 *
 * Options cannot be styled reliably across browsers, so the hierarchy has to
 * be drawn with characters: four spaces per level, then an elbow.
 */
export function categoryOptionLabel(category) {
  const depth = category.depth ?? category.level ?? 0;
  if (!depth) return category.name;
  return `${NBSP.repeat(depth * 4)}└${NBSP}${category.name}`;
}

/** Rows a category cannot be re-parented to: itself and its own descendants. */
export function descendantIds(categories, id) {
  const blocked = new Set([id]);
  // The list is depth-first, so a parent is always seen before its children.
  for (const c of categories) {
    if (c.parent_id != null && blocked.has(c.parent_id)) blocked.add(c.id);
  }
  return blocked;
}
