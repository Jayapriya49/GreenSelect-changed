import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import type { CandidateSite, MNRESolarPark } from '../../types';
import { getEnergyColor } from '../../utils/colorHelpers';
import { formatCapacity } from '../../utils/formatters';
import { ArrowRight, Layers, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Custom Map Controller to smoothly pan/zoom when selected site changes
const MapController: React.FC<{ selectedSite?: CandidateSite | null }> = ({ selectedSite }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size on mount to make sure tiles fully fill the container
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (selectedSite) {
      map.flyTo([selectedSite.latitude, selectedSite.longitude], 8, {
        duration: 1.5,
      });
    }
  }, [selectedSite, map]);
  return null;
};

// Function to generate sleek custom HTML DivIcons for Leaflet
function createCustomMarkerIcon(site: CandidateSite, isSelected: boolean) {
  const energy = getEnergyColor(site.energy_type);
  const color = energy.hex;

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ${isSelected ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${color}; animation: pulse-emerald 1.5s infinite; opacity: 0.8;"></div>` : ''}
      <div style="
        width: ${isSelected ? '28px' : '22px'};
        height: ${isSelected ? '28px' : '22px'};
        background: ${color};
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 14px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #0b132b;
        font-weight: 800;
        font-size: 11px;
        transition: all 0.2s ease-in-out;
      ">
        ${site.energy_type === 'Solar' ? 'S' : site.energy_type === 'Wind' ? 'W' : 'H'}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

// Function to generate custom HTML DivIcon for MNRE Sanctioned Mega Parks
function createMNREParkMarkerIcon(_park: MNRESolarPark) {
  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; border: 2px solid #f59e0b; opacity: 0.5;"></div>
      <div style="
        width: 24px;
        height: 24px;
        background: #f59e0b;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 0 14px #f59e0b;
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
    className: 'custom-mnre-map-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

interface IndiaRenewableMapProps {
  sites: CandidateSite[];
  mnreParks?: MNRESolarPark[];
  selectedSite?: CandidateSite | null;
  onSelectSite?: (site: CandidateSite) => void;
  height?: string;
  showLayerToggle?: boolean;
}

export const IndiaRenewableMap: React.FC<IndiaRenewableMapProps> = ({
  sites,
  mnreParks = [],
  selectedSite,
  onSelectSite,
  height = 'h-[580px]',
  showLayerToggle = true,
}) => {
  const navigate = useNavigate();
  const [activeLayer, setActiveLayer] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [showMNRELayer, setShowMNRELayer] = useState<boolean>(true);

  const tileLayers = {
    dark: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &copy; OpenStreetMap',
    },
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
    },
  };

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-black/40`}>
      <MapContainer
        center={[22.5937, 78.9629]}
        zoom={5}
        minZoom={4}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          url={tileLayers[activeLayer].url}
          attribution={tileLayers[activeLayer].attribution}
        />
        <MapController selectedSite={selectedSite} />

        {/* Render Official MNRE Parks when layer enabled */}
        {showMNRELayer &&
          mnreParks.map((park) => (
            <Marker
              key={`mnre-${park.id}`}
              position={[park.latitude, park.longitude]}
              icon={createMNREParkMarkerIcon(park)}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 space-y-2 min-w-[250px]">
                  <div className="border-b border-slate-700/60 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">{park.park_code}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        MNRE Approved
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight mt-1">{park.name}</h4>
                    <p className="text-xs text-slate-400">{park.district}, {park.state}</p>
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
                      <span className="text-slate-400 block">Substation Link:</span>
                      <span className="font-medium text-cyan-300 text-[10px]">{park.grid_substation}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Render Candidate Markers */}
        {sites.map((site) => {
          const isSelected = selectedSite?.id === site.id;
          const energy = getEnergyColor(site.energy_type);

          return (
            <Marker
              key={site.id}
              position={[site.latitude, site.longitude]}
              icon={createCustomMarkerIcon(site, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectSite) onSelectSite(site);
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 space-y-2 min-w-[240px]">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">{site.site_code}</span>
                      <h4 className="text-sm font-bold text-white leading-tight">{site.name}</h4>
                      <p className="text-xs text-slate-400">{site.district}, {site.state}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${energy.badge}`}>
                      {site.energy_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                      <span className="text-[10px] text-slate-400 block">AI Suitability</span>
                      <span className="text-sm font-extrabold text-emerald-400 font-['Outfit']">
                        {site.ml_suitability_score}
                        <span className="text-[10px] text-slate-400 font-normal">/100</span>
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50">
                      <span className="text-[10px] text-slate-400 block">Est. Capacity</span>
                      <span className="text-sm font-bold text-white font-['Outfit']">
                        {formatCapacity(site.estimated_capacity_mw)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Solar GHI:</span>
                      <span className="font-semibold text-amber-300">{site.solar_ghi} kWh/m²/d</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wind at 50m:</span>
                      <span className="font-semibold text-cyan-300">{site.wind_speed_50m} m/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Grid Distance:</span>
                      <span className="font-semibold">{site.distance_to_grid_km} km</span>
                    </div>
                    {site.nearest_mnre_park && (
                      <div className="flex justify-between text-[10px] pt-1 border-t border-slate-800/60">
                        <span className="text-amber-400/80">Nearest MNRE Park:</span>
                        <span className="font-medium text-slate-200">{site.distance_to_mnre_park_km} km</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/sites/${site.id}`)}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950 cursor-pointer"
                    >
                      <span>View Full Site Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draw Buffer Ring around Selected Site */}
        {selectedSite && (
          <Circle
            center={[selectedSite.latitude, selectedSite.longitude]}
            radius={selectedSite.distance_to_grid_km * 1000}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.1,
              weight: 1.5,
              dashArray: '4 4',
            }}
          />
        )}
      </MapContainer>

      {/* Layer Toggle Controls - elevated on top of map canvas */}
      {showLayerToggle && (
        <div
          className="absolute top-4 right-4 z-[1000] pointer-events-auto flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs"
          style={{ zIndex: 1000 }}
        >
          <button
            onClick={() => setActiveLayer('dark')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeLayer === 'dark'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            OpenStreetMap
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeLayer === 'satellite'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setActiveLayer('street')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeLayer === 'street'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Street
          </button>

          {mnreParks.length > 0 && (
            <button
              onClick={() => setShowMNRELayer(!showMNRELayer)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 border ${
                showMNRELayer
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>MNRE Parks ({mnreParks.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Map Legend Overlay - elevated on top of map canvas */}
      <div
        className="absolute bottom-4 left-4 z-[1000] pointer-events-auto p-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-xs space-y-1.5"
        style={{ zIndex: 1000 }}
      >
        <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Spatial Overlay Layers</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]"></span>
          <span>Solar Potential (S)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]"></span>
          <span>Wind Potential (W)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]"></span>
          <span>Hybrid Solar-Wind (H)</span>
        </div>
        {mnreParks.length > 0 && showMNRELayer && (
          <div className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold pt-0.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] flex items-center justify-center text-[8px] text-slate-950 font-black shadow-[0_0_6px_#f59e0b]">★</span>
            <span>MNRE Sanctioned Mega Parks</span>
          </div>
        )}
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
          Showing {sites.length} candidate sites {mnreParks.length > 0 && showMNRELayer ? `& ${mnreParks.length} MNRE parks` : ''}
        </div>
      </div>
    </div>
  );
};
