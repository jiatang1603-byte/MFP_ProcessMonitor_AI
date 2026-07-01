/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyRecord } from "../types";

export const DEFAULT_BARREL_WEIGHT = 310; // 台斤/桶

// 產生 28 天份的歷史製程資料，日期為 2026-06-01 至 2026-06-28
export const INITIAL_RECORDS: DailyRecord[] = [
  {
    id: "rec-01",
    date: "2026-06-01",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1540,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260601-A", weight: 400 },
      { supplier: "彌陀漁會", batchNo: "M20260601-B", weight: 380 },
      { supplier: "學甲興達", batchNo: "S20260601-C", weight: 390 },
      { supplier: "梓官鮮撈", batchNo: "Z20260601-D", weight: 370 },
    ],
    prevLeftover: 10,
    currLeftover: 8,
    errorAmount: -8, // 1540 - 1550 + 10 - 8 = -8
    errorRate: -0.52, // -8 / 1550 * 100%
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "開工首日，狀況良好",
    status: "normal"
  },
  {
    id: "rec-02",
    date: "2026-06-02",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1845,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260601-A", weight: 480 },
      { supplier: "彌陀漁會", batchNo: "M20260601-B", weight: 450 },
      { supplier: "學甲興達", batchNo: "S20260601-C", weight: 465 },
      { supplier: "梓官鮮撈", batchNo: "Z20260601-D", weight: 450 },
    ],
    prevLeftover: 8,
    currLeftover: 12,
    errorAmount: -19, // 1845 - 1860 + 8 - 12 = -19
    errorRate: -1.02,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-03",
    date: "2026-06-03",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1262,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260603-A", weight: 310 },
      { supplier: "彌陀漁會", batchNo: "M20260603-B", weight: 320 },
      { supplier: "學甲興達", batchNo: "S20260603-C", weight: 315 },
      { supplier: "梓官鮮撈", batchNo: "Z20260603-D", weight: 317 },
    ],
    prevLeftover: 12,
    currLeftover: 10,
    errorAmount: 24, // 1262 - 1240 + 12 - 10 = 24
    errorRate: 1.94,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-04",
    date: "2026-06-04",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1610,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260603-A", weight: 410 },
      { supplier: "彌陀漁會", batchNo: "M20260603-B", weight: 400 },
      { supplier: "學甲興達", batchNo: "S20260603-C", weight: 400 },
      { supplier: "梓官鮮撈", batchNo: "Z20260603-D", weight: 400 },
    ],
    prevLeftover: 10,
    currLeftover: 15,
    errorAmount: 55, // 1610 - 1550 + 10 - 15 = 55
    errorRate: 3.55,
    anomalyReason: "魚肉較濕",
    otherFactors: "魚肉含水量偏高",
    notes: "魚肉較濕，黏稠度高，故增投原料",
    status: "warn"
  },
  {
    id: "rec-05",
    date: "2026-06-05",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1520,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260605-A", weight: 380 },
      { supplier: "彌陀漁會", batchNo: "M20260605-B", weight: 380 },
      { supplier: "學甲興達", batchNo: "S20260605-C", weight: 380 },
      { supplier: "梓官鮮撈", batchNo: "Z20260605-D", weight: 380 },
    ],
    prevLeftover: 15,
    currLeftover: 10,
    errorAmount: -25, // 1520 - 1550 + 15 - 10 = -25
    errorRate: -1.61,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-06",
    date: "2026-06-06",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1830,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260605-A", weight: 460 },
      { supplier: "彌陀漁會", batchNo: "M20260605-B", weight: 450 },
      { supplier: "學甲興達", batchNo: "S20260605-C", weight: 460 },
      { supplier: "梓官鮮撈", batchNo: "Z20260605-D", weight: 460 },
    ],
    prevLeftover: 10,
    currLeftover: 12,
    errorAmount: -32, // 1830 - 1860 + 10 - 12 = -32
    errorRate: -1.72,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-07",
    date: "2026-06-07",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1250,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260607-A", weight: 310 },
      { supplier: "彌陀漁會", batchNo: "M20260607-B", weight: 310 },
      { supplier: "學甲興達", batchNo: "S20260607-C", weight: 315 },
      { supplier: "梓官鮮撈", batchNo: "Z20260607-D", weight: 315 },
    ],
    prevLeftover: 12,
    currLeftover: 8,
    errorAmount: 14, // 1250 - 1240 + 12 - 8 = 14
    errorRate: 1.13,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-08",
    date: "2026-06-08",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1515,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260607-A", weight: 380 },
      { supplier: "彌陀漁會", batchNo: "M20260607-B", weight: 375 },
      { supplier: "學甲興達", batchNo: "S20260607-C", weight: 380 },
      { supplier: "梓官鮮撈", batchNo: "Z20260607-D", weight: 380 },
    ],
    prevLeftover: 8,
    currLeftover: 10,
    errorAmount: -37, // 1515 - 1550 + 8 - 10 = -37
    errorRate: -2.39,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-09",
    date: "2026-06-09",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1495,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260609-A", weight: 370 },
      { supplier: "彌陀漁會", batchNo: "M20260609-B", weight: 375 },
      { supplier: "學甲興達", batchNo: "S20260609-C", weight: 375 },
      { supplier: "梓官鮮撈", batchNo: "Z20260609-D", weight: 375 },
    ],
    prevLeftover: 10,
    currLeftover: 15,
    errorAmount: -60, // 1495 - 1550 + 10 - 15 = -60
    errorRate: -3.87,
    anomalyReason: "魚肉較乾",
    otherFactors: "魚肉含水率偏低",
    notes: "今日進貨魚肉質地偏乾，油脂與水份少，減少投料",
    status: "warn"
  },
  {
    id: "rec-10",
    date: "2026-06-10",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1840,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260609-A", weight: 460 },
      { supplier: "彌陀漁會", batchNo: "M20260609-B", weight: 460 },
      { supplier: "學甲興達", batchNo: "S20260609-C", weight: 460 },
      { supplier: "梓官鮮撈", batchNo: "Z20260609-D", weight: 460 },
    ],
    prevLeftover: 15,
    currLeftover: 11,
    errorAmount: -16, // 1840 - 1860 + 15 - 11 = -16
    errorRate: -0.86,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-11",
    date: "2026-06-11",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1238,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260611-A", weight: 310 },
      { supplier: "彌陀漁會", batchNo: "M20260611-B", weight: 310 },
      { supplier: "學甲興達", batchNo: "S20260611-C", weight: 308 },
      { supplier: "梓官鮮撈", batchNo: "Z20260611-D", weight: 310 },
    ],
    prevLeftover: 11,
    currLeftover: 9,
    errorAmount: 0, // 1238 - 1240 + 11 - 9 = 0
    errorRate: 0.00,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "完美投料，無誤差",
    status: "normal"
  },
  {
    id: "rec-12",
    date: "2026-06-12",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1635,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260611-A", weight: 410 },
      { supplier: "彌陀漁會", batchNo: "M20260611-B", weight: 405 },
      { supplier: "學甲興達", batchNo: "S20260611-C", weight: 410 },
      { supplier: "梓官鮮撈", batchNo: "Z20260611-D", weight: 410 },
    ],
    prevLeftover: 9,
    currLeftover: 14,
    errorAmount: 80, // 1635 - 1550 + 9 - 14 = 80
    errorRate: 5.16,
    anomalyReason: "魚肉較濕",
    otherFactors: "下雨天魚肉帶水較多",
    notes: "大雨造成運送魚肉表面含水量大增，調高投料比重",
    status: "error"
  },
  {
    id: "rec-13",
    date: "2026-06-13",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1540,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260613-A", weight: 385 },
      { supplier: "彌陀漁會", batchNo: "M20260613-B", weight: 385 },
      { supplier: "學甲興達", batchNo: "S20260613-C", weight: 385 },
      { supplier: "梓官鮮撈", batchNo: "Z20260613-D", weight: 385 },
    ],
    prevLeftover: 14,
    currLeftover: 10,
    errorAmount: 4, // 1540 - 1550 + 14 - 10 = 4
    errorRate: 0.26,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-14",
    date: "2026-06-14",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1810,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260613-A", weight: 450 },
      { supplier: "彌陀漁會", batchNo: "M20260613-B", weight: 450 },
      { supplier: "學甲興達", batchNo: "S20260613-C", weight: 455 },
      { supplier: "梓官鮮撈", batchNo: "Z20260613-D", weight: 455 },
    ],
    prevLeftover: 10,
    currLeftover: 12,
    errorAmount: -52, // 1810 - 1860 + 10 - 12 = -52
    errorRate: -2.80,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-15",
    date: "2026-06-15",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1220,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260615-A", weight: 300 },
      { supplier: "彌陀漁會", batchNo: "M20260615-B", weight: 305 },
      { supplier: "學甲興達", batchNo: "S20260615-C", weight: 305 },
      { supplier: "梓官鮮撈", batchNo: "Z20260615-D", weight: 310 },
    ],
    prevLeftover: 12,
    currLeftover: 15,
    errorAmount: -23, // 1220 - 1240 + 12 - 15 = -23
    errorRate: -1.85,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-16",
    date: "2026-06-16",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1500,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260615-A", weight: 375 },
      { supplier: "彌陀漁會", batchNo: "M20260615-B", weight: 375 },
      { supplier: "學甲興達", batchNo: "S20260615-C", weight: 375 },
      { supplier: "梓官鮮撈", batchNo: "Z20260615-D", weight: 375 },
    ],
    prevLeftover: 15,
    currLeftover: 10,
    errorAmount: -45, // 1500 - 1550 + 15 - 10 = -45
    errorRate: -2.90,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-17",
    date: "2026-06-17",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1480,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260617-A", weight: 370 },
      { supplier: "彌陀漁會", batchNo: "M20260617-B", weight: 370 },
      { supplier: "學甲興達", batchNo: "S20260617-C", weight: 370 },
      { supplier: "梓官鮮撈", batchNo: "Z20260617-D", weight: 370 },
    ],
    prevLeftover: 10,
    currLeftover: 12,
    errorAmount: -82, // 1480 - 1550 + 10 - 12 = -82
    errorRate: -5.29,
    anomalyReason: "秤重異常",
    otherFactors: "地磅傳感器卡異物",
    notes: "磅秤傳感器下方卡木屑，造成讀數偏高，實際物料偏低，下午已排除",
    status: "error"
  },
  {
    id: "rec-18",
    date: "2026-06-18",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1850,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260617-A", weight: 460 },
      { supplier: "彌陀漁會", batchNo: "M20260617-B", weight: 460 },
      { supplier: "學甲興達", batchNo: "S20260617-C", weight: 465 },
      { supplier: "梓官鮮撈", batchNo: "Z20260617-D", weight: 465 },
    ],
    prevLeftover: 12,
    currLeftover: 8,
    errorAmount: -6, // 1850 - 1860 + 12 - 8 = -6
    errorRate: -0.32,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-19",
    date: "2026-06-19",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1245,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260619-A", weight: 310 },
      { supplier: "彌陀漁會", batchNo: "M20260619-B", weight: 310 },
      { supplier: "學甲興達", batchNo: "S20260619-C", weight: 312 },
      { supplier: "梓官鮮撈", batchNo: "Z20260619-D", weight: 313 },
    ],
    prevLeftover: 8,
    currLeftover: 10,
    errorAmount: 3, // 1245 - 1240 + 8 - 10 = 3
    errorRate: 0.24,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-20",
    date: "2026-06-20",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1555,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260619-A", weight: 390 },
      { supplier: "彌陀漁會", batchNo: "M20260619-B", weight: 385 },
      { supplier: "學甲興達", batchNo: "S20260619-C", weight: 390 },
      { supplier: "梓官鮮撈", batchNo: "Z20260619-D", weight: 390 },
    ],
    prevLeftover: 10,
    currLeftover: 11,
    errorAmount: 4, // 1555 - 1550 + 10 - 11 = 4
    errorRate: 0.26,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-21",
    date: "2026-06-21",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1510,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260621-A", weight: 375 },
      { supplier: "彌陀漁會", batchNo: "M20260621-B", weight: 380 },
      { supplier: "學甲興達", batchNo: "S20260621-C", weight: 375 },
      { supplier: "梓官鮮撈", batchNo: "Z20260621-D", weight: 380 },
    ],
    prevLeftover: 11,
    currLeftover: 14,
    errorAmount: -43, // 1510 - 1550 + 11 - 14 = -43
    errorRate: -2.77,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-22",
    date: "2026-06-22",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1880,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260621-A", weight: 470 },
      { supplier: "彌陀漁會", batchNo: "M20260621-B", weight: 470 },
      { supplier: "學甲興達", batchNo: "S20260621-C", weight: 470 },
      { supplier: "梓官鮮撈", batchNo: "Z20260621-D", weight: 470 },
    ],
    prevLeftover: 14,
    currLeftover: 12,
    errorAmount: 22, // 1880 - 1860 + 14 - 12 = 22
    errorRate: 1.18,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-23",
    date: "2026-06-23",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1290,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260623-A", weight: 320 },
      { supplier: "彌陀漁會", batchNo: "M20260623-B", weight: 325 },
      { supplier: "學甲興達", batchNo: "S20260623-C", weight: 325 },
      { supplier: "梓官鮮撈", batchNo: "Z20260623-D", weight: 320 },
    ],
    prevLeftover: 12,
    currLeftover: 10,
    errorAmount: 52, // 1290 - 1240 + 12 - 10 = 52
    errorRate: 4.19,
    anomalyReason: "魚肉較濕",
    otherFactors: "原料水分含量高",
    notes: "魚肉質地較濕軟，增加攪拌時間與投料重",
    status: "warn"
  },
  {
    id: "rec-24",
    date: "2026-06-24",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1545,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260623-A", weight: 390 },
      { supplier: "彌陀漁會", batchNo: "M20260623-B", weight: 385 },
      { supplier: "學甲興達", batchNo: "S20260623-C", weight: 385 },
      { supplier: "梓官鮮撈", batchNo: "Z20260623-D", weight: 385 },
    ],
    prevLeftover: 10,
    currLeftover: 9,
    errorAmount: 6, // 1545 - 1550 + 10 - 9 = 6
    errorRate: 0.39,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-25",
    date: "2026-06-25",
    operator: "阿明",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1520,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260625-A", weight: 380 },
      { supplier: "彌陀漁會", batchNo: "M20260625-B", weight: 380 },
      { supplier: "學甲興達", batchNo: "S20260625-C", weight: 380 },
      { supplier: "梓官鮮撈", batchNo: "Z20260625-D", weight: 380 },
    ],
    prevLeftover: 9,
    currLeftover: 11,
    errorAmount: -32, // 1520 - 1550 + 9 - 11 = -32
    errorRate: -2.06,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-26",
    date: "2026-06-26",
    operator: "阿祥",
    barrels: 6,
    standardWeight: 1860,
    feedingWeight: 1845,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260625-A", weight: 460 },
      { supplier: "彌陀漁會", batchNo: "M20260625-B", weight: 460 },
      { supplier: "學甲興達", batchNo: "S20260625-C", weight: 460 },
      { supplier: "梓官鮮撈", batchNo: "Z20260625-D", weight: 465 },
    ],
    prevLeftover: 11,
    currLeftover: 13,
    errorAmount: -17, // 1845 - 1860 + 11 - 13 = -17
    errorRate: -0.91,
    anomalyReason: "無",
    otherFactors: "常規製造",
    notes: "",
    status: "normal"
  },
  {
    id: "rec-27",
    date: "2026-06-27",
    operator: "小陳",
    barrels: 4,
    standardWeight: 1240,
    feedingWeight: 1215,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260627-A", weight: 300 },
      { supplier: "彌陀漁會", batchNo: "M20260627-B", weight: 305 },
      { supplier: "學甲興達", batchNo: "S20260627-C", weight: 305 },
      { supplier: "梓官鮮撈", batchNo: "Z20260627-D", weight: 305 },
    ],
    prevLeftover: 13,
    currLeftover: 15,
    errorAmount: -27, // 1215 - 1240 + 13 - 15 = -27
    errorRate: -2.18,
    anomalyReason: "設備異常",
    otherFactors: "油壓打漿機攪拌轉速異常",
    notes: "攪拌機轉速不穩造成漿料發熱，微調配比以補償流失，已通報維修",
    status: "warn"
  },
  {
    id: "rec-28",
    date: "2026-06-28",
    operator: "大華",
    barrels: 5,
    standardWeight: 1550,
    feedingWeight: 1720,
    batches: [
      { supplier: "台南永安漁產", batchNo: "F20260627-A", weight: 430 },
      { supplier: "彌陀漁會", batchNo: "M20260627-B", weight: 430 },
      { supplier: "學甲興達", batchNo: "S20260627-C", weight: 430 },
      { supplier: "梓官鮮撈", batchNo: "Z20260627-D", weight: 430 },
    ],
    prevLeftover: 15,
    currLeftover: 12,
    errorAmount: 173, // 1720 - 1550 + 15 - 12 = 173
    errorRate: 11.16,
    anomalyReason: "特殊訂單",
    otherFactors: "高黏度客製魚丸訂單",
    notes: "特別增投特級虱目魚肉及調配比例，生產超高黏度產品",
    status: "severe"
  }
];
