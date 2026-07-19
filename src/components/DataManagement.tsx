/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { DailyRecord, MaterialBatch } from "../types";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Sliders,
  AlertTriangle,
  ExternalLink,
  Download,
  CheckCircle,
  Database,
  CloudLightning
} from "lucide-react";

interface DataManagementProps {
  records: DailyRecord[];
  onAddRecord: (newRecord: DailyRecord) => void;
  onUpdateRecord: (id: string, updatedRecord: DailyRecord) => void;
  onDeleteRecord: (id: string) => void;
  barrelWeight: number;
  onUpdateBarrelWeight: (weight: number) => void;
  isSyncing: boolean;
  onSyncWithSheets: () => Promise<void>;
  excelBackupLogs: string[];
}

export default function DataManagement({
  records,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  barrelWeight,
  onUpdateBarrelWeight,
  isSyncing,
  onSyncWithSheets,
  excelBackupLogs
}: DataManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // 表單狀態
  const [date, setDate] = useState("");
  const [operator, setOperator] = useState("");
  const [barrels, setBarrels] = useState<number>(5);
  const [prevLeftover, setPrevLeftover] = useState<number>(10);
  const [currLeftover, setCurrLeftover] = useState<number>(10);
  const [anomalyReason, setAnomalyReason] = useState<DailyRecord["anomalyReason"]>("無");
  const [otherFactors, setOtherFactors] = useState("");
  const [notes, setNotes] = useState("");

  // 4組供應商批號及投料
  const [batches, setBatches] = useState<MaterialBatch[]>([
    { supplier: "台南永安漁產", batchNo: "F20260628-A", weight: 390 },
    { supplier: "彌陀漁會", batchNo: "M20260628-B", weight: 385 },
    { supplier: "學甲興達", batchNo: "S20260628-C", weight: 385 },
    { supplier: "梓官鮮撈", batchNo: "Z20260628-D", weight: 390 },
  ]);

  // 修改特定批次重量/批號
  const handleBatchChange = (index: number, field: keyof MaterialBatch, value: string | number) => {
    const updated = [...batches];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setBatches(updated);
  };

  // 開啟新增視窗
  const openAddModal = () => {
    setEditingRecordId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setOperator("");
    setBarrels(5);
    setPrevLeftover(records.length > 0 ? records[records.length - 1].currLeftover : 10); // 自動代入昨日餘料
    setCurrLeftover(10);
    setAnomalyReason("無");
    setOtherFactors("");
    setNotes("");
    setBatches([
      { supplier: "台南永安漁產", batchNo: `F${new Date().toISOString().split("T")[0].replace(/-/g, "")}-A`, weight: 390 },
      { supplier: "彌陀漁會", batchNo: `M${new Date().toISOString().split("T")[0].replace(/-/g, "")}-B`, weight: 385 },
      { supplier: "學甲興達", batchNo: `S${new Date().toISOString().split("T")[0].replace(/-/g, "")}-C`, weight: 385 },
      { supplier: "梓官鮮撈", batchNo: `Z${new Date().toISOString().split("T")[0].replace(/-/g, "")}-D`, weight: 390 },
    ]);
    setIsModalOpen(true);
  };

  // 開啟編輯視窗
  const openEditModal = (r: DailyRecord) => {
    setEditingRecordId(r.id);
    setDate(r.date);
    setOperator(r.operator);
    setBarrels(r.barrels);
    setPrevLeftover(r.prevLeftover);
    setCurrLeftover(r.currLeftover);
    setAnomalyReason(r.anomalyReason);
    setOtherFactors(r.otherFactors || "");
    setNotes(r.notes || "");
    setBatches(r.batches);
    setIsModalOpen(true);
  };

  // 表單存檔
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const sumFeedingWeight = batches.reduce((sum, b) => sum + Number(b.weight || 0), 0);
    const standard = barrels * barrelWeight;
    const errorAmount = sumFeedingWeight - standard + prevLeftover - currLeftover;
    const errorRate = standard > 0 ? (errorAmount / standard) * 100 : 0;

    // 依據誤差率判定狀態燈號
    let status: DailyRecord["status"] = "normal";
    const absRate = Math.abs(errorRate);
    if (absRate > 10) {
      status = "severe";
    } else if (absRate > 5) {
      status = "error";
    } else if (absRate > 3) {
      status = "warn";
    }

    const payload: DailyRecord = {
      id: editingRecordId || `rec-${Date.now()}`,
      date,
      operator,
      barrels,
      standardWeight: standard,
      feedingWeight: sumFeedingWeight,
      batches,
      prevLeftover,
      currLeftover,
      errorAmount,
      errorRate,
      anomalyReason,
      otherFactors: otherFactors || "常規製造",
      notes,
      status,
    };

    if (editingRecordId) {
      onUpdateRecord(editingRecordId, payload);
    } else {
      onAddRecord(payload);
    }

    setIsModalOpen(false);
  };

  // 驗證紀錄是否異常 (重覆日期、投料平均量不合理)
  const validateRecord = (r: DailyRecord) => {
    const issues = [];
    
    // 檢查重覆日期
    const dupCount = records.filter(item => item.date === r.date && item.id !== r.id).length;
    if (dupCount > 0) {
      issues.push("重複日期");
    }

    // 檢查單桶均重合理性 (大於 370 斤或小於 250 斤/桶，視為極端異常)
    if (r.barrels > 0) {
      const avgPerBarrel = r.feedingWeight / r.barrels;
      if (avgPerBarrel < 250 || avgPerBarrel > 370) {
        issues.push("投料重量異常");
      }
    } else {
      issues.push("桶數不可為 0");
    }

    return issues;
  };

  // 一鍵匯出 CSV 報表
  const exportToExcelCSV = () => {
    let csvContent = "\uFEFF"; // 加上 BOM 防亂碼
    csvContent += "日期,投料人員,生產桶數,單桶標準用量(斤),標準重量(斤),實際投料總重(斤),實際投料總重(公斤),多供應商原料批次投料明細,前日餘料(斤),當日餘料(斤),誤差量(斤),誤差率(%),異常狀態,異常原因,其他製造說明,備註\n";

    records.forEach((r) => {
      const statusText = r.status === "severe" ? "🔴 重大異常" : r.status === "error" ? "🟠 異常" : r.status === "warn" ? "🟡 注意" : "🟢 正常";
      
      const batchDetails = r.batches 
        ? r.batches.map(b => `${b.supplier}(批號:${b.batchNo}):${b.weight}斤(${(b.weight * 0.6).toFixed(2)}公斤)`).join(" | ") 
        : "";
      const escapedBatchDetails = `"${batchDetails.replace(/"/g, '""')}"`;

      const kgWeight = (r.feedingWeight * 0.6).toFixed(2);

      csvContent += `${r.date},${r.operator},${r.barrels},${barrelWeight},${r.standardWeight},${r.feedingWeight},${kgWeight},${escapedBatchDetails},${r.prevLeftover},${r.currLeftover},${r.errorAmount},${r.errorRate.toFixed(2)}%,${statusText},${r.anomalyReason},${r.otherFactors || ""},${r.notes || ""}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `虱目魚漿生產製程管制表_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="data-management-panel">
      {/* 數據源與整合 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <Database className="w-5 h-5" />
            <h4 className="text-sm font-bold text-slate-900 font-sans">雲端資料庫整合同步</h4>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            系統支援雙向綁定。您可在現場部署專屬 Google 表單收集各班別投料，數據自動流入 Google 試算表；此處點選「同步」即可即時更新分析、重新核算 SPC 管制上限與 AI 品質診斷。
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLScFCEYrWbPrwMUplJDKfhHrhnI8Mon8DR4I2tWGnuv9z_hluA/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              現場 Google Form 連結
            </a>
            <a
              href="https://docs.google.com/spreadsheets/d/1CH9DR0tlD_52-VHKDIVYCUZOT2IQkKZz1V1uqYTfWAM/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              雲端 Google Sheets 資料庫
            </a>
            <button
              onClick={onSyncWithSheets}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm"
              id="btn-sync-sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "讀取試算表中..." : "同步 Google Sheets 資料"}
            </button>
          </div>
        </div>

        {/* 核心計算公式與參數調整 */}
        <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-600" />
              單桶標準用量調校 (SOP 參數)
            </h5>
            <p className="text-[11px] text-slate-500 leading-normal">
              目前標準用量為 <strong className="text-slate-900 font-semibold">{barrelWeight} 斤／桶</strong>。若工廠因應配方調研需要更換桶裝容量，修改後系統將動態重新運算所有標準重量與製程誤差率！
            </p>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min="280"
              max="350"
              value={barrelWeight}
              onChange={(e) => onUpdateBarrelWeight(Number(e.target.value))}
              className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              id="barrel-weight-slider"
            />
            <span className="text-xs font-bold text-indigo-600 font-mono shrink-0">
              {barrelWeight} 斤/桶
            </span>
          </div>
        </div>
      </div>

      {/* 資料表與控制按鈕 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* 表格標頭 */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900 font-sans">製程日報生產流水帳</h4>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={openAddModal}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              id="btn-add-record"
            >
              <Plus className="w-3.5 h-3.5" />
              補登當日投料
            </button>
            <button
              onClick={exportToExcelCSV}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
              id="btn-export-excel"
            >
              <Download className="w-3.5 h-3.5" />
              導出生產 Excel
            </button>
          </div>
        </div>

        {/* 響應式表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-100 font-semibold">
                <th className="p-3">日期</th>
                <th className="p-3">投料人員</th>
                <th className="p-3">生產桶數</th>
                <th className="p-3">標準用量 (斤)</th>
                <th className="p-3">實際用料 (斤)</th>
                <th className="p-3">前日/當日餘料 (斤)</th>
                <th className="p-3">製程誤差率</th>
                <th className="p-3">警報燈號</th>
                <th className="p-3">其他製造</th>
                <th className="p-3">異常原因 / 備註</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {records.slice().reverse().map((r) => {
                const issues = validateRecord(r);
                const isDuplicated = issues.includes("重複日期");
                const isWeightUnreasonable = issues.includes("投料重量異常");

                let lampColor = "bg-emerald-500";
                let lampBg = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                let lampLabel = "正常";

                if (r.status === "severe") {
                  lampColor = "bg-red-500";
                  lampBg = "bg-red-50 text-red-700 border border-red-100";
                  lampLabel = "重大";
                } else if (r.status === "error") {
                  lampColor = "bg-orange-500";
                  lampBg = "bg-amber-50 text-amber-700 border border-amber-100";
                  lampLabel = "異常";
                } else if (r.status === "warn") {
                  lampColor = "bg-yellow-500";
                  lampBg = "bg-yellow-50 text-yellow-700 border border-yellow-100";
                  lampLabel = "注意";
                }

                return (
                  <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${
                    isDuplicated || isWeightUnreasonable ? "bg-red-50/20" : ""
                  }`}>
                    {/* 日期欄，重複則高亮 */}
                    <td className="p-3 font-mono font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {r.date}
                        {isDuplicated && (
                          <span className="px-1.5 py-0.2 bg-red-50 text-red-700 border border-red-100 text-[8px] rounded font-bold" title="相同日期有多筆批次，請檢查！">
                            日期重複
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-800 font-bold">{r.operator}</td>
                    <td className="p-3 font-mono">{r.barrels} 桶</td>
                    {/* 標準重量 */}
                    <td className="p-3 font-mono">{r.standardWeight} 斤</td>
                    {/* 實際投料，過濾出極端異常值 */}
                    <td className="p-3 font-mono text-slate-700">
                      <div className="flex flex-col">
                        <span className="font-semibold">{r.feedingWeight} 斤</span>
                        <span className="text-[10px] text-slate-400">({(r.feedingWeight * 0.6).toFixed(1)} 公斤)</span>
                        {isWeightUnreasonable && (
                          <span className="px-1.5 py-0.2 mt-0.5 w-fit bg-amber-50 text-amber-700 border border-amber-100 text-[8px] rounded font-bold" title="單桶平均投料量超出合理防呆區間 (250~370斤)">
                            均量疑誤
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      前: {r.prevLeftover}斤 / 當: {r.currLeftover}斤
                    </td>
                    {/* 誤差率 */}
                    <td className={`p-3 font-mono font-bold ${
                      r.status === "severe" || r.status === "error" ? "text-red-600" : r.status === "warn" ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {r.errorRate >= 0 ? `+${r.errorRate.toFixed(2)}` : r.errorRate.toFixed(2)}%
                    </td>
                    {/* SPC 燈號 */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lampBg} flex items-center gap-1 w-fit`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${lampColor}`}></span>
                        {lampLabel}
                      </span>
                    </td>
                    {/* 其他製造 */}
                    <td className="p-3 text-slate-800 font-semibold">
                      {r.otherFactors || "常規製造"}
                    </td>
                    {/* 異常因素與備註 */}
                    <td className="p-3 text-slate-400 max-w-[200px] truncate" title={r.notes}>
                      <span className="text-slate-700 font-bold">{r.anomalyReason}</span>
                      {r.notes && <span className="text-slate-400 ml-1.5 italic font-sans text-[11px]">({r.notes})</span>}
                    </td>
                    {/* 操作按鈕 */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-50 transition-all"
                          title="修改資料"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecord(r.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-all"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 自動備份日誌日誌 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2 text-orange-600">
            <CloudLightning className="w-5 h-5" />
            <h4 className="text-sm font-bold text-slate-900 font-sans">雲端 Drive 自動化異地存檔紀錄</h4>
          </div>
          <span className="px-2 py-0.5 text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded font-semibold">AUTO-BACKUP ON</span>
        </div>
        <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 scrollbar-thin text-[10px] font-mono text-slate-400">
          {excelBackupLogs.map((log, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                {log}
              </span>
              <span className="text-slate-400">自動打包成功 (.xlsx)</span>
            </div>
          ))}
        </div>
      </div>

      {/* 新增/編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-700">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-sans">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                {editingRecordId ? "修改投料製程紀錄" : "補登當日生產投料紀錄"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg font-mono focus:outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
              {/* 基本生產參數 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">生產日期</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 font-mono focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">投料人員</label>
                  <input
                    type="text"
                    required
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    placeholder="請輸入投料人員姓名"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">生產桶數 (單桶基準 {barrelWeight}斤)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={barrels}
                    onChange={(e) => setBarrels(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 font-mono focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 供應商投料明細 - 至少四組供應商投料資料 */}
              <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200/40 pb-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  多供應商原料批次投料明細（至少 4 組）
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {batches.map((batch, index) => (
                    <div key={index} className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-sm space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block">供應商 {index + 1}</span>
                      <div className="text-slate-900 font-bold truncate">{batch.supplier}</div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">批號</label>
                        <input
                          type="text"
                          value={batch.batchNo}
                          onChange={(e) => handleBatchChange(index, "batchNo", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 block">投料重量 (台斤)</label>
                        <input
                          type="number"
                          required
                          value={batch.weight}
                          onChange={(e) => handleBatchChange(index, "weight", Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 餘料重量、異常原因與說明 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">前日餘料重量 (斤)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prevLeftover}
                    onChange={(e) => setPrevLeftover(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 font-mono focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">當日餘料重量 (斤)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={currLeftover}
                    onChange={(e) => setCurrLeftover(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 font-mono focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">異常原因判定</label>
                  <select
                    value={anomalyReason}
                    onChange={(e) => setAnomalyReason(e.target.value as DailyRecord["anomalyReason"])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  >
                    <option value="無">無 (常規)</option>
                    <option value="魚肉較濕">魚肉較濕</option>
                    <option value="魚肉較乾">魚肉較乾</option>
                    <option value="特殊訂單">特殊訂單</option>
                    <option value="秤重異常">秤重異常</option>
                    <option value="設備異常">設備異常</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">其他製造細節</label>
                  <input
                    type="text"
                    value={otherFactors}
                    onChange={(e) => setOtherFactors(e.target.value)}
                    placeholder="例如:常規製造"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 備註 */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">現場備註說明</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="請填入現場異常狀況、地磅校驗結果或特別備註..."
                  className="w-full h-16 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-950 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  {editingRecordId ? "儲存修改" : "新增日報"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
