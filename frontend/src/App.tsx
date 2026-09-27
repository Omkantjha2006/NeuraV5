import { AppProvider, useApp } from '@/store/AppContext';
import { I18nProvider, useTranslation } from '@/i18n/I18nContext';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';
import { ChatArea } from '@/components/ChatArea';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { StudyPage } from '@/pages/StudyPage';
import { DeveloperPage } from '@/pages/DeveloperPage';
import { ProductivityPage } from '@/pages/ProductivityPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { useEffect } from 'react';
import { settingsService } from '@/services/api';

function UserPreferencesEffect() {
  useEffect(() => {
    let cancelled = false;
    // Tracks the last settings object we were asked to apply, so the
    // OS-preference change listener can re-resolve 'system' without
    // needing settings passed back in.
    let currentSettings: { theme: string; language: string; fontSize: string } | null = null;
    const media = window.matchMedia('(prefers-color-scheme: light)');

    const resolveTheme = (theme: string) =>
      theme === 'system' ? (media.matches ? 'light' : 'dark') : theme;

    const apply = (settings: { theme: string; language: string; fontSize: string }) => {
      if (cancelled) return;
      currentSettings = settings;
      const root = document.documentElement;
      root.dataset.theme = resolveTheme(settings.theme);
      root.lang = settings.language || 'en';
      root.classList.toggle('font-size-small', settings.fontSize === 'small');
      root.classList.toggle('font-size-large', settings.fontSize === 'large');
      root.classList.toggle('font-size-medium', settings.fontSize !== 'small' && settings.fontSize !== 'large');
    };

    const load = async () => {
      try {
        const settings = await settingsService.get();
        if (settings) apply(settings);
      } catch {
        apply({ theme: 'dark', language: 'en', fontSize: 'medium' });
      }
    };

    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<{ theme: string; language: string; fontSize: string }>;
      if (custom.detail) apply(custom.detail);
    };

    // Live OS-preference detection: if the user's theme is 'system',
    // flip between light/dark the moment the OS preference changes,
    // without requiring a reload or a settings re-fetch.
    const onSystemPreferenceChange = () => {
      if (cancelled || !currentSettings || currentSettings.theme !== 'system') return;
      document.documentElement.dataset.theme = resolveTheme('system');
    };

    void load();
    window.addEventListener('neura-settings-changed', onChanged);
    media.addEventListener('change', onSystemPreferenceChange);
    return () => {
      cancelled = true;
      window.removeEventListener('neura-settings-changed', onChanged);
      media.removeEventListener('change', onSystemPreferenceChange);
    };
  }, []);

  return null;
}

function Router() {
  const { route, isAuthenticated } = useApp();

  // Auth pages
  if (route === 'landing') return <LandingPage />;
  if (route === 'login') return <LoginPage />;
  if (route === 'register') return <RegisterPage />;
  if (route === 'forgot-password') return <ForgotPasswordPage />;
  if (route === 'reset-password') return <ResetPasswordPage />;

  // Protected application routes
  if (!isAuthenticated) return <LoginPage />;

  return <AppLayout />;
}

function AppLayout() {
  const { route } = useApp();

  return (
    <div className="app-shell flex app-bg overflow-hidden safe-left safe-right">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <div className="flex-1 flex flex-col min-h-0">
          {route === 'dashboard' && <DashboardPage />}
          {route === 'documents' && <DocumentsPage />}
          {route === 'settings' && <SettingsPage />}
          {route === 'profile' && <ProfilePage />}
          {route === 'study' && <StudyPage />}
          {route === 'developer' && <DeveloperPage />}
          {route === 'productivity' && <ProductivityPage />}
          {route === 'analytics' && <AnalyticsPage />}
          {(route === 'chat' || !route) && <ChatArea />}
        </div>
      </div>
    </div>
  );
}

function TitleManager() {
  const { route } = useApp();
  const { t, language } = useTranslation();

  useEffect(() => {
    const titles: Record<string, string> = {
      landing: t('titles.landing'),
      login: t('titles.login'),
      register: t('titles.register'),
      'forgot-password': t('titles.forgotPassword'),
      'reset-password': t('titles.resetPassword'),
      chat: t('titles.chat'),
      dashboard: t('titles.dashboard'),
      documents: t('titles.documents'),
      settings: t('titles.settings'),
      profile: t('titles.profile'),
      study: t('titles.study'),
    };
    document.title = titles[route] || t('titles.default');
    // Keep <html lang> in sync with the active UI language even before
    // settings finish loading (UserPreferencesEffect also sets this once
    // saved settings are known, so authenticated users stay consistent).
    document.documentElement.lang = language;
  }, [route, t, language]);

  return null;
}

function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <TitleManager />
        <UserPreferencesEffect />
        <Router />
      </AppProvider>
    </I18nProvider>
  );
}

export default App;
