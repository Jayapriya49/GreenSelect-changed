import React from 'react';
import type { SHAPFactor } from '../../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SHAPWaterfallChartProps {
  positiveFactors: SHAPFactor[];
  negativeFactors: SHAPFactor[];
  baseValue?: number;
  predictedScore?: number;
}

export const SHAPWaterfallChart: React.FC<SHAPWaterfallChartProps> = ({
  positiveFactors,
  negativeFactors,
  baseValue = 60.0,
  predictedScore = 85.0
}) => {
  return (
    <div className="space-y-6">
      {/* SHAP Summary Pill Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Base Value (E[f(x)])</span>
          <span className="text-xl font-extrabold text-slate-300 font-['Outfit']">{baseValue.toFixed(1)} pts</span>
          <p className="text-[10px] text-slate-400">National climatology prior</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Net Feature Shift</span>
          <span className={`text-xl font-extrabold font-['Outfit'] ${(predictedScore - baseValue) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {(predictedScore - baseValue) >= 0 ? `+${(predictedScore - baseValue).toFixed(1)}` : (predictedScore - baseValue).toFixed(1)} pts
          </span>
          <p className="text-[10px] text-slate-400">Sum of Shapley contributions</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Model Output (f(x))</span>
          <span className="text-xl font-extrabold text-emerald-400 font-['Outfit']">{predictedScore.toFixed(1)} / 100</span>
          <p className="text-[10px] text-slate-400">Final predicted suitability</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Positive Factors Column */}
        <div className="rounded-xl bg-slate-900/40 border border-emerald-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2.5">
            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-400">Positive Factors (Suitability Drivers)</h4>
              <p className="text-[11px] text-slate-400">Features increasing site score above baseline</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {positiveFactors.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No significant positive drivers identified.</p>
            ) : (
              positiveFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200">{factor.display_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {factor.feature_value} {factor.unit}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[11px]">
                        +{factor.shap_value.toFixed(2)} pts ({factor.percentage_impact}%)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${Math.min(100, factor.percentage_impact * 2.5)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{factor.explanation}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Negative Factors Column */}
        <div className="rounded-xl bg-slate-900/40 border border-rose-500/20 p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-rose-500/20 pb-2.5">
            <div className="p-1 rounded bg-rose-500/20 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-400">Restricting Factors (Siting Penalties)</h4>
              <p className="text-[11px] text-slate-400">Features deducting from ideal suitability score</p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {negativeFactors.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700 text-center">
                <span className="text-xs text-emerald-400 font-medium">Clean Zone: No major environmental or civil risk penalties!</span>
              </div>
            ) : (
              negativeFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-rose-500/40 transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200">{factor.display_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {factor.feature_value} {factor.unit}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold font-mono text-[11px]">
                        {factor.shap_value.toFixed(2)} pts ({factor.percentage_impact}%)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full"
                      style={{ width: `${Math.min(100, factor.percentage_impact * 2.5)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{factor.explanation}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
