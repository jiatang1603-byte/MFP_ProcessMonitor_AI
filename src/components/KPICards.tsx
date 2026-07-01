/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyRecord } from "../types";
import { Scale, Activity, Percent, AlertCircle, ShieldAlert, CheckCircle2, TrendingUp } from "lucide-react";

interface KPICardsProps {
  records: DailyRecord[];
  selectedDate?: string;
}

export default function KPICards({ records, selectedDate }: KPICardsProps) {
  // 取得選定日期的資料，未指定則預設為最新一筆（今天）的資料
  const todayRecord = selectedDate 
    ? (records.find(r => r.date === selectedDate) || (records.length > 0 ? records[records.length - 1] : null))
    : (records.length > 0 ? records[records.length - 1] : null);

  // 計算本月平均誤差率與基本統計
  const totalCount = records.length;
  const sumErrorRate = records.reduce((acc, r) => acc + r.errorRate, 0);
  const avgErrorRate = totalCount > 0 ? sumErrorRate / totalCount : 0;

  // 異常統計
  const warnCount = records.filter(r => r.status === "warn").length;
  const errorCount = records.filter(r => r.status === "error").length;
  const severeCount = records.filter(r => r.status === "severe").length;
  const totalAnomalies = warnCount + errorCount + severeCount;

  // 最新狀態的燈號樣式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "severe":
        return {
          bg: "bg-red-50 border-red-200 text-red-950 shadow-sm",
          text: "text-red-700",
          glow: "bg-red-500 shadow-red-500/30",
          label: "🔴 重大異常",
          desc: "誤差率超過 ±10%，製程嚴重失控，必須立即停機檢修並追回漿料！"
        };
      case "error":
        return {
          bg: "bg-orange-50 border-orange-200 text-orange-950 shadow-sm",
          text: "text-orange-700",
          glow: "bg-orange-500 shadow-orange-500/30",
          label: "🟠 異常",
          desc: "誤差率在 ±5% ~ ±10% 之間，超出 SPC 管制界限，請立即排查原因。"
        };
      case "warn":
        return {
          bg: "bg-yellow-50 border-yellow-200 text-yellow-950 shadow-sm",
          text: "text-yellow-700",
          glow: "bg-yellow-400 shadow-yellow-400/30",
          label: "🟡 注意",
          desc: "誤差率在 ±3% ~ ±5% 之間，提示製程有偏移跡象，需加強現場監控。"
        };
      default:
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm",
          text: "text-emerald-700",
          glow: "bg-emerald-500 shadow-emerald-500/30",
          label: "🟢 正常",
          desc: "誤差率控制在 ±3% 以內，品質均勻度高，製程高度受控中。"
        };
    }
  };

  const currentStatus = todayRecord ? getStatusStyle(todayRecord.status) : getStatusStyle("normal");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="kpi-section">
      {/* 燈號狀態與提示 */}
      <div className={`lg:col-span-2 border rounded-2xl p-6 transition-all duration-300 shadow-sm flex flex-col justify-between ${currentStatus.bg}`} id="spc-status-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-500 block">CURRENT SPC STATUS</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 font-sans">
              當前製程 SPC 燈號
            </h3>
          </div>
          {/* 呼吸發光燈號 */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
            <span className={`w-3.5 h-3.5 rounded-full animate-pulse shadow-md ${currentStatus.glow}`}></span>
            <span className={`text-sm font-bold font-mono ${currentStatus.text}`}>{currentStatus.label}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-slate-700 font-medium leading-relaxed">
            {todayRecord ? (
              <>
                今日 (<span className="text-slate-900 font-bold">{todayRecord.date}</span>) 生產 <span className="text-slate-900 font-bold">{todayRecord.barrels} 桶</span> 魚漿，由 <span className="text-slate-900 font-bold">{todayRecord.operator}</span> 負責投料。標準用料 <span className="text-slate-900 font-bold">{todayRecord.standardWeight} 斤</span>，實際用料 <span className="text-slate-900 font-bold">{todayRecord.feedingWeight} 斤</span>，誤差量為 <span className={`font-bold ${todayRecord.errorAmount >= 0 ? "text-indigo-600" : "text-amber-600"}`}>{todayRecord.errorAmount >= 0 ? `+${todayRecord.errorAmount}` : todayRecord.errorAmount} 斤</span>（誤差率 <span className={`font-bold ${todayRecord.errorRate >= 0 ? "text-indigo-600" : "text-amber-600"}`}>{todayRecord.errorRate >= 0 ? `+${todayRecord.errorRate.toFixed(2)}` : todayRecord.errorRate.toFixed(2)}%</span>）。
              </>
            ) : "尚無今日投料數據。"}
          </p>
          <div className="mt-3 p-3 rounded-lg bg-white/75 border border-slate-200/60 shadow-inner">
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">💡 現場診斷提示：</span>
              {todayRecord?.anomalyReason !== "無" 
                ? `系統記錄之現場異常因素為「${todayRecord?.anomalyReason}」，備註說明：${todayRecord?.notes || "無"}。`
                : currentStatus.desc}
            </p>
          </div>
        </div>
      </div>

      {/* 4 個緊湊指標卡 */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        {/* 今日實際投料 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              {selectedDate ? `${selectedDate} 實際投料` : "今日實際投料"}
            </span>
            <div className="p-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-cyan-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
              {todayRecord ? todayRecord.feedingWeight.toLocaleString() : "0"}
            </span>
            <span className="text-xs text-slate-500 ml-1">台斤</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-500" />
            <span>標準: {todayRecord ? todayRecord.standardWeight : "0"} 斤</span>
          </div>
        </div>

        {/* 今日誤差率 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              {selectedDate ? `${selectedDate} 誤差率` : "今日誤差率"}
            </span>
            <div className="p-1.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-extrabold font-sans tracking-tight ${todayRecord && Math.abs(todayRecord.errorRate) > 3 ? "text-amber-600" : "text-emerald-600"}`}>
              {todayRecord ? (todayRecord.errorRate >= 0 ? `+${todayRecord.errorRate.toFixed(2)}` : todayRecord.errorRate.toFixed(2)) : "0.00"}
              %
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            誤差量: {todayRecord ? (todayRecord.errorAmount >= 0 ? `+${todayRecord.errorAmount}` : todayRecord.errorAmount) : "0"} 斤
          </div>
        </div>

        {/* 本月平均誤差率 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">本月平均誤差率</span>
            <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
              {avgErrorRate >= 0 ? `+${avgErrorRate.toFixed(2)}` : avgErrorRate.toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>製程能力良好</span>
          </div>
        </div>

        {/* 異常警報次數 */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">異常警報 / 重大異常</span>
            <div className="p-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-red-600 font-sans tracking-tight">
              {totalAnomalies}
            </span>
            <span className="text-xs text-slate-400">次 /</span>
            <span className="text-lg font-bold text-red-700 font-sans">
              {severeCount}
            </span>
            <span className="text-xs text-slate-400">重大</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span>異常率: {((totalAnomalies / (totalCount || 1)) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
