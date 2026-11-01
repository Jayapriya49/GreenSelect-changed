export interface CandidateSite {
  id: number;
  site_code: string;
  name: string;
  state: string;
  district: string;
  region: string;
  latitude: number;
  longitude: number;
  energy_type: 'Solar' | 'Wind' | 'Hybrid';

  // Solar
  solar_ghi: number;
  solar_dni: number;
  solar_pvout: number;
  temperature_avg: number;

  // Wind
  wind_speed_10m: number;
  wind_speed_50m: number;
  wind_power_density: number;

  // Terrain
  elevation_m: number;
  slope_deg: number;
  terrain_type: string;

  // Infrastructure
  distance_to_grid_km: number;
  distance_to_substation_km: number;
  distance_to_road_km: number;
  road_type: string;

  // Land & Environment
  land_cover_class: string;
  land_suitability_score: number;
  environmental_penalty: number;
  nearest_protected_area?: string;
  distance_to_protected_area_km: number;

  // MNRE Government Integration
  nearest_mnre_park?: string;
  distance_to_mnre_park_km?: number;
  in_mnre_green_corridor?: string;

  // Model & Metrics
  ml_suitability_score: number;
  suitability_tier: 'Very High' | 'High' | 'Moderate' | 'Low';
  estimated_capacity_mw: number;
  annual_energy_potential_gwh: number;
  lcoe_inr_kwh: number;
  co2_offset_tonnes_year: number;

  // Precomputed SHAP
  shap_positive_factors?: SHAPFactor[];
  shap_negative_factors?: SHAPFactor[];
  explanation_summary?: string;
}

export interface SiteFilterParams {
  energy_type?: string;
  region?: string;
  state?: string;
  min_suitability?: number;
  max_grid_distance?: number;
  max_slope?: number;
  limit?: number;
  offset?: number;
}

export interface PriorityWeights {
  energy_potential: number;
  grid_accessibility: number;
  environmental_sustainability: number;
  land_suitability: number;
  economic_feasibility: number;
}

export interface RecommendationRequest {
  energy_type: string;
  region?: string;
  state?: string;
  priorities: PriorityWeights;
  top_n?: number;
  min_suitability_threshold?: number;
}

export interface RecommendationResultItem {
  rank: number;
  site: CandidateSite;
  composite_recommendation_score: number;
  ml_suitability_score: number;
  energy_score: number;
  grid_score: number;
  environmental_score: number;
  land_score: number;
  economic_score: number;
  top_positive_factors: any[];
  top_negative_factors: any[];
  recommendation_verdict: string;
}

export interface RecommendationResponse {
  energy_type: string;
  region?: string;
  state?: string;
  total_evaluated_sites: number;
  results: RecommendationResultItem[];
  methodology_note: string;
}

export interface SHAPFactor {
  feature_name: string;
  display_name: string;
  feature_value: number;
  unit: string;
  shap_value: number;
  percentage_impact: number;
  direction: 'positive' | 'negative';
  explanation: string;
}

export interface SiteExplanationResponse {
  site_id: number;
  site_code: string;
  name: string;
  energy_type: string;
  predicted_suitability_score: number;
  base_value: number;
  positive_factors: SHAPFactor[];
  negative_factors: SHAPFactor[];
  natural_language_explanation: string;
  methodology: string;
}

export interface GlobalFeatureImportance {
  feature_name: string;
  display_name: string;
  mean_abs_shap: number;
  importance_rank: number;
  category: string;
}

export interface ParameterComparisonRow {
  parameter: string;
  category: string;
  unit: string;
  values: Record<number, any>;
  best_site_id?: number;
  interpretation: string;
}

export interface SiteComparisonResponse {
  sites: CandidateSite[];
  comparison_table: ParameterComparisonRow[];
  radar_metrics: Array<Record<string, any>>;
  recommended_winner_site_id: number;
  winner_rationale: string;
}

