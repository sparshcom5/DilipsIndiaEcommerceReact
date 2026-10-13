import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { Shell } from '../layout/Layout.jsx';

/**
 * Red "Get a company brochure" band that closes most inner pages. It sits half
 * over the footer in the design; the negative bottom margin reproduces that
 * overlap.
 */
export default function BrochureCta() {
  return (
    <Shell className="relative z-10 -mb-16 mt-20">
      <div className="flex flex-wrap items-center justify-between gap-8 rounded-sm bg-brand px-10 py-14 sm:px-16">
        <p className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          Get a company brochure
          <br />
          for more info.
        </p>

        <Link
          to="/contact-us"
          className="inline-flex items-center gap-3 rounded-full bg-black py-3 pl-7 pr-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Contact With Us
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-black">
            <ArrowUpRight size={17} aria-hidden />
          </span>
        </Link>
      </div>
    </Shell>
  );
}
