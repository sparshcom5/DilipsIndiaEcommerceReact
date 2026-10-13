import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { adminApi } from '../lib/adminApi.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { Button, Card, Field, Input, PageHeader, dateTime, useToast } from '../components/ui.jsx';

/**
 * This deployment runs with a single super admin, so there is no user list or
 * role assignment — just the signed-in account's own profile and password.
 */
export default function Account() {
  const { user, logout } = useAdminAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await adminApi.updateUser(user.id, { fullName: profile.fullName, phone: profile.phone });
      toast.success('Profile saved. Sign out and back in to refresh the header.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setErrors({});

    if (pw.password.length < 10) {
      return setErrors({ password: 'Use at least 10 characters.' });
    }
    if (pw.password !== pw.confirm) {
      return setErrors({ confirm: 'The two passwords do not match.' });
    }

    setSavingPw(true);
    try {
      await adminApi.updateUser(user.id, { password: pw.password });
      toast.success('Password changed. Signing you out…');
      // The API revokes every refresh token on a password change, so the
      // current session is already dead — sign out rather than let the next
      // request fail.
      setTimeout(async () => {
        await logout();
        navigate('/admin/login', { replace: true });
      }, 1400);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else toast.error(err.message);
      setSavingPw(false);
    }
  };

  return (
    <>
      <PageHeader title="My Account" subtitle="Your admin profile and password." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <form onSubmit={saveProfile} className="space-y-5">
            <Field label="Full name">
              <Input
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
              />
            </Field>
            <Field label="Email" hint="The sign-in address cannot be changed here.">
              <Input value={user?.email ?? ''} disabled />
            </Field>
            <Field label="Phone">
              <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
            </Field>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Change password">
            <form onSubmit={changePassword} className="space-y-5">
              <Field label="New password" required error={errors.password} hint="At least 10 characters.">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={pw.password}
                  onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
                  error={errors.password}
                />
              </Field>
              <Field label="Confirm password" required error={errors.confirm}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  error={errors.confirm}
                />
              </Field>
              <p className="rounded-input bg-accent/20 px-4 py-3 text-xs text-ink-700">
                Changing your password signs you out of every device, including this one.
              </p>
              <Button type="submit" disabled={savingPw}>
                {savingPw ? 'Updating…' : 'Change password'}
              </Button>
            </form>
          </Card>

          <Card title="Access">
            <div className="flex items-start gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <ShieldCheck size={18} aria-hidden />
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink-900">Super Admin</p>
                <p className="mt-1 text-ink-500">
                  Full access to every module. This store runs with a single admin account.
                </p>
                {user?.lastLoginAt && (
                  <p className="mt-2 text-xs text-ink-400">Last sign-in {dateTime(user.lastLoginAt)}</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
