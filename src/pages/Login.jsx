import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Pencil } from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout, { AuthField, authInputClass } from '../components/auth/AuthLayout.jsx';

/**
 * Customer sign-in — Figma frame 1586:17203, reworked for one-time codes.
 *
 * There is no separate registration: verifying a code on a number that has no
 * account creates one, so this single screen covers both. A brand-new customer
 * lands on My Account, which asks for their name and email.
 *
 * Measured off the 1920x1080 frame:
 *   image panel 1389px (72.3%) | black panel 531px (27.7%)
 *   form column 415px · Poppins · inputs 58px tall · submit 415x50 #E3000F
 */
export default function Login() {
  const { requestOtp, signInWithOtp, isSignedIn, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/account';

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [resendIn, setResendIn] = useState(0);

  const otpRef = useRef(null);

  // Someone already signed in has no business on this screen.
  useEffect(() => {
    if (!loading && isSignedIn) navigate(next, { replace: true });
  }, [loading, isSignedIn, navigate, next]);

  // Resend countdown, so the button says when it will work again.
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const send = async (e) => {
    e?.preventDefault();
    setMessage(null);
    setErrors({});
    setBusy(true);
    try {
      const res = await requestOtp(phone.trim());
      setRegistered(res.registered);
      setDevOtp(res.devOtp || null);
      setResendIn(res.resendAfterSeconds || 30);
      setOtp('');
      setStep('otp');
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else if (err.code === 'too_soon') {
        // Already had a code moments ago — go straight to entering it.
        setStep('otp');
        setMessage(err.message);
      } else setMessage(err.message || 'We could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});
    setBusy(true);
    try {
      await signInWithOtp(phone.trim(), otp.trim());
      navigate(next, { replace: true });
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else setMessage(err.message || 'We could not verify that code.');
    } finally {
      setBusy(false);
    }
  };

  const submitClass =
    'mt-[38px] flex h-[50px] w-full items-center justify-center gap-2 rounded-input bg-brand text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60';

  return (
    <AuthLayout title={step === 'phone' ? 'Login' : 'Verify your number'}>
      {step === 'phone' ? (
        <form onSubmit={send} noValidate className="mt-6">
          <p className="mb-6 text-sm text-white/60">
            Enter your mobile number and we&apos;ll send you a one-time code. New here? Your account
            is created automatically.
          </p>

          <AuthField label="Mobile Number" name="phone" error={errors.phone}>
            {(id) => (
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm text-ink-500"
                >
                  +91
                </span>
                <input
                  id={id}
                  name="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setErrors({});
                  }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel-national"
                  autoFocus
                  placeholder="10-digit mobile number"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? `${id}-error` : undefined}
                  className={`${authInputClass(errors.phone)} pl-14`}
                />
              </div>
            )}
          </AuthField>

          <button type="submit" disabled={busy || phone.length !== 10} className={submitClass}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} noValidate className="mt-6">
          <p className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/60">
            Code sent to <span className="font-semibold text-white">+91 {phone}</span>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setErrors({});
                setMessage(null);
              }}
              className="inline-flex items-center gap-1 text-white underline hover:text-brand"
            >
              <Pencil size={12} aria-hidden />
              change
            </button>
          </p>

          {registered === false && (
            <p className="mb-5 rounded-input bg-white/10 px-4 py-3 text-sm text-white/90">
              Looks like you&apos;re new — verifying this code creates your account.
            </p>
          )}

          <AuthField label="One-Time Code" name="otp" error={errors.otp}>
            {(id) => (
              <input
                ref={otpRef}
                id={id}
                name="otp"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrors({});
                }}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6-digit code"
                aria-invalid={Boolean(errors.otp)}
                aria-describedby={errors.otp ? `${id}-error` : undefined}
                className={`${authInputClass(errors.otp)} tracking-[0.4em]`}
              />
            )}
          </AuthField>

          <p className="mt-3 text-right text-sm">
            {resendIn > 0 ? (
              <span className="text-white/45">Resend code in {resendIn}s</span>
            ) : (
              <button type="button" onClick={send} className="text-white underline hover:text-brand">
                Resend code
              </button>
            )}
          </p>

          <button type="submit" disabled={busy || otp.length !== 6} className={submitClass}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {busy ? 'Verifying…' : 'Verify & Continue'}
          </button>

          {/* Development only: shown while no SMS gateway is configured and the API echoes the code. */}
          {devOtp && (
            <p className="mt-5 rounded-input border border-dashed border-white/25 px-4 py-3 text-xs text-white/60">
              No SMS gateway is connected yet, so your one-time code is{' '}
              <button
                type="button"
                onClick={() => setOtp(devOtp)}
                className="font-semibold text-white underline"
              >
                {devOtp}
              </button>
              .
            </p>
          )}
        </form>
      )}

      {message && (
        <p role="status" className="mt-5 rounded-input bg-white/10 px-4 py-3 text-sm text-white/90">
          {message}
        </p>
      )}
    </AuthLayout>
  );
}
