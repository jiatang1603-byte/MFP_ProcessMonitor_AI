/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import html2canvas from "html2canvas";
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
  Scatter
} from "recharts";
import { BarChart2, ShieldCheck, ToggleLeft, ToggleRight, HelpCircle, Download, Image } from "lucide-react";

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
  const [activeChartTab, setActiveChartTab] = useState<"rate" | "amount">("rate");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // 匯出 PNG 圖片 (保留完整介面與文字)
  const handleExportImage = async () => {
    setIsExporting(true);

    // 備份並清潔當前頁面所有的 <style> 標籤與禁用外置 <link> 樣式表，防止 html2canvas 解析時崩潰
    const styleElements = Array.from(document.querySelectorAll("style"));
    const originalStyleContents = styleElements.map((el) => el.textContent || "");

    const linkElements = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
    const originalLinkRels = linkElements.map((el) => el.rel);

    try {
      const element = document.getElementById("spc-charts-container");
      if (!element) return;

      // 保留完整介面與文字：不隱藏控制項與按鈕，保留完整的外觀細節
      // A. 在 html2canvas 開始解析前，將 live document 的所有 style 內容完全替換成安全的 rgb 格式
      styleElements.forEach((el) => {
        if (el.textContent) {
          el.textContent = cleanCSS(el.textContent);
        }
      });

      // B. 暫時禁用 link 外部樣式表，避免其內含的 oklab 等新色彩格式被 html2canvas 解析時拋出錯誤
      linkElements.forEach((el) => {
        el.rel = "disabled-stylesheet";
      });

      // 擷取為 Canvas
      const canvas = await html2canvas(element, {
        scale: 2, // 提高解析度
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
      const link = document.createElement("a");
      link.download = `SPC-品質管制圖-${activeChartTab === "rate" ? "誤差率" : "誤差量"}-${new Date().toISOString().split("T")[0]}.png`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error("Image export error:", error);
      alert("匯出圖片時發生錯誤，請稍後重試。");
    } finally {
      // 絕對要回復原始 live document 標籤內容與狀態，避免影響原頁面呈現
      styleElements.forEach((el, idx) => {
        el.textContent = originalStyleContents[idx];
      });
      linkElements.forEach((el, idx) => {
        el.rel = originalLinkRels[idx];
      });
      setIsExporting(false);
    }
  };

  // 計算動態 3-Sigma SPC 管制界限
  const spcLimits = useMemo<SPCLimits>(() => {
    if (records.length === 0) {
      return { meanRate: 0, uclRate: 3, lclRate: -3, meanAmount: 0, uclAmount: 50, lclAmount: -50 };
    }

    // 1. 誤差率統計
    const rates = records.map((r) => r.errorRate);
    const meanRate = rates.reduce((sum, val) => sum + val, 0) / rates.length;
    
    const varianceRate = rates.reduce((sum, val) => sum + Math.pow(val - meanRate, 2), 0) / Math.max(1, rates.length - 1);
    const stdDevRate = Math.sqrt(varianceRate);
    const uclRate = meanRate + 3 * stdDevRate;
    const lclRate = meanRate - 3 * stdDevRate;

    // 2. 誤差量統計
    const amounts = records.map((r) => r.errorAmount);
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
  }, [records]);

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
    return records.map((r) => {
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
  }, [records, activeLimits, useDynamicLimits, spcLimits]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 mb-5">
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
              className="flex items-center gap-2 text-xs font-bold text-slate-700 focus:outline-none"
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

          {/* 匯出管制圖圖片按鈕 */}
          <button
            onClick={handleExportImage}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 shadow-sm transition-all cursor-pointer`}
            id="btn-export-image"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "匯出中..." : "匯出管制圖圖片"}
          </button>
        </div>
      </div>

      {/* 管制圖切換 Tabs */}
      <div className="flex border border-slate-200/80 mb-6 bg-slate-100/80 p-1 rounded-lg">
        <button
          onClick={() => setActiveChartTab("rate")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
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
          className={`flex-1 py-2 text-center text-xs font-bold rounded-md transition-all ${
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
      <div className="h-[320px] w-full" id="spc-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
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
              domain={activeChartTab === "rate" ? ["dataMin - 1.5", "dataMax + 1.5"] : ["dataMin - 20", "dataMax + 20"]}
              tickFormatter={(val) => (activeChartTab === "rate" ? `${val}%` : `${val}斤`)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#475569" }} />

            {/* 選定日期的垂直參考定位線 */}
            {selectedDate && (
              <ReferenceLine
                x={selectedDate}
                stroke="#6366f1"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                label={{ value: "選定日期", fill: "#4f46e5", position: "insideTopLeft", fontSize: 10, fontWeight: "bold" }}
              />
            )}

            {/* 參考中心線 CL */}
            {activeChartTab === "rate" ? (
              <ReferenceLine y={activeLimits.meanRate} stroke="#059669" strokeWidth={1} label={{ value: `CL: ${activeLimits.meanRate.toFixed(2)}%`, fill: "#059669", position: "insideBottomRight", fontSize: 9 }} />
            ) : (
              <ReferenceLine y={activeLimits.meanAmount} stroke="#7c3aed" strokeWidth={1} label={{ value: `CL: ${activeLimits.meanAmount.toFixed(1)}斤`, fill: "#7c3aed", position: "insideBottomRight", fontSize: 9 }} />
            )}

            {/* 管制界限上限 UCL */}
            {activeChartTab === "rate" ? (
              <ReferenceLine y={activeLimits.uclRate} stroke="#dc2626" strokeWidth={1} strokeDasharray="5 5" label={{ value: `UCL: ${activeLimits.uclRate.toFixed(2)}%`, fill: "#dc2626", position: "insideTopRight", fontSize: 9 }} />
            ) : (
              <ReferenceLine y={activeLimits.uclAmount} stroke="#dc2626" strokeWidth={1} strokeDasharray="5 5" label={{ value: `UCL: ${activeLimits.uclAmount.toFixed(1)}斤`, fill: "#dc2626", position: "insideTopRight", fontSize: 9 }} />
            )}

            {/* 管制界限下限 LCL */}
            {activeChartTab === "rate" ? (
              <ReferenceLine y={activeLimits.lclRate} stroke="#dc2626" strokeWidth={1} strokeDasharray="5 5" label={{ value: `LCL: ${activeLimits.lclRate.toFixed(2)}%`, fill: "#dc2626", position: "insideBottomRight", fontSize: 9 }} />
            ) : (
              <ReferenceLine y={activeLimits.lclAmount} stroke="#dc2626" strokeWidth={1} strokeDasharray="5 5" label={{ value: `LCL: ${activeLimits.lclAmount.toFixed(1)}斤`, fill: "#dc2626", position: "insideBottomRight", fontSize: 9 }} />
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

      {/* 底部說明 */}
      <div className="mt-5 p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            {useDynamicLimits ? (
              <>
                當前採用 <strong className="text-slate-800">動態 3-Sigma SPC 計算</strong>。誤差率 UCL = <strong>{spcLimits.uclRate.toFixed(2)}%</strong> / LCL = <strong>{spcLimits.lclRate.toFixed(2)}%</strong>。
              </>
            ) : (
              <>
                當前採用 <strong className="text-slate-800">固定規格臨界線</strong>。正常波動範圍設定於 <strong>±5% 誤差率 / ±50斤誤差量</strong>。
              </>
            )}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono hidden md:inline">WESTERN ELECTRIC RULES ENABLED</span>
      </div>
    </div>
  );
}
