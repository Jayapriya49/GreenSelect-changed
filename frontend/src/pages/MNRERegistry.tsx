import React, { useEffect, useState, useMemo } from 'react';
import { mnreService } from '../services/mnreService';
import type {
  MNRESolarPark,
  MNREStatePotential,
  MNREBenchmark,
  MNRESummaryResponse
} from '../types';
import { StatCard } from '../components/common/StatCard';
import { LoadingSkeleton, ErrorState } from '../components/common/LoadingSkeleton';
import { formatCapacity, formatNumber } from '../utils/formatters';
import {
  Building2,
  Sun,
  Wind,
  Zap,
  MapPin,
  Search,
  Calculator,
  CheckCircle2,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Custom Marker for MNRE Sanctioned Mega Parks
function createMNREParkIcon(park: MNRESolarPark) {
  const isSolar = park.energy_type === 'Solar';
  const isWind = park.energy_type === 'Wind';
  const color = isSolar ? '#f59e0b' : isWind ? '#06b6d4' : '#10b981';

  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; border: 2px solid ${color}; opacity: 0.4;"></div>
      <div style="
        width: 26px;
        height: 26px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0b132b;
        font-weight: 900;
        font-size: 11px;
      ">
        ★
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-mnre-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

export const MNRERegistry: React.FC = () => {
  const [summary, setSummary] = useState<MNRESummaryResponse | null>(null);
  const [parks, setParks] = useState<MNRESolarPark[]>([]);
  const [potentials, setPotentials] = useState<MNREStatePotential[]>([]);
  const [benchmarks, setBenchmarks] = useState<MNREBenchmark | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'parks' | 'potential' | 'guidelines'>('parks');

  // Filter & Search states for Parks
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedEnergyType, setSelectedEnergyType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPark, setSelectedPark] = useState<MNRESolarPark | null>(null);

  // Interactive Land Calculator State
  const [calcCapacityMw, setCalcCapacityMw] = useState<number>(500);
  const [calcTech, setCalcTech] = useState<'solar' | 'wind' | 'hybrid'>('solar');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, parksData, potData, benchData] = await Promise.all([
        mnreService.getSummary(),
        mnreService.getSolarParks({ limit: 100 }),
        mnreService.getStatePotentials(),
        mnreService.getBenchmarks()
      ]);
      setSummary(sumData);
      setParks(parksData.parks);
      setPotentials(potData);
      setBenchmarks(benchData);
    } catch (err: any) {
      setError(err.message || 'Failed to load official MNRE dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Parks
  const filteredParks = useMemo(() => {
    return parks.filter((park) => {
      const matchesSearch =
        park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.implementing_agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        park.grid_substation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = selectedState === 'All' || park.state === selectedState;
      const matchesType = selectedEnergyType === 'All' || park.energy_type === selectedEnergyType;
      const matchesStatus = selectedStatus === 'All' || park.status === selectedStatus;
      return matchesSearch && matchesState && matchesType && matchesStatus;
    });
  }, [parks, searchTerm, selectedState, selectedEnergyType, selectedStatus]);

  // Unique state list for dropdown
  const uniqueStates = useMemo(() => {
    const states = Array.from(new Set(parks.map((p) => p.state)));
    return ['All', ...states.sort()];
  }, [parks]);

  // Land Calculator Computation
  const calculatedLand = useMemo(() => {
    if (calcTech === 'solar') {
      const acres = calcCapacityMw * 4.0; // 4.0 acres/MW standard
      const sqkm = acres * 0.00404686;
      return { acres: formatNumber(acres, 0), sqkm: sqkm.toFixed(2), rule: '4.0 acres / MW (Fixed/Bifacial PV Norm)' };
    } else if (calcTech === 'wind') {
      const ha = calcCapacityMw * 5.0; // 5 ha / MW inter-turbine spacing
      const acres = ha * 2.47105;
      const sqkm = ha * 0.01;
      return { acres: formatNumber(acres, 0), sqkm: sqkm.toFixed(2), rule: '5.0 hectares / MW (5-7 rotor diameter spacing)' };
    } else {
      const acres = calcCapacityMw * 4.8; // 4.8 acres / MW hybrid shared infrastructure
      const sqkm = acres * 0.00404686;
      return { acres: formatNumber(acres, 0), sqkm: sqkm.toFixed(2), rule: '4.8 acres / MW (25% colocation footprint saving)' };
    }
  }, [calcCapacityMw, calcTech]);

  // Chart Data for State Potentials vs Targets
  const chartData = useMemo(() => {
    return potentials.slice(0, 10).map((p) => ({
      state: p.state,
      'Solar Potential (GW)': p.solar_potential_gw,
      'Wind Potential (GW)': p.wind_potential_120m_gw,
      'Total Installed (GW)': +(p.total_installed_mw / 1000).toFixed(1),
      '2030 Target (GW)': +(p.target_2030_mw / 1000).toFixed(1),
    }));
  }, [potentials]);

  if (loading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton rows={4} height="h-28" />
        <LoadingSkeleton rows={1} height="h-96" />
      </div>
    );
  }

  if (error || !summary) {
    return <ErrorState message={error || 'Failed to load MNRE dataset.'} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#101d3f] to-slate-900 border border-amber-500/30 p-8 shadow-2xl">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Ministry of New and Renewable Energy (MNRE), Govt. of India</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Official MNRE Sanctioned Parks & State Potential Registry
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Direct integration of official government assessments from the <b>Development of Solar Parks Scheme</b>, <b>NISE Solar Assessment</b> (748+ GW), <b>NIWE Wind Potential at 120m</b> (695+ GW), and <b>Green Energy Corridor (GEC)</b> interconnections.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>42,800+ MW Sanctioned Mega Parks</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>1,494 GW National RE Potential</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Green Energy Corridor Phase I & II</span>
            </span>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top National MNRE KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Sanctioned Mega Parks"
          value={`${summary.total_sanctioned_capacity_gw.toFixed(1)} GW`}
          subtitle={`${summary.total_sanctioned_parks} Ultra-Mega Parks approved`}
          icon={Building2}
          trend={`${summary.total_operational_capacity_gw.toFixed(1)} GW currently operational`}
          accentColor="amber"
        />
        <StatCard
          title="NISE Solar Potential"
          value={`${summary.solar_potential_gw.toFixed(1)} GW`}
          subtitle="Ground-mounted & wasteland assessment"
          icon={Sun}
          trend="NISE National Study Baseline"
          accentColor="emerald"
        />
        <StatCard
          title="NIWE Wind Potential"
          value={`${summary.wind_potential_120m_gw.toFixed(1)} GW`}
          subtitle="At 120m hub height across 8 windy states"
          icon={Wind}
          trend="NIWE Indicative Assessment"
          accentColor="cyan"
        />
        <StatCard
          title="Total RE Potential"
          value={`${summary.total_national_potential_gw.toFixed(1)} GW`}
          subtitle={`${summary.total_installed_re_gw.toFixed(1)} GW cumulative installed`}
          icon={Zap}
          trend="Solar + Wind + Hydro + Biomass"
          accentColor="purple"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-3">
        <button
          onClick={() => setActiveTab('parks')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'parks'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Sanctioned Ultra-Mega Parks ({parks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('potential')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'potential'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart className="w-4 h-4" />
          <span>State Potential & Targets (NISE & NIWE)</span>
        </button>
        <button
          onClick={() => setActiveTab('guidelines')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'guidelines'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>MNRE Siting Guidelines & Benchmarks</span>
        </button>
      </div>

      {/* TAB 1: SANCTIONED MEGA PARKS */}
      {activeTab === 'parks' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by park name, district, agency, substation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* State Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>State:</span>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {uniqueStates.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Energy Type Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Type:</span>
                <select
                  value={selectedEnergyType}
                  onChange={(e) => setSelectedEnergyType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Types</option>
                  <option value="Solar">Solar</option>
                  <option value="Wind">Wind</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span>Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Fully Operational">Fully Operational</option>
                  <option value="Partially Operational">Partially Operational</option>
                  <option value="Under Execution">Under Execution</option>
                  <option value="Approved / Under Planning">Approved / Planning</option>
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Map Overlay for MNRE Parks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Geospatial Distribution of MNRE Sanctioned Ultra-Mega Parks</span>
                </h3>
                <p className="text-xs text-slate-400">Showing {filteredParks.length} government-approved renewable parks with high-voltage evacuation lines.</p>
              </div>
            </div>

            <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl">
              <MapContainer
                center={[22.5937, 78.9629]}
                zoom={5}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                {filteredParks.map((park) => (
                  <Marker
                    key={park.id}
                    position={[park.latitude, park.longitude]}
                    icon={createMNREParkIcon(park)}
                    eventHandlers={{
                      click: () => setSelectedPark(park),
                    }}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-2 space-y-2 min-w-[260px]">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-2">
                          <div>
                            <span className="text-[10px] font-mono text-amber-400 font-bold">{park.park_code}</span>
                            <h4 className="text-sm font-bold text-white leading-tight">{park.name}</h4>
                            <p className="text-xs text-slate-400">{park.district}, {park.state}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            park.energy_type === 'Solar'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : park.energy_type === 'Wind'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {park.energy_type}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs py-1">
                          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                            <span className="text-[10px] text-slate-400 block">Sanctioned</span>
                            <span className="text-sm font-bold text-amber-400 font-['Outfit']">
                              {formatCapacity(park.sanctioned_capacity_mw)}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                            <span className="text-[10px] text-slate-400 block">Operational</span>
                            <span className="text-sm font-bold text-emerald-400 font-['Outfit']">
                              {formatCapacity(park.operational_capacity_mw)}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-slate-400 block">Implementing Agency:</span>
                            <span className="font-semibold text-slate-200">{park.implementing_agency}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Evacuation Substation:</span>
                            <span className="font-medium text-cyan-300 text-[10px]">{park.grid_substation}</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-400">Status:</span>
                            <span className="font-semibold text-amber-300">{park.status}</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {selectedPark && (
                  <Circle
                    center={[selectedPark.latitude, selectedPark.longitude]}
                    radius={25000} // 25km radius circle
                    pathOptions={{
                      color: '#f59e0b',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.15,
                      weight: 2,
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          {/* Detailed Parks Table */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                MNRE Ultra-Mega Solar & Renewable Parks Catalog ({filteredParks.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="p-3">Park Code</th>
                    <th className="p-3">Park Name & Location</th>
                    <th className="p-3">Energy Type</th>
                    <th className="p-3">Capacity (Sanctioned / Operational)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Implementing Agency</th>
                    <th className="p-3">Evacuation Substation</th>
                    <th className="p-3">Land Area</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredParks.map((park) => (
                    <tr
                      key={park.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {park.park_code}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{park.name}</div>
                        <div className="text-[11px] text-slate-400">{park.district}, {park.state} ({park.region})</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          park.energy_type === 'Solar'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : park.energy_type === 'Wind'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}>
                          {park.energy_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white font-['Outfit'] text-sm">
                          {formatCapacity(park.sanctioned_capacity_mw)}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {formatCapacity(park.operational_capacity_mw)} active
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          park.status === 'Fully Operational'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : park.status === 'Partially Operational'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {park.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 text-[11px] max-w-[200px]">
                        {park.implementing_agency}
                      </td>
                      <td className="p-3 text-cyan-300 text-[11px] max-w-[220px]">
                        {park.grid_substation}
                      </td>
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">
                        {park.land_area_acres ? `${formatNumber(park.land_area_acres, 0)} acres` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATE POTENTIAL (NISE & NIWE) */}
      {activeTab === 'potential' && (
        <div className="space-y-6">
          {/* Comparative Chart */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  <span>NISE Solar & NIWE Wind Potential vs Installed Capacity by State</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Estimated potential in Gigawatts (GW) based on official NISE ground assessments & NIWE 120m hub-height wind data.
                </p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="state" stroke="#94a3b8" fontSize={11} angle={-25} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={11} unit=" GW" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="Solar Potential (GW)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Wind Potential (GW)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Total Installed (GW)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="2030 Target (GW)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full State Potentials Table */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Complete State-wise Renewable Energy Potential Matrix (MNRE Official)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="p-3">State / UT</th>
                    <th className="p-3">Region</th>
                    <th className="p-3">NISE Solar (GW)</th>
                    <th className="p-3">NIWE Wind 120m (GW)</th>
                    <th className="p-3">Small Hydro (GW)</th>
                    <th className="p-3">Biomass (GW)</th>
                    <th className="p-3 font-bold text-amber-400">Total Potential (GW)</th>
                    <th className="p-3">Installed Solar (MW)</th>
                    <th className="p-3">Installed Wind (MW)</th>
                    <th className="p-3 font-bold text-emerald-400">Total Installed (MW)</th>
                    <th className="p-3">2030 Target (MW)</th>
                    <th className="p-3">Achievement %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {potentials.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-white">{st.state}</td>
                      <td className="p-3 text-slate-400">{st.region}</td>
                      <td className="p-3 font-semibold text-amber-300">{st.solar_potential_gw.toFixed(2)}</td>
                      <td className="p-3 font-semibold text-cyan-300">{st.wind_potential_120m_gw.toFixed(2)}</td>
                      <td className="p-3 text-slate-400">{st.small_hydro_potential_gw.toFixed(2)}</td>
                      <td className="p-3 text-slate-400">{st.biomass_potential_gw.toFixed(2)}</td>
                      <td className="p-3 font-bold text-amber-400 font-['Outfit'] text-sm">
                        {st.total_potential_gw.toFixed(2)}
                      </td>
                      <td className="p-3 text-amber-300">{formatNumber(st.installed_solar_mw, 0)}</td>
                      <td className="p-3 text-cyan-300">{formatNumber(st.installed_wind_mw, 0)}</td>
                      <td className="p-3 font-bold text-emerald-400 font-['Outfit']">
                        {formatNumber(st.total_installed_mw, 0)}
                      </td>
                      <td className="p-3 text-purple-300 font-semibold">{formatNumber(st.target_2030_mw, 0)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{st.achievement_pct}%</span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, st.achievement_pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GUIDELINES & BENCHMARK CALCULATOR */}
      {activeTab === 'guidelines' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Land Requirement Calculator (1 span) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-[#0e1730] border border-amber-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base font-['Outfit']">
              <Calculator className="w-5 h-5" />
              <span>{benchmarks?.guidelines_title || 'MNRE Land Requirement Calculator'}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Source: {benchmarks?.source || 'Ministry of New and Renewable Energy (MNRE)'}. Calculate official land acquisition footprint based on MNRE & CEA standard acreage norms per MW.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Project Capacity (MW)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={50}
                    max={5000}
                    step={50}
                    value={calcCapacityMw}
                    onChange={(e) => setCalcCapacityMw(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-bold text-amber-400 min-w-[85px] text-center font-['Outfit']">
                    {calcCapacityMw} MW
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Generation Technology
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setCalcTech('solar')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      calcTech === 'solar'
                        ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Solar PV
                  </button>
                  <button
                    onClick={() => setCalcTech('wind')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      calcTech === 'wind'
                        ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md shadow-cyan-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Wind Farm
                  </button>
                  <button
                    onClick={() => setCalcTech('hybrid')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      calcTech === 'hybrid'
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Hybrid Park
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Calculated Land Footprint
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-['Outfit']">
                    {calculatedLand.acres}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Acres required</span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between border-t border-slate-800/80 pt-2">
                  <span>Metric Area:</span>
                  <span className="font-bold text-white">{calculatedLand.sqkm} km²</span>
                </div>
                <p className="text-[11px] text-slate-400 italic pt-1">
                  Norm: {calculatedLand.rule}
                </p>
              </div>
            </div>
          </div>

          {/* Benchmark Details & Policy Rules (2 spans) */}
          <div className="lg:col-span-2 space-y-6">
            {/* CUF Benchmarks */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>MNRE Capacity Utilization Factor (CUF) Performance Norms</span>
              </h3>
              <p className="text-xs text-slate-400">
                Statutory CUF benchmark thresholds defined for tariff bidding and financial modeling.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold text-amber-400 block">Solar PV (Fixed Tilt)</span>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Min CUF: 19.0%</span>
                    <span>Typical: 21.5%</span>
                    <span className="text-emerald-400 font-semibold">High: 25.0%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold text-amber-300 block">Solar PV (Single-Axis Tracker)</span>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Min CUF: 22.0%</span>
                    <span>Typical: 24.5%</span>
                    <span className="text-emerald-400 font-semibold">High: 28.0%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold text-cyan-400 block">Onshore Wind Power</span>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Min CUF: 28.0%</span>
                    <span>Typical: 35.0%</span>
                    <span className="text-emerald-400 font-semibold">High: 44.0%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <span className="text-xs font-bold text-emerald-400 block">Solar-Wind Hybrid System</span>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Min CUF: 35.0%</span>
                    <span>Typical: 42.0%</span>
                    <span className="text-emerald-400 font-semibold">High: 52.0%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Green Energy Corridor & ISTS Waiver Policy */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Green Energy Corridor (GEC) & Transmission Policy</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <b className="text-white block mb-1">GEC Phase I & Phase II Priority States:</b>
                  <span>Rajasthan, Gujarat, Tamil Nadu, Karnataka, Andhra Pradesh, Madhya Pradesh, Maharashtra, and Himachal Pradesh.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <b className="text-white block mb-1">ISTS Transmission Charge Waiver:</b>
                  <span>Inter-State Transmission System (ISTS) wheeling charges are 100% waived for projects connecting to PGCIL 400kV/765kV green corridors within approved commissioning windows.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <b className="text-white block mb-1">Great Indian Bustard (GIB) Mitigation:</b>
                  <span>Mandatory installation of bird flight diverters and undergrounding of 33kV distribution lines within Supreme Court designated priority zones in Thar (Rajasthan) and Kutch (Gujarat).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
