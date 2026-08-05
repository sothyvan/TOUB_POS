import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import SkipLink from '../components/ui/SkipLink';
import ThemeToggle from '../shared/theme/ThemeToggle';

const features = [
  {
    icon: 'cash',
    title: 'Backend-Owned Checkout',
    description:
      'Trusted totals and cash confirmation stay on the backend, keeping cashier checkout accurate and auditable.',
    tone: 'bg-brand-action/10 text-brand-action border-brand-action/30',
  },
  {
    icon: 'check',
    title: 'Cashier-Only Live Confirmation',
    description:
      'Payment pushes arrive only on the cashier screen that opened the session — no shared devices, no confusion in busy stalls.',
    tone: 'bg-state-success/10 text-state-success border-state-success/30',
  },
  {
    icon: 'telegram',
    title: 'Telegram Kitchen Display',
    description:
      'Confirmed orders relay to a Telegram kitchen channel as structured tickets. Cooks tap Done and the ticket updates in real time.',
    tone: 'bg-brand-action/10 text-brand-action border-brand-action/30',
  },
  {
    icon: 'trendUp',
    title: 'Multi-Stall Reports',
    description:
      'Owners and managers view stall-scoped revenue, top products, and staff performance with daily, monthly, and yearly filters.',
    tone: 'bg-state-success/10 text-state-success border-state-success/30',
  },
];

const steps = [
  {
    step: '01',
    title: 'Register the Terminal',
    description:
      'An owner or manager one-time registers a tablet to a specific stall. Cross-stall data is never exposed.',
  },
  {
    step: '02',
    title: 'Cashier Taps & Enters PIN',
    description:
      'The cashier picks their avatar from the stall roster and unlocks the shift with a 4-digit PIN.',
  },
  {
    step: '03',
    title: 'Confirm and Send',
    description:
      'Select items, confirm cash received, and send the paid order to the kitchen instantly.',
  },
];

function FeatureCard({ icon, title, description, tone }) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-brand-border bg-ui-surface p-6 transition-colors hover:border-brand-action/40">
      <span
        className={`grid h-12 w-12 place-items-center rounded-lg border ${tone}`}
      >
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="m-0 text-lg font-bold text-brand-text">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-text-soft">{description}</p>
    </article>
  );
}

function StepCard({ step, title, description }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-border bg-ui-surface p-6">
      <span className="font-mono text-sm font-bold text-brand-action">{step}</span>
      <h3 className="m-0 text-base font-bold text-brand-text">{title}</h3>
      <p className="m-0 text-sm leading-relaxed text-text-soft">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const goCashier = () => navigate('/login?mode=cashier');
  const goManagement = () => navigate('/login?mode=management');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="tech-grid min-h-svh bg-ui-bg text-brand-text">
      <SkipLink />
      {/* Navigation bar */}
      <header className="sticky top-0 z-50 border-b border-brand-border bg-ui-bg/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <a href="/" className="flex shrink-0 items-center gap-3">
            <Logo className="w-10 h-10" />
            <span className="text-lg font-bold tracking-tight text-brand-text">ToubPOS</span>
          </a>

          <ul className="hidden items-center gap-6 text-sm font-semibold text-text-soft lg:flex">
            <li>
              <a href="#features" className="transition-colors hover:text-brand-action">Features</a>
            </li>
            <li>
              <a href="#how" className="transition-colors hover:text-brand-action">How it works</a>
            </li>
          </ul>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 md:flex">
              <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={goCashier} iconName="cash">
                Cashier Login
              </Button>
              <Button size="sm" className="whitespace-nowrap" onClick={goManagement} iconName="settings">
                Management Login
              </Button>
            </div>
            <ThemeToggle className="bg-ui-surface" />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-navigation"
              className="grid h-10 w-10 place-items-center rounded-md border border-brand-border bg-ui-surface text-text-soft transition-colors hover:border-brand-action/50 hover:bg-ui-muted hover:text-brand-action cursor-pointer md:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div id="landing-mobile-navigation" className="animate-in slide-in-from-top-2 fade-in border-t border-brand-border bg-ui-bg/95 duration-200 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
              <a
                href="#features"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-semibold text-text-soft transition-colors hover:bg-ui-muted hover:text-brand-action"
              >
                Features
              </a>
              <a
                href="#how"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-semibold text-text-soft transition-colors hover:bg-ui-muted hover:text-brand-action"
              >
                How it works
              </a>
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  size="md"
                  variant="outline"
                  fullWidth
                  className="whitespace-nowrap"
                  onClick={() => { setMenuOpen(false); goCashier(); }}
                  iconName="cash"
                >
                  Cashier Login
                </Button>
                <Button
                  size="md"
                  fullWidth
                  className="whitespace-nowrap"
                  onClick={() => { setMenuOpen(false); goManagement(); }}
                  iconName="settings"
                >
                  Management Login
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main-content" tabIndex={-1}>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pb-16 pt-12 text-center md:pt-20">
        <span className="rounded-full border border-brand-border bg-ui-surface px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-text-soft">
          Point of Sale for multi-stall teams
        </span>
        <h1 className="m-0 max-w-3xl text-4xl font-black leading-tight tracking-tight text-brand-text md:text-6xl">
          Fast, stall-scoped POS with
          <span className="text-brand-action"> trusted backend checkout</span>.
        </h1>
        <p className="m-0 max-w-2xl text-base leading-relaxed text-text-soft md:text-lg">
          ToubPOS keeps cashiers, kitchens, and owners in sync across physical booths —
          backend-owned cash confirmation, a Telegram kitchen display, and per-stall reporting.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="min-w-56" onClick={goCashier} iconName="cash" iconPosition="left">
            Cashier Login
          </Button>
          <Button size="lg" variant="outline" className="min-w-56" onClick={goManagement} iconName="settings" iconPosition="left">
            Management Login
          </Button>
        </div>
        <p className="m-0 text-xs font-semibold text-text-muted">
          Internal tool — no public sign-up. Access is limited to registered staff.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <h2 className="m-0 mb-10 text-center text-2xl font-bold tracking-tight text-brand-text md:text-3xl">
          Built for the rush
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <h2 className="m-0 mb-10 text-center text-2xl font-bold tracking-tight text-brand-text md:text-3xl">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {steps.map((s) => (
            <StepCard key={s.step} {...s} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-6 rounded-lg border border-brand-border bg-ui-elevated px-6 py-12 text-center">
          <h2 className="m-0 max-w-xl text-2xl font-bold tracking-tight text-brand-text md:text-3xl">
            Ready to start a shift?
          </h2>
          <p className="m-0 max-w-md text-sm leading-relaxed text-text-soft">
            Cashiers open the terminal with a PIN. Owners and managers sign in to the portal.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="min-w-52" onClick={goCashier} iconName="cash">
              Cashier Login
            </Button>
            <Button size="lg" variant="outline" className="min-w-52" onClick={goManagement} iconName="settings">
              Management Login
            </Button>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-ui-elevated ">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs font-semibold text-text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7" />
            <span>© {new Date().getFullYear()} ToubPOS</span>
          </div>
          <span>Internal POS tool — access by invitation only.</span>
        </div>
      </footer>
    </div>
  );
}
