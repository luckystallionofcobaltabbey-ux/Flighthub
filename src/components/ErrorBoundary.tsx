import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('FlightHub Lmtd render error:', error, info);
  }

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('flighthub_bookings_v1');
      localStorage.removeItem('flighthub_seats_v1');
    } catch {
      // Ignore storage access errors
    }
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#141414] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
              <div>
                <h1 className="font-display text-lg font-bold text-white">
                  Display Recovery Needed
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  {this.state.errorMessage}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  this.setState({ hasError: false, errorMessage: '' })
                }
                className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Retry Render
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Cabin Cache & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
