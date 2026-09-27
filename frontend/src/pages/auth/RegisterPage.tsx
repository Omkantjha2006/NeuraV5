import { useState, type FormEvent } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { AuthLayout, GoogleButton, Divider } from '@/pages/auth/AuthLayout';
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '@/services/api';

export function RegisterPage() {
  const { navigate, register } = useApp();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });

  const nameError = touched.name && name.length < 2 ? t('auth.errors.enterName') : '';
  const emailError = touched.email && !email.includes('@') ? t('auth.errors.invalidEmail') : '';
  const passwordError = touched.password && password.length < 8 ? t('auth.errors.passwordMin8') : '';
  const confirmError = touched.confirm && confirm !== password ? t('auth.errors.passwordsNoMatch') : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.length < 2 || !email.includes('@') || password.length < 8 || confirm !== password) {
      setError(t('auth.errors.fillAllFields'));
      setTouched({ name: true, email: true, password: true, confirm: true });
      return;
    }

    setLoading(true);
    const { error: err } = await register(name, email, password);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('chat'), 700);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    await authService.googleAuth();
  };

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.haveAccount')}{' '}
          <button onClick={() => navigate('login')} className="text-primary-400 hover:text-primary-300 font-medium">
            {t('auth.register.signIn')}
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
          {t('auth.register.accountCreated')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.name')}</label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder={t('auth.namePlaceholder')}
              className="input-glass pl-10"
              autoFocus
            />
          </div>
          {nameError && <p className="mt-1.5 text-xs text-error-400">{nameError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.email')}</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder={t('auth.emailPlaceholder')}
              className="input-glass pl-10"
            />
          </div>
          {emailError && <p className="mt-1.5 text-xs text-error-400">{emailError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.password')}</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder={t('auth.register.passwordPlaceholder')}
              className="input-glass pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordError && <p className="mt-1.5 text-xs text-error-400">{passwordError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-300 mb-1.5">{t('auth.confirmPassword')}</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              className="input-glass pl-10"
            />
          </div>
          {confirmError && <p className="mt-1.5 text-xs text-error-400">{confirmError}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3 mt-2">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {t('auth.register.creatingAccount')}
            </>
          ) : (
            t('auth.register.createAccount')
          )}
        </button>
      </form>

      <Divider label={t('auth.or')} />

      <GoogleButton onClick={handleGoogle} loading={googleLoading} />
    </AuthLayout>
  );
}
