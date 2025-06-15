"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Performance monitoring
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark('error-boundary-triggered');
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: 'anonymous' // Could be replaced with actual user ID
    };

    // In a real app, send this to your error tracking service
    console.error('Error Report:', errorReport);
    
    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorReport);
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      component: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId
    };

    const subject = encodeURIComponent(`Bug Report - Error ID: ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error Details:
${JSON.stringify(errorDetails, null, 2)}

Steps to reproduce:
1. 
2. 
3. 

Expected behavior:


Actual behavior:


Additional context:

    `);

    window.open(`mailto:support@smarthub.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Error Message */}
            <h2 className="text-xl font-semibold text-white mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-400 mb-6">
              We encountered an unexpected error. Don't worry, our team has been notified.
            </p>

            {/* Error ID */}
            <div className="bg-gray-900/50 rounded-lg p-3 mb-6">
              <p className="text-xs text-gray-500 mb-1">Error ID</p>
              <p className="text-sm text-gray-300 font-mono">{this.state.errorId}</p>
            </div>

            {/* Error Details (if enabled) */}
            {this.props.showDetails && this.state.error && (
              <details className="text-left mb-6">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 mb-2">
                  Technical Details
                </summary>
                <div className="bg-gray-900/50 rounded-lg p-3 text-xs">
                  <div className="text-red-400 mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="text-gray-500 font-mono whitespace-pre-wrap">
                      {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-400 text-slate-900 rounded-lg font-medium hover:bg-teal-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <div className="flex gap-3">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>

                <button
                  onClick={this.handleReportBug}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <Bug className="w-4 h-4" />
                  Report Bug
                </button>
              </div>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-4">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting from functional components
export function useErrorHandler() {
  const reportError = (error: Error, context?: string) => {
    console.error('Manual error report:', error, context);
    
    // Create synthetic error info
    const errorInfo: ErrorInfo = {
      componentStack: context || 'Manual error report'
    };

    // Report the error
    const errorReport = {
      errorId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      const existingErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      existingErrors.push(errorReport);
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  };

  return { reportError };
}
