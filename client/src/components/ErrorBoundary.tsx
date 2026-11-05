import { Component, type ErrorInfo, type ReactNode } from "react";
import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { trackSiteError } from "@/lib/analytics";
import { isChunkLoadError } from "@/lib/chunk-load-error";

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
    if (isChunkLoadError(error)) return;
    trackSiteError("component_crash");
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    // A chunk that failed to load (deploy rotated its hash) can't recover by
    // re-rendering: React caches the rejected lazy() import. Let it reach the
    // route boundary, which reloads once onto the new build (C22-LH-CHUNK).
    if (this.state.error && isChunkLoadError(this.state.error)) throw this.state.error;
    if (this.state.error) {
      return (
        <StatePanel tone="error" label="Error · crashed" inline testId="error-boundary-fallback"
          title={this.props.label ? `The ${this.props.label} crashed` : "Something went wrong"}
          actions={<RetryButton onRetry={this.handleReset} handoffFocus={false} testId="button-error-retry" />}>
          This part of the page hit an unexpected error. The rest of the page still works.
        </StatePanel>
      );
    }
    return this.props.children;
  }
}
