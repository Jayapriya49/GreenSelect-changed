import { api } from './api';
import type {
  WeatherAnalysisResponse,
  LocationComparisonRequest,
  LocationComparisonResponse
} from '../types';

export interface WeatherQueryParams {
  latitude: number;
  longitude: number;
  start_year?: number;
  end_year?: number;
  site_id?: number;
  location_name?: string;
  state?: string;
}

export const weatherService = {
  async getHistoricalWeather(params: WeatherQueryParams): Promise<WeatherAnalysisResponse> {
    const response = await api.get<WeatherAnalysisResponse>('/weather/historical', {
      params,
    });
    return response.data;
  },

  async compareLocations(request: LocationComparisonRequest): Promise<LocationComparisonResponse> {
    const response = await api.post<LocationComparisonResponse>('/weather/compare', request);
    return response.data;
  },

  async getAvailableYears(): Promise<{ min_year: number; max_year: number; default_start: number; default_end: number }> {
    const response = await api.get('/weather/years');
    return response.data;
  }
};
