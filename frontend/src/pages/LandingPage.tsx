import { useApp } from '@/store/AppContext';
import { useTranslation } from '@/i18n/I18nContext';
import { NeuraLogo } from '@/components/NeuraLogo';
import { AgentAvatar } from '@/components/AgentAvatar';
import {
  Sparkles, Code2, GraduationCap, Search, PenTool,
  Mic, FileText, ArrowRight, Zap, Brain, MessageSquare,
} from 'lucide-react';

export function LandingPage() {
  const { agents, navigate } = useApp();
  const { t, td } = useTranslation();

  const featureIcons = [
    <Brain size={22} />, <Mic size={22} />, <FileText size={22} />,
    <Zap size={22} />, <MessageSquare size={22} />, <Sparkles size={22} />,
  ];
  const features = td<{ title: string; desc: string }[]>('landing.features.items').map((f, i) => ({ ...f, icon: featureIcons[i] }));

  const capabilityIcons: Record<string, typeof Sparkles> = {
    sparkles: Sparkles,
    code: Code2,
    'graduation-cap': GraduationCap,
    search: Search,
    'pen-tool': PenTool,
  };

  return (
    <div className="min-h-app-shell landing-bg overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-subtle safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <NeuraLogo size={30} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('login')}
              className="btn-ghost"
            >
              {t('landing.nav.signIn')}
            </button>
            <button
              onClick={() => navigate('register')}
              className="btn-primary"
            >
              {t('landing.nav.createAccount')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 animate-fade-in-down">
            <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse-soft" />
            <span className="text-sm text-ink-300">{t('landing.hero.badge')}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight text-balance animate-fade-in-up">
            {t('landing.hero.titleLine1')}
            <br />
            <span className="text-gradient">{t('landing.hero.titleLine2', { count: agents.length })}</span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-ink-400 max-w-2xl mx-auto leading-relaxed text-balance animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => navigate('register')}
              className="btn-primary glow-primary text-base px-7 py-3"
            >
              {t('landing.hero.getStarted')}
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('login')}
              className="btn-glass text-base px-7 py-3"
            >
              {t('landing.hero.signIn')}
            </button>
          </div>

          <button
            onClick={() => navigate('login')}
            className="mt-5 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-white transition-colors animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            <GoogleIcon /> {t('landing.hero.continueWithGoogle')}
          </button>
        </div>

        {/* Hero visual — floating agent orbs */}
        <div className="relative max-w-4xl mx-auto mt-20 h-64 hidden md:block">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 blur-3xl animate-glow-pulse" />
          {agents.map((agent, i) => {
            const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.5;
            return (
              <div
                key={agent.id}
                className="absolute left-1/2 top-1/2 transition-transform"
                style={{
                  transform: `translate(${x - 22}px, ${y - 22}px)`,
                  animation: `pulseSoft 3s ease-in-out infinite ${i * 0.3}s`,
                }}
              >
                <div className="glass-strong rounded-2xl p-2 animate-fade-in" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                  <AgentAvatar agent={agent} size="md" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {t('landing.features.heading')}
            </h2>
            <p className="mt-4 text-ink-400 max-w-xl mx-auto">
              {t('landing.features.subheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-6 glass-hover animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-ink-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent showcase */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              {t('landing.agentShowcase.heading')}
            </h2>
            <p className="mt-4 text-ink-400 max-w-xl mx-auto">
              {t('landing.agentShowcase.subheading')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {agents.map((agent, i) => {
              const Icon = capabilityIcons[agent.icon] ?? Sparkles;
              return (
                <div
                  key={agent.id}
                  className="glass rounded-2xl p-5 text-center glass-hover animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex justify-center mb-4">
                    <AgentAvatar agent={agent} size="lg" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{agent.name}</h3>
                  <p className="text-xs text-ink-400 mb-3">{agent.description}</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {agent.capabilities.slice(0, 3).map((cap) => (
                      <span key={cap} className="text-[10px] glass-subtle rounded-full px-2 py-0.5 text-ink-400">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Voice + Document highlight */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-8 glass-hover">
            <div className="w-12 h-12 rounded-xl bg-accent-500/15 text-accent-400 flex items-center justify-center mb-5">
              <Mic size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing.voiceHighlight.title')}</h3>
            <p className="text-ink-400 text-sm leading-relaxed mb-4">
              {t('landing.voiceHighlight.desc')}
            </p>
            <div className="flex items-center gap-1.5">
              {[3, 5, 8, 6, 10, 7, 4, 9, 5, 3, 6, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-accent-400/60 rounded-full animate-pulse-soft"
                  style={{ height: `${h * 3}px`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-8 glass-hover">
            <div className="w-12 h-12 rounded-xl bg-success-500/15 text-success-400 flex items-center justify-center mb-5">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{t('landing.docHighlight.title')}</h3>
            <p className="text-ink-400 text-sm leading-relaxed mb-4">
              {t('landing.docHighlight.desc')}
            </p>
            <div className="flex items-center gap-2">
              {['PDF', 'DOCX', 'CSV', 'MD'].map((fmt) => (
                <span key={fmt} className="glass-subtle rounded-lg px-2.5 py-1 text-xs font-mono text-ink-300">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center glass-strong rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            {t('landing.cta.heading')}
          </h2>
          <p className="text-ink-400 mb-8 max-w-md mx-auto">
            {t('landing.cta.subheading')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('register')} className="btn-primary glow-primary text-base px-7 py-3">
              {t('landing.cta.createAccount')}
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('login')} className="btn-glass text-base px-7 py-3">
              {t('landing.cta.signIn')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <NeuraLogo size={24} />
          <p className="text-sm text-ink-500">{t('landing.footer.rights')}</p>
          <div className="flex items-center gap-6 text-sm text-ink-400">
            <a className="hover:text-white transition-colors cursor-pointer">{t('landing.footer.privacy')}</a>
            <a className="hover:text-white transition-colors cursor-pointer">{t('landing.footer.terms')}</a>
            <a className="hover:text-white transition-colors cursor-pointer">{t('landing.footer.contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
