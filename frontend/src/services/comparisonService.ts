import { api } from './api';
import type { SiteComparisonResponse } from '../types';

export const comparisonService = {
  async compareSites(siteIds: number[]): Promise<SiteComparisonResponse> {
    const res = await api.post('/compare', { site_ids: siteIds });
    return res.data;
  },
};
