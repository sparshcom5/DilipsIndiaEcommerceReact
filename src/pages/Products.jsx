import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, ChevronDown } from 'lucide-react';

import { getCatalogProducts, getCategories } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { formatPrice } from '../lib/format.js';
import { Shell } from '../components/layout/Layout.jsx';
import PageHero from '../components/common/PageHero.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'name', label: 'Name A–Z' },
];

const FACET_PARAM = { finish: 'finish', mount_type: 'mount' };

function FilterGroup({ title, children }) {
  return (
    <section className="border-t border-ink-200 py-5 first:border-t-0 first:pt-0">
      <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-ink-900">
        {title}
        <ChevronDown size={16} className="text-ink-400" aria-hidden />
      </h3>
      {children}
    </section>
  );
}

export default function Products() {
  const [params, setParams] = useSearchParams();

  const category = params.get('category') || '';
  const q = params.get('q') || '';
  const sort = params.get('sort') || 'popularity';
  const maxPrice = params.get('maxPrice') || '';
  const selected = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(FACET_PARAM).map(([code, key]) => [
          code,
          (params.get(key) || '').split(',').filter(Boolean),
        ])
      ),
    [params]
  );

  const { data: cats } = useApi(() => getCategories(), []);
  const { data, loading } = useApi(
    () =>
      getCatalogProducts({
        category,
        q,
        sort,
        maxPrice,
        finish: selected.finish,
        mount: selected.mount_type,
        perPage: 12,
      }),
    [category, q, sort, maxPrice, selected.finish.join(','), selected.mount_type.join(',')]
  );

  const patch = (updates) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (!v || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : v);
    }
    setParams(next, { replace: true });
  };

  const toggleFacet = (code, slug) => {
    const key = FACET_PARAM[code];
    const current = selected[code];
    patch({ [key]: current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug] });
  };

  const flatCategories = useMemo(() => {
    const out = [];
    const walk = (nodes, depth = 0) => {
      for (const n of nodes) {
        out.push({ ...n, depth });
        if (n.children.length) walk(n.children, depth + 1);
      }
    };
    walk(cats?.categories ?? []);
    return out;
  }, [cats]);

  const activeCategory = flatCategories.find((c) => c.slug === category);

  // Chips mirror every active filter so nothing is applied invisibly.
  const chips = [
    activeCategory && { label: activeCategory.name, clear: () => patch({ category: '' }) },
    q && { label: `"${q}"`, clear: () => patch({ q: '' }) },
    maxPrice && { label: `Under ${formatPrice(Number(maxPrice))}`, clear: () => patch({ maxPrice: '' }) },
    ...(data?.facets ?? []).flatMap((f) =>
      selected[f.code].map((slug) => ({
        label: `${f.name}: ${f.values.find((v) => v.slug === slug)?.value ?? slug}`,
        clear: () => toggleFacet(f.code, slug),
      }))
    ),
  ].filter(Boolean);

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });

  return (
    <>
      <PageHero
        pageKey="products"
        title="Our"
        titleAccent="Products"
        image="/images/banners/products-hero.jpg"
        crumbs={[
          { label: 'Home', to: '/' },
          { label: 'Categories', to: '/products' },
          ...(activeCategory ? [{ label: activeCategory.name }] : []),
        ]}
      />

      <Shell className="py-12">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Filter rail */}
          <aside className="h-fit rounded-card bg-white p-6 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink-900">Filters</h2>
              <button type="button" onClick={clearAll} className="text-sm text-brand hover:opacity-80">
                Clear All
              </button>
            </div>

            <FilterGroup title="Categories">
              <ul className="space-y-2.5">
                {flatCategories.map((c) => (
                  <li key={c.slug} style={{ paddingLeft: c.depth * 12 }}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600">
                      <input
                        type="radio"
                        name="category"
                        checked={category === c.slug}
                        onChange={() => patch({ category: c.slug })}
                        className="h-4 w-4 accent-[var(--color-brand)]"
                      />
                      {c.name} <span className="text-ink-400">({c.productCount})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </FilterGroup>

            <FilterGroup title="Price Range">
              <input
                type="range"
                min={data?.priceRange.min ?? 0}
                max={data?.priceRange.max ?? 25000}
                step={50}
                value={maxPrice || data?.priceRange.max || 25000}
                onChange={(e) => patch({ maxPrice: e.target.value })}
                aria-label="Maximum price"
                className="w-full accent-[var(--color-brand)]"
              />
              <div className="mt-2 flex justify-between text-xs text-ink-500">
                <span>{formatPrice(data?.priceRange.min ?? 0)}</span>
                <span>{formatPrice(Number(maxPrice) || data?.priceRange.max || 25000)}</span>
              </div>
            </FilterGroup>

            {(data?.facets ?? []).map((f) => (
              <FilterGroup key={f.code} title={f.name}>
                <ul className="space-y-2.5">
                  {f.values.map((v) => (
                    <li key={v.slug}>
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-600">
                        <input
                          type="checkbox"
                          checked={selected[f.code].includes(v.slug)}
                          onChange={() => toggleFacet(f.code, v.slug)}
                          className="h-4 w-4 accent-[var(--color-brand)]"
                        />
                        {v.hexColor && (
                          <span
                            aria-hidden
                            className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15"
                            style={{ backgroundColor: v.hexColor }}
                          />
                        )}
                        {v.value} <span className="text-ink-400">({v.productCount})</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </FilterGroup>
            ))}

            <button
              type="button"
              onClick={clearAll}
              className="mt-4 w-full rounded-input bg-ink-100 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-200"
            >
              Clear All
            </button>
          </aside>

          {/* Grid */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-ink-900">
                  {activeCategory?.name || (q ? `Results for “${q}”` : 'All Products')}
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Premium bath and hardware fittings that blend style, performance and durability
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                  <input
                    defaultValue={q}
                    onKeyDown={(e) => e.key === 'Enter' && patch({ q: e.currentTarget.value })}
                    placeholder="Search Products"
                    aria-label="Search products"
                    className="w-52 rounded-input border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
                  />
                </div>

                <select
                  value={sort}
                  onChange={(e) => patch({ sort: e.target.value })}
                  aria-label="Sort products"
                  className="rounded-input border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      Sort By : {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {chips.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={c.clear}
                    className="inline-flex items-center gap-2 rounded-input border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-brand hover:text-brand"
                  >
                    {c.label}
                    <X size={13} aria-hidden />
                  </button>
                ))}
                <button type="button" onClick={clearAll} className="text-xs text-brand hover:opacity-80">
                  Clear All
                </button>
              </div>
            )}

            {loading ? (
              <p className="mt-10 text-sm text-ink-500">Loading products…</p>
            ) : !data?.products.length ? (
              <div className="mt-10 rounded-card bg-white p-16 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
                <p className="text-base font-semibold text-ink-900">No products match those filters</p>
                <p className="mt-1 text-sm text-ink-500">Try widening your selection.</p>
                <button type="button" onClick={clearAll} className="mt-5 text-sm font-semibold text-brand">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {data.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                <p className="mt-8 text-center text-sm text-ink-500">
                  Showing {data.products.length} of {data.pagination.total} products
                </p>
              </>
            )}
          </div>
        </div>
      </Shell>

      <BrochureCta />
    </>
  );
}