export interface StateStatItem {
  state: string;
  region: string;
  total_sites: number;
  avg_suitability: number;
  avg_solar_ghi: number;
  avg_wind_speed: number;
  total_potential_mw: number;
  top_energy_type: string;
}

export interface EnergyTypeStatItem {
  energy_type: string;
  count: number;
  avg_suitability: number;
  total_capacity_mw: number;
  annual_generation_gwh: number;
}

export interface NationalStatsResponse {
  total_candidate_sites: number;
  total_analyzed_area_sqkm: number;
  high_suitability_zones_count: number;
  total_estimated_capacity_gw: number;
  total_annual_generation_twh: number;
  total_annual_co2_offset_m_tonnes: number;
  energy_type_distribution: EnergyTypeStatItem[];
  top_states: StateStatItem[];
  regional_breakdown: Record<string, number>;
  avg_solar_ghi: number;
  avg_wind_speed_50m: number;
  data_source_summary: Record<string, string>;
}

// MNRE Official Dataset Types
export interface MNRESolarPark {
  id: number;
  park_code: string;
  name: string;
  state: string;
  district: string;
  region: string;
  latitude: number;
  longitude: number;
  energy_type: string;
  sanctioned_capacity_mw: number;
  operational_capacity_mw: number;
  status: string;
  implementing_agency: string;
  scheme_mode?: string;
  land_area_acres?: number;
  grid_substation: string;
  commissioning_year?: number;
}

export interface MNREStatePotential {
  id: number;
  state: string;
  region: string;
  solar_potential_gw: number;
  wind_potential_120m_gw: number;
  small_hydro_potential_gw: number;
  biomass_potential_gw: number;
  total_potential_gw: number;
  installed_solar_mw: number;
  installed_wind_mw: number;
  total_installed_mw: number;
  target_2030_mw: number;
  achievement_pct: number;
}

export interface MNREBenchmark {
  source: string;
  guidelines_title: string;
  land_norms: Record<string, any>;
  cuf_benchmarks_pct: Record<string, any>;
  green_energy_corridor: Record<string, any>;
  environmental_clearance_regime: Record<string, any>;
}

export interface MNRESummaryResponse {
  total_sanctioned_parks: number;
  total_sanctioned_capacity_gw: number;
  total_operational_capacity_gw: number;
  total_national_potential_gw: number;
  total_installed_re_gw: number;
  solar_potential_gw: number;
  wind_potential_120m_gw: number;
  top_potential_states: MNREStatePotential[];
  parks_by_status: Record<string, number>;
  parks_by_region: Record<string, number>;
}

export interface MNREFilterParams {
  state?: string;
  region?: string;
  energy_type?: string;
  status?: string;
  min_capacity_mw?: number;
  limit?: number;
  offset?: number;
}

// ==========================================
// Weather & Seasonal Analysis Types
// ==========================================

export interface MonthlyWeatherItem {
  month: number;
  month_name: string;
  solar_radiation: number;
  wind_speed: number;
  temperature: number;
  precipitation: number;
  rainfall_month_mm: number;
}

export interface SeasonalWeatherItem {
  season_name: string;
  months_included: string[];
  solar_radiation_avg: number;
  wind_speed_avg: number;
  temperature_avg: number;
  precipitation_avg: number;
  solar_delta_pct: number;
  wind_delta_pct: number;
}

export interface SeasonalSummary {
  best_solar_season: string;
  best_solar_value: number;
  best_wind_season: string;
  best_wind_value: number;
  annual_avg_solar: number;
  annual_avg_wind: number;
  annual_avg_temperature: number;
  annual_total_rainfall_mm: number;
  disclaimer: string;
}

export interface WeatherAnalysisResponse {
  location_name: string;
  state?: string;
  district?: string;
  latitude: number;
  longitude: number;
  start_year: number;
  end_year: number;
  data_source: string;
  is_cached: boolean;
  monthly_data: MonthlyWeatherItem[];
  seasonal_data: SeasonalWeatherItem[];
  summary: SeasonalSummary;
  yearly_trend?: Array<{
    year: number;
    solar_radiation: number;
    wind_speed: number;
    temperature: number;
  }>;
}

