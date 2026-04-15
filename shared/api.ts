/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export interface ModelMetrics {
  rmse: number;
  mae: number;
  r2: number;
}

export interface SoilProfile {
  N: number;
  P: number;
  K: number;
  ph: number;
  desc: string;
}

export interface CropSwitchConfig {
  districts: string[];
  crops: string[];
  seasons: string[];
  soil_types: string[];
  data_years: number[];
  limitations: string[];
  model_metrics: Record<string, ModelMetrics>;
  source_summary: Record<string, boolean>;
  ensemble_weights: Record<string, number>;
}

export interface CropSwitchConfigResponse {
  success: boolean;
  config: CropSwitchConfig;
}

export interface CropSwitchRequest {
  district: string;
  current_crop: string;
  season: string;
  soil_type: string;
  rainfall: number;
}

export interface MarketInfo {
  modal_price: number;
  price_date: string;
}

export interface CropSwitchCard {
  crop: string;
  score: number;
  predicted_index: number;
  predicted_yield: number;
  support_mode: string;
  support_score: number;
  stability: number;
  local_median: number;
  district_season_median: number;
  crop_baseline: number;
  trend_2y: number;
  years_seen: number;
  confidence?: number;
  market?: MarketInfo | null;
  component_predictions?: Record<string, number>;
}

export interface CropSwitchReason {
  label: string;
  detail: string;
  weight: number;
}

export interface CropSwitchPredictionResult {
  switch: number;
  recommendation: string;
  confidence: number;
  current_crop_score: number;
  top_crop_score: number;
  performance_gap: number;
  yield_gap: number;
  yield_gap_pct: number;
  current_crop_analysis: CropSwitchCard;
  recommendations: CropSwitchCard[];
  reasons: CropSwitchReason[];
  model_info: {
    name: string;
    metrics: Record<string, ModelMetrics>;
    data_years: number[];
    limitations: string[];
    ensemble_weights: Record<string, number>;
    source_summary: Record<string, boolean>;
  };
  input: CropSwitchRequest;
  soil_snapshot: SoilProfile;
}

export interface CropSwitchPredictionResponse {
  success: boolean;
  result: CropSwitchPredictionResult;
}

export interface CropSwitchHistoryEntry {
  id: number;
  district: string;
  current_crop: string;
  season: string;
  soil_type: string;
  rainfall: number;
  recommendation: string;
  confidence: number;
  top_crop: string;
  performance_gap: number;
  yield_gap: number;
  created_at: string;
}

export interface CropSwitchHistoryResponse {
  success: boolean;
  history: CropSwitchHistoryEntry[];
}

export interface DiseaseAnalyzeRequest {
  image_name: string;
  image_data_url: string;
  crop_hint?: string;
  requested_model?: DiseaseModelChoice;
}

export type DiseaseModelChoice =
  | "auto"
  | "pretrained-transfer"
  | "custom-cnn";

export type DiseaseResolvedMode =
  | "pretrained-transfer"
  | "custom-cnn"
  | "demo-fallback";

export interface DiseaseModelOptionStatus {
  key: Exclude<DiseaseModelChoice, "auto">;
  label: string;
  description: string;
  available: boolean;
  framework: string;
  reason: string;
  model_files: {
    weights: boolean;
    classes: boolean;
    metrics: boolean;
  };
}

export interface DiseaseTopPrediction {
  label: string;
  confidence: number;
}

export interface DiseaseAdvisory {
  overview: string;
  severity: string;
  why: string;
  immediate_actions: string[];
  preventive_actions: string[];
}

export interface DiseaseModelStatus {
  ready: boolean;
  mode: DiseaseResolvedMode;
  requested_mode: DiseaseModelChoice;
  best_available_mode: DiseaseResolvedMode;
  reason: string;
  framework: string;
  dependencies: {
    torch: boolean;
    pillow: boolean;
    torchvision: boolean;
  };
  model_files: {
    weights: boolean;
    classes: boolean;
    metrics: boolean;
  };
  image_size: number;
  class_names: string[];
  available_models: DiseaseModelOptionStatus[];
}

export interface DiseasePrediction {
  predicted_label: string;
  confidence: number;
  crop_hint: string;
  requested_model: DiseaseModelChoice;
  image_digest: string;
  top_predictions: DiseaseTopPrediction[];
  advisory: DiseaseAdvisory;
  model_status: DiseaseModelStatus;
}

export interface DiseaseSummary {
  total_scans: number;
  top_disease: string | null;
  latest_scan_at: string | null;
}

export interface DiseaseHistoryEntry {
  id: number;
  filename: string;
  crop_hint: string;
  predicted_label: string;
  confidence: number;
  requested_model: DiseaseModelChoice;
  model_mode: string;
  created_at: string;
  advisory: DiseaseAdvisory | null;
}

export interface DiseaseAnalyzeResponse {
  success: boolean;
  prediction: DiseasePrediction;
  history: DiseaseHistoryEntry[];
  summary: DiseaseSummary;
}

export interface DiseaseHistoryResponse {
  success: boolean;
  history: DiseaseHistoryEntry[];
  summary: DiseaseSummary;
  model_status: DiseaseModelStatus;
}
