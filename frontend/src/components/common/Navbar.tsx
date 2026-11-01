import React from 'react';
import { Globe } from 'lucide-react';

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  title = "Where should India's next renewable energy projects be built?",
  subtitle = "AI-powered spatial analysis for renewable energy site selection across India."
}) => {
  return (
    <header className="h-20 bg-[#0d162f]/80 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-lg font-bold text-white font-['Outfit'] tracking-tight flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium">Live Spatial Pipeline</span>
        </div>

        {/* Region Tag */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>India Nationwide</span>
        </div>
      </div>
    </header>
  );
};
