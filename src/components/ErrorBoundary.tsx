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
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "var(--avd-fg)" }}>Algo ha fallado</p>
          <p style={{ fontSize: 13, color: "var(--avd-fg-muted)", maxWidth: 360 }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--avd-brand)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
