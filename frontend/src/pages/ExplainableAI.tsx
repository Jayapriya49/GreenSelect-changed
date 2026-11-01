import React, { useEffect, useState } from 'react';
import { explainService } from '../services/explainService';
import { siteService } from '../services/siteService';
import type { SiteExplanationResponse, GlobalFeatureImportance, CandidateSite } from '../types';
import { SHAPWaterfallChart } from '../components/xai/SHAPWaterfallChart';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';
import {
  BrainCircuit,
  BarChart3,
  ShieldCheck,
  Info
} from 'lucide-react';

export const ExplainableAI: React.FC = () => {
  const [sites, setSites] = useState<CandidateSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<SiteExplanationResponse | null>(null);
  const [globalImportances, setGlobalImportances] = useState<GlobalFeatureImportance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [sitesData, globalData] = await Promise.all([
          siteService.getSites({ limit: 100 }),
          explainService.getGlobalFeatureImportance(),
        ]);
        setSites(sitesData.sites);
        setGlobalImportances(globalData);

        if (sitesData.sites.length > 0) {
          setSelectedSiteId(sitesData.sites[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load Explainable AI data.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedSiteId) return;
    const fetchSiteExplanation = async () => {
      try {
        setLoadingExplanation(true);
        const exp = await explainService.getSiteExplanation(selectedSiteId);
        setExplanation(exp);
      } catch (err: any) {
        console.error('Failed to load site explanation:', err);
      } finally {
        setLoadingExplanation(false);
      }
    };
    fetchSiteExplanation();
  }, [selectedSiteId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={2} height="h-28" />
        <LoadingSkeleton rows={3} height="h-64" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Explainable AI Engine (XAI)</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
          TreeSHAP Feature Attribution & Site Explanations
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Rigorous game-theoretic Shapley value decomposition explaining why the machine learning model recommended each candidate location.
        </p>
      </div>

      {/* Site Selector Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white font-['Outfit']">Select Candidate Site to Explain</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Computes live Shapley values for all 11 climatological, topography, and infrastructure features.
          </p>
        </div>

        <div className="w-full md:w-96">
          <select
            value={selectedSiteId || ''}
            onChange={(e) => setSelectedSiteId(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-md"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_code} &bull; {s.name} ({s.state}) &bull; Score: {s.ml_suitability_score}/100
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Site SHAP Breakdown */}
      {loadingExplanation ? (
        <LoadingSkeleton rows={2} height="h-64" />
      ) : explanation ? (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400">{explanation.site_code}</span>
              <h3 className="text-xl font-black text-white font-['Outfit']">{explanation.name}</h3>
              <p className="text-xs text-slate-400">Target Generation Archetype: {explanation.energy_type}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Predicted Score</span>
              <span className="text-2xl font-black text-emerald-400 font-['Outfit']">
                {explanation.predicted_suitability_score.toFixed(1)} / 100
              </span>
            </div>
          </div>

          <SHAPWaterfallChart
            positiveFactors={explanation.positive_factors}
            negativeFactors={explanation.negative_factors}
            baseValue={explanation.base_value}
            predictedScore={explanation.predicted_suitability_score}
          />

          {/* Natural Language Interpretation Card */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Natural Language Model Explanation</span>
            </h5>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {explanation.natural_language_explanation}
            </p>
          </div>
        </div>
      ) : null}

      {/* Global Feature Importance Section */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Global Feature Importance (Mean Absolute SHAP)
            </h3>
            <p className="text-xs text-slate-400">
              Ranking the overall decisive influence of each GIS parameter across all analyzed Indian regions.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {globalImportances.map((feat) => {
            const maxVal = globalImportances[0]?.mean_abs_shap || 1.0;
            const pct = Math.round((feat.mean_abs_shap / maxVal) * 100);

            return (
              <div
                key={feat.feature_name}
                className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="w-full sm:w-1/3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                      #{feat.importance_rank}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{feat.display_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 ml-7">{feat.category} Factor</span>
                </div>

                <div className="flex-1 flex items-center gap-3">
                  <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-300 w-16 text-right">
                    {feat.mean_abs_shap.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Methodology Accordion Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
        <h4 className="text-sm font-bold text-white font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Methodology & Academic Transparency Note</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Shapley values represent the unique linear additive feature attribution method satisfying the four axioms of game theory: Efficiency, Symmetry, Dummy player, and Additivity. GreenSelect calculates exact TreeSHAP solutions in polynomial time on the trained ensemble tree models, avoiding stochastic approximation error.
        </p>
      </div>
    </div>
  );
};
