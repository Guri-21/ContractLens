import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <AlertTriangle className="mb-3 h-6 w-6" />
            <h2 className="font-display text-xl font-semibold">
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </h2>
            <p className="mt-2 text-sm text-red-700">
              {this.state.error?.message ?? 'An unexpected error occurred in this panel.'}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 border border-red-300 bg-white px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-red-700 hover:bg-red-50"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
