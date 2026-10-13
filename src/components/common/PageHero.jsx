import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { useSite } from '../../context/SiteContext.jsx';
import { mediaUrl } from '../../lib/api.js';

/**
 * Full-bleed hero used on every inner page.
 *
 * Content comes from the admin (Appearance → Page Banners) via `pageKey`.
 * The props act as fallbacks for first paint and for any page the admin has
 * not configured; setting a banner inactive hides the hero entirely.
 */
export default function PageHero({ pageKey, title, titleAccent, subtitle, image, crumbs = [] }) {
  const { banner, banners } = useSite();
  const managed = pageKey ? banner(pageKey) : null;

  // The API only returns active banners. So once banners have loaded and this
  // page's key is absent, the admin switched the hero off — as opposed to the
  // request simply not having landed yet, when we fall back to the props.
  const loaded = Object.keys(banners).length > 0;
  if (pageKey && loaded && !managed) return null;

  const eyebrow = managed?.eyebrow;
  const heading = managed?.title ?? title;
  const accent = managed?.titleAccent ?? titleAccent;
  const sub = managed?.subtitle ?? subtitle;
  const bg = mediaUrl(managed?.imageUrl) ?? image;
  const ctaText = managed?.ctaText;
  const ctaUrl = managed?.ctaUrl;

  return (
    <section className="relative isolate overflow-hidden bg-ink-900">
      {bg && (
        <img
          src={bg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          onError={(e) => {
            e.currentTarget.remove();
          }}
        />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />

      <div className="relative mx-auto flex max-w-shell flex-col items-center justify-center px-6 py-28 text-center sm:py-36">
        {eyebrow && (
          <p className="mb-3 text-xs uppercase tracking-[0.22em] text-brand">{eyebrow}</p>
        )}

        <h1 className="text-4xl font-light text-white sm:text-6xl">
          {heading} <span className="font-bold">{accent}</span>
        </h1>

        {sub && <p className="mt-4 max-w-[62ch] text-sm leading-6 text-white/80">{sub}</p>}

        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mt-4">
            <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm uppercase tracking-wide">
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="text-white/40">|</span>}
                  {c.to ? (
                    <Link to={c.to} className="text-brand transition-opacity hover:opacity-80">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white/90">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {ctaText && ctaUrl && (
          <Link
            to={ctaUrl}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-brand py-2.5 pl-6 pr-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            {ctaText}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black">
              <ArrowUpRight size={15} aria-hidden />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
