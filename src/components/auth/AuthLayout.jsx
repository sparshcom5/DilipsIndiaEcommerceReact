import { Link } from 'react-router-dom';

/**
 * The standalone auth chrome from Figma frame 1586:17203 — photograph on the
 * left, black panel with the logo and form on the right. No site header or
 * footer, as the design shows.
 *
 * Login keeps the measured 72.3 / 27.7 split. `wide` opens the panel out for
 * any future screen carrying enough fields that a 415px column would have to
 * scroll.
 */
export default function AuthLayout({ title, wide = false, children, footer }) {
  return (
    <div className="flex min-h-screen bg-black font-display">
      <div className={`relative hidden lg:block ${wide ? 'lg:w-[58%]' : 'lg:w-[72.3%]'}`}>
        <img
          src="/images/banners/login-hero.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
        />
      </div>

      <div className={`flex w-full flex-col ${wide ? 'lg:w-[42%]' : 'lg:w-[27.7%]'}`}>
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className={`w-full ${wide ? 'max-w-[560px]' : 'max-w-[415px]'}`}>
            <Link to="/">
              <img
                src="/images/brand/dilips-logo.png"
                alt="DiliPS — Elegance in Bath Fittings"
                className="h-[83px] w-auto"
              />
            </Link>

            <h1 className={`${wide ? 'mt-9' : 'mt-[50px]'} text-xl font-bold text-white`}>{title}</h1>

            {children}
          </div>
        </div>

        <div className="px-8 pb-6">
          <hr className="border-white/25" />
          <p className="pt-4 text-center text-sm text-white">
            {footer || 'Powered by Sparsh Communications Pvt. Ltd.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Label + control + error, styled to the design's 58px white inputs. */
export function AuthField({ label, name, error, optional, children, className = '' }) {
  const id = `auth-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white">
        {label}
        {optional && <span className="ml-1 font-normal text-white/50">(Optional)</span>}
      </label>
      {children(id)}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-brand">
          {error}
        </p>
      )}
    </div>
  );
}

export const authInputClass = (error) =>
  `h-[58px] w-full rounded-input bg-white px-5 text-sm text-ink-900 outline-none placeholder:text-[#989898] ${
    error ? 'ring-2 ring-brand' : ''
  }`;
