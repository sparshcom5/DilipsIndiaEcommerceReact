import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, ShoppingCart, Check } from 'lucide-react';

import { getProductBySlug } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice, percentOff } from '../lib/format.js';
import { findVariant, initialSelection, unavailableValueIds } from '../lib/variants.js';
import { Shell } from '../components/layout/Layout.jsx';
import ProductGallery from '../components/product/ProductGallery.jsx';
import TrustBadges, { buildTrustBadges } from '../components/product/TrustBadges.jsx';
import StarRating from '../components/ui/StarRating.jsx';
import OptionSelector from '../components/ui/OptionSelector.jsx';
import QuantityStepper from '../components/ui/QuantityStepper.jsx';
import Accordion from '../components/ui/Accordion.jsx';

const BESTSELLER_THRESHOLD = 100;

function PageState({ children }) {
  return (
    <Shell className="py-24">
      <p className="text-center text-ink-500">{children}</p>
    </Shell>
  );
}

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, busy } = useCart();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [selection, setSelection] = useState({});
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setError(null);

    getProductBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setSelection(initialSelection(data));
        setQty(data.minOrderQty || 1);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const variant = useMemo(
    () => (product ? findVariant(product, selection) : null),
    [product, selection]
  );

  const soldOutByCode = useMemo(
    () => (product ? unavailableValueIds(product, selection) : new Map()),
    [product, selection]
  );

  const trustBadges = useMemo(() => {
    if (!product) return [];
    const warranty = product.specifications.find((s) => s.code === 'warranty')?.value;
    return buildTrustBadges({
      warranty,
      isReturnable: product.isReturnable,
      returnWindowDays: product.returnWindowDays,
    });
  }, [product]);

  const addToCart = async () => {
    if (!variant) return null;
    setNotice(null);
    try {
      const next = await addItem(variant.id, qty);
      if (next.capped) {
        setNotice(`Only ${next.capped.granted} available — your cart was updated to that quantity.`);
      } else {
        setNotice(`Added ${qty} × ${product.name} to your cart.`);
      }
      return next;
    } catch (err) {
      setNotice(err.message);
      return null;
    }
  };

  const buyNow = async () => {
    const next = await addToCart();
    if (next) navigate('/checkout');
  };

  if (error) {
    return (
      <PageState>
        {error.status === 404
          ? 'We could not find that product.'
          : `Something went wrong loading this product: ${error.message}`}
      </PageState>
    );
  }

  if (!product) return <PageState>Loading product…</PageState>;

  // The gallery is product-wide unless a variant ships its own imagery.
  const images = product.images.filter(
    (img) => img.variantId == null || img.variantId === variant?.id
  );

  const discount = variant ? percentOff(variant.mrp, variant.sellingPrice) : 0;
  const purchasable = Boolean(variant?.inStock);
  const isBestseller = product.isFeatured || product.soldCount >= BESTSELLER_THRESHOLD;

  // Variant-defining attributes belong in the selectors, not the spec table —
  // but the *chosen* values still belong in Specifications.
  const selectedOptionSpecs = product.options.map((opt) => ({
    name: opt.name,
    value: opt.values.find((v) => v.id === selection[opt.code])?.value || '—',
  }));

  return (
    <Shell className="py-10">
      <div className="grid gap-10 lg:grid-cols-[662fr_767fr] lg:gap-x-[42px]">
        <ProductGallery images={images} badge={isBestseller ? 'Bestseller' : null} />

        <div>
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-ink-900">
                {product.category?.name || product.name}
              </h1>
              {product.category?.name && (
                <p className="mt-2 text-lg text-ink-500">{product.name}</p>
              )}
            </div>

            <button
              type="button"
              className="flex shrink-0 items-center gap-2 text-sm text-ink-600 transition-colors hover:text-brand"
            >
              <Heart size={18} aria-hidden />
              Add to Wishlist
            </button>
          </div>

          <div className="mt-4">
            <StarRating value={product.rating.average} count={product.rating.count} />
          </div>

          <hr className="my-6 border-ink-200" />

          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-bold text-ink-900">
                {formatPrice(variant?.sellingPrice ?? product.variants[0]?.sellingPrice)}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-ink-400 line-through">
                    {formatPrice(variant.mrp)}
                  </span>
                  <span className="text-sm font-semibold text-success">{discount}% off</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-400">
              MRP (Incl. of all taxes)
            </p>
          </div>

          <div className="mt-7 space-y-6">
            {product.options.map((opt) => (
              <OptionSelector
                key={opt.code}
                label={opt.name}
                values={opt.values}
                selectedId={selection[opt.code]}
                unavailable={soldOutByCode.get(opt.code)}
                onSelect={(valueId) =>
                  setSelection((prev) => ({ ...prev, [opt.code]: valueId }))
                }
              />
            ))}
          </div>

          <div className="mt-7">
            <QuantityStepper
              value={qty}
              onChange={setQty}
              min={product.minOrderQty}
              max={Math.min(product.maxOrderQty, variant?.availableQuantity || product.maxOrderQty)}
            />
          </div>

          {!purchasable && (
            <p className="mt-4 text-sm font-medium text-brand">
              {variant
                ? 'This combination is out of stock.'
                : product.options.length
                  ? 'This combination is not available.'
                  : // No options and no variant means the product carries no
                    // price yet — the same state the listing shows as
                    // "Unavailable".
                    'This product is not available to order yet.'}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={addToCart}
              disabled={!purchasable || busy}
              className="inline-flex h-12 min-w-[244px] items-center justify-center gap-2.5 rounded-control bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShoppingCart size={18} aria-hidden />
              {busy ? 'Adding…' : 'Add to Cart'}
            </button>

            <button
              type="button"
              onClick={buyNow}
              disabled={!purchasable || busy}
              className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-control border border-brand px-6 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Buy Now
            </button>
          </div>

          {notice && (
            <p role="status" className="mt-4 text-sm text-ink-700">
              {notice}
            </p>
          )}

          {product.highlights.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-ink-900">Product Highlights</h2>
              <ul className="space-y-2">
                {product.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-600">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-9">
            <TrustBadges badges={trustBadges} />
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-3">
        <Accordion title="Product Description">
          <div
            className="text-sm leading-6 text-ink-600 [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
          />
        </Accordion>

        <Accordion title="Specifications">
          <dl className="space-y-3 text-sm">
            {[...selectedOptionSpecs, ...product.specifications].map((s) => (
              <div key={s.name} className="flex items-baseline justify-between gap-6">
                <dt className="text-ink-500">{s.name}</dt>
                <dd className="text-right font-medium text-ink-900">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Accordion>

        <Accordion title="Care Instructions">
          <ul className="space-y-3 text-sm text-ink-600">
            {product.careInstructions.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </Accordion>
      </div>
    </Shell>
  );
}
