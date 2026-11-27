import React, { Component, ReactNode, StrictMode, Suspense, ErrorInfo, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { safeStorage } from './safeStorage';

const App = lazy(() => import('./App.tsx'));
const StandaloneLkApp = lazy(() => import('./components/StandaloneLkApp.tsx'));

function isStandaloneLkRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = (window.location.pathname || '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  return (
    pathname === '/lk' ||
    pathname === '/lk/' ||
    pathname.startsWith('/lk/') ||
    params.get('lk') === '1' ||
    params.get('lk') === 'true'
  );
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DK QMS Uncaught Runtime Error]:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = () => {
    try {
      safeStorage.removeItem('dk_firebase_quota_exceeded');
      safeStorage.removeItem('dk_current_user');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="w-full max-w-md bg-slate-900/95 border border-indigo-900/50 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center backdrop-blur-md">
            <div className="w-14 h-14 mx-auto bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              ⚠️
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                Hệ Thống Đang Làm Mới
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ứng dụng gặp sự cố khởi tạo tạm thời. Dữ liệu của anh đã được bảo vệ an toàn 100% trong bộ nhớ.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950/80 rounded-xl p-3 text-left border border-slate-800 text-[11px] font-mono text-rose-300 max-h-28 overflow-y-auto break-all">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
              >
                🔄 Tải Lại Trang
              </button>
              <button
                type="button"
                onClick={this.handleHardReset}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
              >
                🧹 Làm Mới Bộ Nhớ
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              DKBike Quality Management System 2026
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="bg-slate-900 min-h-screen w-full flex flex-col items-center justify-center text-slate-100 font-sans p-4 text-center">
            <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-indigo-300 tracking-wide uppercase">
              Đang tải DK QMS...
            </p>
          </div>
        }
      >
        {isStandaloneLkRoute() ? <StandaloneLkApp /> : <App />}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);

