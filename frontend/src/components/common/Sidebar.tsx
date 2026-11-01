import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Sparkles,
  GitCompare,
  BrainCircuit,
  BarChart3,
  Zap,
  ShieldCheck,
  Building2,
  CloudSun,
  Calculator
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/explorer', label: 'Site Explorer', icon: MapPin },
    { to: '/weather', label: 'Weather & Seasonal Analysis', icon: CloudSun },
    { to: '/cost-estimator', label: 'Infrastructure Cost Estimator', icon: Calculator },
    { to: '/recommendations', label: 'AI Recommender', icon: Sparkles },
    { to: '/mnre', label: 'MNRE Registry & Data', icon: Building2 },
    { to: '/compare', label: 'Compare Sites', icon: GitCompare },
    { to: '/explain', label: 'Explainable AI (SHAP)', icon: BrainCircuit },
    { to: '/model-validation', label: 'Model Validation', icon: BarChart3 },
  ];


  return (
    <aside className="w-64 bg-[#0d162f] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0b132b] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-lg text-white tracking-wider font-['Outfit']">GreenSelect</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">INDIA</span>
            </div>
            <p className="text-[11px] text-slate-400">AI & GIS Site Selection</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1 mt-2">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Decision Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Footer Info Badge */}
      <div className="p-4 border-t border-slate-800/80 m-3 rounded-xl bg-slate-900/60 border">
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">Research Grounded</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Powered by NASA POWER, SRTM DEM, OpenStreetMap & Ensemble TreeSHAP.
        </p>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2">
          <span>CRS: EPSG:4326</span>
          <span className="text-emerald-400 font-medium">PostGIS Ready</span>
        </div>
      </div>
    </aside>
  );
};
