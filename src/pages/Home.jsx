import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ImageOff, ArrowUpRight } from 'lucide-react';

import { getCatalogProducts, getCategories, getBanners, mediaUrl } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useSite } from '../context/SiteContext.jsx';
import { Shell } from '../components/layout/Layout.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import FeatureStrip from '../components/common/FeatureStrip.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

const ROOM_TILES = [
  { label: 'Bathroom', slug: 'bath-products', span: true, image: '/images/rooms/bathroom.jpg' },
  { label: 'Kitchen', slug: 'mixers', span: false, image: '/images/rooms/kitchen.jpg' },
  { label: 'Toilet', slug: 'valves', span: false, image: '/images/rooms/toilet.jpg' },
];

function Tile({ tile }) {
  return (
    <Link
      to={`/products?category=${tile.slug}`}
      className={`group relative isolate block overflow-hidden rounded-sm bg-ink-200 ${
        tile.span ? 'sm:col-span-2' : ''
      }`}
    >
      <div className="aspect-[4/3] sm:aspect-auto sm:h-[280px]">
        <img
          src={tile.image}
          alt={tile.label}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
      </div>
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <span className="absolute bottom-5 left-5 text-lg font-semibold text-white">{tile.label}</span>
    </Link>
  );
}

function Rail({ heading, headingAccent, products, loading, tabs, activeTab, onTab }) {
  return (
    <Shell className="py-14">
      <h2 className="text-2xl font-light text-ink-900 sm:text-3xl">
        {heading} <span className="font-bold">{headingAccent}</span>
      </h2>

      {tabs && (
        <div className="mt-6 flex flex-wrap gap-7 border-b border-ink-200">
          {tabs.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => onTab(t.slug)}
              className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
                activeTab === t.slug
                  ? 'border-brand font-semibold text-ink-900'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-ink-500">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="mt-10 text-sm text-ink-500">No products in this range yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </Shell>
  );
}

export default function Home() {
  const [tab, setTab] = useState('');
  // Home hero copy/image is admin-managed under Appearance → Page Banners.
  const { banner } = useSite();
  const hero = banner('home');

  const { data: banners } = useApi(() => getBanners(), []);
  const { data: cats } = useApi(() => getCategories(), []);
  const { data: bestsellers, loading: loadingBest } = useApi(
    () => getCatalogProducts({ category: tab || undefined, sort: 'popularity', perPage: 4 }),
    [tab]
  );
  const { data: accessories, loading: loadingAcc } = useApi(
    () => getCatalogProducts({ sort: 'newest', perPage: 4 }),
    []
  );

  const strip = banners?.banners.find((b) => b.placement === 'home_strip');

  // Tabs are the live sub-categories of Bath Products, so the rail can never
  // point at a range that no longer exists.
  const bathChildren = cats?.categories.find((c) => c.slug === 'bath-products')?.children ?? [];
  const tabs = [{ slug: '', label: 'All' }, ...bathChildren.map((c) => ({ slug: c.slug, label: c.name }))];

  return (
    <>
      {/* Hero — full-bleed image with copy overlaid, matching frame 1619:35927. */}
      {hero !== null && (
        <section className="relative isolate overflow-hidden bg-ink-900">
          {hero?.imageUrl && (
            <img
              src={mediaUrl(hero.imageUrl)}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.remove();
              }}
            />
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/25" />

          <div className="relative mx-auto max-w-shell px-6 py-28 lg:py-36">
            <div className="max-w-[52ch]">
              {hero?.eyebrow && (
                <p className="text-xs uppercase tracking-[0.22em] text-brand">{hero.eyebrow}</p>
              )}
              <h1 className="mt-4 text-4xl font-light leading-tight text-white sm:text-6xl">
                {hero?.title ?? 'Elegance in'}{' '}
                <span className="font-bold">{hero?.titleAccent ?? 'Bath Fittings'}</span>
              </h1>
              {hero?.subtitle && (
                <p className="mt-5 max-w-[52ch] text-sm leading-6 text-white/80">{hero.subtitle}</p>
              )}

              {hero?.ctaText && hero?.ctaUrl && (
                <Link
                  to={hero.ctaUrl}
                  className="mt-9 inline-flex items-center gap-3 rounded-full bg-brand py-2.5 pl-6 pr-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                >
                  {hero.ctaText}
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-black">
                    <ArrowUpRight size={15} aria-hidden />
                  </span>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Intro */}
      <Shell className="py-16">
        <div className="grid gap-8 lg:grid-cols-[380px_1px_1fr] lg:gap-12">
          <h2 className="text-2xl font-light leading-tight text-ink-900 sm:text-3xl">
            We are the best in
            <br />
            <span className="font-bold">Fitting Products</span>
          </h2>
          <div aria-hidden className="hidden bg-ink-200 lg:block" />
          <p className="max-w-[70ch] text-sm leading-6 text-ink-600">
            We are dedicated to delivering outstanding service to our customers, ensuring they receive
            the best products. Our focus is on excellence in both service and product quality. We
            strive to exceed customer expectations with every experience.
          </p>
        </div>
      </Shell>

      {/* Rooms */}
      <section className="bg-ink-100 py-16">
        <Shell>
          <h2 className="text-2xl font-light text-ink-900 sm:text-3xl">
            Enhance the heart and <span className="font-bold">comfort of your home</span>
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-4">
            {ROOM_TILES.map((t) => (
              <Tile key={t.label} tile={t} />
            ))}
          </div>
        </Shell>
      </section>

      <Rail
        heading="Explore Dilips"
        headingAccent="Home Bestsellers"
        products={bestsellers?.products ?? []}
        loading={loadingBest}
        tabs={tabs}
        activeTab={tab}
        onTab={setTab}
      />

      {/* Accessories banner */}
      <section className="relative isolate flex h-[220px] items-center justify-center overflow-hidden bg-ink-900">
        <img
          src={mediaUrl(strip?.imageUrl) || '/images/banners/fitting-accessories.jpg'}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          onError={(e) => {
            e.currentTarget.remove();
          }}
        />
        <h2 className="relative text-3xl font-medium text-white">{strip?.title || 'Fitting Accessories'}</h2>
      </section>

      <Rail heading="New in" headingAccent="Accessories" products={accessories?.products ?? []} loading={loadingAcc} />

      {/* Video */}
      <Shell className="pb-16">
        <div className="flex items-center gap-8">
          <p
            className="hidden text-2xl text-ink-400 lg:block"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Experience <span className="text-ink-900">us now</span>
          </p>

          <div className="relative grid flex-1 aspect-[16/7] place-items-center overflow-hidden rounded-sm bg-ink-200">
            <ImageOff size={30} className="text-ink-400" aria-hidden />
            <button
              type="button"
              aria-label="Play product video"
              className="absolute grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-900 shadow-lg transition-transform hover:scale-105"
            >
              <Play size={22} className="ml-1" aria-hidden />
            </button>
          </div>
        </div>
      </Shell>

      <FeatureStrip className="!py-0 pb-16" />
      <BrochureCta />
    </>
  );
}
