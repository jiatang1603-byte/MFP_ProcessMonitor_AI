/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MaterialBatch {
  supplier: string;
  batchNo: string;
  weight: number;
}

export interface DailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  operator: string;
  barrels: number;
  standardWeight: number; // calculated: barrels * barrelWeight
  feedingWeight: number;  // sum of batches' weights
  batches: MaterialBatch[]; // 至少四組供應商投料資料
  prevLeftover: number;    // 前日餘料重量（台斤）
  currLeftover: number;    // 當日餘料重量（台斤）
  errorAmount: number;     // 誤差量 = 投料重量 - 標準重量 + 前日餘料 - 當日餘料
  errorRate: number;       // 誤差率 = 誤差量 / 標準重量 * 100%
  otherFactors?: string;   // 其他製造
  anomalyReason: "無" | "魚肉較濕" | "魚肉較乾" | "特殊訂單" | "秤重異常" | "設備異常" | "其他";
  notes?: string;          // 備註
  status: "normal" | "warn" | "error" | "severe"; // 綠燈, 黃燈, 橘燈, 紅燈
}

export interface SPCLimits {
  meanRate: number;
  uclRate: number;
  lclRate: number;
  meanAmount: number;
  uclAmount: number;
  lclAmount: number;
}

export interface OperatorAnalysis {
  operator: string;
  count: number;
  avgErrorRate: number;
  avgErrorAmount: number;
  anomalyCount: number;
  stabilityScore: number; // 穩定度評分 (標準差越低、越接近 0 越好)
}

export interface BatchAnalysis {
  supplier: string;
  batchNo: string;
  count: number;
  avgErrorRate: number;
  anomalyCount: number;
}

export interface AnomalyImpact {
  reason: string;
  count: number;
  avgErrorRate: number;
  avgErrorAmount: number;
  impactDescription: string;
}

export interface AIAnalysisReport {
  timestamp: string;
  summary: string;
  spcStatus: string;
  rootCauses: string;
  recommendations: string;
  fullMarkdown: string;
}
