import { Link } from 'react-router-dom';

// The design lists product ranges by marketing name; each points at the
// closest live category so the footer never dead-ends.
const PRODUCT_LINKS = [
  { label: 'DSM Lx', to: '/products?category=faucets' },
  { label: 'DSM', to: '/products?category=faucets' },
  { label: 'Diverter Collection', to: '/products?category=mixers' },
  { label: 'Wash Basin Mixer', to: '/products?category=mixers' },
  { label: 'Shower & Accessories', to: '/products?category=showers' },
];

const SOCIAL_LINKS = ['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'Youtube'];

const SITE_LINKS = [
  { label: 'Who We Are', to: '/who-we-are' },
  { label: 'Blog', to: '/blog' },
  { label: 'Coupons & Offers', to: '/coupons' },
  { label: 'Track Order', to: '/track-order' },
  { label: 'Contact Us', to: '/contact-us' },
];

function Column({ title, children }) {
  return (
    <div>
      <h2 className="mb-6 text-base font-semibold text-brand">{title}</h2>
      {children}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-20">
      <div className="bg-ink-800 text-white">
        <div className="mx-auto grid max-w-shell gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/">
              <img
                src="/images/brand/dilips-logo.png"
                alt="DiliPS — Elegance in Bath Fittings"
                className="mb-8 h-16 w-auto"
              />
            </Link>
            <p className="max-w-[330px] text-sm italic leading-6 text-white/90">
              Welcome To Our Bath Fitting Company. The Company Is Into Existence With The Brand Name
              &ldquo;Dilips&rdquo; Since 2006.
            </p>
          </div>

          <Column title="Our Products">
            <ul className="space-y-3 text-sm italic text-white/90">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h2 className="mb-4 mt-8 text-base font-semibold text-brand">Quick Links</h2>
            <ul className="space-y-3 text-sm text-white/90">
              {SITE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Column>

          <Column title="Contact Us">
            <address className="text-sm not-italic leading-6 text-white/90">
              <span className="font-semibold italic">Corporate Office :</span>
              <span className="mt-1 block italic">
                Ground Floor, 2-3-365/2,
                <br />
                Plot No. 42, Road No. 4,
                <br />
                Sai Nagar Colony,
                <br />
                Hyderabad, Telangana-500068.
              </span>
            </address>
          </Column>

          <Column title="Social Media">
            <ul className="space-y-3 text-sm text-white/90">
              {SOCIAL_LINKS.map((label) => (
                <li key={label}>
                  <a href="#" className="transition-colors hover:text-brand">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </Column>
        </div>
      </div>

      <div className="bg-black py-4">
        <p className="mx-auto max-w-shell px-6 text-center text-sm text-white/80">
          &copy; copyright 2021 | Dilips. All rights reserved. Developed BY : Sparsh Communications
          Pvt Ltd.
        </p>
      </div>
    </footer>
  );
}
