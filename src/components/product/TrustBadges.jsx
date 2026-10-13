import { Truck, ShieldCheck, RefreshCw } from 'lucide-react';

const FREE_DELIVERY_THRESHOLD = 999;

/**
 * Derived from product data rather than hardcoded, so the row reflects the
 * actual warranty and return window on each product.
 */
export function buildTrustBadges({ warranty, isReturnable, returnWindowDays }) {
  const badges = [
    {
      Icon: Truck,
      title: 'Free Delivery',
      subtitle: `On orders above ₹${FREE_DELIVERY_THRESHOLD}`,
    },
  ];

  if (warranty) {
    badges.push({
      Icon: ShieldCheck,
      // "5 Years" reads correctly in the spec table but not as a compound
      // modifier, so the badge says "5 Year Warranty".
      title: `${warranty.replace(/\bYears\b/i, 'Year')} Warranty`,
      subtitle: 'On manufacturing defects',
    });
  }

  if (isReturnable) {
    badges.push({
      Icon: RefreshCw,
      title: 'Easy Returns',
      subtitle: `Within ${returnWindowDays} days`,
    });
  }

  return badges;
}

export default function TrustBadges({ badges }) {
  if (!badges?.length) return null;

  return (
    <ul className="grid gap-6 rounded-card bg-white px-6 py-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)] sm:grid-cols-3">
      {badges.map(({ Icon, title, subtitle }) => (
        <li key={title} className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/10 text-brand">
            <Icon size={20} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-ink-900">{title}</span>
          <span className="text-xs text-ink-500">{subtitle}</span>
        </li>
      ))}
    </ul>
  );
}
