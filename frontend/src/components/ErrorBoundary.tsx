import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Abitda Uncaught UI Exception caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--paper, #f5f2eb)',
          color: 'var(--ink, #0a0a0a)',
          padding: '24px',
          fontFamily: 'Geist Mono, monospace'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: '#fff',
            border: '1px solid var(--rust, #8b3a2a)',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              fontSize: '10px',
              color: 'var(--rust, #8b3a2a)',
              letterSpacing: '0.15em',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              SURVEILLANCE EXCEPTION INTERCEPTED
            </div>
            <h1 style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: '28px',
              margin: '0 0 12px 0',
              fontWeight: 400
            }}>
              Fiduciary UI Guard Engaged
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--dim, #666)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              An unexpected render fault was intercepted. The engine state remains preserved on the broker gateway.
            </p>
            {this.state.error && (
              <pre style={{
                background: '#faf8f5',
                border: '1px solid #ddd',
                padding: '12px',
                fontSize: '10px',
                color: 'var(--rust, #8b3a2a)',
                overflowX: 'auto',
                marginBottom: '20px'
              }}>
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              style={{
                background: 'var(--ink, #0a0a0a)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                fontFamily: 'Geist Mono, monospace',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
              ↺ Restore Desk Surveillance
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
