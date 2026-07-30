/**
 * Quy chuẩn Lấy mẫu Kiểm tra Chất lượng Đầu vào (IQC) theo AQL - ISO 2859-1 / ANSI/ASQ Z1.4 / MIL-STD-105E
 * Áp dụng cho Ban QLCL Công ty TNHH Xe điện DK Việt Nhật (DKBike)
 */

export type InspectionLevel = 'I' | 'II' | 'III';
export type AQLLevel = 0.65 | 1.0 | 1.5 | 2.5 | 4.0;

export interface AQLResult {
  codeLetter: string;
  sampleSize: number;
  ac: number;
  re: number;
  aqlLevel: AQLLevel;
  level: InspectionLevel;
  evaluation: 'Pass' | 'Fail';
}

/**
 * Tra cứu Mã chữ cái quy mô lô hàng (Code Letter) theo Cấp kiểm tra (Inspection Level)
 * Mặc định: Cấp II (Mức kiểm tra thường Bậc II)
 */
export function getAQLCodeLetter(lotSize: number, level: InspectionLevel = 'II'): string {
  const size = Math.max(1, Math.floor(lotSize || 0));
  
  if (level === 'II') {
    if (size <= 8) return 'A';
    if (size <= 15) return 'B';
    if (size <= 25) return 'C';
    if (size <= 50) return 'D';
    if (size <= 90) return 'E';
    if (size <= 150) return 'F';
    if (size <= 280) return 'G';
    if (size <= 500) return 'H';
    if (size <= 1200) return 'J';
    if (size <= 3200) return 'K';
    if (size <= 10000) return 'L';
    if (size <= 35000) return 'M';
    if (size <= 150000) return 'N';
    if (size <= 500000) return 'P';
    return 'Q';
  } else if (level === 'I') { // Kiểm tra giảm
    if (size <= 8) return 'A';
    if (size <= 15) return 'A';
    if (size <= 25) return 'B';
    if (size <= 50) return 'C';
    if (size <= 90) return 'D';
    if (size <= 150) return 'E';
    if (size <= 280) return 'F';
    if (size <= 500) return 'G';
    if (size <= 1200) return 'H';
    if (size <= 3200) return 'J';
    if (size <= 10000) return 'K';
    if (size <= 35000) return 'L';
    if (size <= 150000) return 'M';
    if (size <= 500000) return 'N';
    return 'P';
  } else { // Level III - Kiểm tra chặt
    if (size <= 8) return 'B';
    if (size <= 15) return 'C';
    if (size <= 25) return 'D';
    if (size <= 50) return 'E';
    if (size <= 90) return 'F';
    if (size <= 150) return 'G';
    if (size <= 280) return 'H';
    if (size <= 500) return 'J';
    if (size <= 1200) return 'K';
    if (size <= 3200) return 'L';
    if (size <= 10000) return 'M';
    if (size <= 35000) return 'N';
    if (size <= 150000) return 'P';
    return 'Q';
  }
}

/**
 * Bảng quy đổi Mã chữ cái sang Cỡ mẫu trích kiểm (Sample Size)
 */
export const CODE_LETTER_SAMPLE_SIZE: Record<string, number> = {
  'A': 2,
  'B': 3,
  'C': 5,
  'D': 8,
  'E': 13,
  'F': 20,
  'G': 32,
  'H': 50,
  'J': 80,
  'K': 125,
  'L': 200,
  'M': 315,
  'N': 500,
  'P': 800,
  'Q': 1250
};

/**
 * Bảng tra Ngưỡng Chấp nhận (Ac) / Bác bỏ (Re) theo Ngưỡng AQL (AQL Single Normal Sampling Plan)
 */
export const AQL_AC_RE_TABLE: Record<string, Record<number, [number, number]>> = {
  'A': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [0, 1], 2.5: [0, 1], 4.0: [0, 1] },
  'B': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [0, 1], 2.5: [0, 1], 4.0: [0, 1] },
  'C': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [0, 1], 2.5: [0, 1], 4.0: [0, 1] },
  'D': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [0, 1], 2.5: [0, 1], 4.0: [1, 2] },
  'E': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [0, 1], 2.5: [1, 2], 4.0: [1, 2] },
  'F': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [0, 1], 2.5: [1, 2], 4.0: [2, 3] },
  'G': { 0.65: [0, 1], 1.0: [0, 1], 1.5: [1, 2], 2.5: [2, 3], 4.0: [3, 4] },
  'H': { 0.65: [0, 1], 1.0: [1, 2], 1.5: [2, 3], 2.5: [3, 4], 4.0: [5, 6] },
  'J': { 0.65: [1, 2], 1.0: [2, 3], 1.5: [3, 4], 2.5: [5, 6], 4.0: [7, 8] },
  'K': { 0.65: [2, 3], 1.0: [3, 4], 1.5: [5, 6], 2.5: [7, 8], 4.0: [10, 11] },
  'L': { 0.65: [3, 4], 1.0: [5, 6], 1.5: [7, 8], 2.5: [10, 11], 4.0: [14, 15] },
  'M': { 0.65: [5, 6], 1.0: [7, 8], 1.5: [10, 11], 2.5: [14, 15], 4.0: [21, 22] },
  'N': { 0.65: [7, 8], 1.0: [10, 11], 1.5: [14, 15], 2.5: [21, 22], 4.0: [21, 22] },
  'P': { 0.65: [10, 11], 1.0: [14, 15], 1.5: [21, 22], 2.5: [21, 22], 4.0: [21, 22] },
  'Q': { 0.65: [14, 15], 1.0: [21, 22], 1.5: [21, 22], 2.5: [21, 22], 4.0: [21, 22] },
};

/**
 * Tính toán đầy đủ kết quả trích mẫu AQL cho một quy mô lô hàng
 */
export function calculateAQLSample(
  lotSize: number,
  failedQty: number = 0,
  aqlLevel: AQLLevel = 1.5,
  level: InspectionLevel = 'II'
): AQLResult {
  const lot = Math.max(1, Math.floor(lotSize || 0));
  const code = getAQLCodeLetter(lot, level);
  let sampleSize = CODE_LETTER_SAMPLE_SIZE[code] || 80;
  
  if (sampleSize > lot) {
    sampleSize = lot;
  }

  const acReMap = AQL_AC_RE_TABLE[code]?.[aqlLevel] || [1, 2];
  const ac = acReMap[0];
  const re = acReMap[1];

  const evaluation = failedQty <= ac ? 'Pass' : 'Fail';

  return {
    codeLetter: code,
    sampleSize,
    ac,
    re,
    aqlLevel,
    level,
    evaluation
  };
}
