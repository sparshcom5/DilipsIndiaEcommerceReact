/**
 * Variant matrix helpers.
 *
 * A product's variants each carry an `options` map of { attributeCode: valueId }.
 * Selecting one value per option group identifies at most one variant.
 */

/** The variant matching every selected option, or null if the combo doesn't exist. */
export function findVariant(product, selection) {
  const variants = product?.variants ?? [];
  const codes = Object.keys(selection);

  // A simple product carries no option groups, so there is nothing to select
  // and no combination to match — its default variant is the only answer.
  // Returning null here would make the page report the product as unavailable.
  if (!codes.length) {
    return variants.find((v) => v.id === product?.defaultVariantId) || variants[0] || null;
  }

  return (
    variants.find((v) => codes.every((code) => v.options[code] === selection[code])) || null
  );
}

/** Selection that lands on the product's default variant. */
export function initialSelection(product) {
  const fallback = product.variants.find((v) => v.id === product.defaultVariantId) || product.variants[0];
  if (!fallback) return {};

  return Object.fromEntries(
    product.options.map((opt) => [opt.code, fallback.options[opt.code]])
  );
}

/**
 * Value ids that lead to no purchasable variant, holding the *other* current
 * selections fixed. Used to strike through sold-out combinations without
 * disabling them, so shoppers can still navigate to them.
 */
export function unavailableValueIds(product, selection) {
  const result = new Map();

  for (const opt of product.options) {
    const others = Object.entries(selection).filter(([code]) => code !== opt.code);
    const soldOut = new Set();

    for (const value of opt.values) {
      const reachable = product.variants.some(
        (v) =>
          v.options[opt.code] === value.id &&
          others.every(([code, valueId]) => v.options[code] === valueId) &&
          v.inStock
      );
      if (!reachable) soldOut.add(value.id);
    }

    result.set(opt.code, soldOut);
  }

  return result;
}
