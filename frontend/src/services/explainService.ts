import { api } from './api';
import type { SiteExplanationResponse, GlobalFeatureImportance } from '../types';

export const explainService = {
  async getSiteExplanation(siteId: number | string): Promise<SiteExplanationResponse> {
    const res = await api.get(`/sites/${siteId}/explanation`);
    return res.data;
  },

  async getGlobalFeatureImportance(): Promise<GlobalFeatureImportance[]> {
    const res = await api.get('/explain/global');
    return res.data;
  },

  async getMLMetrics(): Promise<any> {
    const res = await api.get('/ml/metrics');
    return res.data;
  },
};
