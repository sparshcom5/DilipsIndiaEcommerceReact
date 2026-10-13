import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, ImageOff } from 'lucide-react';

import { getBlogPost, mediaUrl } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Shell } from '../components/layout/Layout.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, loading, error } = useApi(() => getBlogPost(slug), [slug]);

  if (loading) {
    return (
      <Shell className="py-24">
        <p className="text-center text-ink-500">Loading…</p>
      </Shell>
    );
  }

  if (error || !post) {
    return (
      <Shell className="py-24 text-center">
        <p className="text-ink-500">We couldn&rsquo;t find that article.</p>
        <Link to="/blog" className="mt-4 inline-block text-sm font-semibold text-brand">
          Back to Blog
        </Link>
      </Shell>
    );
  }

  return (
    <>
      <Shell className="py-12">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:opacity-80">
          <ArrowLeft size={16} aria-hidden />
          Back to Blog
        </Link>

        <article className="mx-auto mt-8 max-w-[820px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{post.category?.name}</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">{post.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-5 text-sm text-ink-500">
            <span className="flex items-center gap-2">
              <User size={14} className="text-brand" aria-hidden />
              {post.author}
            </span>
            {post.publishedAt && (
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}
          </div>

          <div className="mt-8 grid h-[340px] place-items-center overflow-hidden rounded-card bg-ink-100">
            {post.imageUrl ? (
              <img
                src={mediaUrl(post.imageUrl)}
                alt={post.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <ImageOff size={28} className="absolute text-ink-400" aria-hidden />
          </div>

          <div
            className="mt-10 text-base leading-8 text-ink-700 [&_p]:mb-5"
            dangerouslySetInnerHTML={{ __html: post.content || '' }}
          />
        </article>
      </Shell>

      <BrochureCta />
    </>
  );
}
