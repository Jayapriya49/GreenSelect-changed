import { api } from './api';
import type { RecommendationRequest, RecommendationResponse } from '../types';

export const recommendationService = {
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const res = await api.post('/recommendations', request);
    return res.data;
  },

  async analyzeDeepDive(request: RecommendationRequest): Promise<RecommendationResponse> {
    const res = await api.post('/recommendations/analyze', request);
    return res.data;
  },
};
