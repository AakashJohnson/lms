import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronLeft } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CourseBuilderErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CourseBuilderErrorBoundary]", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoBack = () => {
    window.history.back();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/30 p-8 text-center backdrop-blur-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-md">
            <AlertTriangle className="h-7 w-7 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Something went wrong while rendering this course editor.</h3>
          <p className="mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
            An unexpected error occurred. You can attempt to reload the page or return to the previous screen.
          </p>
          {this.state.error?.message && (
            <code className="mt-4 block max-w-lg overflow-x-auto rounded-xl border border-rose-100/80 bg-white p-3 text-[10px] font-semibold text-rose-600 shadow-sm leading-5">
              {this.state.error.message}
            </code>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload page
            </button>
            <button
              onClick={this.handleGoBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all hover:scale-[1.02]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Go back
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
