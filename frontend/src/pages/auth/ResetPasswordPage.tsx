import { useMemo, useState, type FormEvent } from 'react';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { apiFetch } from '@/services/http';
import { Lock, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export function ResetPasswordPage() {
  const { navigate } = useApp();
  const { t } = useTranslation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') ?? '', []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (token.length < 32) return setError(t('auth.errors.invalidResetLink'));
    if (password.length < 8) return setError(t('auth.errors.passwordMin8Full'));
    if (password !== confirm) return setError(t('auth.errors.passwordsNoMatch'));
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : t('auth.errors.unableToResetPassword')); }
    finally { setLoading(false); }
  };

  return <AuthLayout title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')} footer={<><button onClick={() => navigate('login')} className="text-primary-400 hover:text-primary-300 font-medium">{t('auth.forgotPassword.backToLogin')}</button></>}>
    {error && <div className="mb-5 flex items-center gap-2 rounded-xl bg-error-500/10 border border-error-500/20 px-4 py-3 text-sm text-error-300"><AlertCircle size={16}/>{error}</div>}
    {success ? <div className="text-center"><div className="w-14 h-14 rounded-full bg-success-500/15 flex items-center justify-center mx-auto mb-4"><CheckCircle size={28} className="text-success-400"/></div><h3 className="text-lg font-semibold text-white mb-2">{t('auth.resetPassword.passwordUpdated')}</h3><p className="text-sm text-ink-400 mb-6">{t('auth.resetPassword.passwordUpdatedDesc')}</p><button onClick={() => navigate('login')} className="btn-glass w-full inline-flex items-center justify-center gap-2"><ArrowLeft size={16}/>{t('auth.forgotPassword.backToLogin')}</button></div> : <form onSubmit={submit} className="space-y-5"><div><label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.resetPassword.newPassword')}</label><div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"/><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="input-glass pl-10" minLength={8} required/></div></div><div><label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.confirmPassword')}</label><input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="input-glass" minLength={8} required/></div><button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">{loading ? <><Loader2 size={18} className="animate-spin"/>{t('auth.resetPassword.updating')}</> : t('auth.resetPassword.updatePassword')}</button></form>}
  </AuthLayout>;
}
