import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { siteService } from '../services/siteService';
import { mnreService } from '../services/mnreService';
import type { CandidateSite, SiteFilterParams, StateStatItem, MNRESolarPark } from '../types';
import { IndiaRenewableMap } from '../components/map/IndiaRenewableMap';
import { ErrorState } from '../components/common/LoadingSkeleton';
import { getEnergyColor } from '../utils/colorHelpers';
import { formatCapacity } from '../utils/formatters';
import {
  Search,
  MapPin,
  ArrowRight,
  RotateCcw,
  Sun,
  Calculator
} from 'lucide-react';


export const SiteExplorer: React.FC = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [states, setStates] = useState<StateStatItem[]>([]);
  const [mnreParks, setMnreParks] = useState<MNRESolarPark[]>([]);
  const [selectedSite, setSelectedSite] = useState<CandidateSite | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [energyType, setEnergyType] = useState<string>('All');
  const [region, setRegion] = useState<string>('All India');
  const [state, setState] = useState<string>('All');
  const [minSuitability, setMinSuitability] = useState<number | undefined>(undefined);
  const [maxGridDistance, setMaxGridDistance] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchSites = async () => {
    try {
      setError(null);

      const params: SiteFilterParams = {
        energy_type: energyType !== 'All' ? energyType : undefined,
        region: region !== 'All India' ? region : undefined,
        state: state !== 'All' ? state : undefined,
        min_suitability: minSuitability,
        max_grid_distance: maxGridDistance,
        limit: 200,
      };

      const [sitesData, statesData, mnreData] = await Promise.all([
        siteService.getSites(params),
        siteService.getStates(),
        mnreService.getSolarParks({ limit: 50 })
      ]);

      setSites(sitesData.sites);
      setStates(statesData);
      setMnreParks(mnreData.parks);

      if (sitesData.sites.length > 0 && !selectedSite) {
        setSelectedSite(sitesData.sites[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to query candidate sites from the backend.');
    }
  };

  useEffect(() => {
    fetchSites();
  }, [energyType, region, state, minSuitability, maxGridDistance]);

  const handleResetFilters = () => {
    setEnergyType('All');
    setRegion('All India');
    setState('All');
    setMinSuitability(undefined);
    setMaxGridDistance(undefined);
    setSearchQuery('');
  };

  const filteredSiteList = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.site_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls Bar */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white font-['Outfit'] flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-400" />
              <span>Renewable Energy Site Explorer</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Live spatial querying across 200+ greenfield candidate zones in India.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-['Outfit']">
              {sites.length} Active Sites
            </span>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-800">
          {/* Energy Type Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Energy Type</label>
            <select
              value={energyType}
              onChange={(e) => setEnergyType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Energy Types</option>
              <option value="Solar">Solar</option>
              <option value="Wind">Wind</option>
              <option value="Hybrid">Hybrid (Solar-Wind)</option>
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Indian Region</label>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setState('All');
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All India">All India</option>
              <option value="North">North India</option>
              <option value="South">South India</option>
              <option value="West">West India</option>
              <option value="Central">Central India</option>
              <option value="East">East India</option>
              <option value="Northeast">Northeast India</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All States</option>
              {states.map((st) => (
                <option key={st.state} value={st.state}>
                  {st.state} ({st.total_sites})
                </option>
              ))}
            </select>
          </div>

          {/* Min Suitability */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Min Suitability</label>
            <select
              value={minSuitability !== undefined ? String(minSuitability) : 'all'}
              onChange={(e) => setMinSuitability(e.target.value === 'all' ? undefined : Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Any Score</option>
              <option value="70">&gt; 70 (Moderate +)</option>
              <option value="80">&gt; 80 (High Suitability)</option>
              <option value="90">&gt; 90 (Prime Zones)</option>
            </select>
          </div>

          {/* Max Grid Distance */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Max Grid Distance</label>
            <select
              value={maxGridDistance !== undefined ? String(maxGridDistance) : 'all'}
              onChange={(e) => setMaxGridDistance(e.target.value === 'all' ? undefined : Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Any Distance</option>
              <option value="10">&lt; 10 km (Immediate Interconnect)</option>
              <option value="20">&lt; 20 km (Near Grid)</option>
              <option value="35">&lt; 35 km (Standard Reach)</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchSites} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map Column (2 spans) */}
          <div className="lg:col-span-2 space-y-4">
            <IndiaRenewableMap
              sites={filteredSiteList}
              mnreParks={mnreParks}
              selectedSite={selectedSite}
              onSelectSite={(s) => setSelectedSite(s)}
              height="h-[620px]"
            />
          </div>

          {/* Site Inspection & Search Sidebar (1 span) */}
          <div className="space-y-4 flex flex-col h-[620px]">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search state, district, or park name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Selected Site Quick Card */}
            {selectedSite && (
              <div className="p-4 rounded-xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-emerald-500/40 space-y-3 shadow-lg shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400">{selectedSite.site_code}</span>
                    <h4 className="text-sm font-bold text-white leading-tight">{selectedSite.name}</h4>
                    <p className="text-xs text-slate-400">{selectedSite.district}, {selectedSite.state}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getEnergyColor(selectedSite.energy_type).badge}`}>
                    {selectedSite.energy_type}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Suitability</span>
                    <span className="text-sm font-extrabold text-emerald-400 font-['Outfit']">
                      {selectedSite.ml_suitability_score}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">GHI</span>
                    <span className="text-sm font-bold text-amber-300 font-['Outfit']">
                      {selectedSite.solar_ghi}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Wind 50m</span>
                    <span className="text-sm font-bold text-cyan-300 font-['Outfit']">
                      {selectedSite.wind_speed_50m} m/s
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/sites/${selectedSite.id}`)}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer"
                >
                  <span>Open Full Site Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/weather?siteId=${selectedSite.id}`)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Weather Data</span>
                  </button>
                  <button
                    onClick={() => navigate(`/cost-estimator?siteId=${selectedSite.id}`)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calculator className="w-3 h-3 text-emerald-400" />
                    <span>Cost Estimate</span>
                  </button>
                </div>
              </div>
            )}


            {/* Scrollable Filtered Site List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 rounded-xl bg-slate-900/60 border border-slate-800/80 p-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 flex justify-between">
                <span>Filtered Locations</span>
                <span>{filteredSiteList.length} total</span>
              </div>

              {filteredSiteList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No candidate sites found matching your criteria. Try loosening the filter values.
                </div>
              ) : (
                filteredSiteList.map((site) => {
                  const isSelected = selectedSite?.id === site.id;
                  const energy = getEnergyColor(site.energy_type);

                  return (
                    <div
                      key={site.id}
                      onClick={() => setSelectedSite(site)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500/60 shadow-md'
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${energy.bg}`} />
                          <h5 className="text-xs font-bold text-slate-100">{site.name}</h5>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{site.district}, {site.state}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-emerald-400 font-['Outfit'] block">
                          {site.ml_suitability_score}
                          <span className="text-[10px] text-slate-500 font-normal">/100</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{formatCapacity(site.estimated_capacity_mw)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
