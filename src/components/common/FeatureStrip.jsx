import { Truck, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { Shell } from '../layout/Layout.jsx';

/** The four-up promise row shared by Home, Who We Are and the category pages. */
export const PROMISES = [
  {
    Icon: Truck,
    title: 'Damage-Free Delivery',
    body: 'We ensure your order arrives safely—handled with care every step of the way!',
  },
  {
    Icon: RefreshCw,
    title: 'Returns & Exchanges',
    body: 'Shop with peace of mind—return or exchange within 30 days, with warranty guaranteed.',
  },
  {
    Icon: ShieldCheck,
    title: 'Best-In-Class Warranty',
    body: 'Enjoy up to 10 years of reliable protection for your complete peace of mind.',
  },
  {
    Icon: Wrench,
    title: 'Installation Service',
    body: 'Get the perfect fit and let our experts take care of the installation for you.',
  },
];

export default function FeatureStrip({ items = PROMISES, className = '' }) {
  return (
    <Shell className={`py-16 ${className}`}>
      <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ Icon, title, body }) => (
          <li key={title}>
            <Icon size={26} className="text-brand" aria-hidden />
            <h3 className="mt-4 text-sm font-bold text-ink-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-500">{body}</p>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
