import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { siteService } from '../services/siteService';
import { mnreService } from '../services/mnreService';
import type { NationalStatsResponse, CandidateSite, MNRESolarPark } from '../types';
import { StatCard } from '../components/common/StatCard';
import { IndiaRenewableMap } from '../components/map/IndiaRenewableMap';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';
import { formatCapacity, formatEnergy, formatNumber } from '../utils/formatters';
import { getEnergyColor } from '../utils/colorHelpers';
import {
  MapPin,
  Sparkles,
  Zap,
  Leaf,
  Globe,
  Layers,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<NationalStatsResponse | null>(null);
  const [featuredSites, setFeaturedSites] = useState<CandidateSite[]>([]);
  const [mnreParks, setMnreParks] = useState<MNRESolarPark[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, sitesData, mnreData] = await Promise.all([
        siteService.getStatistics(),
        siteService.getSites({ min_suitability: 85, limit: 6 }),
        mnreService.getSolarParks({ limit: 50 })
      ]);
      setStats(statsData);
      setFeaturedSites(sitesData.sites);
      setMnreParks(mnreData.parks);
    } catch (err: any) {
      setError(err.message || 'Failed to load national renewable analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton rows={4} height="h-28" />
        <LoadingSkeleton rows={1} height="h-96" />
      </div>
    );
  }

  if (error || !stats) {
    return <ErrorState message={error || 'Failed to connect to backend service.'} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border border-emerald-500/20 p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>National Spatial Decision-Support Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight leading-tight">
            AI-Powered Renewable Energy Site Selection for India
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Synthesizing multi-year climatological solar & wind datasets (NASA POWER), high-resolution topography (SRTM DEM), and transmission infrastructure (OpenStreetMap) to identify prime greenfield energy zones.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/recommendations')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-950 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Site Recommender</span>
            </button>
            <button
              onClick={() => navigate('/explorer')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Explore Interactive GIS Map</span>
            </button>
          </div>
        </div>
        {/* Subtle Background Glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Real National KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Areas Analyzed"
          value={`${formatNumber(stats.total_analyzed_area_sqkm, 0)} km²`}
          subtitle="Across major Indian renewable corridors"
          icon={Globe}
          trend="Multi-State Grid Nodes"
          accentColor="cyan"
        />
        <StatCard
          title="Candidate Sites"
          value={stats.total_candidate_sites}
          subtitle={`${stats.high_suitability_zones_count} high-suitability zones`}
          icon={MapPin}
          trend="Filtered for Environmental Safety"
          accentColor="emerald"
        />
        <StatCard
          title="Est. Clean Capacity"
          value={`${stats.total_estimated_capacity_gw.toFixed(1)} GW`}
          subtitle={`Yielding ${stats.total_annual_generation_twh.toFixed(1)} TWh/yr`}
          icon={Zap}
          trend="Solar, Wind & Hybrid Potential"
          accentColor="amber"
        />
        <StatCard
          title="CO₂ Offset Potential"
          value={`${stats.total_annual_co2_offset_m_tonnes.toFixed(1)}M t/yr`}
          subtitle="Carbon emissions avoided"
          icon={Leaf}
          trend="India Grid CEA Baseline"
          accentColor="purple"
        />
      </div>

      {/* Interactive Map & Energy Mix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Column (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span>National Geospatial Site Distribution</span>
              </h3>
              <p className="text-xs text-slate-400">Click any marker to inspect real-time techno-economic metrics.</p>
            </div>
            <button
              onClick={() => navigate('/explorer')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Screen Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <IndiaRenewableMap sites={featuredSites} mnreParks={mnreParks} height="h-[460px]" />
        </div>

        {/* Energy Mix & Regional Summary Column (1 span) */}
        <div className="space-y-6">
          {/* Energy Mix Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-white font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Renewable Energy Breakdown</span>
            </h4>
            <div className="space-y-3">
              {stats.energy_type_distribution.map((item) => {
                const energy = getEnergyColor(item.energy_type);
                return (
                  <div key={item.energy_type} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${energy.badge}`}>
                        {item.energy_type}
                      </span>
                      <span className="text-xs font-bold text-white font-['Outfit']">
                        {item.count} Sites ({formatCapacity(item.total_capacity_mw)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Avg. Suitability: <b className="text-emerald-400">{item.avg_suitability}/100</b></span>
                      <span>{formatEnergy(item.annual_generation_gwh)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top States Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
            <h4 className="text-sm font-bold text-white font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Leading Renewable States</span>
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {stats.top_states.slice(0, 5).map((st) => (
                <div key={st.state} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">{st.state}</span>
                    <span className="text-[10px] text-slate-400">{st.region} India &bull; {st.total_sites} candidate zones</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 font-['Outfit'] block">{st.avg_suitability}/100</span>
                    <span className="text-[10px] text-slate-400">{formatCapacity(st.total_potential_mw)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top 6 Featured Prime Siting Locations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Prime High-Suitability Locations Across India</span>
            </h3>
            <p className="text-xs text-slate-400">Validated high-score candidate zones ready for techno-economic evaluation.</p>
          </div>
          <button
            onClick={() => navigate('/explorer')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Sites</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredSites.map((site) => {
            const energy = getEnergyColor(site.energy_type);

            return (
              <div
                key={site.id}
                onClick={() => navigate(`/sites/${site.id}`)}
                className="p-5 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg hover:-translate-y-1 group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">{site.site_code}</span>
                    <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-tight">
                      {site.name}
                    </h4>
                    <p className="text-xs text-slate-400">{site.district}, {site.state}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${energy.badge}`}>
                    {site.energy_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">AI Suitability</span>
                    <span className="text-xl font-extrabold text-emerald-400 font-['Outfit']">
                      {site.ml_suitability_score}
                      <span className="text-xs text-slate-400 font-normal">/100</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Capacity</span>
                    <span className="text-base font-bold text-white font-['Outfit']">
                      {formatCapacity(site.estimated_capacity_mw)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Solar Irradiance:</span>
                    <span className="font-semibold text-amber-300">{site.solar_ghi} kWh/m²/d</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wind at 50m:</span>
                    <span className="font-semibold text-cyan-300">{site.wind_speed_50m} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grid Distance:</span>
                    <span className="font-semibold">{site.distance_to_grid_km} km</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Inspect Site Telemetry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
