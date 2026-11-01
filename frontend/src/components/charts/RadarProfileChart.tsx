import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { CandidateSite } from '../../types';

interface RadarProfileChartProps {
  sites: CandidateSite[];
  metricsData?: Array<Record<string, any>>;
}

export const RadarProfileChart: React.FC<RadarProfileChartProps> = ({ sites, metricsData }) => {
  const data = metricsData || [
    {
      metric: 'Solar Potential',
      ...sites.reduce((acc, s) => ({ ...acc, [`site_${s.id}`]: Math.min(100, Math.round((s.solar_ghi / 6.5) * 100)) }), {}),
    },
    {
      metric: 'Wind Speed',
      ...sites.reduce((acc, s) => ({ ...acc, [`site_${s.id}`]: Math.min(100, Math.round((s.wind_speed_50m / 8.5) * 100)) }), {}),
    },
    {
      metric: 'Grid Access',
      ...sites.reduce((acc, s) => ({ ...acc, [`site_${s.id}`]: Math.max(0, Math.round(100 - (s.distance_to_grid_km / 40) * 100)) }), {}),
    },
    {
      metric: 'Road Access',
      ...sites.reduce((acc, s) => ({ ...acc, [`site_${s.id}`]: Math.max(0, Math.round(100 - (s.distance_to_road_km / 20) * 100)) }), {}),
    },
    {
      metric: 'Flat Terrain',
      ...sites.reduce((acc, s) => ({ ...acc, [`site_${s.id}`]: Math.max(0, Math.round(100 - (s.slope_deg / 10) * 100)) }), {}),
    },
    {
      metric: 'Eco Safety',
      ...sites.reduce((acc, s) => ({ ...acc, [`site_${s.id}`]: Math.max(0, Math.round(100 - s.environmental_penalty)) }), {}),
    },
  ];

  const palette = ['#10b981', '#f59e0b', '#06b6d4'];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#334155" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              borderColor: '#334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '8px',
              fontSize: '12px',
            }}
          />
          {sites.map((site, idx) => (
            <Radar
              key={site.id}
              name={`${site.site_code} (${site.name.split('(')[0].trim()})`}
              dataKey={`site_${site.id}`}
              stroke={palette[idx % palette.length]}
              fill={palette[idx % palette.length]}
              fillOpacity={0.25}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
