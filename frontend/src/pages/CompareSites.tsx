import React, { useEffect, useState } from 'react';
import { siteService } from '../services/siteService';
import { comparisonService } from '../services/comparisonService';
import type { CandidateSite, SiteComparisonResponse } from '../types';
import { RadarProfileChart } from '../components/charts/RadarProfileChart';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';
import { getEnergyColor } from '../utils/colorHelpers';
import {
  GitCompare,
  Trophy,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const CompareSites: React.FC = () => {
  const [allSites, setAllSites] = useState<CandidateSite[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonResult, setComparisonResult] = useState<SiteComparisonResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async (ids: number[]) => {
    if (ids.length < 2) return;
    try {
      setError(null);
      const res = await comparisonService.compareSites(ids);
      setComparisonResult(res);
    } catch (err: any) {
      setError(err.message || 'Comparison failed.');
    }
  };

  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoading(true);
        const data = await siteService.getSites({ limit: 200 });
        setAllSites(data.sites);
        if (data.sites.length >= 3) {
          // Pre-select 3 diverse sites
          const initialIds = [data.sites[0].id, data.sites[1].id, data.sites[2].id];
          setSelectedIds(initialIds);
          runComparison(initialIds);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load sites for comparison.');
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, []);

  const handleSelectSlot = (slotIdx: number, siteId: number) => {
    const updated = [...selectedIds];
    updated[slotIdx] = siteId;
    setSelectedIds(updated);
    runComparison(updated);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={2} height="h-28" />
        <LoadingSkeleton rows={3} height="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
          <GitCompare className="w-3.5 h-3.5" />
          <span>Multi-Criteria Benchmarking</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Side-by-Side Candidate Site Comparison
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Evaluate up to 3 candidate locations across techno-economic, resource flux, grid access, and environmental parameters.
        </p>
      </div>

      {/* Site Selector Header Slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((slotIdx) => {
          const currentId = selectedIds[slotIdx];
          const site = allSites.find((s) => s.id === currentId);
          const energy = site ? getEnergyColor(site.energy_type) : null;

          return (
            <div
              key={slotIdx}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                site
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-xl'
                  : 'bg-slate-900/40 border-dashed border-slate-800 flex flex-col items-center justify-center min-h-[140px]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Site Candidate {String.fromCharCode(65 + slotIdx)}
                </span>
                {site && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${energy?.badge}`}>
                    {site.energy_type}
                  </span>
                )}
              </div>

              <select
                value={currentId || ''}
                onChange={(e) => handleSelectSlot(slotIdx, Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {allSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.site_code} - {s.name} ({s.state})
                  </option>
                ))}
              </select>

              {site && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">{site.district}, {site.state}</span>
                  <span className="font-extrabold text-emerald-400 font-['Outfit']">
                    {site.ml_suitability_score}/100
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <ErrorState message={error} />}

      {/* Dynamic Recommended Winner Banner */}
      {comparisonResult && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-teal-950/80 border border-emerald-500/40 shadow-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
            <span>AI Dynamic Siting Verdict</span>
          </div>
          <h3 className="text-xl font-black text-white font-['Outfit']">
            Recommended Prime Candidate: {comparisonResult.sites.find((s) => s.id === comparisonResult.recommended_winner_site_id)?.name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            {comparisonResult.winner_rationale}
          </p>
        </div>
      )}

      {/* Radar Chart Overlay */}
      {comparisonResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Multi-Dimensional Profile</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Radar comparison across Solar, Wind, Grid Access, Road Infrastructure, Terrain Slope, and Ecological Safety dimensions.
            </p>
            <div className="space-y-2 pt-3">
              {comparisonResult.sites.map((s, idx) => {
                const palette = ['text-emerald-400', 'text-amber-400', 'text-cyan-400'];
                return (
                  <div key={s.id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                    <span className={`font-bold ${palette[idx % palette.length]}`}>{s.site_code}</span>
                    <span className="text-slate-300">{s.name.split('(')[0]}</span>
                    <span className="font-mono text-emerald-400">{s.ml_suitability_score}/100</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 flex items-center justify-center">
            <RadarProfileChart sites={comparisonResult.sites} metricsData={comparisonResult.radar_metrics} />
          </div>
        </div>
      )}

      {/* Comprehensive Parameter Comparison Table */}
      {comparisonResult && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <h3 className="text-lg font-bold text-white font-['Outfit']">Detailed Parameter Benchmarking Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Parameter</th>
                  <th className="py-3 px-4">Category</th>
                  {comparisonResult.sites.map((site) => (
                    <th key={site.id} className="py-3 px-4 text-white font-bold">
                      {site.site_code} ({site.district})
                    </th>
                  ))}
                  <th className="py-3 px-4">Benchmark Takeaway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparisonResult.comparison_table.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {row.parameter}
                      <span className="text-[10px] text-slate-500 font-normal ml-1">({row.unit})</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{row.category}</td>
                    {comparisonResult.sites.map((site) => {
                      const val = row.values[site.id];
                      const isBest = row.best_site_id === site.id;

                      return (
                        <td key={site.id} className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs ${
                              isBest
                                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                                : 'text-slate-300'
                            }`}
                          >
                            {typeof val === 'number' ? val : String(val)}
                            {isBest && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-[11px] text-slate-400 italic">
                      {row.interpretation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