export interface LocationComparisonRequest {
  site_ids?: number[];
  start_year?: number;
  end_year?: number;
}

export interface LocationComparisonResponse {
  start_year: number;
  end_year: number;
  locations: WeatherAnalysisResponse[];
  monthly_comparison: Array<Record<string, any>>;
  seasonal_comparison: Array<Record<string, any>>;
}

// ==========================================
// Infrastructure Cost Estimator Types
// ==========================================

export interface CostEstimationRequest {
  site_id?: number;
  location_name: string;
  state: string;
  energy_type: 'Solar' | 'Wind' | 'Hybrid';
  capacity_mw: number;
  solar_capacity_mw?: number;
  wind_capacity_mw?: number;
  land_requirement_acres?: number;
  distance_to_grid_km: number;
  distance_to_road_km?: number;
  terrain_type?: string;
  slope_deg?: number;
  custom_assumptions?: Record<string, number>;
}

export interface CostComponentItem {
  name: string;
  category: string;
  base_unit_rate: number;
  unit: string;
  quantity: number;
  quantity_unit: string;
  adjustment_factor: number;
  total_cost_inr: number;
  total_cost_crores: number;
  percentage_of_total: number;
  calculation_formula: string;
  description: string;
}

export interface CategoryCostSummary {
  category: string;
  total_inr: number;
  total_crores: number;
  percentage_of_total: number;
  components: CostComponentItem[];
}

export interface CostEstimationResponse {
  location_name: string;
  state: string;
  energy_type: string;
  capacity_mw: number;
  solar_capacity_mw?: number;
  wind_capacity_mw?: number;
  land_requirement_acres: number;
  distance_to_grid_km: number;
  distance_to_road_km: number;
  terrain_type: string;
  slope_deg: number;

  terrain_adjustment_multiplier: number;
  road_distance_adjustment_multiplier: number;
  grid_distance_adjustment_multiplier: number;

  equipment_cost_crores: number;
  equipment_cost_inr: number;
  land_development_cost_crores: number;
  land_development_cost_inr: number;
  grid_connection_cost_crores: number;
  grid_connection_cost_inr: number;
  installation_cost_crores: number;
  installation_cost_inr: number;
  civil_infrastructure_cost_crores: number;
  civil_infrastructure_cost_inr: number;

  shared_synergy_savings_crores: number;
  shared_synergy_savings_inr: number;
  synergy_details?: {
    shared_grid_savings_crores: number;
    shared_substation_savings_crores: number;
    shared_civil_savings_crores: number;
    total_synergy_savings_crores: number;
    description: string;
  };

  total_cost_crores: number;
  total_cost_inr: number;
  cost_per_mw_crores: number;

  categories: CategoryCostSummary[];
  all_components: CostComponentItem[];
  assumptions_used: Record<string, any>;
  currency: string;
  disclaimer: string;
}

export interface CostAssumptionItem {
  id?: number;
  parameter_key: string;
  parameter_name: string;
  energy_type: string;
  category: string;
  default_value: number;
  current_value: number;
  unit: string;
  description?: string;
}

export interface CostComparisonRequest {
  mode: 'locations' | 'energy_types' | 'capacities';
  base_request: CostEstimationRequest;
  comparison_site_ids?: number[];
  comparison_capacities?: number[];
}

export interface CostComparisonItem {

  label: string;
  energy_type: string;
  capacity_mw: number;
  location_name: string;
  state: string;
  equipment_crores: number;
  land_crores: number;
  grid_crores: number;
  installation_crores: number;
  civil_crores: number;
  total_crores: number;
  cost_per_mw_crores: number;
}

export interface CostComparisonResponse {
  comparison_mode: string;
  items: CostComparisonItem[];
}

