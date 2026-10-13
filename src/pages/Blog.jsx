import { Link } from 'react-router-dom';
import { User, Clock, ArrowRight, ImageOff, ShieldCheck, Gem, Zap } from 'lucide-react';

import { getBlogPosts, mediaUrl } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Shell } from '../components/layout/Layout.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

const QUALITIES = [
  { Icon: ShieldCheck, title: 'Premium Quality', subtitle: 'International Standards' },
  { Icon: Gem, title: 'Durable & Reliable', subtitle: 'Built to Last' },
  { Icon: Zap, title: 'Innovative Design', subtitle: 'Style Meets Function' },
];

function DateChip({ iso }) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    <span className="absolute bottom-4 left-4 rounded-sm bg-white px-3 py-1.5 text-center leading-tight shadow">
      <span className="block text-base font-bold text-ink-900">{String(d.getDate()).padStart(2, '0')}</span>
      <span className="block text-[10px] uppercase tracking-wide text-ink-500">
        {d.toLocaleString('en-IN', { month: 'short' })}
      </span>
    </span>
  );
}

function Cover({ src, alt, children }) {
  return (
    <div className="relative grid h-full min-h-[220px] place-items-center overflow-hidden bg-ink-100">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <ImageOff size={26} className="absolute text-ink-400" aria-hidden />
      {children}
    </div>
  );
}

function Meta({ post }) {
  return (
    <div className="flex flex-wrap items-center gap-5 text-xs text-ink-500">
      <span className="flex items-center gap-1.5">
        <User size={13} className="text-brand" aria-hidden />
        {post.author}
      </span>
      <span className="flex items-center gap-1.5">
        <Clock size={13} aria-hidden />
        {post.readMinutes} min read
      </span>
    </div>
  );
}

export default function Blog() {
  const { data, loading } = useApi(() => getBlogPosts(), []);

  const posts = data?.posts ?? [];
  const [featured, ...rest] = posts;

  return (
    <>
      <Shell className="py-12">
        <h1 className="text-3xl font-bold text-ink-900">Blog / News</h1>
        <p className="mt-2 text-base text-ink-500">
          Stay updated with the latest trends, tips, and innovations from the world of bathroom fittings.
        </p>

        {loading && <p className="mt-10 text-sm text-ink-500">Loading posts…</p>}

        {featured && (
          <article className="mt-9 grid overflow-hidden rounded-card bg-ink-100 lg:grid-cols-[420px_1fr]">
            <Cover src={mediaUrl(featured.imageUrl)} alt={featured.title}>
              <span className="absolute left-4 top-4 rounded-sm bg-brand px-3 py-1 text-xs font-semibold text-white">
                Featured
              </span>
              <DateChip iso={featured.publishedAt} />
            </Cover>

            <div className="p-10">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                {featured.category?.name}
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-snug text-ink-900">
                <Link to={`/blog/${featured.slug}`} className="hover:text-brand">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-[70ch] text-sm leading-6 text-ink-600">{featured.excerpt}</p>

              <div className="mt-6">
                <Meta post={featured} />
              </div>

              <Link
                to={`/blog/${featured.slug}`}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:opacity-80"
              >
                Read More <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div className="mt-8 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-card bg-white shadow-[0_1px_3px_rgba(17,24,39,0.06)]"
              >
                <div className="relative h-[210px]">
                  <Cover src={mediaUrl(post.imageUrl)} alt={post.title}>
                    <span className="absolute left-4 top-4 rounded-sm bg-brand px-3 py-1 text-xs font-semibold text-white">
                      {post.category?.name}
                    </span>
                    <DateChip iso={post.publishedAt} />
                  </Cover>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold leading-snug text-ink-900">
                    <Link to={`/blog/${post.slug}`} className="hover:text-brand">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-ink-600">{post.excerpt}</p>

                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-ink-200 pt-4">
                    <Meta post={post} />
                    <Link
                      to={`/blog/${post.slug}`}
                      className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:opacity-80"
                    >
                      Read More <ArrowRight size={14} aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <ul className="mt-14 grid gap-8 border-t border-ink-200 pt-10 sm:grid-cols-3">
          {QUALITIES.map(({ Icon, title, subtitle }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-brand/10 text-brand">
                <Icon size={19} aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-900">{title}</span>
                <span className="block text-xs text-ink-500">{subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      </Shell>

      <BrochureCta />
    </>
  );
}
