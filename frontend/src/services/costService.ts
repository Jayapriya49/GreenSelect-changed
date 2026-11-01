import { api } from './api';
import type {
  CostEstimationRequest,
  CostEstimationResponse,
  CostAssumptionItem,
  CostComparisonRequest,
  CostComparisonResponse
} from '../types';

export const costService = {
  async estimateCost(request: CostEstimationRequest): Promise<CostEstimationResponse> {
    const response = await api.post<CostEstimationResponse>('/cost-estimator/estimate', request);
    return response.data;
  },

  async getAssumptions(): Promise<CostAssumptionItem[]> {
    const response = await api.get<CostAssumptionItem[]>('/cost-estimator/assumptions');
    return response.data;
  },

  async updateAssumptions(assumptions: Record<string, number>): Promise<CostAssumptionItem[]> {
    const response = await api.put<CostAssumptionItem[]>('/cost-estimator/assumptions', { assumptions });
    return response.data;
  },

  async resetAssumptions(): Promise<CostAssumptionItem[]> {
    const response = await api.post<CostAssumptionItem[]>('/cost-estimator/assumptions/reset');
    return response.data;
  },

  async compareCosts(request: CostComparisonRequest): Promise<CostComparisonResponse> {
    const response = await api.post<CostComparisonResponse>('/cost-estimator/compare', request);
    return response.data;
  },

  async downloadPdfReport(request: CostEstimationRequest): Promise<void> {
    const response = await api.post('/cost-estimator/report/pdf', request, {
      responseType: 'blob',
    });
    
    // Trigger browser download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = request.location_name.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `GreenSelect_Cost_Report_${sanitizedName}_${request.energy_type}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
