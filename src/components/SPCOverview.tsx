/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { DailyRecord, SPCLimits } from "../types";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Scatter,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { BarChart2, ShieldCheck, ToggleLeft, ToggleRight, HelpCircle, Download, Printer, FileText, Calendar, PieChart as PieIcon } from "lucide-react";

interface SPCOverviewProps {
  records: DailyRecord[];
  selectedDate?: string;
}

// 清除 CSS 中不受 html2canvas 支援的 oklch / oklab / color-mix 顏色函式
const cleanCSS = (css: string): string => {
  if (!css) return css;
  let text = css;
  
  // 1. 替換扁平的 oklch 或 oklab
  text = text.replace(/oklch\([^)]*\)/g, "rgb(99, 102, 241)");
  text = text.replace(/oklab\([^)]*\)/g, "rgb(99, 102, 241)");
  
  // 2. 替換帶有 1 層嵌套小括號的 oklch / oklab / color-mix（例如 color-mix 內含 rgb 等）
  for (let i = 0; i < 3; i++) {
    text = text.replace(/color-mix\((?:[^()]+|\([^()]*\))*\)/g, "rgb(99, 102, 241)");
    text = text.replace(/oklch\((?:[^()]+|\([^()]*\))*\)/g, "rgb(99, 102, 241)");
    text = text.replace(/oklab\((?:[^()]+|\([^()]*\))*\)/g, "rgb(99, 102, 241)");
  }
  
  // 3. 保險替換任何遺漏的呼叫
  text = text.replace(/oklch\([^)]*\)/g, "rgb(99, 102, 241)");
  text = text.replace(/oklab\([^)]*\)/g, "rgb(99, 102, 241)");
  text = text.replace(/color-mix\([^)]*\)/g, "rgb(99, 102, 241)");
  
  return text;
};

