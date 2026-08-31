import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Trash2, Wrench } from 'lucide-react';
import { clearAllStorage, STORAGE_KEYS, removeStorageItem } from '../services/dbStorage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRepairing: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRepairing: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isRepairing: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary captured error:', error, errorInfo);
    if (typeof (window as any).__addAppError === 'function') {
      (window as any).__addAppError(
        `[ErrorBoundary] ${error.message || 'React render crash'}`,
        error.stack || errorInfo.componentStack,
        'runtime'
      );
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleEmergencyRepair = async () => {
    this.setState({ isRepairing: true });
    try {
      // Clear potentially corrupt cached state while preserving snapshots/backups if possible
      await removeStorageItem(STORAGE_KEYS.APP_STATE);
      await removeStorageItem(STORAGE_KEYS.SCHED_DATA);
      localStorage.removeItem(STORAGE_KEYS.APP_STATE);
      localStorage.removeItem(STORAGE_KEYS.SCHED_DATA);
    } catch (e) {
      console.warn('Błąd podczas czyszczenia pamięci podręcznej:', e);
    } finally {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] p-6 bg-slate-900 text-white select-none">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-lg font-bold text-slate-100 mb-2">
              {this.props.fallbackTitle || 'Wystąpił błąd podczas wyświetlania'}
            </h2>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              System napotkał nieoczekiwany stan danych. Dane w pamięci podręcznej są zabezpieczone. Możesz spróbować odświeżyć widok, naprawić stan lub przywrócić bezpieczną wersję.
            </p>

            {this.state.error && (
              <div className="mb-5 p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-left overflow-x-auto max-h-32 text-[11px] font-mono text-rose-300 custom-scrollbar">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <RotateCcw size={14} />
                Spróbuj ponownie
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw size={14} />
                Odśwież aplikację
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyRepair}
                disabled={this.state.isRepairing}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Wyczyść uszkodzoną pamięć podręczną i uruchom bezpieczny stan"
              >
                <Wrench size={14} />
                {this.state.isRepairing ? 'Naprawianie...' : 'Awaryjny reset pamięci podręcznej'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
