import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[REACT UNCAUGHT ERROR BOUNDARY]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    const path = (window.location && window.location.pathname) || '';
    let safeUrl = '/';
    if (path.startsWith('/super-admin') || path.startsWith('/sudo-control-panel')) {
      safeUrl = '/super-admin/dashboard';
    } else if (path.startsWith('/admin')) {
      safeUrl = '/admin/dashboard';
    } else if (path.startsWith('/student')) {
      safeUrl = '/dashboard';
    }
    window.location.href = safeUrl;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans select-none">
          
          <div className="max-w-md w-full bg-white/10 backdrop-blur-2xl border border-white/15 shadow-2xl rounded-3xl p-8 space-y-6">
            
            {/* Animated Warning Emblem */}
            <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-[0_0_30px_rgba(244,63,94,0.2)] animate-pulse">
              🛡️
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white">Something Went Wrong</h2>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                An unexpected interface issue occurred. Our system caught this issue automatically to prevent a screen crash.
              </p>
            </div>

            {/* Error Details Box (Collapsible / Readable) */}
            {this.state.error && (
              <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-left overflow-x-auto max-h-32 text-[11px] font-mono text-rose-300">
                <p className="font-bold text-rose-400 mb-1">Error Trace:</p>
                <p className="break-words">{this.state.error.toString()}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                🔄 Refresh Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-extrabold py-3 px-4 rounded-xl text-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                🏠 Return to Safety
              </button>
            </div>

          </div>

          <p className="text-[11px] text-gray-500 mt-6 font-semibold">
            Skill Bridge India • Error Recovery System Active
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
