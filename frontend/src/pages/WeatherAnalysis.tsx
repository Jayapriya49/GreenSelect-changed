import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sun,
  Wind,
  Thermometer,
  CloudRain,
  MapPin,
  RefreshCw,
  GitCompare,
  Info,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart
} from 'recharts';

import { weatherService } from '../services/weatherService';
import { siteService } from '../services/siteService';
import type {
  CandidateSite,
  WeatherAnalysisResponse,
  LocationComparisonResponse
} from '../types';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';

export const WeatherAnalysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySiteId = searchParams.get('siteId');

  // Candidate Sites List
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedSiteId, setSelectedSiteId] = useState<string>(querySiteId || '');
  const [customLat, setCustomLat] = useState<number>(27.5381);
  const [customLon, setCustomLon] = useState<number>(71.9167);
  const [startYear, setStartYear] = useState<number>(2018);
  const [endYear, setEndYear] = useState<number>(2023);

  // Data & UI states
  const [weatherData, setWeatherData] = useState<WeatherAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-location comparison state
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareSiteIds, setCompareSiteIds] = useState<number[]>([]);
  const [compareData, setCompareData] = useState<LocationComparisonResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Load sites on mount
  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await siteService.getSites({ limit: 300 });
        setSites(res.sites);
        const uniqueStates = Array.from(new Set(res.sites.map((s) => s.state))).sort();
        setStates(uniqueStates);

        // Pre-select site if passed in query params
        if (querySiteId) {
          const match = res.sites.find((s) => s.id === Number(querySiteId));
          if (match) {
            setSelectedSiteId(String(match.id));
            setSelectedState(match.state);
            fetchWeatherForSite(match);
            return;
          }
        }

        // Default to first site if none selected
        if (res.sites.length > 0) {
          const first = res.sites[0];
          setSelectedSiteId(String(first.id));
          fetchWeatherForSite(first);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load candidate sites list.');
      }
    };
    loadSites();
  }, [querySiteId]);

  const fetchWeatherForSite = async (site: CandidateSite) => {
    try {
      setLoading(true);
      setError(null);
      const data = await weatherService.getHistoricalWeather({
        latitude: site.latitude,
        longitude: site.longitude,
        start_year: startYear,
        end_year: endYear,
        site_id: site.id,
        location_name: site.name,
        state: site.state
      });
      setWeatherData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve NASA POWER historical meteorological data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchWeather = async () => {
    if (selectedSiteId === 'custom') {
      try {
        setLoading(true);
        setError(null);
        const data = await weatherService.getHistoricalWeather({
          latitude: customLat,
          longitude: customLon,
          start_year: startYear,
          end_year: endYear,
          location_name: `Custom Location (${customLat.toFixed(2)}°N, ${customLon.toFixed(2)}°E)`
        });
        setWeatherData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve NASA POWER weather data.');
      } finally {
        setLoading(false);
      }
    } else {
      const site = sites.find((s) => s.id === Number(selectedSiteId));
      if (site) {
        fetchWeatherForSite(site);
      }
    }
  };

  const handleRunComparison = async () => {
    if (compareSiteIds.length < 2) {
      alert('Please select at least 2 candidate sites to compare.');
      return;
    }
    try {
      setCompareLoading(true);
      setError(null);
      const res = await weatherService.compareLocations({
        site_ids: compareSiteIds,
        start_year: startYear,
        end_year: endYear
      });
      setCompareData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to run multi-location weather comparison.');
    } finally {
      setCompareLoading(false);
    }
  };

  const filteredSites = selectedState === 'All'
    ? sites
    : sites.filter((s) => s.state === selectedState);

  const availableYears = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0d1f38] border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sun className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              NASA POWER Climatology Integration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
            Weather & Seasonal Analysis
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Analyze historical solar irradiance, 10m wind speeds, ambient temperatures and precipitation
            across Indian candidate sites using multi-year NASA POWER satellite observations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsCompareMode(!isCompareMode);
              if (!isCompareMode && compareSiteIds.length === 0 && sites.length >= 2) {
                setCompareSiteIds([sites[0].id, sites[1].id]);
              }
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isCompareMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <span>{isCompareMode ? 'Single Site View' : 'Compare Locations'}</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Filters & Parameters */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm space-y-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* State Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">State Filter</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                const firstInState = sites.find((s) => e.target.value === 'All' || s.state === e.target.value);
                if (firstInState) {
                  setSelectedSiteId(String(firstInState.id));
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-850 bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All States ({states.length})</option>
              {states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Location Selector */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Candidate Location / Site
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {filteredSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} — {site.district}, {site.state} ({site.energy_type})
                </option>
              ))}
              <option value="custom">-- Custom Latitude & Longitude Coordinates --</option>
            </select>
          </div>

          {/* Start Year */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Start Year</label>
            <select
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr > endYear}>{yr}</option>
              ))}
            </select>
          </div>

          {/* End Year */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">End Year</label>
            <select
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} disabled={yr < startYear}>{yr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom coordinates row if custom selected */}
        {selectedSiteId === 'custom' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Latitude (°N)</label>
              <input
                type="number"
                step="0.0001"
                value={customLat}
                onChange={(e) => setCustomLat(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Longitude (°E)</label>
              <input
                type="number"
                step="0.0001"
                value={customLon}
                onChange={(e) => setCustomLon(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Parameters: ALLSKY_SFC_SW_DWN (Solar), WS10M (Wind), T2M (Temp), PRECTOTCORR (Precipitation)</span>
          </div>

          <button
            onClick={handleFetchWeather}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Retrieving NASA Data...' : 'Analyze Historical Climatology'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton rows={2} height="h-28" />
          <LoadingSkeleton rows={4} height="h-64" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={handleFetchWeather} />
      ) : isCompareMode ? (
        /* ================= MULTI-LOCATION COMPARISON VIEW ================= */
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-cyan-400" />
                  <span>Compare Historical Weather Across Candidate Sites</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select candidate sites to compare monthly solar irradiance and seasonal wind potential.
                </p>
              </div>

              <button
                onClick={handleRunComparison}
                disabled={compareLoading || compareSiteIds.length < 2}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-cyan-950 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${compareLoading ? 'animate-spin' : ''}`} />
                <span>Run Comparison ({compareSiteIds.length} sites)</span>
              </button>
            </div>

            {/* Sites Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              {sites.slice(0, 40).map((s) => {
                const checked = compareSiteIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      checked
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setCompareSiteIds(compareSiteIds.filter((id) => id !== s.id));
                        } else {
                          if (compareSiteIds.length >= 5) {
                            alert('You can compare a maximum of 5 locations at once.');
                            return;
                          }
                          setCompareSiteIds([...compareSiteIds, s.id]);
                        }
                      }}
                      className="rounded accent-cyan-500"
                    />
                    <span className="truncate">{s.name} ({s.state})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {compareLoading ? (
            <LoadingSkeleton rows={4} height="h-72" />
          ) : compareData && compareData.locations.length > 0 ? (
            <div className="space-y-6">
              {/* Comparative Monthly Solar Chart */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">
                      Monthly Solar Irradiance Comparison (kWh/m²/day)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">{startYear} – {endYear} NASA POWER Baseline</span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={compareData.monthly_comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 9]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      {compareData.locations.map((loc, idx) => {
                        const colors = ['#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#8b5cf6'];
                        return (
                          <Line
                            key={loc.location_name}
                            type="monotone"
                            dataKey={`${loc.location_name}_solar`}
                            name={`${loc.location_name} (GHI)`}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        );
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparative Monthly Wind Speed Chart */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">
                      Monthly Wind Speed Comparison at 10m (m/s)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">{startYear} – {endYear} NASA POWER Baseline</span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={compareData.monthly_comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 10]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      {compareData.locations.map((loc, idx) => {
                        const colors = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                        return (
                          <Line
                            key={loc.location_name}
                            type="monotone"
                            dataKey={`${loc.location_name}_wind`}
                            name={`${loc.location_name} (Wind)`}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        );
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Seasonal Comparison Summary Cards Table */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 overflow-x-auto">
                <h4 className="text-sm font-bold text-white mb-4">
                  Seasonal Solar & Wind Potential Matrix
                </h4>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-3 px-3">Location Name</th>
                      <th className="pb-3 px-3">State</th>
                      <th className="pb-3 px-3">Best Solar Season</th>
                      <th className="pb-3 px-3">Summer Solar (kWh/m²)</th>
                      <th className="pb-3 px-3">Monsoon Solar</th>
                      <th className="pb-3 px-3">Best Wind Season</th>
                      <th className="pb-3 px-3">Monsoon Wind (m/s)</th>
                      <th className="pb-3 px-3">Annual Rain (mm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {compareData.locations.map((loc) => {
                      const summer = loc.seasonal_data.find((s) => s.season_name === 'Summer');
                      const monsoon = loc.seasonal_data.find((s) => s.season_name === 'Monsoon');
                      return (
                        <tr key={loc.location_name} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-white">{loc.location_name}</td>
                          <td className="py-3 px-3 text-slate-300">{loc.state || 'N/A'}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                              {loc.summary.best_solar_season} ({loc.summary.best_solar_value})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-amber-300 font-semibold">{summer?.solar_radiation_avg}</td>
                          <td className="py-3 px-3 text-slate-300">{monsoon?.solar_radiation_avg}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">
                              {loc.summary.best_wind_season} ({loc.summary.best_wind_value} m/s)
                            </span>
                          </td>
                          <td className="py-3 px-3 text-cyan-300 font-semibold">{monsoon?.wind_speed_avg}</td>
                          <td className="py-3 px-3 text-slate-300">{loc.summary.annual_total_rainfall_mm} mm</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : weatherData ? (
        /* ================= SINGLE LOCATION FULL ANALYSIS VIEW ================= */
        <div className="space-y-8">
          {/* Location Badge & Source Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">{weatherData.location_name}</span>
              {weatherData.district && weatherData.state && (
                <span className="text-slate-400">({weatherData.district}, {weatherData.state})</span>
              )}
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{weatherData.latitude.toFixed(4)}°N, {weatherData.longitude.toFixed(4)}°E</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Baseline: {weatherData.start_year} – {weatherData.end_year}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1.5 ${
                weatherData.is_cached
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${weatherData.is_cached ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'}`} />
                <span>{weatherData.data_source}</span>
              </span>
            </div>
          </div>

          {/* 4 Summary / Best Season Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Best Solar Season */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Sun className="w-4 h-4" />
                  <span>Best Solar Potential</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  PEAK SEASON
                </span>
              </div>
              <div className="text-2xl font-extrabold text-white font-['Outfit']">
                {weatherData.summary.best_solar_season}
              </div>
              <div className="text-sm font-bold text-amber-300 mt-1">
                {weatherData.summary.best_solar_value} <span className="text-xs text-slate-400 font-normal">kWh/m²/day</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Highest seasonal photovoltaic irradiance over historical observation period.
              </p>
            </div>

            {/* Best Wind Season */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-slate-900 to-slate-900 border border-cyan-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Wind className="w-4 h-4" />
                  <span>Best Wind Potential</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  PEAK SEASON
                </span>
              </div>
              <div className="text-2xl font-extrabold text-white font-['Outfit']">
                {weatherData.summary.best_wind_season}
              </div>
              <div className="text-sm font-bold text-cyan-300 mt-1">
                {weatherData.summary.best_wind_value} <span className="text-xs text-slate-400 font-normal">m/s (10m agl)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Strongest seasonal atmospheric circulation driven by monsoon gradient.
              </p>
            </div>

            {/* Annual Average Solar GHI */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Annual Average Solar GHI</span>
                </span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-['Outfit']">
                {weatherData.summary.annual_avg_solar}
                <span className="text-xs text-slate-400 font-normal ml-1">kWh/m²/day</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Avg Temperature: <span className="text-slate-200 font-semibold">{weatherData.summary.annual_avg_temperature}°C</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Multi-year mean daily downward shortwave irradiance.
              </p>
            </div>

            {/* Annual Wind & Rainfall */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-indigo-400" />
                  <span>Annual Wind & Rainfall</span>
                </span>
              </div>
              <div className="text-2xl font-extrabold text-indigo-300 font-['Outfit']">
                {weatherData.summary.annual_avg_wind}
                <span className="text-xs text-slate-400 font-normal ml-1">m/s</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Est. Precipitation: <span className="text-slate-200 font-semibold">{weatherData.summary.annual_total_rainfall_mm} mm/year</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Annual cumulative rainfall & mean anemometric velocity.
              </p>
            </div>
          </div>

          {/* Historical Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-300 block mb-0.5">Climatological Baseline Notice</span>
              <p>{weatherData.summary.disclaimer}</p>
            </div>
          </div>

          {/* Interactive Charts Section: Monthly Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Monthly Solar Radiation & Temperature */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Monthly Solar Irradiance & Temperature
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">GHI vs °C</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weatherData.monthly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} domain={[0, 9]} label={{ value: 'GHI (kWh/m²/day)', angle: -90, position: 'insideLeft', fill: '#f59e0b', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={11} domain={[0, 45]} label={{ value: 'Temp (°C)', angle: 90, position: 'insideRight', fill: '#f43f5e', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="solar_radiation"
                      name="Solar Radiation (kWh/m²/day)"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      name="Temperature (°C)"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Monthly Wind Speed & Rainfall */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">
                    Monthly Wind Speed (10m) & Rainfall
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">m/s vs mm/month</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weatherData.monthly_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#06b6d4" fontSize={11} domain={[0, 10]} label={{ value: 'Wind Speed (m/s)', angle: -90, position: 'insideLeft', fill: '#06b6d4', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} label={{ value: 'Rainfall (mm)', angle: 90, position: 'insideRight', fill: '#3b82f6', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar
                      yAxisId="right"
                      dataKey="rainfall_month_mm"
                      name="Est. Rainfall (mm/month)"
                      fill="#3b82f6"
                      opacity={0.6}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="wind_speed"
                      name="Wind Speed (m/s at 10m)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Seasonal Analysis Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white font-['Outfit']">
                Indian Meteorological Seasonal Potentials
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated into four primary Indian seasons according to IMD / MNRE classification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {weatherData.seasonal_data.map((season) => {
                const isSolarBest = season.season_name === weatherData.summary.best_solar_season;
                const isWindBest = season.season_name === weatherData.summary.best_wind_season;

                return (
                  <div
                    key={season.season_name}
                    className={`p-5 rounded-2xl border transition-all ${
                      isSolarBest
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg'
                        : isWindBest
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-bold text-white">{season.season_name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {season.months_included.join(', ')}
                      </span>
                    </div>

                    <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-800">
                      {/* Solar */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Solar GHI:</span>
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-white">{season.solar_radiation_avg} kWh/m²</span>
                          <span className={`text-[10px] ml-1.5 font-semibold ${season.solar_delta_pct >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {season.solar_delta_pct >= 0 ? `+${season.solar_delta_pct}%` : `${season.solar_delta_pct}%`}
                          </span>
                        </div>
                      </div>

                      {/* Wind */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Wind className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Wind Speed:</span>
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-white">{season.wind_speed_avg} m/s</span>
                          <span className={`text-[10px] ml-1.5 font-semibold ${season.wind_delta_pct >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {season.wind_delta_pct >= 0 ? `+${season.wind_delta_pct}%` : `${season.wind_delta_pct}%`}
                          </span>
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                          <span>Avg Temp:</span>
                        </span>
                        <span className="font-semibold text-slate-200">{season.temperature_avg}°C</span>
                      </div>

                      {/* Precipitation */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                          <span>Precipitation:</span>
                        </span>
                        <span className="font-semibold text-slate-200">{season.precipitation_avg} mm/day</span>
                      </div>
                    </div>

                    {(isSolarBest || isWindBest) && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-bold">
                        {isSolarBest && <span className="text-amber-400">★ Optimal for Solar Generation</span>}
                        {isWindBest && <span className="text-cyan-400">★ Optimal for Wind Generation</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Seasonal Comparison Bar Chart */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white">
                Seasonal Solar GHI vs Wind Speed Potential
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weatherData.seasonal_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="season_name" stroke="#94a3b8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} label={{ value: 'Solar GHI (kWh/m²/day)', angle: -90, position: 'insideLeft', fill: '#f59e0b', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={11} label={{ value: 'Wind Speed (m/s)', angle: 90, position: 'insideRight', fill: '#06b6d4', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar yAxisId="left" dataKey="solar_radiation_avg" name="Seasonal Solar GHI (kWh/m²/day)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="wind_speed_avg" name="Seasonal Wind Speed (m/s)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeatherAnalysis;
