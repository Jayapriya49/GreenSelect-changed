import { api } from './api';
import type { CandidateSite, SiteFilterParams, NationalStatsResponse, StateStatItem } from '../types';

export const siteService = {
  async getSites(params?: SiteFilterParams): Promise<{ total: number; sites: CandidateSite[] }> {
    const res = await api.get('/sites', { params });
    return res.data;
  },

  async getSiteById(id: number | string): Promise<CandidateSite> {
    const res = await api.get(`/sites/${id}`);
    return res.data;
  },

  async getNearbySites(lat: number, lon: number, radiusKm: number = 150): Promise<Array<{ site: CandidateSite; distance_km: number }>> {
    const res = await api.get('/sites/nearby', {
      params: { latitude: lat, longitude: lon, radius_km: radiusKm }
    });
    return res.data;
  },

  async getStates(): Promise<StateStatItem[]> {
    const res = await api.get('/states');
    return res.data;
  },

  async getStatistics(): Promise<NationalStatsResponse> {
    const res = await api.get('/statistics');
    return res.data;
  },
};
