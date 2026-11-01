import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  accentColor?: 'emerald' | 'amber' | 'cyan' | 'blue' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'emerald'
}) => {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 from-emerald-500/10 to-transparent',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 from-amber-500/10 to-transparent',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 from-cyan-500/10 to-transparent',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 from-blue-500/10 to-transparent',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 from-purple-500/10 to-transparent',
  };

  const iconColors = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/80 to-[#121c38]/90 border border-slate-700/60 p-5 shadow-lg shadow-black/20 hover:border-slate-600/80 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 font-['Outfit'] tracking-tight">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[accentColor]} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColors[accentColor]}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
