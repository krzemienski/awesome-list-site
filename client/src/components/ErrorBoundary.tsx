import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Short label for the crashed region, e.g. "Users tab". */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * R2-L13: generic error boundary so a render crash in one admin tab (or any
 * wrapped region) shows a contained fallback with a retry button instead of
 * blanking the entire page.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          className="border border-destructive/30 bg-destructive/5 rounded-lg p-6 text-center space-y-3"
          role="alert"
          data-testid="error-boundary-fallback"
        >
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <div className="space-y-1">
            <p className="font-medium text-[var(--text)]">
              {this.props.label ? `The ${this.props.label} crashed.` : "Something went wrong."}
            </p>
            <p className="text-sm text-[var(--text-2)] font-mono break-all">
              {this.state.error.message}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset} data-testid="button-error-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
