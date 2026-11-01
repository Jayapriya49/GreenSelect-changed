export function getEnergyColor(type: string): {
  badge: string;
  bg: string;
  border: string;
  text: string;
  hex: string;
  glow: string;
} {
  switch (type?.toLowerCase()) {
    case 'solar':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        bg: 'bg-amber-500',
        border: 'border-amber-500',
        text: 'text-amber-400',
        hex: '#f59e0b',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
      };
    case 'wind':
      return {
        badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        bg: 'bg-cyan-500',
        border: 'border-cyan-500',
        text: 'text-cyan-400',
        hex: '#06b6d4',
        glow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]',
      };
    case 'hybrid':
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        bg: 'bg-emerald-500',
        border: 'border-emerald-500',
        text: 'text-emerald-400',
        hex: '#10b981',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
      };
    default:
      return {
        badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        bg: 'bg-slate-500',
        border: 'border-slate-500',
        text: 'text-slate-400',
        hex: '#64748b',
        glow: 'shadow-none',
      };
  }
}

export function getTierColor(tier: string, score: number): {
  badge: string;
  text: string;
  gradient: string;
} {
  if (score >= 85 || tier === 'Very High') {
    return {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
      text: 'text-emerald-400',
      gradient: 'from-emerald-500 to-teal-400',
    };
  }
  if (score >= 72 || tier === 'High') {
    return {
      badge: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
      text: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-400',
    };
  }
  if (score >= 58 || tier === 'Moderate') {
    return {
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
      text: 'text-amber-400',
      gradient: 'from-amber-500 to-yellow-400',
    };
  }
  return {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
    text: 'text-rose-400',
    gradient: 'from-rose-500 to-red-400',
  };
}
