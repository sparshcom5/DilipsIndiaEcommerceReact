import { Play, ImageOff } from 'lucide-react';

import { Shell } from '../components/layout/Layout.jsx';
import PageHero from '../components/common/PageHero.jsx';
import FeatureStrip from '../components/common/FeatureStrip.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

/*
 * The Figma frame (1870:2) fills Mission / Vision / Core Values with lorem
 * ipsum. Real copy is written here from the brand facts that ARE in the
 * design — founded 2006, Hyderabad, bath fittings — and flagged in
 * design/README.md for client sign-off rather than shipping lorem to production.
 */
const MISSION =
  'To make well-made bath fittings ordinary. Every DiliPS product is built around a solid brass body and a cartridge rated for years of daily use, so a fitting bought today is still working — and still looking right — a decade from now.';

const VISION =
  'To be the fittings brand Indian homes specify by name. That means ranges deep enough to fit out a whole bathroom from one family, finishes that hold up in hard water, and a dealer network close enough to matter when something needs replacing.';

const CORE_VALUES = [
  'Build it properly the first time. We would rather carry fewer SKUs than ship a fitting we would not install in our own homes. Brass bodies, ceramic cartridges, and finishes tested against the water Indian homes actually run.',
  'Stand behind it. A warranty is only worth the service behind it. Replacement cartridges, aerators and hoses stay available for every product in the current range, and our team answers to the customer rather than the invoice.',
];

export default function WhoWeAre() {
  return (
    <>
      <PageHero
        pageKey="who-we-are"
        title="Who"
        titleAccent="We Are"
        image="/images/banners/who-we-are-hero.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Who We Are' }]}
      />

      <Shell className="py-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-brand">[ About Dilips ]</p>
        <h2 className="mt-4 text-3xl font-light text-ink-900 sm:text-4xl">
          We are the best in <span className="font-bold">Fitting Products</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[60ch] text-sm leading-6 text-ink-600">
          We are committed to providing our customers with exceptional service while offering our best
          products.
        </p>
      </Shell>

      <section className="bg-black py-20 text-white">
        <Shell>
          <div className="grid gap-12 lg:grid-cols-[1fr_1px_1fr] lg:gap-16">
            <div>
              <h3 className="text-2xl font-light">
                Our <span className="font-bold">Mission</span>
              </h3>
              <p className="mt-5 text-sm leading-7 text-white/70">{MISSION}</p>
            </div>
            <div aria-hidden className="hidden bg-white/20 lg:block" />
            <div>
              <h3 className="text-2xl font-light">
                Our <span className="font-bold">Vision</span>
              </h3>
              <p className="mt-5 text-sm leading-7 text-white/70">{VISION}</p>
            </div>
          </div>
        </Shell>
      </section>

      <section className="relative grid h-[380px] place-items-center bg-ink-200">
        <ImageOff size={30} className="text-ink-400" aria-hidden />
        <button
          type="button"
          aria-label="Play company video"
          className="absolute grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-900 shadow-lg transition-transform hover:scale-105"
        >
          <Play size={22} className="ml-1" aria-hidden />
        </button>
      </section>

      <section className="bg-black py-20 text-white">
        <Shell>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-light">
                Our <span className="font-bold">Core Values</span>
              </h3>
              {CORE_VALUES.map((p) => (
                <p key={p.slice(0, 24)} className="mt-5 text-sm leading-7 text-white/70">
                  {p}
                </p>
              ))}
            </div>
            <div className="grid aspect-[4/3] place-items-center rounded-sm bg-white/5">
              <ImageOff size={30} className="text-white/30" aria-hidden />
            </div>
          </div>
        </Shell>
      </section>

      <FeatureStrip />
      <BrochureCta />
    </>
  );
}
