import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-[18px] font-bold text-[var(--avd-fg)]">Algo ha fallado</p>
          <p className="text-[13px] text-[var(--avd-fg-muted)] max-w-[360px]">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-lg bg-[var(--avd-brand)] text-white border-none cursor-pointer font-semibold">
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
