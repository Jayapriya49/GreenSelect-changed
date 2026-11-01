import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const LoadingSkeleton: React.FC<{ rows?: number; height?: string }> = ({
  rows = 3,
  height = 'h-24'
}) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className={`w-full ${height} bg-slate-800/60 rounded-xl border border-slate-700/40`} />
      ))}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = "Connection Error",
  message = "Unable to connect to the renewable energy analysis service.",
  onRetry
}) => {
  return (
    <div className="rounded-2xl bg-rose-950/20 border border-rose-800/40 p-6 text-center max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="text-xs text-rose-300/80 mt-1.5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};
