import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { siteService } from '../services/siteService';
import { explainService } from '../services/explainService';
import type { CandidateSite, SiteExplanationResponse } from '../types';
import { SuitabilityGauge } from '../components/charts/SuitabilityGauge';
import { SHAPWaterfallChart } from '../components/xai/SHAPWaterfallChart';
import { IndiaRenewableMap } from '../components/map/IndiaRenewableMap';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';
import { formatCapacity, formatEnergy, formatCO2, formatLCOE, formatCoordinates } from '../utils/formatters';
import { getEnergyColor, getTierColor } from '../utils/colorHelpers';
import {
  Sun,
  MapPin,
  Compass,
  Zap,
  ArrowLeft,
  GitCompare,
  BrainCircuit,
  ShieldCheck,
  Trees,
  Info,
  CloudSun,
  Calculator
} from 'lucide-react';


export const SiteDetails: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [site, setSite] = useState<CandidateSite | null>(null);
  const [explanation, setExplanation] = useState<SiteExplanationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!siteId) return;
    try {
      setLoading(true);
      setError(null);
      const [siteData, expData] = await Promise.all([
        siteService.getSiteById(siteId),
        explainService.getSiteExplanation(siteId),
      ]);
      setSite(siteData);
      setExplanation(expData);
    } catch (err: any) {
      setError(err.message || 'Failed to load site dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [siteId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={2} height="h-32" />
        <LoadingSkeleton rows={4} height="h-40" />
      </div>
    );
  }

  if (error || !site) {
    return <ErrorState message={error || 'Candidate site not found.'} onRetry={fetchDetails} />;
  }

  const energy = getEnergyColor(site.energy_type);
  const tier = getTierColor(site.suitability_tier, site.ml_suitability_score);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sites List</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(`/weather?siteId=${site.id}`)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <CloudSun className="w-3.5 h-3.5 text-amber-400" />
            <span>Weather & Seasonal Data</span>
          </button>
          <button
            onClick={() => navigate(`/cost-estimator?siteId=${site.id}`)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Setup Cost Estimator</span>
          </button>
          <button
            onClick={() => navigate('/compare')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Compare Site</span>
          </button>
          <button
            onClick={() => navigate('/explain')}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Full SHAP Diagnostics</span>
          </button>
        </div>
      </div>


      {/* Header Site Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-[#131d3b] to-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {site.site_code}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${energy.badge}`}>
              {site.energy_type} Generation
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${tier.badge}`}>
              {site.suitability_tier} Suitability
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
            {site.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {site.district}, {site.state} ({site.region} Region)
            </span>
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              {formatCoordinates(site.latitude, site.longitude)}
            </span>
            <span className="flex items-center gap-1.5">
              <Trees className="w-3.5 h-3.5 text-amber-400" />
              {site.land_cover_class}
            </span>
          </div>
        </div>

        {/* Large Overall Suitability Gauge */}
        <div className="shrink-0 bg-slate-950/60 p-2 rounded-2xl border border-slate-800/80">
          <SuitabilityGauge score={site.ml_suitability_score} tier={site.suitability_tier} size={160} />
        </div>
      </div>

      {/* Techno-Economic Sizing KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Estimated Capacity</span>
          <span className="text-2xl font-black text-white font-['Outfit']">{formatCapacity(site.estimated_capacity_mw)}</span>
          <p className="text-[11px] text-slate-400">Peak installed nameplate rating</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Annual Energy Yield</span>
          <span className="text-2xl font-black text-emerald-400 font-['Outfit']">{formatEnergy(site.annual_energy_potential_gwh)}</span>
          <p className="text-[11px] text-slate-400">Clean electricity delivered to grid</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Estimated LCOE</span>
          <span className="text-2xl font-black text-amber-300 font-['Outfit']">{formatLCOE(site.lcoe_inr_kwh)}</span>
          <p className="text-[11px] text-slate-400">Levelized cost benchmark</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">CO₂ Abatement</span>
          <span className="text-2xl font-black text-cyan-400 font-['Outfit']">{formatCO2(site.co2_offset_tonnes_year)}</span>
          <p className="text-[11px] text-slate-400">Annual emission reductions</p>
        </div>
      </div>

      {/* Deep-Dive Grid: Resource, Infrastructure, Terrain, Environment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Climatological Resource Assessment */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sun className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">NASA Climatological Resource Flux</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Global Horizontal Irradiance</span>
              <span className="text-lg font-bold text-amber-300 font-['Outfit']">{site.solar_ghi}</span>
              <span className="text-[10px] text-slate-400 block">kWh / m² / day</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Direct Normal Irradiance</span>
              <span className="text-lg font-bold text-amber-300 font-['Outfit']">{site.solar_dni}</span>
              <span className="text-[10px] text-slate-400 block">kWh / m² / day</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Wind Speed (50m Hub)</span>
              <span className="text-lg font-bold text-cyan-300 font-['Outfit']">{site.wind_speed_50m} m/s</span>
              <span className="text-[10px] text-slate-400 block">{site.wind_speed_10m} m/s at 10m</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Wind Power Density</span>
              <span className="text-lg font-bold text-cyan-300 font-['Outfit']">{site.wind_power_density} W/m²</span>
              <span className="text-[10px] text-slate-400 block">Air density: 1.225 kg/m³</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex justify-between items-center">
            <span className="text-slate-400">Mean Ambient Temperature:</span>
            <span className="font-bold text-white">{site.temperature_avg} °C</span>
          </div>
        </div>

        {/* 2. Infrastructure & Grid Connectivity */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">Infrastructure & Grid Connectivity</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-200 block">High-Voltage Transmission Grid</span>
                <span className="text-[11px] text-slate-400">Direct geodesic distance to nearest corridor</span>
              </div>
              <span className="text-base font-bold text-emerald-400 font-['Outfit']">{site.distance_to_grid_km} km</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-200 block">Grid Substation Distance</span>
                <span className="text-[11px] text-slate-400">Interconnection step-up substation</span>
              </div>
              <span className="text-base font-bold text-cyan-300 font-['Outfit']">{site.distance_to_substation_km} km</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-200 block">Highway & Heavy Transport Road</span>
                <span className="text-[11px] text-slate-400">{site.road_type}</span>
              </div>
              <span className="text-base font-bold text-amber-300 font-['Outfit']">{site.distance_to_road_km} km</span>
            </div>

            {site.nearest_mnre_park && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-amber-300 block">Nearest MNRE Sanctioned Mega Park</span>
                  <span className="text-[11px] text-slate-300">{site.nearest_mnre_park}</span>
                  <span className="text-[10px] text-emerald-400 block font-medium">GEC: {site.in_mnre_green_corridor || 'Standard ISTS'}</span>
                </div>
                <span className="text-base font-bold text-amber-400 font-['Outfit']">{site.distance_to_mnre_park_km} km</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Topography & Civil Engineering */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Compass className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">Topography & Civil Engineering (SRTM)</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Elevation Above Sea Level</span>
              <span className="text-lg font-bold text-white font-['Outfit']">{site.elevation_m} m</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <span className="text-slate-400 block text-[11px]">Terrain Slope Gradient</span>
              <span className="text-lg font-bold text-emerald-400 font-['Outfit']">{site.slope_deg}°</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex justify-between items-center">
            <span className="text-slate-400">Morphological Classification:</span>
            <span className="font-bold text-purple-300">{site.terrain_type}</span>
          </div>
        </div>

        {/* 4. Environmental Buffer Assessment */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">Ecological & Protected Area Assessment</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-200 block">Nearest Protected Zone</span>
                <span className="text-[11px] text-slate-400">{site.nearest_protected_area || 'None within 20km'}</span>
              </div>
              <span className="text-base font-bold text-white font-['Outfit']">{site.distance_to_protected_area_km} km</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-200 block">Environmental Penalty Deductions</span>
                <span className="text-[11px] text-slate-400">Buffer zone risk mitigation</span>
              </div>
              <span className="text-base font-bold text-teal-400 font-['Outfit']">
                {site.environmental_penalty === 0 ? '0 pts (Zero Risk)' : `-${site.environmental_penalty} pts`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SHAP Explainability Section */}
      {explanation && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-black text-white font-['Outfit']">
                  Explainable AI (SHAP Factor Attribution)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real TreeSHAP values detailing exact positive driver boosts and negative siting penalties.
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              TreeSHAP Ensemble
            </span>
          </div>

          <SHAPWaterfallChart
            positiveFactors={explanation.positive_factors}
            negativeFactors={explanation.negative_factors}
            baseValue={explanation.base_value}
            predictedScore={explanation.predicted_suitability_score}
          />

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Automated Model Synthesis Report</span>
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {explanation.natural_language_explanation}
            </p>
          </div>
        </div>
      )}

      {/* Mini Geographic Map Preview */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <span>Local Site GIS Coordinates & Radial Interconnection Buffer</span>
        </h3>
        <IndiaRenewableMap sites={[site]} selectedSite={site} height="h-[360px]" />
      </div>
    </div>
  );
};
