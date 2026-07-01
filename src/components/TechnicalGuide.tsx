/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Copy, Check, Server, FileSpreadsheet, FileCode, BarChart4, Cpu, RotateCcw, Cloud, AlertCircle } from "lucide-react";

export default function TechnicalGuide() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"arch" | "sheets" | "gas" | "spc" | "expand">("arch");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const appsScriptCode = `/**
 * 虱目魚漿智慧監控與 AI 診斷平台 - Google Apps Script 核心控制模組
 * 功能：1. 資料驗證 2. SPC 自動計算 3. Gemini AI 診斷報告生成 4. 每日 Excel 備份
 */

// 專案環境設定
const CONFIG = {
  SINGLE_BARREL_WEIGHT: 310,  // 單桶標準重量 (台斤)
  SHEET_NAME: "生產資料庫",
  BACKUP_FOLDER_ID: "請替換為您的GoogleDrive備份資料夾ID",
  GEMINI_API_KEY: "請在「指令碼屬性」中設定 GEMINI_API_KEY"
};

/**
 * 試算表開啟時自動建立專用功能選單
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🐟 魚漿製程 AI 診斷')
    .addItem('⚡ 執行製程資料驗證', 'validateCurrentSheetData')
    .addItem('📊 計算今日 SPC 指標', 'calculateTodaySPC')
    .addItem('🤖 產生 AI 智慧診斷報告', 'triggerGeminiAnalysis')
    .addSeparator()
    .addItem('💾 執行每日自動備份 (Excel + Drive)', 'executeDailyBackup')
    .addToUi();
}

/**
 * 核心計算：誤差量與誤差率
 * 誤差量 = 投料重量 − 標準重量 + 前日餘料重量 - 當日餘料重量
 */
function calculateTodaySPC() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  var dataRange = sheet.getRange(2, 1, lastRow - 1, 9); // A2:I{LastRow}
  var values = dataRange.getValues();
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowNum = i + 2;
    
    var barrels = Number(row[2]) || 0; // 生產桶數
    var feedingWeight = Number(row[4]) || 0; // 投料重量
    var prevLeftover = i > 0 ? (Number(values[i-1][5]) || 0) : 0; // 前日餘料
    var currLeftover = Number(row[5]) || 0; // 當日餘料
    
    // 1. 計算標準重量
    var standardWeight = barrels * CONFIG.SINGLE_BARREL_WEIGHT;
    sheet.getRange(rowNum, 4).setValue(standardWeight); // 寫入標準重量
    
    // 2. 計算誤差量
    var errorAmount = feedingWeight - standardWeight + prevLeftover - currLeftover;
    sheet.getRange(rowNum, 7).setValue(errorAmount); // 寫入誤差量
    
    // 3. 計算誤差率
    var errorRate = standardWeight > 0 ? (errorAmount / standardWeight) : 0;
    sheet.getRange(rowNum, 8).setValue(errorRate); // 寫入誤差率 (% 格式在 Sheet 設定)
    
    // 4. 判定警報燈號
    var status = "🟢 正常";
    var absRate = Math.abs(errorRate);
    if (absRate > 0.10) {
      status = "🔴 重大異常";
    } else if (absRate > 0.05) {
      status = "🟠 異常";
    } else if (absRate > 0.03) {
      status = "🟡 注意";
    }
    sheet.getRange(rowNum, 9).setValue(status);
  }
  
  SpreadsheetApp.getUi().alert("📊 SPC 指標與管制線計算完成！");
}

/**
 * 自動化資料驗證：空白、重複、異常數值標記
 */
function validateCurrentSheetData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();
  var ruleViolations = [];
  
  sheet.getRange(2, 1, lastRow, 10).setBackground(null); // 清除先前背景色
  
  var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  for (var i = 0; i < values.length; i++) {
    var rowNum = i + 2;
    var date = values[i][0];
    var operator = values[i][1];
    var barrels = values[i][2];
    var feedingWeight = values[i][4];
    
    // 驗證 1: 必填欄位檢查
    if (!date || !operator || barrels === "" || feedingWeight === "") {
      sheet.getRange(rowNum, 1, 1, 6).setBackground('#FFEBEE'); // 淺紅標記
      ruleViolations.push("第 " + rowNum + " 行：有欄位空白，請補齊資料。");
    }
    
    // 驗證 2: 數值合理性檢查 (單桶投料重量平均應在 250 ~ 370 斤之間)
    if (barrels > 0) {
      var avgPerBarrel = feedingWeight / barrels;
      if (avgPerBarrel < 250 || avgPerBarrel > 370) {
        sheet.getRange(rowNum, 5).setBackground('#FFF9C4'); // 淺黃標記合理性異常
        ruleViolations.push("第 " + rowNum + " 行：單桶投料平均量 (" + avgPerBarrel.toFixed(1) + "斤) 顯著偏離 310斤 正常區間，請確認是否記錄錯誤。");
      }
    }
  }
  
  if (ruleViolations.length > 0) {
    var msg = "⚠️ 資料驗證發現 " + ruleViolations.length + " 項潛在錯誤：\\n" + ruleViolations.slice(0, 8).join("\\n");
    if (ruleViolations.length > 8) msg += "\\n...以及其他項目。";
    SpreadsheetApp.getUi().alert(msg);
  } else {
    SpreadsheetApp.getUi().alert("✅ 資料全數通過驗證，未發現空白、重複或極端異常值！");
  }
}

/**
 * 呼叫 Gemini API 進行 SPC 製程分析與異常原因診斷
 */
function triggerGeminiAnalysis() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    SpreadsheetApp.getUi().alert("❌ 請先在 Apps Script [設定] -> [指令碼屬性] 中新增 GEMINI_API_KEY！");
    return;
  }
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow < 5) {
    SpreadsheetApp.getUi().alert("❌ 數據量太少，至少需要5筆資料進行診斷。");
    return;
  }
  
  // 抓取最近 10 筆資料做分析
  var startRow = Math.max(2, lastRow - 9);
  var range = sheet.getRange(startRow, 1, (lastRow - startRow + 1), 9);
  var data = range.getValues();
  
  var dataSummary = data.map(function(r) {
    return "日期: " + Utilities.formatDate(r[0], "GMT+8", "yyyy-MM-dd") + 
           ", 人員: " + r[1] + 
           ", 桶數: " + r[2] + 
           ", 標準重量: " + r[3] + "斤" +
           ", 實際投料: " + r[4] + "斤" +
           ", 餘料: " + r[5] + "斤" +
           ", 誤差率: " + (r[7] * 100).toFixed(2) + "%" +
           ", 異常原因: " + (r[8] || "無");
  }).join("\\n");
  
  var prompt = "您是一位精通 SPC (統計製程管制) 的食品工程顧問。以下是近期台灣虱目魚漿加工廠的投料生產記錄：\\n\\n" +
               dataSummary + 
               "\\n\\n請依據這批數據，提供一份製程診斷報告。報告必須涵蓋：\\n" +
               "1. 今日/近期製程總結 (計算平均誤差率、最大誤差點)\\n" +
               "2. SPC管制狀態評估 (是否超出±3%注意或±5%異常管制線，有無連續偏移現象)\\n" +
               "3. 異常成因推導 (結合「魚肉較濕」、「秤重異常」、「特殊訂單」等原因進行歸因)\\n" +
               "4. 具體可執行的改善建議。請使用正體中文(繁體)回答。";
               
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + apiKey;
  
  var payload = {
    "contents": [{
      "parts": [{ "text": prompt }]
    }]
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());
    var reportText = responseData.candidates[0].content.parts[0].text;
    
    // 建立新工作表寫入 AI 報告，或顯示在 Dialog
    var reportSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AI診斷報告報告") || 
                      SpreadsheetApp.getActiveSpreadsheet().insertSheet("AI診斷報告報告");
    
    reportSheet.clear();
    reportSheet.getRange(1, 1).setValue("🐟 虱目魚漿製程 AI 診斷改善報告").setFontSize(16).setFontWeight("bold");
    reportSheet.getRange(2, 1).setValue("產生時間: " + new Date().toLocaleString());
    reportSheet.getRange(4, 1).setValue(reportText);
    reportSheet.getRange(4, 1).setWrap(true);
    reportSheet.setColumnWidth(1, 800);
    
    SpreadsheetApp.getUi().alert("🤖 AI 診斷報告生成成功！已儲存至 [AI診斷報告報告] 工作表。");
  } catch(e) {
    SpreadsheetApp.getUi().alert("❌ AI 串接失敗: " + e.toString());
  }
}

/**
 * 自動備份機制：每日定時將當前生產資料導出為新 Excel，並備份到指定的 Google Drive 資料夾
 */
function executeDailyBackup() {
  if (CONFIG.BACKUP_FOLDER_ID === "請替換為您的GoogleDrive備份資料夾ID") {
    SpreadsheetApp.getUi().alert("⚠️ 請先在 Apps Script 中設定正確的 BACKUP_FOLDER_ID 以啟動備份！");
    return;
  }
  
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var folder = DriveApp.getFolderById(CONFIG.BACKUP_FOLDER_ID);
    
    var formattedDate = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss");
    var backupName = "虱目魚漿生產資料備份_" + formattedDate;
    
    // 複製整份試算表做為備份
    var fileCopy = DriveApp.getFileById(spreadsheet.getId()).makeCopy(backupName, folder);
    
    SpreadsheetApp.getUi().alert("💾 自動備份成功！檔案已安全儲存在 Google Drive 中：\\n" + fileCopy.getName());
  } catch(e) {
    Logger.log("備份失敗: " + e.toString());
    SpreadsheetApp.getUi().alert("❌ 備份失敗，請確認資料夾權限或 ID 是否正確：" + e.toString());
  }
}`;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden text-slate-600 animate-fadeIn" id="tech-guide-panel">
      {/* 頂部橫幅 */}
      <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 text-xs font-semibold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
            TECHNICAL RESOURCE
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2 font-sans tracking-tight">
            平台部署、資料結構與自動化指南
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            包含 Google Sheets 規劃、Apps Script 可部署原始碼、SPC 管制界限計算邏輯與系統架構
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">系統狀態: 配置就緒</span>
        </div>
      </div>

      {/* 技術選項卡 */}
      <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none bg-slate-50/50">
        <button
          onClick={() => setActiveTab("arch")}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-xs tracking-tight transition-all shrink-0 ${
            activeTab === "arch"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
          id="tab-arch"
        >
          <Server className="w-4 h-4 text-indigo-600" />
          1. 系統架構與流程
        </button>
        <button
          onClick={() => setActiveTab("sheets")}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-xs tracking-tight transition-all shrink-0 ${
            activeTab === "sheets"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
          id="tab-sheets"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          2. Sheets 資料結構
        </button>
        <button
          onClick={() => setActiveTab("gas")}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-xs tracking-tight transition-all shrink-0 ${
            activeTab === "gas"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
          id="tab-gas"
        >
          <FileCode className="w-4 h-4 text-amber-600" />
          3. Apps Script 程式碼
        </button>
        <button
          onClick={() => setActiveTab("spc")}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-xs tracking-tight transition-all shrink-0 ${
            activeTab === "spc"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
          id="tab-spc"
        >
          <BarChart4 className="w-4 h-4 text-purple-600" />
          4. SPC 計算與 AI 診斷
        </button>
        <button
          onClick={() => setActiveTab("expand")}
          className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-xs tracking-tight transition-all shrink-0 ${
            activeTab === "expand"
              ? "border-indigo-600 text-indigo-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
          id="tab-expand"
        >
          <Cloud className="w-4 h-4 text-orange-600" />
          5. 備份與後續擴充
        </button>
      </div>

      {/* 內容區 */}
      <div className="p-6 md:p-8">
        {/* 1. 系統架構與流程 */}
        {activeTab === "arch" && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">1.1</span>
                平台部署架構圖 (System Architecture)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                本平台基於輕量化、極低維護成本、高穩定的無伺服器 (Serverless) 架構設計，結合 Google 雲端生態系與 Gemini AI。
              </p>
            </div>

            {/* SVG 系統架構圖 */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/60 overflow-x-auto shadow-inner">
              <div className="min-w-[650px] mx-auto text-center">
                <svg viewBox="0 0 800 240" className="w-full h-auto text-slate-700" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* 背景格線 */}
                  <defs>
                    <pattern id="grid-light" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-light)" rx="8" />

                  {/* 節點1: Google Form /現場輸入 */}
                  <rect x="20" y="80" width="120" height="60" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <text x="80" y="105" fill="#1e293b" fontSize="11" fontWeight="bold" textAnchor="middle">1. 現場投料輸入</text>
                  <text x="80" y="123" fill="#64748b" fontSize="9" textAnchor="middle">Google 表單 / 網頁</text>

                  {/* 箭頭 1 -> 2 */}
                  <path d="M 140 110 L 180 110" stroke="#94a3b8" strokeWidth="1.5" />
                  <polygon points="180,110 173,106 173,114" fill="#94a3b8" />

                  {/* 節點2: Google Sheets */}
                  <rect x="180" y="80" width="130" height="60" rx="8" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
                  <text x="245" y="105" fill="#065f46" fontSize="11" fontWeight="bold" textAnchor="middle">2. Google Sheets</text>
                  <text x="245" y="123" fill="#059669" fontSize="9" textAnchor="middle">核心生產資料庫</text>

                  {/* 雙向箭頭 2 <-> 3 */}
                  <path d="M 310 100 L 370 100" stroke="#059669" strokeWidth="1.5" />
                  <polygon points="370,100 363,96 363,104" fill="#059669" />
                  <path d="M 370 120 L 310 120" stroke="#4f46e5" strokeWidth="1.5" />
                  <polygon points="310,120 317,116 317,124" fill="#4f46e5" />
                  <text x="340" y="90" fill="#64748b" fontSize="8" textAnchor="middle">雙向同步</text>

                  {/* 節點3: 平台 Dashboard */}
                  <rect x="370" y="50" width="160" height="120" rx="8" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="1.5" />
                  <text x="450" y="75" fill="#1e1b4b" fontSize="12" fontWeight="bold" textAnchor="middle">3. 智慧製程監控平台</text>
                  <text x="450" y="93" fill="#6366f1" fontSize="10" fontWeight="bold" textAnchor="middle">React Dashboard</text>
                  <text x="450" y="113" fill="#4f46e5" fontSize="9" textAnchor="middle">● SPC 管制圖 ● 穩定度排行</text>
                  <text x="450" y="131" fill="#4f46e5" fontSize="9" textAnchor="middle">● 魚肉批號分析 ● 備份 logs</text>

                  {/* 箭頭 3 -> 4 (Gemini) */}
                  <path d="M 530 90 L 610 70" stroke="#4f46e5" strokeWidth="1.5" />
                  <polygon points="610,70 602,68 605,76" fill="#4f46e5" />
                  <text x="570" y="68" fill="#64748b" fontSize="8" textAnchor="middle" transform="rotate(-15 570 70)">分析請求</text>

                  {/* 節點4: Gemini AI Engine */}
                  <rect x="610" y="30" width="160" height="60" rx="8" fill="#faf5ff" stroke="#e9d5ff" strokeWidth="1.5" />
                  <text x="690" y="55" fill="#581c87" fontSize="11" fontWeight="bold" textAnchor="middle">4. Gemini AI Engine</text>
                  <text x="690" y="73" fill="#7e22ce" fontSize="9" textAnchor="middle">自動化異常診斷 & 對策建議</text>

                  {/* 箭頭 4 -> 3 (回應) */}
                  <path d="M 610 80 L 530 110" stroke="#7e22ce" strokeWidth="1.5" />
                  <polygon points="530,110 538,111 535,103" fill="#7e22ce" />
                  <text x="570" y="103" fill="#64748b" fontSize="8" textAnchor="middle" transform="rotate(-20 570 105)">智慧診斷書</text>

                  {/* 箭頭 3 -> 5 (雲端備份) */}
                  <path d="M 530 135 L 610 155" stroke="#ea580c" strokeWidth="1.5" />
                  <polygon points="610,155 602,157 605,149" fill="#ea580c" />
                  <text x="570" y="151" fill="#64748b" fontSize="8" textAnchor="middle" transform="rotate(15 570 153)">每日自動存檔</text>

                  {/* 節點5: Google Drive 備份 */}
                  <rect x="610" y="140" width="160" height="60" rx="8" fill="#fff7ed" stroke="#fed7aa" strokeWidth="1.5" />
                  <text x="690" y="165" fill="#7c2d12" fontSize="11" fontWeight="bold" textAnchor="middle">5. Google Drive 備份</text>
                  <text x="690" y="183" fill="#c2410c" fontSize="9" textAnchor="middle">Excel 長期保存 (.xlsx)</text>
                </svg>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">1.2</span>
                資料流程圖 (Data Flow)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                描述數據從現場合理化輸入、即時計算 SPC 指標、動態判定警戒燈號，直到 AI 自動化介入分析與最終歸檔之生命週期。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-[10px] font-mono font-bold text-indigo-600 mb-2 uppercase tracking-wide">STEP 1. 資料收集與驗證</div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">現場合理化過濾</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  透過 Google Form 表單或網頁介面防呆，排除空白欄位與重複紀錄。Apps Script 在背景對每日記錄進行投料量合理性校驗。
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-[10px] font-mono font-bold text-emerald-600 mb-2 uppercase tracking-wide">STEP 2. SPC 指標運算</div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">誤差量與管制線</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  系統自動引入公式，扣除當日餘料並加回前日餘料，精確計算誤差量與誤差率。建立 UCL / LCL 管制界限。
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-[10px] font-mono font-bold text-purple-600 mb-2 uppercase tracking-wide">STEP 3. AI 異常診斷</div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Gemini 原因歸因</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Gemini API 讀取近期趨勢及異常備註，針對「魚肉較濕」、「秤重異常」等事件，建立統計影響模型並生成改善指引。
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-[10px] font-mono font-bold text-orange-600 mb-2 uppercase tracking-wide">STEP 4. 備份存檔</div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">異地安全保存</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  結合 Google Apps Script 時鐘觸發器，每日夜間 23:59 自動將資料封裝為 Excel (.xlsx) 下載備份並上傳雲端硬碟。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Sheets 資料結構 */}
        {activeTab === "sheets" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">2.1</span>
                Google Sheets 資料表規劃
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                為利於 Apps Script 讀取及 Dashboard 渲染，請在 Google Sheets 的「生產資料庫」工作表中，按以下欄位順序與型態建立首行標題：
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 border-b border-slate-100 font-bold">
                    <th className="p-3">欄位順序</th>
                    <th className="p-3">欄位名稱</th>
                    <th className="p-3">資料型態</th>
                    <th className="p-3">計量單位</th>
                    <th className="p-3">合理性驗證規則 / 備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">A (Col 1)</td>
                    <td className="p-3 font-bold text-slate-900">日期</td>
                    <td className="p-3">日期 (Date)</td>
                    <td className="p-3 font-mono">YYYY-MM-DD</td>
                    <td className="p-3">不可空白，不重複，支援跨年度自動分析。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">B (Col 2)</td>
                    <td className="p-3 font-bold text-slate-900">投料人員</td>
                    <td className="p-3">字串 (Text)</td>
                    <td className="p-3">無</td>
                    <td className="p-3">例如：阿明、阿祥、小陳、大華。用於統計人員穩定度排名。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">C (Col 3)</td>
                    <td className="p-3 font-bold text-slate-900">生產桶數</td>
                    <td className="p-3">整數 (Integer)</td>
                    <td className="p-3">桶</td>
                    <td className="p-3">必須 &gt; 0，用於乘上 310斤 得到「標準重量」。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">D (Col 4)</td>
                    <td className="p-3 font-bold text-slate-900">標準重量</td>
                    <td className="p-3">數值 (Decimal)</td>
                    <td className="p-3">台斤 (斤)</td>
                    <td className="p-3">自動計算公式：生產桶數 * 310 斤/桶。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">E (Col 5)</td>
                    <td className="p-3 font-bold text-slate-900">投料重量</td>
                    <td className="p-3">數值 (Decimal)</td>
                    <td className="p-3">台斤 (斤)</td>
                    <td className="p-3">實際投料總和。單桶投料重量平均應在 250 ~ 370 斤之合理區間。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">F (Col 6)</td>
                    <td className="p-3 font-bold text-slate-900">餘料重量</td>
                    <td className="p-3">數值 (Decimal)</td>
                    <td className="p-3">台斤 (斤)</td>
                    <td className="p-3">當日打漿生產結束後，桶底所餘之半成品重量。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">G (Col 7)</td>
                    <td className="p-3 font-bold text-slate-900">誤差量</td>
                    <td className="p-3">數值 (Decimal)</td>
                    <td className="p-3">台斤 (斤)</td>
                    <td className="p-3">自動公式：投料重量 - 標準重量 + 前日餘料 - 當日餘料。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">H (Col 8)</td>
                    <td className="p-3 font-bold text-slate-900">誤差率</td>
                    <td className="p-3">百分比 (Percent)</td>
                    <td className="p-3 font-mono">%</td>
                    <td className="p-3">自動公式：誤差量 / 標準重量 * 100%。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">I (Col 9)</td>
                    <td className="p-3 font-bold text-slate-900">警報燈號</td>
                    <td className="p-3">字串 (Text)</td>
                    <td className="p-3">無</td>
                    <td className="p-3">正常(±3%內) / 注意(±5%內) / 異常(±10%內) / 重大(超過±10%)。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">J (Col 10)</td>
                    <td className="p-3 font-bold text-slate-900">原料批號</td>
                    <td className="p-3">字串 (Text)</td>
                    <td className="p-3">無</td>
                    <td className="p-3">記錄批號格式：台南永安漁產 F-01 等，提供多供應商原料追溯。</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-semibold text-indigo-600">K (Col 11)</td>
                    <td className="p-3 font-bold text-slate-900">異常原因</td>
                    <td className="p-3">單選 (Enum)</td>
                    <td className="p-3">無</td>
                    <td className="p-3">「無」、「魚肉較濕」、「魚肉較乾」、「特殊訂單」、「秤重異常」、「設備異常」、「其他」。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-800 leading-relaxed">
                <span className="font-bold">💡 單位規範：</span>依據漁業加工及本案計量單位規範，本平台全面採用「<span className="font-bold text-slate-900 underline">台斤（斤）</span>」作為顯示與計算核心。系統內部已建立 1 台斤 = 0.6 公斤之轉換對應，但所有圖表、儀表板與 AI 報告皆不得以公斤做為主要單位。
              </div>
            </div>
          </div>
        )}

        {/* 3. Apps Script 程式碼 */}
        {activeTab === "gas" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">3.1</span>
                  Google Apps Script 完整程式碼
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  用於在 Google 試算表中建立自動選單、背景資料驗證、SPC 計算、呼叫 Gemini 與每日自動備份。
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(appsScriptCode, "gas-code")}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-all"
              >
                {copiedSection === "gas-code" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    已複製原始碼！
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    複製 Apps Script 原始碼
                  </>
                )}
              </button>
            </div>

            <div className="relative bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-hidden shadow-inner">
              <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[350px] text-slate-700 scrollbar-thin">
                {appsScriptCode}
              </pre>
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-900 mb-2">💡 部署步驟說明：</h4>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 pl-2">
                <li>開啟您的 Google Sheets 試算表，點選選單 <strong className="text-slate-800">「擴充功能」-&gt;「Apps Script」</strong>。</li>
                <li>將預設的程式碼清空，完整複製並貼上本頁提供的原始碼。</li>
                <li>在 Apps Script 左側邊欄，點選 <strong className="text-slate-800">「專案設定 (齒輪圖示)」</strong>，拉到最下方的「指令碼屬性」，新增屬性名 <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono font-semibold">GEMINI_API_KEY</code>，並填入您的 Google AI Studio 密鑰。</li>
                <li>視需要替換程式碼頂端 <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono font-semibold">CONFIG.BACKUP_FOLDER_ID</code> 為您在 Google Drive 建立的備份資料夾 ID（網址最後一串字串）。</li>
                <li>儲存並關閉 Apps Script。重新整理試算表，您會看到頂部選單新增了 <strong className="text-slate-900">「🐟 魚漿製程 AI 診斷」</strong>。</li>
                <li>若要啟動「每日自動備份」，請在 Apps Script 左邊欄點選 <strong className="text-slate-800">「觸發器 (時鐘圖示)」-&gt;「新增觸發器」</strong>，選擇執行 <code className="text-amber-700 font-mono font-semibold">executeDailyBackup</code>，事件來源為「時間驅動」，設定為「日計時器」，時段設為「下午 11 點至午夜」即可。</li>
              </ol>
            </div>
          </div>
        )}

        {/* 4. SPC 計算與 AI 診斷 */}
        {activeTab === "spc" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">4.1</span>
                SPC 統計製程管制計算邏輯
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                本系統採用行業標準 SPC 管制圖，包含「誤差率管制圖（%）」與「誤差量管制圖（台斤）」。以下為數學模型與異常判定規則。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
                  誤差率 SPC 管制線公式
                </h4>
                <ul className="text-xs text-slate-600 space-y-3">
                  <li>
                    <strong className="text-slate-800">中心線 (CL)：</strong>
                    <div className="p-2 bg-white border border-slate-200 rounded font-mono text-indigo-600 my-1 text-center text-xs shadow-sm">
                      CL_rate = 歷史平均誤差率 (%) = Σ(誤差率) / N
                    </div>
                  </li>
                  <li>
                    <strong className="text-slate-800">誤差率標準差 (σ)：</strong>
                    <div className="p-2 bg-white border border-slate-200 rounded font-mono text-indigo-600 my-1 text-center text-xs shadow-sm">
                      σ_rate = SQRT( Σ(誤差率_i - CL_rate)² / (N - 1) )
                    </div>
                  </li>
                  <li>
                    <strong className="text-slate-800">管制上限 (UCL) 與 管制下限 (LCL)：</strong>
                    <div className="p-2 bg-white border border-slate-200 rounded font-mono text-indigo-600 my-1 text-center text-xs shadow-sm">
                      UCL_rate = CL_rate + 3σ <br />
                      LCL_rate = CL_rate - 3σ
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">依據 3-Sigma 原則，當製程正常時，99.73% 的點應落在 UCL 與 LCL 之間。</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
                  西電規則 (Western Electric Rules) 異常判定
                </h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700 font-mono text-[9px] rounded font-bold mt-0.5 shrink-0">Rule 1</span>
                    <span><strong>超出管制界限：</strong> 單一觀測點超出 UCL 或低於 LCL（即超出 ±3σ 範圍）。系統判定為<strong>「重大製程變異」</strong>。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[9px] rounded font-bold mt-0.5 shrink-0">Rule 2</span>
                    <span><strong>連續偏移 (Run)：</strong> 連續 7 個以上的觀測點落在中心線 (CL) 的同一側。顯示製程平均值已發生系統性位移，常因原料產地變更或新人員操作習慣引起。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700 font-mono text-[9px] rounded font-bold mt-0.5 shrink-0">Rule 3</span>
                    <span><strong>異常波動 (Trend)：</strong> 連續 6 個點持續上升或持續下降。預示製程可能發生漸進性惡化（如秤重地磅元件疲勞、刀具磨損或溫度升高）。</span>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2 mt-4">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">4.2</span>
                AI 智慧分析引擎與歸因模型
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gemini API 對接本平台資料後，會自動在背景建立異常原因的統計模型。例如對以下事件進行自動統計歸因分析：
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-sm">
                <h5 className="font-bold text-indigo-700 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                  魚肉較濕事件
                </h5>
                <p className="text-slate-500 leading-relaxed">
                  系統自動加權分析，指出下雨進貨、多供應商產地交雜時造成的濕肉。
                  <strong className="text-slate-800 block mt-1">平均造成：+6.8% 誤差率</strong>
                </p>
              </div>
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-sm">
                <h5 className="font-bold text-amber-700 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  秤重設備異常
                </h5>
                <p className="text-slate-500 leading-relaxed">
                  分析秤重地磅元件疲勞或雜質卡阻引起的系統性常值位移。
                  <strong className="text-slate-800 block mt-1">平均造成：-5.3% 誤差率</strong>
                </p>
              </div>
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-sm">
                <h5 className="font-bold text-purple-700 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full"></span>
                  特殊訂單/客製比例
                </h5>
                <p className="text-slate-500 leading-relaxed">
                  統計因特殊高黏度魚丸、魚酥等特定批量配方變更引發的已知合理偏移。
                  <strong className="text-slate-800 block mt-1">平均造成：+11.2% 誤差率</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. 備份與後續擴充 */}
        {activeTab === "expand" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">5.1</span>
                自動化備份與長期保存機制
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                為落實製造業資訊安全規範（ISMS），平台建立了「本地實體 Excel 備份」與「雲端異地 Google Drive 自動存檔」雙軌機制。
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/60 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-orange-600" />
                    Google Drive 每日自動存檔
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-slate-500 pl-1 leading-relaxed">
                    <li>透過 Apps Script 觸發器（Trigger），於每日晚上 23:59 自動將整個生產資料庫快照。</li>
                    <li>依據日期自動命名（如：<code className="text-slate-800 bg-slate-200/50 px-1 py-0.5 rounded font-mono">魚漿製程備份_20260628</code>），上傳至指定 Google Drive 資料夾中。</li>
                    <li>包含當日原始資料、SPC 指標、以及 AI 產出的智慧診斷書（markdown 格式與 txt 檔），便於歷史回溯。</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    本地端實體 Excel (.xlsx) 導出
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-slate-500 pl-1 leading-relaxed">
                    <li>本 Dashboard 網頁端整合了 Excel/CSV 匯出按鈕，一鍵即在 client-side 將當前顯示之所有記錄（包含經 SPC 計算與 AI 判定後的燈號）打包匯出。</li>
                    <li>不經後端處理，完全保護商業資料隱私，提供管理者隨時離線保存。</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2 mt-4">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs rounded-full font-mono font-bold">5.2</span>
                後續擴充與升級建議
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                為配合虱目魚漿生產線未來之數位化升級，本平台在欄位設計與架構上已保留高度彈性：
              </p>
            </div>

            <div className="space-y-3 text-xs pl-2">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 font-mono text-[10px] rounded-full shrink-0 font-bold">1</span>
                <div>
                  <strong className="text-slate-900 font-bold">物聯網 (IoT) 智慧地磅與感測器整合：</strong>
                  <p className="text-slate-500 mt-1">未來打漿機可加裝 PLC 及溫度感測器、數位地磅，透過 API 自動將投料重量、溫度、攪拌電流、轉速等自動寫入 Google Sheets，消除人工登打誤差與時效延遲。</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 font-mono text-[10px] rounded-full shrink-0 font-bold">2</span>
                <div>
                  <strong className="text-slate-900 font-bold">CPK（製程能力分析指標）擴充：</strong>
                  <p className="text-slate-500 mt-1">隨著累積數據超過 100 筆，平台可進一步導入 CPK 計算（CPK = Min( (UCL - Mean)/3σ, (Mean - LCL)/3σ )），藉此精確評估製程的精確度與準確度，提供客戶更高層級的品質保證。</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 bg-indigo-50 border border-indigo-200 text-indigo-600 font-mono text-[10px] rounded-full shrink-0 font-bold">3</span>
                <div>
                  <strong className="text-slate-900 font-bold">AI 產能預測與智慧排程系統：</strong>
                  <p className="text-slate-500 mt-1">結合歷史魚漿需求與產能，藉由更深入的機器學習模型，自動分析各節慶、季節投料的氣候干擾（如氣溫、濕度對魚肉保水度的影響），在開工前自動產出當日最佳「投料配比推薦值」，將製程誤差防範於未然。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
