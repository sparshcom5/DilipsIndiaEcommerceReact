const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₹4,250 — Indian digit grouping, no decimals (the design shows none). */
export const formatPrice = (value) => (value == null ? '' : inr.format(value));

export const percentOff = (mrp, selling) =>
  mrp && selling && mrp > selling ? Math.round(((mrp - selling) / mrp) * 100) : 0;
