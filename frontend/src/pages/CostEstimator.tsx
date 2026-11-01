import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calculator,
  Sun,
  Wind,
  Layers,
  Download,
  RefreshCw,
  GitCompare,
  TrendingDown,
  ShieldCheck,
  Zap,
  SlidersHorizontal
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { costService } from '../services/costService';
import { siteService } from '../services/siteService';
import type {
  CandidateSite,
  CostEstimationRequest,
  CostEstimationResponse,
  CostAssumptionItem,
  CostComparisonResponse
} from '../types';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';

const CATEGORY_COLORS: Record<string, string> = {
  Equipment: '#10b981',      // Emerald
  Land: '#f59e0b',           // Amber
  Grid: '#06b6d4',           // Cyan
  Installation: '#8b5cf6',   // Purple
  Civil: '#ec4899'           // Pink
};

export const CostEstimator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySiteId = searchParams.get('siteId');

  // Candidate Sites
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(querySiteId || '');

  // Form State
  const [locationName, setLocationName] = useState<string>('Thar Desert Basin (Sector A)');
  const [stateName, setStateName] = useState<string>('Rajasthan');
  const [energyType, setEnergyType] = useState<'Solar' | 'Wind' | 'Hybrid'>('Solar');
  const [capacityMw, setCapacityMw] = useState<number>(50);
  const [solarMw, setSolarMw] = useState<number>(30);
  const [windMw, setWindMw] = useState<number>(20);
  const [landAcres, setLandAcres] = useState<number | undefined>(undefined);
  const [gridDistanceKm, setGridDistanceKm] = useState<number>(10.0);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number>(2.0);
  const [terrainType, setTerrainType] = useState<string>('Flat Plain');
  const [slopeDeg, setSlopeDeg] = useState<number>(1.2);

  // Estimation Results
  const [estimation, setEstimation] = useState<CostEstimationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Configurable Assumptions Modal
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);
  const [assumptions, setAssumptions] = useState<CostAssumptionItem[]>([]);
  const [assumptionsLoading, setAssumptionsLoading] = useState<boolean>(false);

  // Comparison State
  const [compareMode, setCompareMode] = useState<'none' | 'locations' | 'energy_types' | 'capacities'>('none');
  const [comparisonData, setComparisonData] = useState<CostComparisonResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Load sites on mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await siteService.getSites({ limit: 300 });
        setSites(res.sites);

        if (querySiteId) {
          const match = res.sites.find((s) => s.id === Number(querySiteId));
          if (match) {
            applySiteToInputs(match);
            return;
          }
        }

        if (res.sites.length > 0) {
          applySiteToInputs(res.sites[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load candidate sites.');
      }
    };
    loadSites();
  }, [querySiteId]);

  const applySiteToInputs = (site: CandidateSite) => {
    setSelectedSiteId(String(site.id));
    setLocationName(site.name);
    setStateName(site.state);
    setEnergyType(site.energy_type as 'Solar' | 'Wind' | 'Hybrid');
    setCapacityMw(site.estimated_capacity_mw > 0 ? site.estimated_capacity_mw : 50);
    setGridDistanceKm(site.distance_to_grid_km || 10.0);
    setRoadDistanceKm(site.distance_to_road_km || 2.0);
    setSlopeDeg(site.slope_deg || 1.2);
    setTerrainType(site.terrain_type || 'Flat Plain');

    // Trigger estimation for this site
    runEstimation({
      site_id: site.id,
      location_name: site.name,
      state: site.state,
      energy_type: site.energy_type as 'Solar' | 'Wind' | 'Hybrid',
      capacity_mw: site.estimated_capacity_mw > 0 ? site.estimated_capacity_mw : 50,
      distance_to_grid_km: site.distance_to_grid_km || 10.0,
      distance_to_road_km: site.distance_to_road_km || 2.0,
      slope_deg: site.slope_deg || 1.2,
      terrain_type: site.terrain_type || 'Flat Plain'
    });
  };

  const buildCurrentRequest = (): CostEstimationRequest => {
    return {
      site_id: selectedSiteId && selectedSiteId !== 'custom' ? Number(selectedSiteId) : undefined,
      location_name: locationName,
      state: stateName,
      energy_type: energyType,
      capacity_mw: capacityMw,
      solar_capacity_mw: energyType === 'Hybrid' ? solarMw : undefined,
      wind_capacity_mw: energyType === 'Hybrid' ? windMw : undefined,
      land_requirement_acres: landAcres,
      distance_to_grid_km: gridDistanceKm,
      distance_to_road_km: roadDistanceKm,
      terrain_type: terrainType,
      slope_deg: slopeDeg
    };
  };

  const runEstimation = async (customReq?: CostEstimationRequest) => {
    try {
      setLoading(true);
      setError(null);
      const req = customReq || buildCurrentRequest();
      const res = await costService.estimateCost(req);
      setEstimation(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate infrastructure cost estimation.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const req = buildCurrentRequest();
      await costService.downloadPdfReport(req);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const loadAssumptions = async () => {
    try {
      setAssumptionsLoading(true);
      const data = await costService.getAssumptions();
      setAssumptions(data);
      setShowAssumptionsModal(true);
    } catch (err: any) {
      alert(`Could not load assumptions: ${err.message}`);
    } finally {
      setAssumptionsLoading(false);
    }
  };

  const handleResetAssumptions = async () => {
    if (!confirm('Reset all parameters back to official CERC / MNRE benchmark rates?')) return;
    try {
      setAssumptionsLoading(true);
      const data = await costService.resetAssumptions();
      setAssumptions(data);
      runEstimation();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setAssumptionsLoading(false);
    }
  };

  const handleRunComparison = async (mode: 'locations' | 'energy_types' | 'capacities') => {
    try {
      setCompareLoading(true);
      setCompareMode(mode);
      const baseReq = buildCurrentRequest();
      const compSites = sites.slice(0, 4).map((s) => s.id);
      const res = await costService.compareCosts({
        mode,
        base_request: baseReq,
        comparison_site_ids: compSites,
        comparison_capacities: [25, 50, 100, 250]
      });
      setComparisonData(res);
    } catch (err: any) {
      alert(`Comparison failed: ${err.message}`);
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#14233c] border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Calculator className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Techno-Economic Decision Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
            Infrastructure Cost Estimator
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Estimate transparent capital setup expenditure (CAPEX) for Solar, Wind, and Hybrid power plants
            across India with site-specific grid, logistics, and slope adjustments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAssumptions}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Assumptions & Rates</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !estimation}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${downloadingPdf ? 'animate-bounce' : ''}`} />
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-lg">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Plant Configuration & Geographical Parameters</span>
        </h3>

        {/* Energy Type Selector Tabs */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">Energy Plant Type</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'Solar', label: 'Solar Power Plant', icon: Sun, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
              { type: 'Wind', label: 'Wind Power Plant', icon: Wind, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
              { type: 'Hybrid', label: 'Hybrid Solar + Wind', icon: Layers, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = energyType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => {
                    setEnergyType(item.type as any);
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? `${item.color} shadow-md`
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Site Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Candidate Site Dossier</label>
            <select
              value={selectedSiteId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedSiteId(id);
                const s = sites.find((x) => x.id === Number(id));
                if (s) applySiteToInputs(s);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.district}, {s.state})
                </option>
              ))}
            </select>
          </div>

          {/* Installed Capacity */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Installed Capacity (MW)
            </label>
            <input
              type="number"
              min="1"
              max="5000"
              value={capacityMw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCapacityMw(val);
                if (energyType === 'Hybrid') {
                  setSolarMw(Math.round(val * 0.6));
                  setWindMw(Math.round(val * 0.4));
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Grid Distance */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Grid Substation Distance (km)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={gridDistanceKm}
              onChange={(e) => setGridDistanceKm(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Road Distance */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Nearest Paved Road (km)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={roadDistanceKm}
              onChange={(e) => setRoadDistanceKm(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Hybrid Capacity Split (Only if Hybrid) */}
        {energyType === 'Hybrid' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-amber-300 block mb-1">
                Solar Share (MW): {solarMw} MW
              </label>
              <input
                type="range"
                min="1"
                max={capacityMw - 1}
                value={solarMw}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setSolarMw(s);
                  setWindMw(capacityMw - s);
                }}
                className="w-full accent-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-cyan-300 block mb-1">
                Wind Share (MW): {windMw} MW
              </label>
              <input
                type="range"
                min="1"
                max={capacityMw - 1}
                value={windMw}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setWindMw(w);
                  setSolarMw(capacityMw - w);
                }}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Terrain, Slopes, Land & Calculate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Terrain Slope Category</label>
              <span className="text-[10px] text-cyan-400 font-medium">SRTM DEM</span>
            </div>
            <select
              value={terrainType}
              onChange={(e) => {
                const t = e.target.value;
                setTerrainType(t);
                if (t === 'Flat Plain' && slopeDeg > 2.0) setSlopeDeg(1.0);
                else if (t === 'Rolling Terrain' && (slopeDeg <= 2.0 || slopeDeg > 5.0)) setSlopeDeg(3.5);
                else if (t === 'Hilly Undulating' && (slopeDeg <= 5.0 || slopeDeg > 10.0)) setSlopeDeg(7.0);
                else if (t === 'Steep Slope' && slopeDeg <= 10.0) setSlopeDeg(12.0);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Flat Plain">Flat Plain (≤ 2° slope)</option>
              <option value="Rolling Terrain">Rolling Terrain (2° - 5° slope)</option>
              <option value="Hilly Undulating">Hilly Undulating (5° - 10° slope)</option>
              <option value="Steep Slope">Steep Mountainous (&gt; 10° slope)</option>
            </select>
            <span className="text-[10px] text-slate-400 block mt-1">Based on NASA SRTM elevation data</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">Slope Angle (Degrees)</label>
              <span className="text-[10px] text-emerald-400 font-medium">SRTM: {slopeDeg.toFixed(1)}°</span>
            </div>
            <input
              type="number"
              step="0.1"
              min="0"
              max="45"
              value={slopeDeg}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSlopeDeg(val);
                if (val <= 2.0) setTerrainType('Flat Plain');
                else if (val <= 5.0) setTerrainType('Rolling Terrain');
                else if (val <= 10.0) setTerrainType('Hilly Undulating');
                else setTerrainType('Steep Slope');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-400 block mt-1">Editable for civil sensitivity modeling</span>
          </div>


          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Land Footprint (Acres)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder={estimation ? `${estimation.land_requirement_acres} (auto)` : 'Auto-calculated'}
              value={landAcres ?? ''}
              onChange={(e) => setLandAcres(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => runEstimation()}
              disabled={loading}
              className="w-full py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Calculating...' : 'Recalculate Setup Cost'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Results Display */}
      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton rows={2} height="h-28" />
          <LoadingSkeleton rows={4} height="h-64" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => runEstimation()} />
      ) : estimation ? (
        <div className="space-y-8">
          {/* Top Big Headline Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Setup Cost */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl">
              <span className="text-xs font-semibold text-emerald-400 block mb-1">
                Total Estimated Setup Cost
              </span>
              <div className="text-3xl font-extrabold text-white font-['Outfit']">
                ₹ {estimation.total_cost_crores.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                <span className="text-base text-emerald-400 ml-1 font-normal">Cr</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                ₹ {estimation.total_cost_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Turnkey CAPEX for {estimation.capacity_mw} MW {estimation.energy_type} facility.
              </p>
            </div>

            {/* Cost per MW */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Normalized CAPEX per MW
              </span>
              <div className="text-3xl font-extrabold text-amber-300 font-['Outfit']">
                ₹ {estimation.cost_per_mw_crores.toFixed(2)}
                <span className="text-base text-slate-400 ml-1 font-normal">Cr / MW</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Land Footprint: <span className="text-slate-200 font-semibold">{estimation.land_requirement_acres} Acres</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Derived from standard Indian CERC benchmark cost orders.
              </p>
            </div>

            {/* Shared Synergy Savings (Hybrid) or Grid Factor */}
            {estimation.energy_type === 'Hybrid' && estimation.shared_synergy_savings_crores > 0 ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-900 border border-cyan-500/40 shadow-xl">
                <span className="text-xs font-semibold text-cyan-400 block mb-1 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-cyan-400" />
                  <span>Shared Infrastructure Savings</span>
                </span>
                <div className="text-3xl font-extrabold text-cyan-300 font-['Outfit']">
                  ₹ {estimation.shared_synergy_savings_crores.toFixed(2)}
                  <span className="text-base text-cyan-400 ml-1 font-normal">Cr Saved</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Shared Transmission Line & Substation
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Avoids duplicate transmission lines and common civil overhead.
                </p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Grid Evacuation CAPEX
                </span>
                <div className="text-3xl font-extrabold text-cyan-400 font-['Outfit']">
                  ₹ {estimation.grid_connection_cost_crores.toFixed(2)}
                  <span className="text-base text-slate-400 ml-1 font-normal">Cr</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {estimation.distance_to_grid_km} km transmission + 1 substation bay
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Dedicated high-voltage feeder link to utility grid.
                </p>
              </div>
            )}

            {/* Terrain & Logistics Adjustment Multiplier */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Site Adjustment Multipliers
              </span>
              <div className="text-2xl font-extrabold text-white font-['Outfit']">
                {estimation.terrain_adjustment_multiplier.toFixed(2)}x
                <span className="text-xs text-slate-400 ml-1.5 font-normal">Slope factor</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Logistics Multiplier: <span className="text-slate-200 font-semibold">{estimation.road_distance_adjustment_multiplier.toFixed(2)}x</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Adjustment applied on grading, foundations, and heavy cranes.
              </p>
            </div>
          </div>

          {/* Planning Notice Banner */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200 block mb-0.5">Indicative Planning Estimate</span>
              <p>{estimation.disclaimer}</p>
            </div>
          </div>

          {/* Charts: Cost Distribution by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Donut Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Cost Distribution by Category</h4>
                <p className="text-xs text-slate-400">Proportional allocation of total plant CAPEX</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={estimation.categories}
                      dataKey="total_crores"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {estimation.categories.map((entry) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      formatter={(val: any) => [`₹ ${Number(val).toFixed(2)} Cr`, 'Cost']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                {estimation.categories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.category] }} />
                    <span className="text-slate-400 truncate">{cat.category}:</span>
                    <span className="font-bold text-white ml-auto">{cat.percentage_of_total}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Subtotals Bar Chart */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Category Subtotals (₹ Crores)</h4>
                  <p className="text-xs text-slate-400">Total expenditure per infrastructure pillar</p>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  Total: ₹ {estimation.total_cost_crores.toFixed(2)} Cr
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estimation.categories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                    <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={11} width={90} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      formatter={(val: any) => [`₹ ${Number(val).toFixed(2)} Crores`, 'Expenditure']}
                    />
                    <Bar dataKey="total_crores" radius={[0, 4, 4, 0]}>
                      {estimation.categories.map((entry) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Itemized Components Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-white">Itemized Cost Components & Calculation Formulas</h4>
                <p className="text-xs text-slate-400">
                  Transparent breakdown showing quantity, benchmark unit rates, and site adjustment factors.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">
                Currency: INR (₹) & Crores
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="py-3 px-3">Component Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Quantity</th>
                    <th className="py-3 px-3">Calculation Formula</th>
                    <th className="py-3 px-3 text-right">Cost (₹ Cr)</th>
                    <th className="py-3 px-3 text-right">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {estimation.all_components.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{c.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{c.description}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[c.category]}20`,
                            color: CATEGORY_COLORS[c.category]
                          }}
                        >
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {c.quantity} {c.quantity_unit}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {c.calculation_formula}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-400 font-['Outfit']">
                        ₹ {c.total_cost_crores.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {c.percentage_of_total}%
                      </td>
                    </tr>
                  ))}

                  {/* Grand Total Row */}
                  <tr className="bg-emerald-500/10 font-bold border-t-2 border-emerald-500/40">
                    <td colSpan={4} className="py-3.5 px-3 text-white uppercase tracking-wider">
                      Total Estimated Plant CAPEX Setup Cost
                    </td>
                    <td className="py-3.5 px-3 text-right text-base font-extrabold text-emerald-400 font-['Outfit']">
                      ₹ {estimation.total_cost_crores.toFixed(2)} Cr
                    </td>
                    <td className="py-3.5 px-3 text-right text-white">
                      100.0%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Comparison Section */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-cyan-400" />
                  <span>Cost Comparison & Sensitivity Analysis</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Compare setup costs across locations, technology types, or plant capacity scales.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunComparison('energy_types')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    compareMode === 'energy_types'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  Solar vs Wind vs Hybrid
                </button>
                <button
                  onClick={() => handleRunComparison('capacities')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    compareMode === 'capacities'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  Capacity Scales (25-250 MW)
                </button>
                <button
                  onClick={() => handleRunComparison('locations')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    compareMode === 'locations'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  Candidate Locations
                </button>
              </div>
            </div>

            {compareLoading ? (
              <LoadingSkeleton rows={3} height="h-64" />
            ) : comparisonData ? (
              <div className="space-y-4">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData.items}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} label={{ value: 'Cost (₹ Crores)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="equipment_crores" name="Equipment" stackId="a" fill="#10b981" />
                      <Bar dataKey="land_crores" name="Land" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="grid_crores" name="Grid Connection" stackId="a" fill="#06b6d4" />
                      <Bar dataKey="installation_crores" name="Installation" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="civil_crores" name="Civil Infra" stackId="a" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                        <th className="py-2.5 px-3">Configuration</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Capacity</th>
                        <th className="py-2.5 px-3 text-right">Equipment (Cr)</th>
                        <th className="py-2.5 px-3 text-right">Grid (Cr)</th>
                        <th className="py-2.5 px-3 text-right">Total CAPEX (Cr)</th>
                        <th className="py-2.5 px-3 text-right">Cost / MW</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {comparisonData.items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-white">{item.label}</td>
                          <td className="py-2.5 px-3 text-slate-300">{item.location_name}</td>
                          <td className="py-2.5 px-3 text-slate-300">{item.capacity_mw} MW</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">₹ {item.equipment_crores.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-cyan-400 font-semibold">₹ {item.grid_crores.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-white">₹ {item.total_crores.toFixed(2)} Cr</td>
                          <td className="py-2.5 px-3 text-right text-amber-300 font-semibold">₹ {item.cost_per_mw_crores.toFixed(2)} Cr/MW</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Assumptions & Rates Modal */}
      {showAssumptionsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span>Configurable Benchmark Cost Assumptions</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standard baseline rates grounded in Indian CERC and MNRE regulatory norms.
                </p>
              </div>

              <button
                onClick={() => setShowAssumptionsModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs text-slate-400">{assumptions.length} Active Parameters</span>
                <button
                  onClick={handleResetAssumptions}
                  disabled={assumptionsLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/40 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Reset to CERC Benchmark Defaults
                </button>
              </div>

              {assumptionsLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading parameters from database...</span>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">

                  <thead>
                    <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <th className="py-2.5 px-3">Parameter Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Benchmark Rate</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {assumptions.map((item) => (
                      <tr key={item.parameter_key} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-white">{item.parameter_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono">
                          {item.current_value >= 100000
                            ? `₹ ${(item.current_value / 10000000).toFixed(2)} Cr`
                            : item.current_value.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>


            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAssumptionsModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostEstimator;
