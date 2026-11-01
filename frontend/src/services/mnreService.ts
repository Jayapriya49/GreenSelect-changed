import { api } from './api';
import type {
  MNRESolarPark,
  MNREStatePotential,
  MNREBenchmark,
  MNRESummaryResponse,
  MNREFilterParams
} from '../types';

export const mnreService = {
  async getSummary(): Promise<MNRESummaryResponse> {
    const res = await api.get('/mnre/summary');
    return res.data;
  },

  async getSolarParks(params?: MNREFilterParams): Promise<{ total: number; limit: number; offset: number; parks: MNRESolarPark[] }> {
    const res = await api.get('/mnre/solar-parks', { params });
    return res.data;
  },

  async getSolarParkById(id: number | string): Promise<MNRESolarPark> {
    const res = await api.get(`/mnre/solar-parks/${id}`);
    return res.data;
  },

  async getStatePotentials(region?: string): Promise<MNREStatePotential[]> {
    const res = await api.get('/mnre/state-potentials', {
      params: region && region !== 'All' ? { region } : undefined
    });
    return res.data;
  },

  async getBenchmarks(): Promise<MNREBenchmark> {
    const res = await api.get('/mnre/benchmarks');
    return res.data;
  }
};
