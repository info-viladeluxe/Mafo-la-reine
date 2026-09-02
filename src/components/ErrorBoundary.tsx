import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Without this, ANY unhandled render/lifecycle error anywhere in the
// component tree — a null reference, a bad API response shape, a third-
// party library throwing — crashes the entire app to a blank white screen
// with zero recovery path for the user. React requires error boundaries to
// be class components (no hook equivalent exists as of React 18/19).
//
// This is intentionally minimal: catch, log, offer a reload. It does not
// try to recover in-place (React explicitly does not support "try again
// with the same state" after a caught render error — the tree below the
// boundary is unmounted), and it does not report to any external service
// since none is configured in this project.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Mafo] Unhandled error caught by ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-sable-100 px-6 text-center dark:bg-indigo-400">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-terre-50 text-terre-500 dark:bg-terre-500/15 dark:text-terre-200">
          <AlertTriangle size={28} />
        </div>
        <div>
          <p className="text-lg font-semibold text-aubergine-700 dark:text-sable-100">
            Une erreur inattendue est survenue
          </p>
          <p className="mt-1 max-w-sm text-sm text-neutral">
            Vos données ne sont pas perdues. Rechargez la page pour continuer.
          </p>
        </div>
        <button onClick={() => window.location.reload()} className="btn-primary btn-md">
          <RefreshCw size={16} />
          Recharger la page
        </button>
      </div>
    );
  }
}
