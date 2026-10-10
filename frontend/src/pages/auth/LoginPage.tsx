import { useState, type FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AuthLayout, GoogleButton, Divider } from '@/pages/auth/AuthLayout';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '@/services/api';

export function LoginPage() {
  const { navigate, login } = useApp();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailError = emailTouched && !email.includes('@') ? t('auth.errors.invalidEmail') : '';
  const passwordError = passwordTouched && password.length < 8 ? t('auth.errors.passwordMin6') : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@') || password.length < 8) {
      setError(t('auth.errors.checkEmailPassword'));
      return;
    }

    setLoading(true);
    const { error: err } = await login(email, password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('chat'), 600);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    await authService.googleAuth();
  };

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <button onClick={() => navigate('register')} className="text-primary-400 hover:text-primary-300 font-medium">
            {t('auth.login.createOne')}
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

      {success && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-success-500/10 border border-success-500/20 px-4 py-3 text-sm text-success-300 animate-fade-in">
          <CheckCircle size={16} />
          {t('auth.login.signedInSuccess')}
        </div>
      )}

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-ink-300">{t('auth.password')}</label>
            <button
              type="button"
              onClick={() => navigate('forgot-password')}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              {t('auth.login.forgotPassword')}
            </button>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="••••••••"
              className="input-glass pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordError && <p className="mt-1.5 text-xs text-error-400">{passwordError}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {t('auth.login.signingIn')}
            </>
          ) : (
            t('auth.login.signIn')
          )}
        </button>
      </form>

      <Divider label={t('auth.or')} />

      <GoogleButton onClick={handleGoogle} loading={googleLoading} />
    </AuthLayout>
  );
}
