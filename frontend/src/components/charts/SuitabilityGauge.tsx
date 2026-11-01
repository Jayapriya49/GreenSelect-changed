import React from 'react';
import { getTierColor } from '../../utils/colorHelpers';

interface SuitabilityGaugeProps {
  score: number;
  tier?: string;
  size?: number;
  label?: string;
}

export const SuitabilityGauge: React.FC<SuitabilityGaugeProps> = ({
  score,
  tier = 'High',
  size = 180,
  label = 'AI Suitability Index'
}) => {
  const tierColor = getTierColor(tier, score);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress stroke with gradient */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={score >= 80 ? '#10b981' : score >= 70 ? '#06b6d4' : score >= 55 ? '#f59e0b' : '#f43f5e'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out',
              filter: `drop-shadow(0 0 8px ${score >= 80 ? 'rgba(16,185,129,0.5)' : 'rgba(6,182,212,0.5)'})`,
            }}
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-white font-['Outfit'] tracking-tight">
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-medium">/ 100</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tierColor.badge}`}>
          {tier} Suitability
        </span>
        <p className="text-xs text-slate-400 mt-1.5">{label}</p>
      </div>
    </div>
  );
};
