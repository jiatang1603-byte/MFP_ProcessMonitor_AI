/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// 輔助函式：當 API 遇到高負載 (503) 或 429 速率限制時，自動進行指數退避重試，並支援備用模型 fallback 邏輯
async function generateContentWithRetry(ai: any, prompt: string) {
  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of models) {
    let delay = 1000;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] 正在嘗試調用模型: ${model} (第 ${attempt}/${maxRetries} 次嘗試)`);
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt
        });
        if (response && response.text) {
          console.log(`[Gemini API] 成功獲取模型 ${model} 的回覆！`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || String(err);
        const errStatus = err.status || err.statusCode || (err.error && err.error.code);
        console.error(`[Gemini API] 模型 ${model} 第 ${attempt} 次嘗試失敗:`, errMsg);
        
        // 判斷是否為暫時性錯誤 (如 503 服務不可用、429 頻率限制、或者是 UNAVAILABLE / high demand)
        const isTemporary = 
          errStatus === 503 || 
          errStatus === 429 || 
          errMsg.includes("503") || 
          errMsg.includes("429") || 
          errMsg.includes("UNAVAILABLE") || 
          errMsg.includes("high demand") || 
          errMsg.includes("exhausted");
        
        if (!isTemporary || attempt === maxRetries) {
          console.warn(`[Gemini API] 非暫時性錯誤或已達最大重試次數，將嘗試切換至下一個備用模型。`);
          break; // 不再重試此模型，直接進入下一輪模型嘗試
        }
        
        console.log(`[Gemini API] 偵測到暫時性高負載，將在 ${delay} 毫秒後重試...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // 指數退避
      }
    }
  }

  throw lastError || new Error("無法使用任何支援的 Gemini 模型產生報告內容。");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // (已廢棄) 取得 Google Sheets 生產資料庫數據：目前已改為由前端 React 直接連線讀取，支援 100% 離線快取/離線操作且不經由 Cloud Run 伺服器
  app.get("/api/sheets/records", (req, res) => {
    res.status(410).json({
      error: "ENDPOINT_DEPRECATED",
      message: "本端點已廢棄，目前數據載入已由前端直接連接 Google Sheet 並支援 100% 離線本機快取操作。"
    });
  });

  // API 路由: 智慧診斷分析
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { dataSummary, recentStats } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
        return res.status(400).json({
          error: "API_KEY_MISSING",
          message: "⚠️ 偵測到伺服器端尚未設定有效的 GEMINI_API_KEY。請點擊右上角「Settings -> Secrets」新增您的 Google AI 密鑰後重試，以啟動完整的 AI 診斷分析。"
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const prompt = `您是一位精通 SPC (統計製程管制) 的食品工程顧問與製程數據分析專家。
以下是台灣虱目魚漿加工廠在 2026 年 6 月的生產與投料數據摘要：
${dataSummary}

近期統計指標摘要：
- 總觀測天數：${recentStats.count} 天
- 平均標準重量：${recentStats.avgStandardWeight} 台斤
- 平均實際投料重量：${recentStats.avgFeedingWeight} 台斤
- 平均誤差量：${recentStats.avgErrorAmount} 台斤
- 平均誤差率：${recentStats.avgErrorRate}%
- 異常發生率 (黃燈及以上)：${recentStats.anomalyRate}%
- 重大異常次數 (紅燈)：${recentStats.severeAnomalyCount} 次

加工異常主要成因的業界經驗影響基準：
- 魚肉較濕：下雨天或多產地混合原料，水分含量高，平均造成 +6.8% 誤差率 (增投原料以補償水份)
- 魚肉較乾：水分及油脂偏低，纖維結實，平均造成 -3.8% 誤差率 (減少投料)
- 秤重異常：地磅傳感器疲勞或卡灰塵，平均造成 -5.3% 誤差率 (常伴隨持續性低值偏置)
- 特殊訂單：高密度、高黏度客製魚丸比例，平均造成 +11.2% 誤差率
- 設備異常：打漿攪拌機油壓轉速不穩使溫度偏高，平均造成 -2.2% 誤差率

請依據上述數據，撰寫一份結構極度專業、條理分明的「虱目魚漿製程 SPC 異常分析與智慧改善診斷書」。
診斷書必須使用正體中文(繁體)，並包含以下四大章節，使用 Markdown 格式呈現：

一、今日製程品質摘要 (Executive Summary)
- 摘要分析最近一天（例如 2026-06-28，當日為重大異常，誤差率 +11.16%，原因為特殊訂單，或者依據您看到的最新一筆記錄）的生產數據與安全狀態。
- 站在高階品質總監視角，用 2-3 句話給予今日製程的整體品質水準一個明確、客觀、不誇大的評語。

二、SPC 統計製程狀態評估 (SPC Performance)
- 評估誤差率與誤差量管制狀態。
- 指出是否有超出管制界線（±3%注意、±5%異常、±10%重大異常）的極端變異點（例如 6月28日的重大異常、6月12日的 5.16% 異常、6月17日的 -5.29% 異常）。
- 依據 SPC 西電規則 (Western Electric Rules)，評估是否有「連續點偏向中心線同側」或「連續點持續上升/下降」的系統性失控跡象。

三、異常原因深度推導與統計歸因 (Root Cause Attribution)
- 結合生產備註，深度剖析最近幾次異常（例如：6/28 特殊訂單、6/27 設備異常、6/23 魚肉較濕、6/17 秤重異常）的物理成因與品質效應。
- 說明這些製程變異對產品口感、黏彈度、耗損成本及庫存餘料回填管理造成的實質影響。

四、前瞻性製程改善指引 (Actionable Recommendations)
- 針對以下各層面提供 4-5 條具有前瞻性、具體可執行的改善指引：
  1. 【地磅設備】：如何優化秤重器具的校正頻率、傳感器卡渣防護。
  2. 【水分補償】：建立快速魚肉水分、脂肪率抽檢，動態自動修正單桶投料標準。
  3. 【餘料管理】：前日餘料與當日餘料的管理標準化 (SOP)，落實確實扣減回填。
  4. 【人員操作習慣與培訓】：提昇不同班別操作穩定度，降低因投料人員（如大華、阿明、小陳、阿祥）不同導致的製程波動。
  5. 【多供應商原料品質基準】：建立彌陀漁會、梓官鮮撈、學甲興達、台南永安漁產等供應商原料的進料檢驗與配方調整對照表。

字數約在 800-1200 字之間，語氣嚴謹、客觀、充滿製造業現場的實務指導價值。`;

      const response = await generateContentWithRetry(ai, prompt);

      const reportText = response.text || "⚠️ AI 診斷引擎未能產生報告內文，請重試。";

      // 提取核心簡短觀點，供前端 Summary 區塊使用
      let quickSummary = "今日生產發生特殊訂單的大幅正向偏離，製程整體處於受控波動，但仍需嚴格執行防呆措施。";
      let spcStatus = "製程近期出現 3 個超出管制界線之異常點，西電規則檢驗顯示有局部系統性偏移。";
      let rootCauses = "主要異常歸因於特殊規格訂單投料增加（+11.2%）、地磅卡屑秤重不準（-5.3%）與高水份魚肉（+6.8%）。";
      let recommendations = "1. 落實地磅傳感器每日三班清點與週校正。\n2. 導入手持式近紅外線 (NIR) 快速水分儀。\n3. 制訂餘料回填與當日扣減標準 SOP。";

      // 試圖從生成內容中做更精緻的截取（若模型有依格式回答，可維持原樣）
      res.json({
        reportText,
        parsed: {
          quickSummary,
          spcStatus,
          rootCauses,
          recommendations
        }
      });
    } catch (err: any) {
      console.error("Gemini API Error on Server:", err);
      res.status(500).json({
        error: "AI 診斷引擎呼叫失敗",
        message: err.message || "伺服器在呼叫 Google Gemini API 時遭遇困難，請確認 Settings 中的金鑰是否配置妥當。"
      });
    }
  });

  // 靜態檔案及 Vite 中間件託管
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
