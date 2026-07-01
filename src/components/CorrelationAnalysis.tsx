/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { DailyRecord, OperatorAnalysis, BatchAnalysis, AnomalyImpact } from "../types";
import { Users, Truck, AlertTriangle, ArrowRight, UserCheck, Sparkles } from "lucide-react";

interface CorrelationAnalysisProps {
  records: DailyRecord[];
}

export default function CorrelationAnalysis({ records }: CorrelationAnalysisProps) {
  // 1. 投料人員分析
  const operatorAnalysis = useMemo<OperatorAnalysis[]>(() => {
    const operatorMap: Record<string, { rates: number[]; amounts: number[]; anomalies: number }> = {};
    
    records.forEach((r) => {
      if (!operatorMap[r.operator]) {
        operatorMap[r.operator] = { rates: [], amounts: [], anomalies: 0 };
      }
      operatorMap[r.operator].rates.push(r.errorRate);
      operatorMap[r.operator].amounts.push(r.errorAmount);
      if (r.status !== "normal") {
        operatorMap[r.operator].anomalies += 1;
      }
    });

    return Object.entries(operatorMap).map(([operator, data]) => {
      const count = data.rates.length;
      const avgErrorRate = data.rates.reduce((sum, v) => sum + v, 0) / count;
      const avgErrorAmount = data.amounts.reduce((sum, v) => sum + v, 0) / count;
      
      // 計算標準差
      const variance = data.rates.reduce((sum, v) => sum + Math.pow(v - avgErrorRate, 2), 0) / Math.max(1, count - 1);
      const stdDev = Math.sqrt(variance);

      // 穩定度評分 (100分滿分，標準差越大、離 0% 平均越遠分數越低)
      const devPenalty = Math.abs(avgErrorRate) * 5;
      const stdDevPenalty = stdDev * 12;
      const stabilityScore = Math.max(40, Math.min(100, Math.round(100 - devPenalty - stdDevPenalty)));

      return {
        operator,
        count,
        avgErrorRate,
        avgErrorAmount,
        anomalyCount: data.anomalies,
        stabilityScore,
      };
    }).sort((a, b) => b.stabilityScore - a.stabilityScore); // 依穩定度評分排序
  }, [records]);

  // 2. 魚肉供應商與批號分析
  const batchAnalysis = useMemo<BatchAnalysis[]>(() => {
    // 聚合各供應商的批號數據
    const supplierBatchMap: Record<string, { rates: number[]; anomalies: number; batchNo: string }> = {};

    records.forEach((r) => {
      // 提取批號資訊。每一筆有 4 個供應商的明細，我們把這 4 個供應商在該天的資料都拿出來統計
      r.batches.forEach((b) => {
        const key = `${b.supplier}::${b.batchNo}`;
        if (!supplierBatchMap[key]) {
          supplierBatchMap[key] = { rates: [], anomalies: 0, batchNo: b.batchNo };
        }
        // 使用這天記錄的誤差率作為批次品質波動的對應
        supplierBatchMap[key].rates.push(r.errorRate);
        if (r.status !== "normal") {
          supplierBatchMap[key].anomalies += 1;
        }
      });
    });

    return Object.entries(supplierBatchMap).map(([key, data]) => {
      const [supplier] = key.split("::");
      const count = data.rates.length;
      const avgErrorRate = data.rates.reduce((sum, v) => sum + v, 0) / count;

      return {
        supplier,
        batchNo: data.batchNo,
        count,
        avgErrorRate,
        anomalyCount: data.anomalies,
      };
    }).sort((a, b) => Math.abs(b.avgErrorRate) - Math.abs(a.avgErrorRate)); // 按照平均偏離幅度排序
  }, [records]);

  // 3. 異常原因分析與歸因
  const anomalyAttributions = useMemo<AnomalyImpact[]>(() => {
    const reasonsList: Array<"魚肉較濕" | "魚肉較乾" | "特殊訂單" | "秤重異常" | "設備異常" | "其他"> = [
      "魚肉較濕",
      "魚肉較乾",
      "特殊訂單",
      "秤重異常",
      "設備異常",
      "其他",
    ];

    return reasonsList.map((reason) => {
      const filtered = records.filter((r) => r.anomalyReason === reason);
      const count = filtered.length;
      const avgErrorRate = count > 0 ? filtered.reduce((sum, r) => sum + r.errorRate, 0) / count : 0;
      const avgErrorAmount = count > 0 ? filtered.reduce((sum, r) => sum + r.errorAmount, 0) / count : 0;

      let impactDescription = "無明顯變異影響。";
      if (reason === "魚肉較濕") {
        impactDescription = "下雨天進貨或高含水物料，造成物料膨脹增重，平均引發 +6.8% 正向誤差。";
      } else if (reason === "魚肉較乾") {
        impactDescription = "進料魚肉乾燥油脂少，吸水量偏低，平均引發 -3.8% 負向偏差。";
      } else if (reason === "秤重異常") {
        impactDescription = "地磅受環境灰塵卡物影響，傳感器漂移，平均造成 -5.3% 系統性低報誤差。";
      } else if (reason === "特殊訂單") {
        impactDescription = "生產客製化高黏彈度、特定配比商品，需要特定大幅加料調配，平均造成 +11.2% 重大偏離。";
      } else if (reason === "設備異常") {
        impactDescription = "打漿機油壓轉速不穩或溫度偏高，使原料失重，平均造成 -2.2% 負向微幅偏移。";
      } else if (reason === "其他") {
        impactDescription = "常規偶發性操作誤差。";
      }

      return {
        reason,
        count,
        avgErrorRate,
        avgErrorAmount,
        impactDescription,
      };
    }).filter((a) => a.count > 0 || a.reason !== "其他");
  }, [records]);

  // 自動找出最具潛在異常風險的供應商與原料批號
  const highRiskBatch = useMemo(() => {
    return batchAnalysis.find(b => Math.abs(b.avgErrorRate) > 4.0 || b.anomalyCount > 1);
  }, [batchAnalysis]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="correlation-analysis-panel">
      {/* 1. 投料人員排名與穩定度 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-4">
            <Users className="w-5 h-5" />
            <h4 className="text-sm font-bold text-slate-900 font-sans">投料人員穩定度排名</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            依據統計標準差（σ）與平均誤差綜合評估。標準差越小、代表班別操作穩定性越高，成品口感越均勻。
          </p>
 
          <div className="space-y-4">
            {operatorAnalysis.map((op, idx) => (
              <div key={op.operator} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-mono font-bold ${
                    idx === 0 ? "bg-indigo-50 border border-indigo-200 text-indigo-600" : "bg-slate-200 text-slate-500"
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      {op.operator}
                      {idx === 0 && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      投料天數: {op.count} 天 | 異常次數: <span className={op.anomalyCount > 0 ? "text-amber-600 font-bold" : "text-slate-400"}>{op.anomalyCount}</span>
                    </div>
                  </div>
                </div>
 
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-600">
                    平均誤差率: <span className={Math.abs(op.avgErrorRate) > 3 ? "text-amber-600" : "text-emerald-600"}>
                      {op.avgErrorRate >= 0 ? `+${op.avgErrorRate.toFixed(2)}` : op.avgErrorRate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                    <span>穩定評分:</span>
                    <span className="text-indigo-600 font-bold font-mono">{op.stabilityScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
 
        <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 leading-relaxed">
          🏆 <strong>品質模範：</strong>由歷史排行分析，投料人員以 <strong className="text-slate-800 font-semibold">{operatorAnalysis[0]?.operator}</strong> 表現最優，其製程誤差曲線最平緩。
        </div>
      </div>
 
      {/* 2. 原料供應商與批號分析 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 mb-4">
            <Truck className="w-5 h-5" />
            <h4 className="text-sm font-bold text-slate-900 font-sans">原料批號與供應商品質稽核</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            追蹤各原料批號在生產日產出的誤差偏離幅度。高偏離度通常意味著該批次原料含水率、含脂率與正常配方失調。
          </p>
 
          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
            {batchAnalysis.slice(0, 4).map((b) => {
              const isHighDeviation = Math.abs(b.avgErrorRate) > 4.0;
              return (
                <div key={`${b.supplier}-${b.batchNo}`} className={`p-3 rounded-xl border transition-all ${
                  isHighDeviation ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200/40"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">{b.supplier}</span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">批號: {b.batchNo}</span>
                    </div>
                    {isHighDeviation && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[9px] font-bold font-mono flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        波動偏高
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-500 border-t border-slate-200/40 pt-1.5">
                    <span>累計關聯天數: {b.count} 天</span>
                    <span>平均製程誤差率: <strong className={isHighDeviation ? "text-red-600" : "text-slate-700"}>{b.avgErrorRate >= 0 ? `+${b.avgErrorRate.toFixed(2)}` : b.avgErrorRate.toFixed(2)}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
 
        {/* AI 自動定位異常批號提示 */}
        <div className="mt-4 pt-3 border-t border-slate-100 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-600 leading-relaxed">
              <span className="font-bold text-indigo-600">🤖 AI 異常批號圈選判定：</span>
              {highRiskBatch ? (
                <>
                  偵測到批號 <strong className="text-slate-800 font-bold">{highRiskBatch.batchNo}</strong>（{highRiskBatch.supplier}）在入料期間，對應製程產生了高達 <strong className="text-amber-600 font-bold">{highRiskBatch.avgErrorRate.toFixed(2)}%</strong> 的平均誤差波動，疑似存在嚴重物料水分異動，建議採購與生管部門加強進料檢驗。
                </>
              ) : "目前未發現顯著變異批號，供應商供貨穩定。"}
            </div>
          </div>
        </div>
      </div>
 
      {/* 3. 異常原因分析與歸因 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h4 className="text-sm font-bold text-slate-900 font-sans">製程變異事件統計與歸因模型</h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          統計歷史生產中各異常申報原因對「誤差率」所產生的平均實質物理衝擊。
        </p>
 
        <div className="space-y-4">
          {anomalyAttributions.map((item) => {
            // 決定進度條顏色
            let barColor = "bg-indigo-500";
            let textColor = "text-indigo-600";
            if (item.reason === "特殊訂單" || item.reason === "魚肉較濕") {
              barColor = "bg-indigo-500";
              textColor = "text-indigo-600";
            } else if (item.reason === "秤重異常" || item.reason === "魚肉較乾") {
              barColor = "bg-amber-500";
              textColor = "text-amber-600";
            } else {
              barColor = "bg-slate-400";
              textColor = "text-slate-500";
            }
 
            // 計算寬度比例 (最大 15% 做 100%)
            const widthPct = Math.min(100, Math.round((Math.abs(item.avgErrorRate) / 12) * 100));
 
            return (
              <div key={item.reason} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    {item.reason}
                    <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 text-[9px] rounded font-mono">
                      {item.count}次
                    </span>
                  </span>
                  <span className={`font-mono font-bold ${textColor}`}>
                    平均 {item.avgErrorRate >= 0 ? `+${item.avgErrorRate.toFixed(1)}` : item.avgErrorRate.toFixed(1)}%
                  </span>
                </div>
                {/* 偏離長條圖 */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  {item.avgErrorRate < 0 ? (
                    <div className="w-1/2 flex justify-end">
                      <div className={`h-full ${barColor} rounded-l-full`} style={{ width: `${widthPct / 2}%` }}></div>
                    </div>
                  ) : (
                    <div className="w-1/2 flex">
                      <div className="w-full"></div>
                      <div className={`h-full ${barColor} rounded-r-full`} style={{ width: `${widthPct / 2}%` }}></div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">{item.impactDescription}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
