import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { firstAllowedRoute } from '../nav.js';

/**
 * Reuses the split-screen composition from Figma frame 1586:17203 — the only
 * login design in the file — restyled for the admin console.
 */
export default function AdminLogin() {
  const { login, session, loading } = useAdminAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-black text-white/70">
        <Loader2 size={22} className="animate-spin" aria-hidden />
      </div>
    );
  }
  if (session) return <Navigate to="/admin" replace />;

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((p) => (p[name] ? { ...p, [name]: undefined } : p));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);
    setSubmitting(true);

    try {
      const data = await login(form.email, form.password);
      const target = firstAllowedRoute((slug) => data.permissions.includes(slug), data.features);
      if (!target) {
        setMessage('Your account has no permissions assigned yet. Ask a super admin to give you a role.');
        return;
      }
      navigate(target, { replace: true });
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-ink-200 lg:block">
        <img
          src="/images/banners/login-hero.jpg"
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="flex flex-col justify-center bg-black px-8 py-16 sm:px-20">
        <div className="mx-auto w-full max-w-[420px]">
          <img src="/images/brand/dilips-logo.png" alt="DiliPS" className="h-16 w-auto" />
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">Admin Console</p>

          <h1 className="mt-10 text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-white/55">Use the credentials issued by your super admin.</p>

          <form onSubmit={submit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-white">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={change}
                placeholder="you@dilipsindia.com"
                aria-invalid={Boolean(errors.email)}
                className={`w-full rounded-input px-4 py-3.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 ${
                  errors.email ? 'ring-2 ring-brand' : 'bg-white'
                } bg-white`}
              />
              {errors.email && <p className="mt-1.5 text-xs text-brand">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-white">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={change}
                  placeholder="Enter password"
                  aria-invalid={Boolean(errors.password)}
                  className="w-full rounded-input bg-white px-4 py-3.5 pr-12 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-brand">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-input bg-brand py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-55"
            >
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>

            {message && (
              <p role="alert" className="rounded-input bg-brand/15 px-4 py-3 text-sm text-white">
                {message}
              </p>
            )}
          </form>

          <p className="mt-14 text-center text-xs text-white/45">
            Powered by Sparsh Communications Pvt. Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}
