import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PropConnect UI ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f8fafc",
          padding: "24px",
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            background: "#1e293b",
            borderRadius: "16px",
            border: "1px solid #334155",
            padding: "32px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <span style={{ fontSize: "28px" }}>⚠️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#f1f5f9" }}>
                  Something went wrong in this view
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                  PropConnect captured this issue to avoid a blank screen.
                </p>
              </div>
            </div>

            <div style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "14px",
              margin: "20px 0",
              fontSize: "12.5px",
              color: "#f87171",
              fontFamily: "monospace",
              overflowX: "auto"
            }}>
              {this.state.error?.message || "An unexpected rendering error occurred"}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                ↻ Reload Application
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: "transparent",
                  color: "#cbd5e1",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Try Again
              </button>
              <a
                href="/login"
                style={{
                  color: "#60a5fa",
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 14px",
                  fontSize: "13px",
                  textDecoration: "none"
                }}
              >
                Return to Login →
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
