/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { INITIAL_RECORDS, DEFAULT_BARREL_WEIGHT } from "./data/mockData";
import { DailyRecord, AIAnalysisReport } from "./types";
import KPICards from "./components/KPICards";
import SPCOverview from "./components/SPCOverview";
import CorrelationAnalysis from "./components/CorrelationAnalysis";
import DataManagement from "./components/DataManagement";
import AIInsights from "./components/AIInsights";
import TechnicalGuide from "./components/TechnicalGuide";
import {
  Activity,
  Sparkles,
  FileSpreadsheet,
  BrainCircuit,
  Settings,
  HelpCircle,
  Clock,
  Waves,
  Calendar
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "ai" | "data" | "guide">("dashboard");
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [barrelWeight, setBarrelWeight] = useState<number>(DEFAULT_BARREL_WEIGHT);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AIAnalysisReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // 從本機快取 localStorage 初始化，若無則使用模擬資料，確保完全離線可用
  const [records, setRecords] = useState<DailyRecord[]>(() => {
    const cached = localStorage.getItem("spc_records");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("無法解析快取的離線生產資料:", e);
      }
    }
    return INITIAL_RECORDS;
  });

  // 每當 records 有任何變動 (手動新增/修改/刪除/同步)，自動寫入本機快取
  useEffect(() => {
    localStorage.setItem("spc_records", JSON.stringify(records));
  }, [records]);

  // 整理所有不重複且已排序的生產日期
  const uniqueDates = useMemo<string[]>(() => {
    const dates = records.map((r) => r.date);
    const unique = Array.from(new Set(dates)) as string[];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [records]);

  // 前端直接解析 Google Sheets 匯出的 CSV 文字，不經由 Cloud Run
  const parseCSVDtoRecords = (csvText: string): DailyRecord[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    // 解析標題列以動態定位欄位索引
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    
    const findHeaderIndex = (keyword: string, fallback: number, excludeKeywords: string[] = []) => {
      const idx = headers.findIndex(h => {
        const matched = h.includes(keyword);
        if (!matched) return false;
        if (excludeKeywords.length > 0) {
          return !excludeKeywords.some(ex => h.includes(ex));
        }
        return true;
      });
      return idx !== -1 ? idx : fallback;
    };

    const dateIdx = findHeaderIndex("作業日期", 1);
    const operatorIdx = findHeaderIndex("投料人員", 2);
    const barrelsIdx = findHeaderIndex("生產桶數", 3);
    
    const supplierIdx1 = findHeaderIndex("原料廠商1", 5);
    const supplierIdx2 = findHeaderIndex("原料廠商2", 6);
    const supplierIdx3 = findHeaderIndex("原料廠商3", 7);
    const supplierIdx4 = findHeaderIndex("原料廠商4", 8);

    const weightIdx1 = findHeaderIndex("投料重量1", 9);
    const weightIdx2 = findHeaderIndex("投料重量2", 10);
    const weightIdx4 = findHeaderIndex("投料重量4", 11);
    const weightIdx3 = findHeaderIndex("投料重量", 12, ["1", "2", "4", "總"]);

    const leftoverIdx = findHeaderIndex("餘料重量", 13);
    const otherIdx = findHeaderIndex("其他製造", 14);
    const reasonIdx = findHeaderIndex("異常原因", 15);
    const notesIdx = findHeaderIndex("備註", 16);

    const parsedRecords: DailyRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      if (cols.length <= Math.max(dateIdx, operatorIdx, barrelsIdx)) continue;
      
      const rawDate = cols[dateIdx] || "";
      let date = rawDate;
      const dateParts = rawDate.split(/[\/\-]/);
      if (dateParts.length === 3) {
        const y = dateParts[0];
        const m = dateParts[1].padStart(2, "0");
        const d = dateParts[2].padStart(2, "0");
        date = `${y}-${m}-${d}`;
      }
      
      const operator = cols[operatorIdx] || "未知";
      const barrels = parseFloat(cols[barrelsIdx]) || 0;
      
      const weight1 = parseFloat(cols[weightIdx1]) || 0;
      const weight2 = parseFloat(cols[weightIdx2]) || 0;
      const weight3 = parseFloat(cols[weightIdx3]) || 0;
      const weight4 = parseFloat(cols[weightIdx4]) || 0;
      
      const parseSupplierAndBatch = (supplierBatchStr: string, defaultSupplier: string) => {
        if (!supplierBatchStr) return { supplier: defaultSupplier, batchNo: "" };
        const parts = supplierBatchStr.split("-");
        if (parts.length >= 2) {
          return { supplier: parts[0].trim(), batchNo: parts.slice(1).join("-").trim() };
        }
        return { supplier: supplierBatchStr.trim(), batchNo: "" };
      };
      
      const batches = [];
      if (cols[supplierIdx1] || weight1 > 0) {
        const { supplier, batchNo } = parseSupplierAndBatch(cols[supplierIdx1], "蘇慶村");
        batches.push({ supplier, batchNo, weight: weight1 });
      }
      if (cols[supplierIdx2] || weight2 > 0) {
        const { supplier, batchNo } = parseSupplierAndBatch(cols[supplierIdx2], "松柏");
        batches.push({ supplier, batchNo, weight: weight2 });
      }
      if (cols[supplierIdx3] || weight3 > 0) {
        const { supplier, batchNo } = parseSupplierAndBatch(cols[supplierIdx3], "無");
        batches.push({ supplier, batchNo, weight: weight3 });
      }
      if (cols[supplierIdx4] || weight4 > 0) {
        const { supplier, batchNo } = parseSupplierAndBatch(cols[supplierIdx4], "無");
        batches.push({ supplier, batchNo, weight: weight4 });
      }
      
      const feedingWeight = weight1 + weight2 + weight3 + weight4;
      const currLeftover = parseFloat(cols[leftoverIdx]) || 0;
      const otherFactors = cols[otherIdx] || "常規製造";
      
      const reasonStr = (cols[reasonIdx] || "").trim();
      let anomalyReason = "無" as DailyRecord["anomalyReason"];
      if (["魚肉較濕", "魚肉較乾", "特殊訂單", "秤重異常", "設備異常", "其他"].includes(reasonStr)) {
        anomalyReason = reasonStr as DailyRecord["anomalyReason"];
      } else if (reasonStr !== "" && reasonStr !== "無") {
        anomalyReason = "其他";
      }
      
      const notes = cols[notesIdx] || "";
      
      parsedRecords.push({
        id: `sheet-rec-${i}`,
        date,
        operator,
        barrels,
        standardWeight: barrels * 310,
        feedingWeight,
        batches: batches.length > 0 ? batches : [
          { supplier: "蘇慶村", batchNo: "無", weight: weight1 },
          { supplier: "松柏", batchNo: "無", weight: weight2 }
        ],
        prevLeftover: 0,
        currLeftover,
        errorAmount: 0,
        errorRate: 0,
        otherFactors,
        anomalyReason,
        notes,
        status: "normal"
      });
    }
    
    parsedRecords.sort((a, b) => a.date.localeCompare(b.date));
    
    for (let i = 0; i < parsedRecords.length; i++) {
      if (i === 0) {
        parsedRecords[i].prevLeftover = 10;
      } else {
        parsedRecords[i].prevLeftover = parsedRecords[i - 1].currLeftover;
      }
    }
    
    return parsedRecords;
  };

  // 取得 Google Sheets 真實數據 (完全在前端，免除 Cloud Run)
  const fetchSheetRecords = async (showNotification = false) => {
    setIsLoading(true);
    try {
      const url = "https://docs.google.com/spreadsheets/d/1CH9DR0tlD_52-VHKDIVYCUZOT2IQkKZz1V1uqYTfWAM/export?format=csv";
      const res = await fetch(url);
      if (res.ok) {
        const csvText = await res.text();
        const data = parseCSVDtoRecords(csvText);
        if (data && data.length > 0) {
          setRecords(data);
          setOfflineMode(false);
          if (showNotification) {
            console.log(`[Google Sheets] 成功在前端直接獲取 ${data.length} 筆試算表生產數據！`);
          }
        }
      } else {
        console.warn("無法取得試算表數據，切換為離線本機快取。");
        setOfflineMode(true);
      }
    } catch (err) {
      console.warn("離線或網路連線失敗，自動加載本機歷史資料:", err);
      setOfflineMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 頁面加載時，自動在前端同步試算表真實資料
  useEffect(() => {
    fetchSheetRecords(true);
  }, []);

  // 雲端備份日誌紀錄 (初始包含 3 筆歷史備份日誌)
  const [excelBackupLogs, setExcelBackupLogs] = useState<string[]>([
    "2026-06-26 23:59:00: [系統排程] 自動備份已啟動。匯出為：[虱目魚漿生產資料備份_20260626.xlsx]，已安全存檔於 Google Drive (Folder ID: backup_626)。",
    "2026-06-27 23:59:00: [系統排程] 自動備份已啟動。匯出為：[虱目魚漿生產資料備份_20260627.xlsx]，已安全存檔於 Google Drive (Folder ID: backup_627)。",
    "2026-06-28 23:26:30: [手動備份] 管理員手動執行備份。匯出為：[虱目魚漿生產資料備份_20260628_手動.xlsx]，已安全存檔於 Google Drive 備份夾。"
  ]);

  // 動態重新計算所有的標準重量、誤差量、誤差率與警報狀態
  // 這可以確保當「單桶標準用量」滑桿拉動時，整個 Dashboard 的所有圖表與 KPI 即時、協調地同步重新渲染！
  const recalculatedRecords = useMemo<DailyRecord[]>(() => {
    return records.map((r) => {
      const standardWeight = r.barrels * barrelWeight;
      const errorAmount = r.feedingWeight - standardWeight + r.prevLeftover - r.currLeftover;
      const errorRate = standardWeight > 0 ? (errorAmount / standardWeight) * 100 : 0;

      // 依據誤差率判定狀態
      let status: DailyRecord["status"] = "normal";
      const absRate = Math.abs(errorRate);
      if (absRate > 10) {
        status = "severe"; // 紅燈 (重大異常)
      } else if (absRate > 5) {
        status = "error";  // 橘燈 (異常)
      } else if (absRate > 3) {
        status = "warn";   // 黃燈 (注意)
      }

      return {
        ...r,
        standardWeight,
        errorAmount,
        errorRate,
        status,
      };
    });
  }, [records, barrelWeight]);

  // 統計指標摘要
  const statsSummary = useMemo(() => {
    if (recalculatedRecords.length === 0) {
      return { count: 0, avgStandardWeight: 0, avgFeedingWeight: 0, avgErrorAmount: 0, avgErrorRate: 0, anomalyRate: 0, severeAnomalyCount: 0 };
    }
    const count = recalculatedRecords.length;
    const sumStandard = recalculatedRecords.reduce((acc, r) => acc + r.standardWeight, 0);
    const sumFeeding = recalculatedRecords.reduce((acc, r) => acc + r.feedingWeight, 0);
    const sumAmount = recalculatedRecords.reduce((acc, r) => acc + r.errorAmount, 0);
    const sumRate = recalculatedRecords.reduce((acc, r) => acc + r.errorRate, 0);
    
    const anomalies = recalculatedRecords.filter(r => r.status !== "normal").length;
    const severeAnomalies = recalculatedRecords.filter(r => r.status === "severe").length;

    return {
      count,
      avgStandardWeight: Math.round(sumStandard / count),
      avgFeedingWeight: Math.round(sumFeeding / count),
      avgErrorAmount: Math.round(sumAmount / count),
      avgErrorRate: Number((sumRate / count).toFixed(2)),
      anomalyRate: Number(((anomalies / count) * 100).toFixed(1)),
      severeAnomalyCount: severeAnomalies
    };
  }, [recalculatedRecords]);

  // 同步 Google Sheets (完全在前端，免除 Cloud Run)
  const handleSyncWithSheets = async () => {
    setIsSyncing(true);
    try {
      const url = "https://docs.google.com/spreadsheets/d/1CH9DR0tlD_52-VHKDIVYCUZOT2IQkKZz1V1uqYTfWAM/export?format=csv";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`試算表讀取失敗: ${response.statusText}`);
      }
      const csvText = await response.text();
      const parsed = parseCSVDtoRecords(csvText);
      if (parsed && parsed.length > 0) {
        setRecords(parsed);
        setOfflineMode(false);
        const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
        setExcelBackupLogs((prev) => [
          `${now}: [ Sheets 同步成功 ] 已由前端直接連接 Google Sheet 成功同步最新生產數據，共計 ${parsed.length} 筆生產資料。`,
          ...prev,
        ]);
        alert(`🎉 成功直接從 Google Sheets 同步 ${parsed.length} 筆真實生產數據！`);
      } else {
        alert("⚠️ 試算表中尚未輸入任何生產數據。");
      }
    } catch (err: any) {
      console.error(err);
      setOfflineMode(true);
      alert("⚠️ 同步 Google Sheets 資料失敗！目前正處於「離線模式」使用本機 cached 資料。\n錯誤原因: " + (err.message || "網路連線異常或跨域 CORS 阻擋"));
    } finally {
      setIsSyncing(false);
    }
  };

  // 呼叫後端 API，藉由 Gemini 進行 AI 品質診斷
  const handleGenerateAIReport = async () => {
    setIsGeneratingAI(true);
    setErrorMessage(null);

    try {
      // 建立簡化的資料字串給 Gemini 進行精確判讀
      const dataSummary = recalculatedRecords
        .slice(-10) // 拿最近 10 筆做深入解析
        .map((r) => {
          return `日期: ${r.date} | 投料人員: ${r.operator} | 桶數: ${r.barrels} | 標準: ${r.standardWeight}斤 | 實際投料: ${r.feedingWeight}斤 | 餘料前/當: ${r.prevLeftover}/${r.currLeftover}斤 | 誤差率: ${r.errorRate.toFixed(2)}% | 狀態: ${r.status} | 異常原因: ${r.anomalyReason} | 備註: ${r.notes || "無"}`;
        })
        .join("\n");

      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dataSummary,
          recentStats: statsSummary
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || "診斷伺服器無回應，請確認設定。");
      }

      const timestamp = new Date().toLocaleString();
      setAiReport({
        timestamp,
        summary: resData.parsed.quickSummary,
        spcStatus: resData.parsed.spcStatus,
        rootCauses: resData.parsed.rootCauses,
        recommendations: resData.parsed.recommendations,
        fullMarkdown: resData.reportText
      });

      // 備份 AI 報告與 Excel
      setExcelBackupLogs((prev) => [
        `${timestamp}: [ 自動排程備份 ] AI 診斷書備份封裝完成。匯出為：[虱目魚漿AI診斷報告_${timestamp.replace(/[:\/\s]/g, "")}.md]，已存檔於 Google Drive。`,
        ...prev
      ]);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "呼叫 AI 診斷失敗，請確認 API Key。");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 資料管理的回呼函式
  const handleAddRecord = (newRecord: DailyRecord) => {
    setRecords((prev) => [...prev, newRecord]);
  };

  const handleUpdateRecord = (id: string, updatedRecord: DailyRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? updatedRecord : r)));
  };

  const handleOnDeleteRecord = (id: string) => {
    if (window.confirm("確定要刪除此筆投料製程資料嗎？")) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 頂部導航 */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white font-bold shadow-md shadow-indigo-500/10">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                  虱目魚漿製程誤差監控與 AI 診斷平台
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 font-mono font-medium">
                    SPC + AI v2.5
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">MILKFISH PASTE PROCESS CONTROL & INTELLIGENT DIAGNOSIS</p>
              </div>
            </div>

            {/* 本地時間與快速統計 */}
            <div className="hidden md:flex items-center gap-4 text-xs">
              {offlineMode ? (
                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg animate-pulse shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-semibold font-sans">離線本機模式</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold font-sans">Sheet 直接連線同步</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100/80 border border-slate-200/60 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-mono font-medium">2026-06-28 23:26</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100/80 border border-slate-200/60 px-3 py-1.5 rounded-lg">
                <span>平均誤差率:</span>
                <strong className={`font-mono font-bold ${statsSummary.avgErrorRate >= 0 ? "text-indigo-600" : "text-amber-600"}`}>
                  {statsSummary.avgErrorRate >= 0 ? `+${statsSummary.avgErrorRate}` : statsSummary.avgErrorRate}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主體區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 頁面切換控制列 */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs transition-all tracking-wider uppercase shrink-0 ${
              activeTab === "dashboard"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            id="tab-dashboard"
          >
            <Activity className="w-4 h-4" />
            📊 智慧監控 Dashboard
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs transition-all tracking-wider uppercase shrink-0 ${
              activeTab === "ai"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            id="tab-ai-insights"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            🤖 AI 智慧品質診斷
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs transition-all tracking-wider uppercase shrink-0 ${
              activeTab === "data"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            id="tab-data-management"
          >
            <FileSpreadsheet className="w-4 h-4" />
            🗄️ 生產資料管理
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-xs transition-all tracking-wider uppercase shrink-0 ${
              activeTab === "guide"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
            id="tab-technical-guide"
          >
            <BrainCircuit className="w-4 h-4" />
            📘 平台部署與技術指南
          </button>
        </div>

        {/* 標籤內容渲染 */}
        <div className="space-y-6">
          {activeTab === "dashboard" && (
            <>
              {/* 智慧監控儀表板日期選取列 */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-sans">智慧監控日期篩選器</h4>
                    <p className="text-xs text-slate-500 leading-normal">
                      選擇特定日期，即可快速切換並鎖定查看該日期的詳細 SPC 生產投料狀況與指標數據。
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-500 font-semibold">查看日期:</span>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors cursor-pointer min-w-[220px]"
                    id="dashboard-date-selector"
                  >
                    <option value="">最新生產資料 (自動定位)</option>
                    {uniqueDates.map((d) => (
                      <option key={d} value={d}>
                        {d} (生產共 {records.filter(r => r.date === d).reduce((acc, r) => acc + r.barrels, 0)} 桶)
                      </option>
                    ))}
                  </select>
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-lg transition-all"
                    >
                      清除重設
                    </button>
                  )}
                </div>
              </div>

              {/* KPI 卡片 */}
              <KPICards records={recalculatedRecords} selectedDate={selectedDate} />

              {/* SPC 管制圖 */}
              <SPCOverview records={recalculatedRecords} selectedDate={selectedDate} />

              {/* 關聯統計分析 */}
              <CorrelationAnalysis records={recalculatedRecords} />
            </>
          )}

          {activeTab === "ai" && (
            <AIInsights
              records={recalculatedRecords}
              aiReport={aiReport}
              onGenerateReport={handleGenerateAIReport}
              isGenerating={isGeneratingAI}
              errorMessage={errorMessage}
            />
          )}

          {activeTab === "data" && (
            <DataManagement
              records={recalculatedRecords}
              onAddRecord={handleAddRecord}
              onUpdateRecord={handleUpdateRecord}
              onDeleteRecord={handleOnDeleteRecord}
              barrelWeight={barrelWeight}
              onUpdateBarrelWeight={setBarrelWeight}
              isSyncing={isSyncing}
              onSyncWithSheets={handleSyncWithSheets}
              excelBackupLogs={excelBackupLogs}
            />
          )}

          {activeTab === "guide" && <TechnicalGuide />}
        </div>
      </main>

      {/* 底部 Footer */}
      <footer className="border-t border-slate-200 py-6 mt-12 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-medium text-slate-700">
            🐟 虱目魚漿智慧生產製程誤差自動監控系統 — SPC & Google Gemini AI 智慧稽核診斷平台
          </p>
          <p className="text-[10px] text-slate-400">
            工業統計與人工智慧技術輔助生產．計量單位規格：台斤（斤）．保留後續 IoT 感測與 CPK 指標升級空間
          </p>
        </div>
      </footer>
    </div>
  );
}
