export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface EnvironmentalIssue {
  type: string;
  description: string;
  severity: Severity;
  location_context: string;
  recommendations: string[];
}

export interface AnalysisResult {
  overall_status: string;
  summary: string;
  detected_objects: string[];
  issues: EnvironmentalIssue[];
  // Forensic/Reporting fields
  issue_category: 'deforestation' | 'landfill' | 'water_pollution' | 'air_pollution' | 'industrial_waste' | 'urban_litter' | 'healthy_environment' | 'uncertain';
  confidence: number;
  visual_evidence: string[];
  short_description: string;
  // Metadata specific fields
  probable_causes?: string[];
  suggested_actions?: string[];
  urgency_level?: 'low' | 'medium' | 'high';
  citizen_alert?: string;
  reporter_notification?: string;
}

export interface ReportInput {
  issue_category: string;
  confidence: number;
}

export interface AggregationResult {
  summary: string;
  top_issues: {
    category: string;
    average_confidence: number;
    count: number;
  }[];
  recommended_regional_actions: string[];
}

export interface GeographicAnalysisResult {
  probability_score: number;
  reasoning: string;
}
