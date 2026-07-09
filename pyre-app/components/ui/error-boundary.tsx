"use client";

/* ERROR BOUNDARY, keep one failure from blanking the whole app.

   Without a boundary, a single component that THROWS during render unmounts the
   entire React tree, the dreaded blank screen ("the building doesn't load at
   all"). On a degraded machine (full disk, failed media decode, a data error)
   that's a real risk. This boundary catches the throw, shows a small, on-brand
   fallback with a Retry, and leaves the rest of the app standing.

   Class component because React error boundaries have no hook equivalent. */

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback; defaults to the compact card below. */
  fallback?: ReactNode;
  /** A short name for what failed, shown in the default fallback. */
  label?: string;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep a console trace for debugging; never rethrow.
    console.error("[PYRE] render error caught by boundary:", error);
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div className="stone-panel px-5 py-6 text-center">
        <p className="text-text-2 text-sm">
          {this.props.label ? `${this.props.label} hit a snag.` : "Something went wrong here."}
        </p>
        <p className="mt-1 text-text-3 text-xs">
          This can happen if your device is low on storage. Freeing some space and reloading usually fixes it.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={this.retry}
            className="rounded-md bg-brand text-bg px-4 py-2 text-sm font-medium hover:bg-brand-deep transition-colors duration-fast"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-surface-3 text-text-2 px-4 py-2 text-sm hover:border-brand hover:text-brand transition-colors duration-fast"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
