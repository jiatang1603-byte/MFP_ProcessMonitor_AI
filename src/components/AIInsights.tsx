/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DailyRecord, AIAnalysisReport } from "../types";
import { Sparkles, Brain, RefreshCw, CheckCircle, HelpCircle, FileText, Download, ShieldAlert } from "lucide-react";

interface AIInsightsProps {
  records: DailyRecord[];
  aiReport: AIAnalysisReport | null;
  onGenerateReport: () => Promise<void>;
  isGenerating: boolean;
  errorMessage: string | null;
}

export default function AIInsights({
  records,
  aiReport,
  onGenerateReport,
  isGenerating,
  errorMessage,
}: AIInsightsProps) {
  const [loadingStep, setLoadingStep] = useState<number>(0);

  const loadingMessages = [
    "正在連線 Google Gemini 智慧分析引擎...",
    "正在讀取生產資料庫與 SPC 指標統計資料...",
    "正在進行 SPC 西電規則比對與異常點偵測...",
    "正在分析投料人員穩定度與各供應商批號品質...",
    "正在依據食品加工標準指引生成專業改善對策...",
    "報告正在進行最後排版與格式封裝..."
  ];

  // 循環播放加載提示
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // 一個極簡、高效、美觀的 Markdown 渲染器，將 Gemini 回傳的 markdown 格式化成優雅之 HTML
  const renderMarkdown = (md: string) => {
    if (!md) return null;
    
    const lines = md.split("\n");
    return lines.map((line, idx) => {
      // 處理 H1
      if (line.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-xl font-bold text-slate-900 mt-6 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
            {line.replace("# ", "")}
          </h2>
        );
      }
      // 處理 H2
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-lg font-bold text-slate-800 mt-5 mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
            {line.replace("## ", "")}
          </h3>
        );
      }
      // 處理 H3
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-slate-700 mt-4 mb-2">
            {line.replace("### ", "")}
          </h4>
        );
      }
      // 處理無序列表
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const content = line.trim().substring(2);
        // 渲染粗體
        const formatted = formatBold(content);
        return (
          <li key={idx} className="list-disc list-inside text-xs text-slate-600 pl-4 mb-1.5 leading-relaxed">
            {formatted}
          </li>
        );
      }
      // 處理有序列表
      const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        const formatted = formatBold(numMatch[2]);
        return (
          <div key={idx} className="text-xs text-slate-600 pl-2 mb-2 leading-relaxed flex items-start gap-2">
            <span className="text-indigo-600 font-bold font-mono shrink-0">{numMatch[1]}.</span>
            <span>{formatted}</span>
          </div>
        );
      }
      // 處理空行
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }
      // 處理一般段落
      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed mb-2.5">
          {formatBold(line)}
        </p>
      );
    });
  };

  // 處理 **粗體** 字串轉換為 JSX
  const formatBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-slate-900 font-bold">{part}</strong>;
      }
      return part;
    });
  };

  // 匯出 AI 診斷書
  const downloadReport = () => {
    if (!aiReport) return;
    const element = document.createElement("a");
    const file = new Blob([aiReport.fullMarkdown], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `虱目魚漿製程AI診斷報告_${aiReport.timestamp.replace(/[:\/\s]/g, "")}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn" id="ai-insights-panel">
      {/* 左側: AI 核心摘要面板 */}
      <div className="xl:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600 shadow-sm">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-indigo-600 font-bold">GEMINI COGNITIVE ENGINE</span>
              <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">AI 智慧品質診斷報告</h3>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            結合製程統計管制 (SPC) 數據、各班別投料人員穩定度與各供應商歷史品質表現，Gemini AI 會自動進行根因歸因並產生具體的製程改善指南。
          </p>

          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                智慧診斷快照
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {aiReport ? aiReport.summary : "尚未執行智慧診斷。點擊下方按鈕以啟動 AI 模型分析。"}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                管制波動追蹤
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {aiReport ? aiReport.spcStatus : "分析中將比對西電規則及極端變異事件。"}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-xs font-bold text-purple-600 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
                主要異常對策
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line">
                {aiReport ? aiReport.recommendations : "改善方案將涵蓋水分抽檢、地磅校正及餘料扣減。"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onGenerateReport}
              disabled={isGenerating}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md ${
                isGenerating
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
              id="btn-generate-ai-report"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  AI 診斷中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {aiReport ? "重新產生 AI 診斷" : "啟動 AI 智慧品質診斷"}
                </>
              )}
            </button>

            {aiReport && (
              <button
                onClick={downloadReport}
                className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 transition-all shadow-sm"
                title="下載診斷書"
                id="btn-download-ai-report"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
            <HelpCircle className="w-3 h-3" />
            <span>診斷依據最近 30 天的統計資料</span>
          </div>
        </div>
      </div>

      {/* 右側: 完整的 Markdown 智慧診斷報告書 */}
      <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900 font-sans">製程 SPC 異常分析與改善智慧診斷書</h4>
            </div>
            {aiReport && (
              <span className="text-[10px] font-mono text-slate-400">
                產出時間: {aiReport.timestamp}
              </span>
            )}
          </div>

          {/* 渲染區塊 */}
          <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin space-y-4" id="ai-report-body">
            {isGenerating ? (
              // 載入炫酷動畫
              <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-ping"></div>
                  <Brain className="w-16 h-16 text-indigo-600 relative animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-slate-800">Gemini 智慧診斷分析中</h5>
                  <p className="text-xs text-indigo-600 font-mono transition-all duration-300">{loadingMessages[loadingStep]}</p>
                </div>
                <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full animate-progress" style={{ width: "60%" }}></div>
                </div>
                <span className="text-[10px] text-slate-400">系統正在分析 SPC 失控點、西電規則、各人員穩定度、批號關聯性...</span>
              </div>
            ) : aiReport ? (
              // 渲染 Markdown
              <div className="prose max-w-none">
                {renderMarkdown(aiReport.fullMarkdown)}
              </div>
            ) : (
              // 提示引導畫面
              <div className="h-[350px] flex flex-col items-center justify-center text-center space-y-3">
                <Brain className="w-14 h-14 text-slate-300" />
                <h5 className="text-sm font-bold text-slate-800">尚未產生製程智慧診斷書</h5>
                <p className="text-xs text-slate-500 max-w-sm">
                  請點擊左側「啟動 AI 智慧品質診斷」按鈕，Gemini 引擎將即時抓取當前 SPC 數據，自動撰寫多維度的製程控制診斷，為您提供專業的改善 SOP。
                </p>
              </div>
            )}
          </div>
        </div>

        {aiReport && !isGenerating && (
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>製程分析與異常歸因演算完成。已將今日備份、SPC 管制線數據與此診斷報告完整封裝以利 Google Drive 自動化備份。</span>
          </div>
        )}
      </div>
    </div>
  );
}
