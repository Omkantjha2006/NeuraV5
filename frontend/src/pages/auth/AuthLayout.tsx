import type { ReactNode } from 'react';
import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { NeuraLogo } from '@/components/NeuraLogo';
import { ArrowLeft } from 'lucide-react';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { navigate } = useApp();
  const { t } = useTranslation();

  return (
    <div className="min-h-app-shell landing-bg flex flex-col safe-top safe-bottom">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('landing')}
            className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-white transition-colors mb-8 animate-fade-in"
          >
            <ArrowLeft size={16} />
            {t('auth.backToHome')}
          </button>

          <div className="glass-strong rounded-2xl p-8 shadow-2xl animate-scale-in">
            <div className="flex justify-center mb-6">
              <NeuraLogo size={36} />
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-2">{title}</h1>
            <p className="text-sm text-ink-400 text-center mb-8">{subtitle}</p>

            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-ink-400 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-xl glass px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {t('auth.continueWithGoogle')}
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs text-ink-500 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}