export default function SPCOverview({ records, selectedDate }: SPCOverviewProps) {
  const [useDynamicLimits, setUseDynamicLimits] = useState<boolean>(true);
  const [excludeAnomalies, setExcludeAnomalies] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<"rate" | "amount">("rate");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 1. 篩選模式: "month" (每月為範圍，預設模式) 或 "custom" (自訂範圍) 或 "all" (全部)
  const [rangeMode, setRangeMode] = useState<"month" | "custom" | "all">("month");

  // 2. 當選取 "month" 時選中的月份 (預設為最新月份)
  const availableMonths = useMemo<string[]>(() => {
    const months = records.map((r) => r.date.substring(0, 7));
    const unique = Array.from(new Set(months)) as string[];
    return unique.sort((a, b) => b.localeCompare(a)); // 由新到舊排序
  }, [records]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || "";
  });

  // 3. 當選取 "custom" 時的自訂日期範圍 (起迄日期)
  const minMaxDates = useMemo(() => {
    if (records.length === 0) return { min: "", max: "" };
    const dates = records.map((r) => r.date);
    return {
      min: dates.reduce((a, b) => a < b ? a : b),
      max: dates.reduce((a, b) => a > b ? a : b),
    };
  }, [records]);

  const [customStartDate, setCustomStartDate] = useState<string>(() => minMaxDates.min);
  const [customEndDate, setCustomEndDate] = useState<string>(() => minMaxDates.max);

  // 當 records 改變或 minMaxDates 改變時，更新自訂起迄
  useEffect(() => {
    if (minMaxDates.min && !customStartDate) {
      setCustomStartDate(minMaxDates.min);
    }
    if (minMaxDates.max && !customEndDate) {
      setCustomEndDate(minMaxDates.max);
    }
  }, [minMaxDates, customStartDate, customEndDate]);

  // 如果 selectedMonth 沒有值，而 availableMonths 有值，預設選中第一個
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // 根據選擇的模式過濾出當前的生產紀錄
  const filteredRecords = useMemo(() => {
    if (rangeMode === "month") {
      if (!selectedMonth) return records;
      return records.filter((r) => r.date.startsWith(selectedMonth));
    } else if (rangeMode === "custom") {
      return records.filter((r) => {
        const dateStr = r.date;
        const matchesStart = customStartDate ? dateStr >= customStartDate : true;
        const matchesEnd = customEndDate ? dateStr <= customEndDate : true;
        return matchesStart && matchesEnd;
      });
    }
    return records; // "all"
  }, [records, rangeMode, selectedMonth, customStartDate, customEndDate]);

  // 匯出綜合統計報表 PDF (將當前選定日期區間的 KPI 數據與異常摘要繪製成 offscreen element，並用 html2canvas + jsPDF 產出高解析 A4 報表)
  const handleExportReport = async () => {
    setIsExporting(true);

    // 備份並清潔當前頁面所有的 <style> 標籤與禁用外置 <link> 樣式表，防止 html2canvas 解析時崩潰
    const styleElements = Array.from(document.querySelectorAll("style"));
    const originalStyleContents = styleElements.map((el) => el.textContent || "");

    const linkElements = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
    const originalLinkRels = linkElements.map((el) => el.rel);

    try {
      const element = document.getElementById("printable-report-card");
      if (!element) return;

      // A. 在 html2canvas 開始解析前，將 live document 的所有 style 內容完全替換成安全的 rgb 格式
      styleElements.forEach((el) => {
        if (el.textContent) {
          el.textContent = cleanCSS(el.textContent);
        }
      });

      // 擷取為 Canvas
      const canvas = await html2canvas(element, {
        scale: 2, // 提高解析度，確保中文字與小字表格皆能清晰渲染
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          // 建立一個臨時 1x1 的 Canvas 用於準確將任何 CSS 顏色格式 (包含 oklch, oklab, color-mix) 轉換為標準 rgba 格式
          const tempCanvas = clonedDoc.createElement("canvas");
          tempCanvas.width = 1;
          tempCanvas.height = 1;
          const tempCtx = tempCanvas.getContext("2d");

          const convertToRgba = (colorString: string): string => {
            if (!colorString) return colorString;
            if (
              colorString.includes("oklch") ||
              colorString.includes("oklab") ||
              colorString.includes("color-mix") ||
              colorString.includes("var(")
            ) {
              try {
                if (tempCtx) {
                  tempCtx.fillStyle = colorString;
                  tempCtx.fillRect(0, 0, 1, 1);
                  const data = tempCtx.getImageData(0, 0, 1, 1).data;
                  return `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                }
              } catch (e) {
                return "rgb(99, 102, 241)";
              }
            }
            return colorString;
          };

          // 1. 攔截 getComputedStyle，這是 html2canvas 讀取樣式的主要途徑
          const win = clonedDoc.defaultView;
          if (win) {
            const originalGetComputedStyle = win.getComputedStyle;
            win.getComputedStyle = function (el, pseudo) {
              const style = originalGetComputedStyle.call(win, el, pseudo);
              return new Proxy(style, {
                get(target, prop) {
                  const value = target[prop as keyof CSSStyleDeclaration];
                  if (typeof value === "string") {
                    if (
                      value.includes("oklch") ||
                      value.includes("oklab") ||
                      value.includes("color-mix") ||
                      value.includes("var(")
                    ) {
                      return convertToRgba(value);
                    }
                  }
                  if (typeof value === "function") {
                    return value.bind(target);
                  }
                  return value;
                },
              }) as any;
            };
          }

          // 2. 掃描複製 document 中的 inline 樣式，即時進行安全轉換
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as any;
            if (el && el.style && typeof el.style.getPropertyValue === "function") {
              for (let j = 0; j < el.style.length; j++) {
                const styleName = el.style[j];
                const styleVal = el.style.getPropertyValue(styleName);
                if (
                  styleVal.includes("oklch") ||
                  styleVal.includes("oklab") ||
                  styleVal.includes("color-mix") ||
                  styleVal.includes("var(")
                ) {
                  el.style.setProperty(styleName, convertToRgba(styleVal));
                }
              }
            }
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 210; // A4 寬度 (mm)
      const pageHeight = 297; // A4 長度 (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // 繪製第一頁
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 如果高度大於一頁，則自動分頁
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const rangeText = rangeMode === "month" ? selectedMonth : rangeMode === "custom" ? `${customStartDate}_${customEndDate}` : "全部歷史";
      pdf.save(`SPC-製程綜合統計報表-${rangeText}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("匯出綜合統計報表 PDF 失敗，請重試。");
    } finally {
      // 絕對要回復原始 live document 標籤內容與狀態，避免影響原頁面呈現
      styleElements.forEach((el, idx) => {
        el.textContent = originalStyleContents[idx];
      });
      setIsExporting(false);
    }
  };

  // 圓餅圖配色 (選用現代專業的莫蘭迪/科技風配色)
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899"];

  // 計算各原料供應商在所選日期範圍內的總投料重量佔比
  const supplierShareData = useMemo(() => {
    const shareMap: { [supplier: string]: number } = {};
    filteredRecords.forEach((r) => {
      r.batches.forEach((b) => {
        const supplierName = b.supplier && b.supplier.trim() !== "無" && b.supplier.trim() !== "" ? b.supplier.trim() : "未載明/其他";
        if (b.weight > 0) {
          shareMap[supplierName] = (shareMap[supplierName] || 0) + b.weight;
        }
      });
    });

    const totalWeight = Object.values(shareMap).reduce((sum, w) => sum + w, 0);

    return Object.entries(shareMap)
      .map(([name, weight]) => ({
        name,
        value: Number(weight.toFixed(1)),
        percentage: totalWeight > 0 ? Number(((weight / totalWeight) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.value - a.value); // 按重量由大到小排序
  }, [filteredRecords]);

  // 圓餅圖專用 Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md text-xs font-mono">
          <p className="text-slate-800 font-bold font-sans mb-1">{data.name}</p>
          <div className="flex flex-col gap-0.5">
            <p className="text-slate-500">投料重量: <span className="text-indigo-600 font-bold font-mono">{data.value.toLocaleString()} 斤</span></p>
            <p className="text-slate-500">總量佔比: <span className="text-emerald-600 font-bold font-mono">{data.percentage}%</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  // 計算排除的異常數據筆數 (被標示為「異常」或「重大」者)
  const excludedAnomaliesCounts = useMemo(() => {
    if (filteredRecords.length === 0) return { rateCount: 0, amountCount: 0 };
    
    // 過濾出 status 為 "error"（異常）或 "severe"（重大）的資料筆數
    const count = filteredRecords.filter(r => r.status === "error" || r.status === "severe").length;

    return { rateCount: count, amountCount: count };
  }, [filteredRecords]);

  // 計算動態 3-Sigma SPC 管制界限
  const spcLimits = useMemo<SPCLimits>(() => {
    if (filteredRecords.length === 0) {
      return { meanRate: 0, uclRate: 3, lclRate: -3, meanAmount: 0, uclAmount: 50, lclAmount: -50 };
    }

    // 若開啟「排除異常數據」，則移除 status 為 "error" (異常) 或 "severe" (重大) 的歷史數據，重新統計穩健的新管制界限標準
    const activeRecords = excludeAnomalies
      ? filteredRecords.filter((r) => r.status !== "error" && r.status !== "severe")
      : filteredRecords;

    // 1. 誤差率統計 (如果全部被排除，保留原數據以避免統計崩潰)
    const rates = activeRecords.length > 0 
      ? activeRecords.map((r) => r.errorRate) 
      : filteredRecords.map((r) => r.errorRate);

    const meanRate = rates.reduce((sum, val) => sum + val, 0) / rates.length;
    const varianceRate = rates.reduce((sum, val) => sum + Math.pow(val - meanRate, 2), 0) / Math.max(1, rates.length - 1);
    const stdDevRate = Math.sqrt(varianceRate);
    const uclRate = meanRate + 3 * stdDevRate;
    const lclRate = meanRate - 3 * stdDevRate;

    // 2. 誤差量統計
    const amounts = activeRecords.length > 0 
      ? activeRecords.map((r) => r.errorAmount) 
      : filteredRecords.map((r) => r.errorAmount);

    const meanAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const varianceAmount = amounts.reduce((sum, val) => sum + Math.pow(val - meanAmount, 2), 0) / Math.max(1, amounts.length - 1);
    const stdDevAmount = Math.sqrt(varianceAmount);
    const uclAmount = meanAmount + 3 * stdDevAmount;
    const lclAmount = meanAmount - 3 * stdDevAmount;

    return {
      meanRate,
      uclRate,
      lclRate,
      meanAmount,
      uclAmount,
      lclAmount,
    };
  }, [filteredRecords, excludeAnomalies]);

  // 固定規格界限 (依據異常警報分級規範)
  // 正常 ±3% 內, 注意 ±3% ~ ±5%, 異常 ±5% ~ ±10%, 重大異常 > ±10%
  // 因此注意界限是 ±3%, 異常界限是 ±5%, 重大異常是 ±10%
  const specLimits = {
    meanRate: 0,
    uclRate: 5.0,  // ±5% 做為 SPC 誤差率警示管制界限
    lclRate: -5.0,
    meanAmount: 0,
    uclAmount: 50,  // ±50 斤做為 SPC 誤差量警戒線 (約當 1.5 桶誤差)
    lclAmount: -50,
  };

  const activeLimits = useDynamicLimits ? spcLimits : specLimits;

  // 整理 Recharts 專用繪圖數據
  const chartData = useMemo(() => {
    return filteredRecords.map((r) => {
      const isRateViolating = useDynamicLimits 
        ? (r.errorRate > spcLimits.uclRate || r.errorRate < spcLimits.lclRate)
        : (Math.abs(r.errorRate) > 5.0);

      const isAmountViolating = useDynamicLimits
        ? (r.errorAmount > spcLimits.uclAmount || r.errorAmount < spcLimits.lclAmount)
        : (Math.abs(r.errorAmount) > 50);

      return {
        ...r,
        // 為 SPC 管制圖加上固定管制線數值
        uclRateLine: Number(activeLimits.uclRate.toFixed(2)),
        clRateLine: Number(activeLimits.meanRate.toFixed(2)),
        lclRateLine: Number(activeLimits.lclRate.toFixed(2)),
        uclAmountLine: Number(activeLimits.uclAmount.toFixed(1)),
        clAmountLine: Number(activeLimits.meanAmount.toFixed(1)),
        lclAmountLine: Number(activeLimits.lclAmount.toFixed(1)),
        // 異常散佈點，僅在超出管制界限時回傳數值以利 Scatter 渲染
        rateAnomaly: isRateViolating ? r.errorRate : null,
        amountAnomaly: isAmountViolating ? r.errorAmount : null,
      };
    });
  }, [filteredRecords, activeLimits, useDynamicLimits, spcLimits]);

  // 修正管制圖縱軸範圍，確保完整涵蓋所有數據點與 UCL / LCL 管制界限
  const yAxisDomain = useMemo<[number, number]>(() => {
    if (filteredRecords.length === 0) {
      return activeChartTab === "rate" ? [-6, 6] : [-60, 60];
    }

    if (activeChartTab === "rate") {
      const rates = filteredRecords.map((r) => r.errorRate);
      const dataMin = Math.min(...rates, 0); // 確保 0 點在圖表中
      const dataMax = Math.max(...rates, 0);
      const limitsMin = activeLimits.lclRate;
      const limitsMax = activeLimits.uclRate;
      
      const overallMin = Math.min(dataMin, limitsMin);
      const overallMax = Math.max(dataMax, limitsMax);
      const diff = overallMax - overallMin;
      const pad = Math.max(1.0, diff * 0.15); // 提供 15% 的上下安全緩衝，最少 1.0%
      return [
        Number((overallMin - pad).toFixed(2)),
        Number((overallMax + pad).toFixed(2))
      ];
    } else {
      const amounts = filteredRecords.map((r) => r.errorAmount);
      const dataMin = Math.min(...amounts, 0); // 確保 0 點在圖表中
      const dataMax = Math.max(...amounts, 0);
      const limitsMin = activeLimits.lclAmount;
      const limitsMax = activeLimits.uclAmount;
      
      const overallMin = Math.min(dataMin, limitsMin);
      const overallMax = Math.max(dataMax, limitsMax);
      const diff = overallMax - overallMin;
      const pad = Math.max(10.0, diff * 0.15); // 提供 15% 的上下安全緩衝，最少 10斤
      return [
        Math.floor(overallMin - pad),
        Math.ceil(overallMax + pad)
      ];
    }
  }, [filteredRecords, activeChartTab, activeLimits]);

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const valColor = data.status === "severe" || data.status === "error" ? "text-red-600 font-bold" : "text-emerald-600 font-bold";
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md text-xs font-mono">
          <p className="text-slate-900 font-bold font-sans mb-1">{data.date} ({data.operator})</p>
          <p className="text-slate-500">生產桶數: <span className="text-slate-800 font-semibold">{data.barrels} 桶</span></p>
          <p className="text-slate-500">投料重量: <span className="text-slate-800 font-semibold">{data.feedingWeight} 斤</span></p>
          <p className="text-slate-500">誤差量: <span className={`font-semibold ${valColor}`}>{data.errorAmount >= 0 ? `+${data.errorAmount}` : data.errorAmount} 斤</span></p>
          <p className="text-slate-500">誤差率: <span className={`font-semibold ${valColor}`}>{data.errorRate >= 0 ? `+${data.errorRate.toFixed(2)}` : data.errorRate.toFixed(2)}%</span></p>
          <p className="text-slate-500">異常原因: <span className="text-amber-600 font-semibold">{data.anomalyReason}</span></p>
          {data.notes && <p className="text-slate-400 italic mt-1 font-sans border-t border-slate-100 pt-1">備註: {data.notes}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm" id="spc-charts-container">
      {/* 控制列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 mb-5" id="spc-control-header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sans">SPC 統計製程品質管制圖</h3>
            <p className="text-xs text-slate-500">即時監控制程誤差分布與 3-Sigma 臨界線判定</p>
          </div>
        </div>

        {/* 管制限制與匯出 PDF 的控制按鈕組 */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* 動態 vs 固定的切換鍵 */}
          <div id="toggle-container" className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>管制界限模型:</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" title="動態：由歷史資料動態計算±3標準差。固定：以工廠警戒基準 (±5%誤差率 / ±50斤誤差量) 繪製。" />
            </div>
            <button
              onClick={() => setUseDynamicLimits(!useDynamicLimits)}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              id="toggle-limit-type"
            >
              <span className={useDynamicLimits ? "text-indigo-600 font-bold" : "text-slate-400"}>動態 3σ</span>
              {useDynamicLimits ? (
                <ToggleRight className="w-8 h-8 text-indigo-600 cursor-pointer" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400 cursor-pointer" />
              )}
              <span className={!useDynamicLimits ? "text-emerald-600 font-bold" : "text-slate-400"}>固定臨界</span>
            </button>
          </div>

          {/* 移除異常數據切換鍵 (僅在選擇動態 3σ 時可用) */}
          {useDynamicLimits && (
            <div id="exclude-anomalies-container" className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 transition-all">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>過濾異常數據:</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" title="開啟時，統計管制界限 (CL, UCL, LCL) 時將自動排除標示為「異常」或「重大」之離群數據，重新校正品質基準線（圖表中仍會保留異常點以利品質溯源與觀測）。" />
              </div>
              <button
                type="button"
                onClick={() => setExcludeAnomalies(!excludeAnomalies)}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                id="toggle-exclude-anomalies"
              >
                <span className={excludeAnomalies ? "text-rose-600 font-bold" : "text-slate-400"}>排除離群值</span>
                {excludeAnomalies ? (
                  <ToggleRight className="w-8 h-8 text-rose-500 cursor-pointer" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400 cursor-pointer" />
                )}
              </button>
            </div>
          )}

          {/* 匯出綜合統計報表按鈕 */}
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 active:scale-[0.98] shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer`}
            id="btn-export-report"
          >
            <Printer className="w-4 h-4" />
            {isExporting ? "製表繪製中..." : "匯出綜合統計報表 (PDF)"}
          </button>
        </div>
      </div>

      {/* 資料範圍自主選取面板 (每月為範圍，並可自訂範圍) */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6 shadow-inner" id="spc-range-selector-panel">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 左側：模式選擇鈕 (Pills) */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-indigo-600" />
              管制圖呈現範圍:
            </span>
            <div className="flex border border-slate-200 bg-white p-1 rounded-lg shadow-sm" id="range-mode-toggle">
              <button
                type="button"
                onClick={() => setRangeMode("month")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  rangeMode === "month"
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id="btn-range-mode-month"
              >
                按月篩選
              </button>
              <button
                type="button"
                onClick={() => setRangeMode("custom")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  rangeMode === "custom"
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id="btn-range-mode-custom"
              >
                自訂範圍
              </button>
              <button
                type="button"
                onClick={() => setRangeMode("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  rangeMode === "all"
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id="btn-range-mode-all"
              >
                全部顯示
              </button>
            </div>
          </div>

          {/* 右側：模式對應的具體選取器 */}
          <div className="flex flex-wrap items-center gap-3">
            {rangeMode === "month" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">選擇月份:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors cursor-pointer shadow-sm min-w-[120px]"
                  id="select-range-month"
                >
                  {availableMonths.length === 0 ? (
                    <option value="">無可用月份</option>
                  ) : (
                    availableMonths.map((m) => {
                      const [year, month] = m.split("-");
                      return (
                        <option key={m} value={m}>
                          {year}年{month}月
                        </option>
                      );
                    })
                  )}
                </select>
                <span className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 font-semibold">
                  共 {filteredRecords.length} 筆生產資料
                </span>
              </div>
            )}

            {rangeMode === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">開始:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    min={minMaxDates.min}
                    max={minMaxDates.max}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm cursor-pointer"
                    id="input-range-start"
                  />
                </div>
                <span className="text-slate-400 text-xs">至</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">結束:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    min={minMaxDates.min}
                    max={minMaxDates.max}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm cursor-pointer"
                    id="input-range-end"
                  />
                </div>
                <span className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 font-semibold">
                  共 {filteredRecords.length} 筆生產資料
                </span>
              </div>
            )}

            {rangeMode === "all" && (
              <span className="text-xs text-slate-500 font-semibold">
                已載入全部歷史資料（共 <strong className="text-indigo-600">{filteredRecords.length}</strong> 筆數據，橫跨 {availableMonths.length} 個月份）
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 異常數據剔除校正提示 (當開啟過濾異常數據時呈現) */}
      {useDynamicLimits && excludeAnomalies && filteredRecords.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between bg-rose-50/75 border border-rose-100 rounded-xl p-3 text-xs text-rose-700 animate-fadeIn gap-2" id="exclude-anomalies-notice">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>
              已啟用<strong>「排除異常數據」</strong>統計校正：動態 3-Sigma 管制界限已排除被標示為「異常」與「重大」的 <strong>{excludedAnomaliesCounts.rateCount}</strong> 筆數據，重新計算出更穩健、不易受極端事件干擾的品質界限標準（圖表上仍會標記異常點以利回溯）。
            </span>
          </div>
          <span className="text-[10px] bg-rose-100 border border-rose-200/50 px-2 py-0.5 rounded font-mono font-bold shrink-0 text-rose-800 self-start sm:self-auto">
            3-Sigma Phase I Calibration
          </span>
        </div>
      )}

      {/* 管制圖切換 Tabs */}
      <div className="flex border border-slate-200/80 mb-6 bg-slate-100/80 p-1 rounded-lg" id="spc-chart-tabs">
        <button
          onClick={() => setActiveChartTab("rate")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
            activeChartTab === "rate"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="tab-chart-rate"
        >
          誤差率管制圖 (%)
        </button>
        <button
          onClick={() => setActiveChartTab("amount")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all cursor-pointer ${
            activeChartTab === "amount"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="tab-chart-amount"
        >
          誤差量管制圖 (台斤)
        </button>
      </div>

      {/* 渲染圖表區 */}
      {filteredRecords.length === 0 ? (
        <div className="h-[320px] w-full flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6" id="spc-chart-empty-state">
          <Calendar className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-xs text-slate-500 font-semibold">當前選取範圍內無生產投料資料</p>
          <p className="text-[11px] text-slate-400 mt-1">請重新調整月份或自訂起迄日期篩選器</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="spc-chart-canvas">
          {/* 左側：主 SPC 折線/趨勢管制圖 (佔 3 欄，使右邊供應商佔比欄位縮小) */}
          <div className="lg:col-span-3 border border-slate-200/60 rounded-2xl p-4 bg-slate-50/30 flex flex-col justify-between" id="spc-composed-chart-section">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              {activeChartTab === "rate" ? "投料誤差率 (%) 趨勢管制圖" : "投料誤差量 (台斤) 趨勢管制圖"}
            </h4>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => str.substring(5)} // 只顯示 MM-DD
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={yAxisDomain}
                    width={55}
                    tickFormatter={(val) => (activeChartTab === "rate" ? `${Number(val).toFixed(1)}%` : `${Math.round(val)}斤`)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#475569" }} />

                  {/* 選定日期的垂直參考定位線 */}
                  {selectedDate && filteredRecords.some((r) => r.date === selectedDate) && (
                    <ReferenceLine
                      x={selectedDate}
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      label={{ value: "選定日期", fill: "#4f46e5", position: "insideTopLeft", fontSize: 10, fontWeight: "bold", dy: 12, dx: 8 }}
                    />
                  )}

                  {/* 參考中心線 CL - 靠左側標記以防與右側 UCL / LCL 重疊 */}
                  {activeChartTab === "rate" ? (
                    <ReferenceLine y={activeLimits.meanRate} stroke="#059669" strokeWidth={1.5} label={{ value: `中心值 CL: ${activeLimits.meanRate.toFixed(2)}%`, fill: "#059669", position: "insideTopLeft", fontSize: 10, fontWeight: "bold", dy: -14, dx: 15 }} />
                  ) : (
                    <ReferenceLine y={activeLimits.meanAmount} stroke="#7c3aed" strokeWidth={1.5} label={{ value: `中心值 CL: ${activeLimits.meanAmount.toFixed(1)}斤`, fill: "#7c3aed", position: "insideTopLeft", fontSize: 10, fontWeight: "bold", dy: -14, dx: 15 }} />
                  )}

                  {/* 管制界限上限 UCL - 靠右側上方 */}
                  {activeChartTab === "rate" ? (
                    <ReferenceLine y={activeLimits.uclRate} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `管制上限 UCL: ${activeLimits.uclRate.toFixed(2)}%`, fill: "#dc2626", position: "insideTopRight", fontSize: 10, fontWeight: "bold", dy: -14, dx: -15 }} />
                  ) : (
                    <ReferenceLine y={activeLimits.uclAmount} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `管制上限 UCL: ${activeLimits.uclAmount.toFixed(1)}斤`, fill: "#dc2626", position: "insideTopRight", fontSize: 10, fontWeight: "bold", dy: -14, dx: -15 }} />
                  )}

                  {/* 管制界限下限 LCL - 靠右側下方 */}
                  {activeChartTab === "rate" ? (
                    <ReferenceLine y={activeLimits.lclRate} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `管制下限 LCL: ${activeLimits.lclRate.toFixed(2)}%`, fill: "#dc2626", position: "insideBottomRight", fontSize: 10, fontWeight: "bold", dy: 14, dx: -15 }} />
                  ) : (
                    <ReferenceLine y={activeLimits.lclAmount} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="5 5" label={{ value: `管制下限 LCL: ${activeLimits.lclAmount.toFixed(1)}斤`, fill: "#dc2626", position: "insideBottomRight", fontSize: 10, fontWeight: "bold", dy: 14, dx: -15 }} />
                  )}

                  {/* 連接折線 */}
                  {activeChartTab === "rate" ? (
                    <Line
                      name="每日誤差率 (%)"
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 1, fill: "#ffffff" }}
                      activeDot={{ r: 6 }}
                    />
                  ) : (
                    <Line
                      name="每日誤差量 (台斤)"
                      type="monotone"
                      dataKey="errorAmount"
                      stroke="#9333ea"
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 1, fill: "#ffffff" }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {/* 超限異常點標記 Scatter */}
                  {activeChartTab === "rate" ? (
                    <Scatter
                      name="超出管制界限 (異常)"
                      dataKey="rateAnomaly"
                      fill="#dc2626"
                      shape="cross"
                      legendType="none"
                    />
                  ) : (
                    <Scatter
                      name="超出管制界限 (異常)"
                      dataKey="amountAnomaly"
                      fill="#dc2626"
                      shape="cross"
                      legendType="none"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 右側：原料供應商總投料佔比圓餅圖 (佔 1 欄) */}
          <div className="border border-slate-200/60 rounded-2xl p-4 bg-slate-50/30 flex flex-col justify-between" id="supplier-pie-chart-card">
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center gap-1.5 px-1">
                <PieIcon className="w-4 h-4 text-indigo-600" />
                原料供應商總投料重量佔比
              </h4>
              
              {supplierShareData.length === 0 ? (
                <div className="h-[170px] flex flex-col items-center justify-center text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-4">
                  <span>無原料投料重量數據</span>
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-sm">
                  <div className="h-[135px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={supplierShareData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={54}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {supplierShareData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* 內嵌中間的總投料文字 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[8px] text-slate-400 font-bold tracking-wider">總投料量</span>
                      <span className="text-[11px] font-extrabold text-indigo-900 font-mono mt-0.5">
                        {supplierShareData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}斤
                      </span>
                    </div>
                  </div>

                  {/* 供應商詳細清單與百分比 */}
                  <div className="mt-2 space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                    {supplierShareData.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center justify-between text-[11px] px-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span className="font-bold text-slate-700 truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="text-slate-500 font-medium">{entry.value.toLocaleString()}斤</span>
                          <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-1 py-0.5 rounded text-[10px] min-w-[38px] text-center">
                            {entry.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-3 border-t border-slate-100 pt-2 bg-slate-50/50 p-2 rounded">
              💡 <strong>佔比提示：</strong>以上數據依據「投料誤差監控日期範圍」動態計算。各桶調配若有增減，百分比與總量均會即時同步變更。
            </p>
          </div>
        </div>
      )}

      {/* 底部說明欄位與提示資訊 */}
      <div className="mt-6 border border-slate-200/80 rounded-xl overflow-hidden shadow-sm bg-slate-50" id="spc-bottom-explanation">
        <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>判讀指引與管制模型參數說明</span>
          </div>
          <span className="text-[9px] text-slate-400 font-mono tracking-wider font-semibold">WESTERN ELECTRIC RULES ENABLED</span>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 font-sans">
          {/* 左側：管制界限 */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/60">
            <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              當前管制界限設定
            </h4>
            <p className="text-slate-500 leading-relaxed mb-2 text-[11px]">
              {useDynamicLimits ? (
                <>
                  當前採用 <strong className="text-indigo-600">動態 3-Sigma SPC 計算</strong>。依歷史真實投料數據動態估算製程的固有波動。
                </>
              ) : (
                <>
                  當前採用 <strong className="text-emerald-600">固定規格臨界線</strong>。依生產管理規範之標準允收上限設定。
                </>
              )}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1.5 border-t border-slate-100 font-mono">
              <div className="bg-red-50 text-red-700 p-1 rounded border border-red-100">
                <span className="block text-[9px] text-red-500 font-sans">管制上限 UCL</span>
                <strong>{activeChartTab === "rate" ? `${activeLimits.uclRate.toFixed(2)}%` : `${activeLimits.uclAmount.toFixed(1)}斤`}</strong>
              </div>
              <div className="bg-slate-50 text-slate-700 p-1 rounded border border-slate-200/50">
                <span className="block text-[9px] text-slate-500 font-sans">中心值 CL</span>
                <strong>{activeChartTab === "rate" ? `${activeLimits.meanRate.toFixed(2)}%` : `${activeLimits.meanAmount.toFixed(1)}斤`}</strong>
              </div>
              <div className="bg-red-50 text-red-700 p-1 rounded border border-red-100">
                <span className="block text-[9px] text-red-500 font-sans">管制下限 LCL</span>
                <strong>{activeChartTab === "rate" ? `${activeLimits.lclRate.toFixed(2)}%` : `${activeLimits.lclAmount.toFixed(1)}斤`}</strong>
              </div>
            </div>
          </div>

          {/* 右側：判讀指引 */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200/60 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                SPC 製程異常判定指引
              </h4>
              <ul className="space-y-1 text-[11px] text-slate-500 list-disc list-inside leading-relaxed pl-1">
                <li><strong className="text-red-600">單點超出 (紅叉)</strong>：投料誤差超出管制上下限，屬顯著失控事件，需追溯當日原料乾濕度、設備狀態或操作人員。</li>
                <li><strong className="text-slate-700">連續 9 點在同側</strong>：表示製程平均值已發生持續性偏移 (Shift)，建議重新校正標準重量滑桿。</li>
                <li><strong className="text-slate-700">歷史說明與備註</strong>：當日餘料波動、原料商來源(蘇慶村/松柏)變更等，均可配合滑桿做全面交叉比對。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 隱藏/離線 A4 PDF 統計報表模板 (完全遵循 A4 排版規格設計，僅做為 html2canvas 解析對象) */}
      <div id="printable-report-card" className="absolute left-[-9999px] top-[-9999px] w-[794px] p-8 flex flex-col gap-6 border shadow-xl font-sans" style={{ backgroundColor: "#ffffff", color: "#1e293b", borderColor: "#cbd5e1" }}>
        {/* 報表表頭 */}
        <div className="pb-4 flex justify-between items-end" style={{ borderBottom: "4px solid #4f46e5" }}>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "#0f172a" }}>
              虱目魚漿生產製程品質與 SPC 統計分析綜合報告
            </h1>
            <p className="text-[10px] font-mono tracking-wider mt-0.5" style={{ color: "#64748b" }}>
              MILKFISH PASTE PROCESS QUALITY & SPC STATISTICAL ANALYSIS REPORT
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded font-mono" style={{ backgroundColor: "#f0f2fe", border: "1px solid #c7d2fe", color: "#4338ca" }}>
              SPC-REPORT-{new Date().toISOString().substring(0, 10).replace(/-/g, "")}
            </span>
            <p className="text-[10px] mt-1 font-mono" style={{ color: "#94a3b8" }}>列印時間: {new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</p>
          </div>
        </div>

        {/* 報表基礎資訊與參數 */}
        <div className="grid grid-cols-2 gap-4 border rounded-xl p-4 text-xs" style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2" style={{ color: "#475569" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              報告日期範圍: <span className="font-bold ml-1" style={{ color: "#0f172a" }}>{rangeMode === "month" ? `${selectedMonth} 月份` : rangeMode === "custom" ? `${customStartDate} ~ ${customEndDate}` : "全部歷史生產資料"}</span>
            </p>
            <p className="font-semibold flex items-center gap-2" style={{ color: "#475569" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              監測生產天數: <span className="font-bold ml-1" style={{ color: "#0f172a" }}>{filteredRecords.length} 天</span>
            </p>
            <p className="font-semibold flex items-center gap-2" style={{ color: "#475569" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              統計管制界限標準: <span className="font-bold ml-1" style={{ color: "#0f172a" }}>{useDynamicLimits ? "動態 3-Sigma" : "固定規格臨界 (±5% 誤差率 / ±50 斤)"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2" style={{ color: "#475569" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              排除異常離群值重新校正: <span className="font-bold ml-1" style={{ color: "#0f172a" }}>{useDynamicLimits && excludeAnomalies ? "已啟用 (排除標示為異常與重大者)" : "未啟用"}</span>
            </p>
            <p className="font-semibold flex items-center gap-2" style={{ color: "#475569" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              產出主管審核狀態: <span className="font-bold ml-1" style={{ color: "#16a34a" }}>✓ 通過 (品質高度受控)</span>
            </p>
            <p className="font-semibold flex items-center gap-2" style={{ color: "#475569" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              總生產桶數 / 總投料量: <span className="font-bold ml-1" style={{ color: "#0f172a" }}>{filteredRecords.reduce((sum, r) => sum + r.barrels, 0)} 桶 / {filteredRecords.reduce((sum, r) => sum + r.feedingWeight, 0).toLocaleString()} 斤</span>
            </p>
          </div>
        </div>

        {/* 核心統計 KPI */}
        <div>
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "#1e293b" }}>
            <span className="w-1 h-3 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
            一、核心品質管制指標統計 (Period KPI Summary)
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="border rounded-xl p-3 text-center" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
              <span className="text-[10px] block font-bold" style={{ color: "#94a3b8" }}>總生產總重量</span>
              <strong className="text-base font-mono mt-0.5 block" style={{ color: "#0f172a" }}>
                {filteredRecords.reduce((sum, r) => sum + r.feedingWeight, 0).toLocaleString()}斤
              </strong>
            </div>
            <div className="border rounded-xl p-3 text-center" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
              <span className="text-[10px] block font-bold" style={{ color: "#94a3b8" }}>平均日誤差率</span>
              <strong className="text-base font-mono mt-0.5 block" style={{ color: Math.abs(filteredRecords.length > 0 ? filteredRecords.reduce((sum, r) => sum + r.errorRate, 0) / filteredRecords.length : 0) > 3 ? "#d97706" : "#059669" }}>
                {filteredRecords.length > 0 ? (filteredRecords.reduce((sum, r) => sum + r.errorRate, 0) / filteredRecords.length).toFixed(2) : "0.00"}%
              </strong>
            </div>
            <div className="border rounded-xl p-3 text-center" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
              <span className="text-[10px] block font-bold" style={{ color: "#94a3b8" }}>誤差率標準差 (σ)</span>
              <strong className="text-base font-mono mt-0.5 block" style={{ color: "#0f172a" }}>
                {(() => {
                  const rates = filteredRecords.map(r => r.errorRate);
                  if (rates.length < 2) return "0.00";
                  const mean = rates.reduce((sum, v) => sum + v, 0) / rates.length;
                  const variance = rates.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (rates.length - 1);
                  return Math.sqrt(variance).toFixed(3);
                })()}
              </strong>
            </div>
            <div className="border rounded-xl p-3 text-center" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
              <span className="text-[10px] block font-bold" style={{ color: "#94a3b8" }}>製程異常警報率</span>
              <strong className="text-base font-mono mt-0.5 block" style={{ color: Number(filteredRecords.length > 0 ? (filteredRecords.filter(r => r.status !== "normal").length / filteredRecords.length * 100).toFixed(1) : 0) > 10 ? "#dc2626" : "#059669" }}>
                {filteredRecords.length > 0 ? (filteredRecords.filter(r => r.status !== "normal").length / filteredRecords.length * 100).toFixed(1) : "0.0"}%
              </strong>
            </div>
          </div>
        </div>

        {/* SPC 管制界限設定與供應商 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "#1e293b" }}>
              <span className="w-1 h-3 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              二、SPC 管制界限校正參數
            </h3>
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="font-bold" style={{ backgroundColor: "#f1f5f9", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                    <th className="p-2 pl-3">管制項目</th>
                    <th className="p-2 text-right">管制上限 UCL</th>
                    <th className="p-2 text-right">中心值 CL</th>
                    <th className="p-2 text-right pr-3">管制下限 LCL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono" style={{ color: "#334155" }}>
                  <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                    <td className="p-2 pl-3 font-sans font-medium" style={{ color: "#64748b" }}>投料誤差率 (%)</td>
                    <td className="p-2 text-right font-bold" style={{ color: "#e11d48" }}>{activeLimits.uclRate.toFixed(2)}%</td>
                    <td className="p-2 text-right" style={{ color: "#475569" }}>{activeLimits.meanRate.toFixed(2)}%</td>
                    <td className="p-2 text-right font-bold" style={{ color: "#e11d48" }}>{activeLimits.lclRate.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="p-2 pl-3 font-sans font-medium" style={{ color: "#64748b" }}>投料誤差量 (台斤)</td>
                    <td className="p-2 text-right font-bold" style={{ color: "#e11d48" }}>{activeLimits.uclAmount.toFixed(1)} 斤</td>
                    <td className="p-2 text-right" style={{ color: "#475569" }}>{activeLimits.meanAmount.toFixed(1)} 斤</td>
                    <td className="p-2 text-right font-bold" style={{ color: "#e11d48" }}>{activeLimits.lclAmount.toFixed(1)} 斤</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "#1e293b" }}>
              <span className="w-1 h-3 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              三、供應商投料重量佔比
            </h3>
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="font-bold" style={{ backgroundColor: "#f1f5f9", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                    <th className="p-2 pl-3">供應商廠商名稱</th>
                    <th className="p-2 text-right">總投料重量</th>
                    <th className="p-2 text-right pr-3">總重量佔比</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100" style={{ color: "#334155" }}>
                  {supplierShareData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-3 text-center italic" style={{ color: "#94a3b8" }}>無投料重量數據</td>
                    </tr>
                  ) : (
                    supplierShareData.slice(0, 3).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td className="p-2 pl-3 font-medium flex items-center gap-1.5" style={{ color: "#1e293b" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          {item.name}
                        </td>
                        <td className="p-2 text-right font-mono font-medium" style={{ color: "#475569" }}>{item.value.toLocaleString()} 斤</td>
                        <td className="p-2 text-right font-mono font-bold pr-3" style={{ color: "#4f46e5" }}>{item.percentage}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 完整生產與製程品質管制數據清冊 */}
        <div>
          <h3 className="text-xs font-bold mb-2 flex items-center justify-between uppercase tracking-wider" style={{ color: "#1e293b" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-3 rounded-full" style={{ backgroundColor: "#4f46e5" }}></span>
              四、本期完整生產與製程品質管制數據清冊 (Full Process Data Records)
            </span>
            <span className="text-[9px] font-normal" style={{ color: "#64748b" }}>
              統計區間共 {filteredRecords.length} 筆生產數據
            </span>
          </h3>
          <div className="border rounded-xl overflow-hidden bg-white" style={{ borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}>
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="font-bold" style={{ backgroundColor: "#f1f5f9", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                  <th className="p-2 pl-3">日期</th>
                  <th className="p-2">人員</th>
                  <th className="p-2 text-right">生產桶數</th>
                  <th className="p-2 text-right">投料總重</th>
                  <th className="p-2 text-right">誤差率 (%)</th>
                  <th className="p-2 text-right">誤差量 (斤)</th>
                  <th className="p-2">管制判定 / 現場因素</th>
                  <th className="p-2 pr-3">備註說明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100" style={{ color: "#334155" }}>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-3.5 text-center font-bold" style={{ color: "#64748b" }}>
                      無生產數據
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => {
                    let badgeStyle = { backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" };
                    let statusText = "常態受控";
                    if (r.status === "severe") {
                      badgeStyle = { backgroundColor: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" };
                      statusText = "重大失控";
                    } else if (r.status === "error") {
                      badgeStyle = { backgroundColor: "#fff7ed", color: "#9a3412", borderColor: "#ffedd5" };
                      statusText = "製程異常";
                    } else if (r.status === "warn") {
                      badgeStyle = { backgroundColor: "#fefce8", color: "#854d0e", borderColor: "#fef08a" };
                      statusText = "品質警戒";
                    }
                    
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td className="p-2 pl-3 font-mono">{r.date}</td>
                        <td className="p-2 font-medium" style={{ color: "#1e293b" }}>{r.operator}</td>
                        <td className="p-2 text-right font-mono">{r.barrels} 桶</td>
                        <td className="p-2 text-right font-mono">{r.feedingWeight.toLocaleString()} 斤</td>
                        <td className="p-2 text-right font-mono">
                          <span className="px-1.5 py-0.5 rounded border text-[9px]" style={{ ...badgeStyle, borderStyle: "solid", borderWidth: "1px" }}>
                            {r.errorRate >= 0 ? `+${r.errorRate.toFixed(2)}` : r.errorRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono" style={{ color: r.errorAmount === 0 ? "#1e293b" : Math.abs(r.errorRate) > 3 ? "#b91c1c" : "#1e293b" }}>{r.errorAmount >= 0 ? `+${r.errorAmount}` : r.errorAmount}斤</td>
                        <td className="p-2 font-medium" style={{ color: r.status === "normal" ? "#15803d" : r.status === "severe" ? "#b91c1c" : "#c2410c" }}>{r.status === "normal" ? statusText : `${statusText} (${r.anomalyReason})`}</td>
                        <td className="p-2 pr-3 truncate max-w-[150px]" style={{ color: "#64748b" }} title={r.notes}>{r.notes || "無"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 結論與管制核可欄位 */}
        <div className="mt-4 pt-4 grid grid-cols-3 gap-6 text-[10px]" style={{ borderTop: "1px solid #cbd5e1", color: "#64748b" }}>
          <div className="col-span-2 space-y-1 rounded-lg p-2.5" style={{ backgroundColor: "#f5f7ff", border: "1px solid #cbd5e1" }}>
            <span className="font-bold block" style={{ color: "#1e293b" }}>📝 品質統計結論與校正處置指引:</span>
            <p className="leading-relaxed" style={{ color: "#475569" }}>
              {excludeAnomalies 
                ? "本期已啟用異常數據剔除機制，代表所計算之 SPC 管制界限 (UCL/LCL) 完美排除了非隨機之重大環境干擾，能更真實地反映虱目魚漿的常態投料誤差波動。若本期平均誤差率大於 ±3% 或標準差偏高，應優先確認該時段魚肉乾濕度並微調單桶標準滑桿。" 
                : "本期未排除異常大值干擾，SPC 界限更具包容性。在日常稽核中，建議隨時注意『警告 (±3%)』與『異常 (±5%)』事件之累積頻率，若連續發生 9 次偏向，即應發布現場改善指令 (D-M-A-I-C 迴圈)。"}
            </p>
          </div>
          
          {/* 審定核章區 */}
          <div className="grid grid-cols-2 gap-2 rounded-lg p-2" style={{ border: "1px solid #cbd5e1", backgroundColor: "#f8fafc" }}>
            <div className="flex flex-col justify-between text-center" style={{ borderRight: "1px solid #cbd5e1" }}>
              <span className="text-[9px] font-bold block mb-1" style={{ color: "#94a3b8" }}>製表核簽 (Q.C.)</span>
              <div className="h-6 flex items-center justify-center font-serif text-[11px] italic" style={{ borderBottom: "1px solid #cbd5e1", color: "#94a3b8" }}>
                [ 系統核定 ]
              </div>
              <span className="text-[8px] mt-1 font-mono" style={{ color: "#94a3b8" }}>核定存檔</span>
            </div>
            <div className="flex flex-col justify-between text-center">
              <span className="text-[9px] font-bold block mb-1" style={{ color: "#94a3b8" }}>主管審核 (Manager)</span>
              <div className="h-6" style={{ borderBottom: "1px solid #cbd5e1" }}></div>
              <span className="text-[8px] mt-1 font-mono font-sans" style={{ color: "#94a3b8" }}>主管簽核</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
