import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production this is where an error-tracking SDK (Sentry, etc.)
    // would be wired in. Logging to console keeps this dependency-free
    // while still surfacing the stack during development.
    // eslint-disable-next-line no-console
    console.error('Nebula UI crashed:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle size={40} className="text-amber" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-white">Something broke</h1>
          <p className="max-w-sm text-mist-dim">
            An unexpected error stopped this page from rendering. Your wallet and on-chain funds are
            unaffected — this is a display issue.
          </p>
          <button onClick={this.handleReset} className="btn-primary">
            Return home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
