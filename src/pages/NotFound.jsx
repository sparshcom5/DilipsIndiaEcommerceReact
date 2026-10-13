import { Link } from 'react-router-dom';
import { Shell } from '../components/layout/Layout.jsx';

export default function NotFound() {
  return (
    <Shell className="py-28 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">We couldn&rsquo;t find that page</h1>
      <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-500">
        The link may be out of date, or the page may have moved.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          to="/"
          className="inline-flex h-12 items-center rounded-control bg-brand px-7 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Back to Home
        </Link>
        <Link
          to="/products"
          className="inline-flex h-12 items-center rounded-control border border-brand px-7 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
        >
          Browse Products
        </Link>
      </div>
    </Shell>
  );
}
