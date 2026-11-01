import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationService } from '../services/recommendationService';
import type { RecommendationRequest, RecommendationResponse, PriorityWeights } from '../types';
import { getEnergyColor } from '../utils/colorHelpers';
import {
  Sparkles,
  Sun,
  Wind,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const RecommendationWizard: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Configuration State
  const [energyType, setEnergyType] = useState<'Solar' | 'Wind' | 'Hybrid'>('Solar');
  const [region, setRegion] = useState<string>('All India');
  const [priorities, setPriorities] = useState<PriorityWeights>({
    energy_potential: 0.35,
    grid_accessibility: 0.25,
    environmental_sustainability: 0.15,
    land_suitability: 0.15,
    economic_feasibility: 0.10,
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSliderChange = (key: keyof PriorityWeights, val: number) => {
    setPriorities((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const runAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const payload: RecommendationRequest = {
        energy_type: energyType,
        region: region !== 'All India' ? region : undefined,
        priorities,
        top_n: 10,
        min_suitability_threshold: 55.0,
      };

      const result = await recommendationService.getRecommendations(payload);
      setRecommendations(result);
    } catch (err: any) {
      setError(err.message || 'AI Recommendation failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Attribute Decision Support System</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
          AI-Powered Site Recommendation Wizard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure project techno-economic priorities to rank greenfield candidate sites across India using ensemble machine learning and spatial multi-criteria analysis.
        </p>
      </div>

      {/* Wizard Step 1: Energy Type */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
            1
          </span>
          <h3 className="text-base font-bold text-white font-['Outfit']">Select Target Renewable Generation Archetype</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Solar Card */}
          <div
            onClick={() => setEnergyType('Solar')}
            className={`p-5 rounded-xl border transition-all cursor-pointer space-y-2 ${
              energyType === 'Solar'
                ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-950'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <Sun className={`w-6 h-6 ${energyType === 'Solar' ? 'text-amber-400' : 'text-slate-400'}`} />
              {energyType === 'Solar' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <h4 className="text-base font-bold text-white">Utility-Scale Solar PV</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prioritizes high Global Horizontal Irradiance (GHI &gt; 5.5 kWh/m²/d), flat terrain (slope &lt; 3°), and high land suitability.
            </p>
          </div>

          {/* Wind Card */}
          <div
            onClick={() => setEnergyType('Wind')}
            className={`p-5 rounded-xl border transition-all cursor-pointer space-y-2 ${
              energyType === 'Wind'
                ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-950'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <Wind className={`w-6 h-6 ${energyType === 'Wind' ? 'text-cyan-400' : 'text-slate-400'}`} />
              {energyType === 'Wind' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
            </div>
            <h4 className="text-base font-bold text-white">Onshore Wind Power</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prioritizes high wind speeds at 50m hub height (&gt; 7.0 m/s), wind power density, and accessible ridgelines.
            </p>
          </div>

          {/* Hybrid Card */}
          <div
            onClick={() => setEnergyType('Hybrid')}
            className={`p-5 rounded-xl border transition-all cursor-pointer space-y-2 ${
              energyType === 'Hybrid'
                ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-950'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <Layers className={`w-6 h-6 ${energyType === 'Hybrid' ? 'text-emerald-400' : 'text-slate-400'}`} />
              {energyType === 'Hybrid' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <h4 className="text-base font-bold text-white">Solar-Wind Hybrid System</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combines complementary diurnal solar generation and seasonal monsoon wind profiles to optimize transmission capacity factor.
            </p>
          </div>
        </div>
      </div>

      {/* Wizard Step 2: Region */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
            2
          </span>
          <h3 className="text-base font-bold text-white font-['Outfit']">Specify Geographic Region in India</h3>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {['All India', 'North', 'South', 'West', 'Central', 'East', 'Northeast'].map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                region === r
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Wizard Step 3: Priority Sliders */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="text-base font-bold text-white font-['Outfit']">Configure Techno-Economic Priority Weights</h3>
          </div>
          <span className="text-xs text-slate-400">Total normalized weighting: 100%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Energy Potential Slider */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">1. Energy Yield Potential (Solar/Wind)</span>
              <span className="font-mono font-bold text-emerald-400">
                {Math.round(priorities.energy_potential * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={priorities.energy_potential}
              onChange={(e) => handleSliderChange('energy_potential', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Weights resource quality (NASA POWER GHI & Wind Speed).
            </p>
          </div>

          {/* Grid Accessibility Slider */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">2. Grid Interconnection Proximity</span>
              <span className="font-mono font-bold text-cyan-400">
                {Math.round(priorities.grid_accessibility * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={priorities.grid_accessibility}
              onChange={(e) => handleSliderChange('grid_accessibility', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Penalizes transmission line distance to minimize sub-station CAPEX.
            </p>
          </div>

          {/* Environmental Sustainability Slider */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">3. Environmental & Ecological Buffer</span>
              <span className="font-mono font-bold text-teal-400">
                {Math.round(priorities.environmental_sustainability * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={priorities.environmental_sustainability}
              onChange={(e) => handleSliderChange('environmental_sustainability', parseFloat(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Ensures maximum safe buffer distance from National Parks & Sanctuaries.
            </p>
          </div>

          {/* Land Suitability Slider */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">4. Land Cover Siting Suitability</span>
              <span className="font-mono font-bold text-amber-400">
                {Math.round(priorities.land_suitability * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={priorities.land_suitability}
              onChange={(e) => handleSliderChange('land_suitability', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Favors wastelands, barren scrub, and non-prime agricultural zones.
            </p>
          </div>

          {/* Economic Feasibility Slider */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2 md:col-span-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">5. Economic Feasibility & Terrain Slope</span>
              <span className="font-mono font-bold text-purple-400">
                {Math.round(priorities.economic_feasibility * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.05"
              value={priorities.economic_feasibility}
              onChange={(e) => handleSliderChange('economic_feasibility', parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Factors in road transportation accessibility and minimal mounting excavation costs.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-950 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>Evaluating Spatial Decision Matrix...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>RUN AI SITE RECOMMENDATION</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Ranked Recommendations Result Section */}
      {recommendations && (
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900/80 border border-emerald-500/30 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  AI RECOMMENDATION COMPLETE
                </span>
                <span className="text-xs text-slate-400">
                  Evaluated {recommendations.total_evaluated_sites} Candidate Sites
                </span>
              </div>
              <h3 className="text-xl font-black text-white font-['Outfit'] mt-1.5">
                Top Ranked {recommendations.energy_type} Sites for {recommendations.region || 'All India'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              {recommendations.methodology_note}
            </p>
          </div>

          <div className="space-y-4">
            {recommendations.results.map((item) => {
              const site = item.site;
              const energy = getEnergyColor(site.energy_type);

              return (
                <div
                  key={site.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-xl space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 font-['Outfit'] shadow-md shadow-emerald-950">
                        #{item.rank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">{site.site_code}</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${energy.badge}`}>
                            {site.energy_type}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white">{site.name}</h4>
                        <p className="text-xs text-slate-400">{site.district}, {site.state} &bull; {site.region} Region</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recommendation Score</span>
                        <span className="text-2xl font-black text-emerald-400 font-['Outfit']">
                          {item.composite_recommendation_score.toFixed(1)}
                          <span className="text-xs text-slate-400 font-normal">/100</span>
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/sites/${site.id}`)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-scores Bar Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Resource Potential</span>
                      <span className="font-bold text-emerald-300">{item.energy_score} / 100</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Grid Accessibility</span>
                      <span className="font-bold text-cyan-300">{item.grid_score} / 100</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Eco Safety</span>
                      <span className="font-bold text-teal-300">{item.environmental_score} / 100</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Land Suitability</span>
                      <span className="font-bold text-amber-300">{item.land_score} / 100</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block">Civil Feasibility</span>
                      <span className="font-bold text-purple-300">{item.economic_score} / 100</span>
                    </div>
                  </div>

                  {/* Positive Factors Tag Highlights */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">Key Strengths:</span>
                    {item.top_positive_factors.map((pos, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                        +{pos.display_name} (+{pos.percentage_impact}%)
                      </span>
                    ))}
                    <p className="text-[11px] text-slate-400 italic w-full mt-1">
                      "{item.recommendation_verdict}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
