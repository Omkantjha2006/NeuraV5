import { useState, type FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { authService } from '@/services/api';
import { AuthLayout } from '@/pages/auth/AuthLayout';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const { navigate } = useApp();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError = emailTouched && !email.includes('@') ? t('auth.errors.invalidEmail') : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError(t('auth.errors.invalidEmailAddress'));
      return;
    }

    setLoading(true);
    const result = await authService.forgotPassword(email);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? t('auth.errors.unableToSendResetLink'));
      return;
    }
    setSuccess(true);
  };

  return (
    <AuthLayout
      title={t('auth.forgotPassword.title')}
      subtitle={t('auth.forgotPassword.subtitle')}
      footer={
        <>
          {t('auth.forgotPassword.rememberPassword')}{' '}
          <button onClick={() => navigate('login')} className="text-primary-400 hover:text-primary-300 font-medium">
            {t('auth.forgotPassword.backToLogin')}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-error-500/10 border border-error-500/20 px-4 py-3 text-sm text-error-300 animate-fade-in">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success ? (
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-success-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-success-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('auth.forgotPassword.checkInbox')}</h3>
          <p className="text-sm text-ink-400 mb-6">
            {t('auth.forgotPassword.sentTo', { email })}
          </p>
          <button
            onClick={() => navigate('login')}
            className="btn-glass w-full inline-flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            {t('auth.forgotPassword.backToLogin')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.email')}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder={t('auth.emailPlaceholder')}
                className="input-glass pl-10"
                autoFocus
              />
            </div>
            {emailError && <p className="mt-1.5 text-xs text-error-400">{emailError}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('auth.forgotPassword.sendingLink')}
              </>
            ) : (
              t('auth.forgotPassword.sendResetLink')
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
