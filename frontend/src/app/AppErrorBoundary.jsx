import { Component } from 'react';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import {
  createFrontendErrorId,
  createFrontendErrorReport,
  reportFrontendRenderError,
} from '../utils/frontendErrorReport';

const initialState = Object.freeze({ hasError: false, errorId: null });
const ERROR_BOUNDARY_TEST_KEY = 'toub-error-boundary-test-triggered';

function dismissDevelopmentTestFailure() {
  if (import.meta.env.DEV) {
    globalThis.sessionStorage?.setItem(ERROR_BOUNDARY_TEST_KEY, 'true');
  }
}

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
      errorId: createFrontendErrorId(),
    };
  }

  componentDidCatch(_error, errorInfo) {
    reportFrontendRenderError(createFrontendErrorReport({
      errorId: this.state.errorId,
      pathname: globalThis.location?.pathname,
      componentStack: errorInfo?.componentStack,
    }));
  }

  handleRetry = () => {
    dismissDevelopmentTestFailure();
    this.setState(initialState);
  };

  handleReload = () => {
    dismissDevelopmentTestFailure();
    globalThis.location?.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-svh place-items-center bg-brand-bg px-5 py-10 text-brand-text">
        <section
          className="w-full max-w-xl rounded-lg border border-ui-border bg-ui-surface p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)] sm:p-8"
          role="alert"
          aria-labelledby="app-recovery-title"
        >
          <Logo className="mx-auto h-14 w-14" />
          <p className="mb-0 mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-state-warning">
            Safe recovery screen
          </p>
          <h1 id="app-recovery-title" className="mb-0 mt-2 text-2xl font-black text-text-strong sm:text-3xl">
            TouB POS needs to recover
          </h1>
          <p className="mx-auto mb-0 mt-3 max-w-md text-sm leading-relaxed text-text-soft">
            An unexpected display problem occurred. Your saved cart and pending checkout remain in this browser.
          </p>

          <div className="mt-5 rounded-md border border-ui-border bg-ui-muted px-3 py-2 text-sm text-text-soft">
            Reference: <code className="font-mono font-bold text-text-strong">{this.state.errorId}</code>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="secondary" onClick={this.handleRetry}>
              Try again
            </Button>
            <Button type="button" onClick={this.handleReload}>
              Reload TouB POS
            </Button>
          </div>

          <p className="mb-0 mt-5 text-xs leading-relaxed text-text-muted">
            If the problem continues, give the reference above to your system administrator. Do not share passwords, PINs, or payment details.
          </p>
        </section>
      </main>
    );
  }
}
