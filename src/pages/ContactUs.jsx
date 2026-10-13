import { useState } from 'react';
import { ImageOff, MapPin } from 'lucide-react';

import { getContactDetails, sendContactEnquiry } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { Shell } from '../components/layout/Layout.jsx';
import PageHero from '../components/common/PageHero.jsx';
import BrochureCta from '../components/common/BrochureCta.jsx';

/**
 * Shown until GET /content/contact answers, and if it ever fails. The same
 * values live in the `settings` table, which is the source of truth -- these
 * exist so the page is never blank, not as a second place to edit them.
 */
const FALLBACK = {
  offices: [
    {
      title: 'Corporate Office',
      lines: ['Ground Floor, 2-3-365/2,', 'Plot No. 42, Road No. 4,', 'Sai Nagar Colony,', 'Hyderabad, Telangana-500068.'],
    },
    {
      title: 'Sales Office',
      lines: ['#4-8-308/1,', 'Gowliguda, Afzal Gunj,', 'Hyderabad - 500012.'],
    },
  ],
  phones: [
    { display: '+91 7222 88 7771', tel: '+917222887771' },
    { display: '+91 7337 202 881', tel: '+917337202881' },
  ],
  emails: [{ label: 'General', address: 'info@dilipsindia.com' }],
  map: {
    embedUrl: 'https://www.google.com/maps?q=Sai+Nagar+Colony,+Hyderabad,+Telangana+500068&output=embed',
    caption: 'Ground Floor, 2-3-365/2, Plot No. 42, Road No. 4, Sai Nagar Colony, Hyderabad, Telangana-500068',
  },
};

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', message: '' };

function Field({ label, name, value, onChange, error, type = 'text', rows }) {
  const id = `contact-${name}`;
  const cls = `w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors ${
    error ? 'border-brand' : 'border-ink-200 focus:border-brand'
  }`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-ink-600">
        {label}
      </label>
      {rows ? (
        <textarea id={id} name={name} rows={rows} value={value} onChange={onChange} className={cls} />
      ) : (
        <input id={id} name={name} type={type} value={value} onChange={onChange} className={cls} />
      )}
      {error && <p className="mt-1.5 text-xs text-brand">{error}</p>}
    </div>
  );
}

export default function ContactUs() {
  // Falls back to the constants above while this is in flight, so the page
  // never renders an empty contact panel.
  const { data: contact } = useApi(() => getContactDetails(), []);
  const details = {
    offices: contact?.offices?.length ? contact.offices : FALLBACK.offices,
    phones: contact?.phones?.length ? contact.phones : FALLBACK.phones,
    emails: contact?.emails?.length ? contact.emails : FALLBACK.emails,
    map: contact?.map || FALLBACK.map,
    hours: contact?.hours || null,
  };

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(null);
  const [sending, setSending] = useState(false);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((p) => (p[name] ? { ...p, [name]: undefined } : p));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSent(null);
    setSending(true);
    try {
      const res = await sendContactEnquiry(form);
      setSent(res.message);
      setForm(EMPTY);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else setSent(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHero
        pageKey="contact-us"
        title="Contact"
        titleAccent="Us"
        image="/images/banners/contact-hero.jpg"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]}
      />

      <Shell className="py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-sm bg-ink-200">
            <ImageOff size={30} className="text-ink-400" aria-hidden />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-ink-900">Write Us A Message.</h2>

            <form onSubmit={submit} className="mt-7 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="First Name" name="firstName" value={form.firstName} onChange={change} error={errors.firstName} />
                <Field label="Last Name" name="lastName" value={form.lastName} onChange={change} error={errors.lastName} />
              </div>
              <Field label="Email" name="email" type="email" value={form.email} onChange={change} error={errors.email} />
              <Field label="Phone Number" name="phone" type="tel" value={form.phone} onChange={change} error={errors.phone} />
              <Field label="Message" name="message" rows={6} value={form.message} onChange={change} error={errors.message} />

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-input bg-black py-4 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send Message'}
              </button>

              {sent && (
                <p role="status" className="rounded-input bg-success/10 px-4 py-3 text-sm text-success">
                  {sent}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {details.offices.map((o) => (
            <section key={o.title} className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
              <h3 className="mb-4 text-sm font-semibold text-brand">{o.title}</h3>
              <address className="text-sm font-semibold not-italic leading-7 text-ink-900">
                {o.lines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
            </section>
          ))}

          <section className="rounded-card bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
            <h3 className="mb-4 text-sm font-semibold text-brand">Call Us</h3>
            <p className="text-sm font-semibold leading-7 text-ink-900">
              {details.phones.map((ph) => (
                <a key={ph.tel} href={`tel:${ph.tel}`} className="block hover:text-brand">
                  {ph.display}
                </a>
              ))}
            </p>

            <h3 className="mb-2 mt-6 text-sm font-semibold text-brand">Email</h3>
            {/*
              The Figma frame prints career@runtailor.com here — a different
              company's address, almost certainly copied from another project.
              Using the DiliPS domain until the client confirms the real one.
              See design/README.md.
            */}
            {details.emails.map((em) => (
              <a
                key={em.address}
                href={`mailto:${em.address}`}
                className="block text-sm font-semibold text-ink-900 hover:text-brand"
              >
                {em.address}
              </a>
            ))}

            {details.hours && (
              <>
                <h3 className="mb-2 mt-6 text-sm font-semibold text-brand">Hours</h3>
                <p className="text-sm text-ink-700">{details.hours}</p>
              </>
            )}
          </section>
        </div>

        <div className="mt-10 overflow-hidden rounded-sm">
          <iframe
            title="DiliPS corporate office location"
            src={details.map.embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[420px] w-full border-0"
          />
          <p className="flex items-center gap-2 bg-white px-4 py-3 text-xs text-ink-500">
            <MapPin size={14} className="text-brand" aria-hidden />
            {details.map.caption}
          </p>
        </div>
      </Shell>

      <BrochureCta />
    </>
  );
}
