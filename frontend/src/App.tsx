import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { SiteExplorer } from './pages/SiteExplorer';
import { RecommendationWizard } from './pages/RecommendationWizard';
import { SiteDetails } from './pages/SiteDetails';
import { ExplainableAI } from './pages/ExplainableAI';
import { CompareSites } from './pages/CompareSites';
import { ModelValidation } from './pages/ModelValidation';
import { MNRERegistry } from './pages/MNRERegistry';
import { WeatherAnalysis } from './pages/WeatherAnalysis';
import { CostEstimator } from './pages/CostEstimator';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="explorer" element={<SiteExplorer />} />
          <Route path="recommendations" element={<RecommendationWizard />} />
          <Route path="mnre" element={<MNRERegistry />} />
          <Route path="weather" element={<WeatherAnalysis />} />
          <Route path="cost-estimator" element={<CostEstimator />} />
          <Route path="sites/:siteId" element={<SiteDetails />} />
          <Route path="explain" element={<ExplainableAI />} />
          <Route path="compare" element={<CompareSites />} />
          <Route path="model-validation" element={<ModelValidation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};


export default App;
