import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown } from 'lucide-react';

import { getCatalogProducts, getFaqs } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Shell } from '../components/layout/Layout.jsx';
import PageHero from '../components/common/PageHero.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import FeatureStrip from '../components/common/FeatureStrip.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-ink-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-5 text-left"
      >
        <span className="text-base font-semibold text-ink-900">{item.question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && <p className="pb-5 text-sm leading-6 text-ink-500">{item.answer}</p>}
    </div>
  );
}

function FaqSection() {
  const { data } = useApi(() => getFaqs(), []);
  const [tab, setTab] = useState(0);
  const [openIndex, setOpenIndex] = useState(0);

  const groups = data?.groups ?? [];
  if (!groups.length) return null;

  const active = groups[Math.min(tab, groups.length - 1)];

  return (
    <section className="bg-ink-100 py-16">
      <Shell>
        <div className="flex flex-wrap justify-center gap-4">
          {groups.map((g, i) => (
            <button
              key={g.category}
              type="button"
              onClick={() => {
                setTab(i);
                setOpenIndex(0);
              }}
              className={`rounded-full border px-7 py-2.5 text-sm font-medium transition-colors ${
                i === tab
                  ? 'border-ink-900 bg-ink-900 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
              }`}
            >
              {g.category}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-[760px]">
          {active.items.map((item, i) => (
            <FaqItem
              key={item.question}
              item={item}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </Shell>
    </section>
  );
}

/**
 * Bath Products (1880:42) and Hardware Products (1877:15496) share a layout:
 * hero, a dark product grid, an FAQ block, the promise strip and the brochure
 * band. Only the copy and category differ.
 */
export default function CategoryLanding({ slug, title, titleAccent, subtitle, heroImage, pageKey }) {
  const [sort, setSort] = useState('popularity');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');

  const { data, loading } = useApi(
    () => getCatalogProducts({ category: slug, sort, q: query, perPage: 8 }),
    [slug, sort, query]
  );

  return (
    <>
      <PageHero
        pageKey={pageKey || slug}
        title={title}
        titleAccent={titleAccent}
        subtitle={subtitle}
        image={heroImage}
        crumbs={[{ label: 'Home', to: '/' }, { label: `${title} ${titleAccent}` }]}
      />

      <Shell className="py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">
              {title} {titleAccent}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setQuery(q)}
                placeholder="Search Products"
                aria-label="Search products"
                className="w-52 rounded-input border border-ink-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="rounded-input border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="popularity">Sort By : Popularity</option>
              <option value="price_asc">Sort By : Price Low to High</option>
              <option value="price_desc">Sort By : Price High to Low</option>
              <option value="rating">Sort By : Rating</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-ink-500">Loading products…</p>
        ) : !data?.products.length ? (
          <p className="mt-10 text-sm text-ink-500">Nothing in this range yet.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.products.map((p) => (
              <ProductCard key={p.id} product={p} variant="dark" />
            ))}
          </div>
        )}

        {data?.pagination.total > data?.products.length && (
          <p className="mt-8 text-center">
            <Link
              to={`/products?category=${slug}`}
              className="inline-flex h-12 items-center rounded-control border border-brand px-7 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
            >
              View all {data.pagination.total} products
            </Link>
          </p>
        )}
      </Shell>

      <FaqSection />
      <FeatureStrip />
      <BrochureCta />
    </>
  );
}
