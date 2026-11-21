import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import {
  BomModelLineItem,
  BomPartMasterItem,
  EcountParsedBomRow
} from '../types/bomCatalog';
import { normalizeColoredPlasticPart } from '../services/bomCatalogService';

const BRAND_TITLE = 'CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT';
const BRAND_SUB = 'DKBike — Xe cho cả gia đình | Phòng Quản lý chất lượng (QLCL / DK QMS)';

const HEADER_FILL = { fgColor: { rgb: '1E3A8A' } };
const SUBHEADER_FILL = { fgColor: { rgb: 'EFF6FF' } };
const TH_FILL = { fgColor: { rgb: '1E40AF' } };
const ZEBRA_FILL = { fgColor: { rgb: 'F8FAFC' } };
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

function normalizeHeader(val: any): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

function parseNumericQty(raw: any): number {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : 1;
  const cleaned = String(raw ?? '').trim().replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseOptionalNumber(raw: any): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const cleaned = String(raw).trim().replace(/,/g, '');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Phân tích file Excel/CSV BOM xuất từ Ecount (hỗ trợ cả mẫu cũ lẫn mẫu mới nhiều cột):
 * - Cột hỗ trợ: Mã mặt hàng, Tên mặt hàng, Thông số, Đơn vị, Ghi chú, Định mức tiêu thụ / Số lượng,
 *   Số lượng tồn kho, Trạng thái, Tên khách hàng/nhà cung cấp, Giá mua, Giá bán, Từ khóa.
 * - Tự động bỏ qua các cột: Giá nhập, Thành tiền nhập, Thành tiền bán.
 * - Tự động chuẩn hóa linh kiện "Nhựa màu" về phôi không màu (bỏ 4 số cuối mã & bỏ tên màu sau tên linh kiện).
 */
export async function parseEcountBomExcel(
  file: File,
  options?: {
    normalizeColoredPlastic?: boolean;
    extraColors?: string[];
  }
): Promise<{
  rows: EcountParsedBomRow[];
  warnings: string[];
  normalizedColoredCount: number;
}> {
  const normalizeColoredPlastic = options?.normalizeColoredPlastic !== false;
  const extraColors = options?.extraColors || [];

  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string' })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel không có sheet dữ liệu nào.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawMatrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  if (!rawMatrix || rawMatrix.length === 0) {
    throw new Error('Sheet đầu tiên trong file Excel đang trống.');
  }

  // Tự động dò dòng tiêu đề trong 20 dòng đầu tiên
  let headerRowIdx = -1;
  let colMap = {
    stt: -1,
    partCode: -1,
    partName: -1,
    specGroup: -1,
    unit: -1,
    qty: -1,
    note: -1,
    stockQty: -1,
    status: -1,
    supplierName: -1,
    purchasePrice: -1,
    sellingPrice: -1,
    keywords: -1
  };

  for (let r = 0; r < Math.min(20, rawMatrix.length); r++) {
    const row = rawMatrix[r] || [];
    const candidate = {
      stt: -1,
      partCode: -1,
      partName: -1,
      specGroup: -1,
      unit: -1,
      qty: -1,
      note: -1,
      stockQty: -1,
      status: -1,
      supplierName: -1,
      purchasePrice: -1,
      sellingPrice: -1,
      keywords: -1
    };
    row.forEach((cell: any, cIdx: number) => {
      const h = normalizeHeader(cell);
      if (!h) return;

      // Tự động bỏ qua tuyệt đối: Giá nhập, Thành tiền nhập, Thành tiền bán
      if (
        h === 'gia nhap' ||
        h.includes('thanh tien nhap') ||
        h.includes('thanh tien ban')
      ) {
        return;
      }

      if (h === 'stt' || h === 'no' || h === 'no.') candidate.stt = cIdx;
      else if (h.includes('ma mat hang') || h.includes('ma linh kien') || h === 'ma hang' || h === 'item code' || h === 'part code') candidate.partCode = cIdx;
      else if (h.includes('ten mat hang') || h.includes('ten linh kien') || h === 'ten hang' || h === 'item name' || h === 'part name') candidate.partName = cIdx;
      else if (h === 'thong so' || h.includes('nhom') || h === 'spec') candidate.specGroup = cIdx;
      else if (h === 'don vi' || h === 'dvt' || h === 'unit') candidate.unit = cIdx;
      else if (h.includes('dinh muc tieu thu') || h === 'dinh muc' || h === 'so luong' || h === 'sl' || h === 'qty') candidate.qty = cIdx;
      else if (h === 'ghi chu' || h === 'note' || h === 'remark') candidate.note = cIdx;
      else if (h.includes('ton kho') || h === 'so luong ton' || h === 'stock') candidate.stockQty = cIdx;
      else if (h === 'trang thai' || h === 'status') candidate.status = cIdx;
      else if (h.includes('nha cung cap') || h.includes('ten khach hang/nha cung cap') || h === 'ncc' || h === 'supplier') candidate.supplierName = cIdx;
      else if (h === 'gia mua' || h === 'purchase price') candidate.purchasePrice = cIdx;
      else if (h === 'gia ban' || h === 'selling price') candidate.sellingPrice = cIdx;
      else if (h === 'tu khoa' || h === 'keyword' || h === 'keywords') candidate.keywords = cIdx;
    });

    if (candidate.partCode >= 0 && candidate.partName >= 0) {
      headerRowIdx = r;
      colMap = candidate;
      break;
    }
  }

  // Fallback nếu file không có header chuẩn
  let dataStartRow = headerRowIdx + 1;
  if (headerRowIdx === -1) {
    dataStartRow = 0;
    const firstNonEmpty = rawMatrix.find(r => Array.isArray(r) && r.some(c => String(c ?? '').trim() !== ''));
    const looksLikeSttFirst = firstNonEmpty && /^\d+$/.test(String(firstNonEmpty[0] ?? '').trim());
    if (looksLikeSttFirst) {
      colMap = { ...colMap, stt: 0, partCode: 1, partName: 2, specGroup: 3, unit: 4, qty: 5 };
    } else {
      colMap = { ...colMap, stt: -1, partCode: 0, partName: 1, specGroup: 2, unit: 3, qty: 4 };
    }
  }

  const parsedMap = new Map<string, EcountParsedBomRow & { _rawCodesSeen: Set<string> }>();
  const warnings: string[] = [];
  let normalizedColoredCount = 0;

  for (let r = dataStartRow; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    if (!Array.isArray(row)) continue;

    const rawCode = String(row[colMap.partCode] ?? '').trim().toUpperCase();
    const rawName = String(row[colMap.partName] ?? '').trim();

    if (!rawCode && !rawName) continue;
    // Bỏ qua dòng tổng cộng hoặc dòng header lặp lại
    if (normalizeHeader(rawCode).includes('ma mat hang') || normalizeHeader(rawName).startsWith('tong')) {
      continue;
    }
    if (!rawCode) {
      warnings.push(`Dòng ${r + 1}: Thiếu Mã mặt hàng ("${rawName || 'trống'}") -> đã bỏ qua.`);
      continue;
    }

    const specGroup = colMap.specGroup >= 0 ? String(row[colMap.specGroup] ?? '').trim() : '';
    const unit = colMap.unit >= 0 ? String(row[colMap.unit] ?? '').trim() || 'Cái' : 'Cái';
    const qty = colMap.qty >= 0 ? parseNumericQty(row[colMap.qty]) : 1;
    const note = colMap.note >= 0 ? String(row[colMap.note] ?? '').trim() : '';
    const stockQty = colMap.stockQty >= 0 ? parseOptionalNumber(row[colMap.stockQty]) : undefined;
    const ecountStatus = colMap.status >= 0 ? String(row[colMap.status] ?? '').trim() : '';
    const supplierName = colMap.supplierName >= 0 ? String(row[colMap.supplierName] ?? '').trim() : '';
    const purchasePrice = colMap.purchasePrice >= 0 ? parseOptionalNumber(row[colMap.purchasePrice]) : undefined;
    const sellingPrice = colMap.sellingPrice >= 0 ? parseOptionalNumber(row[colMap.sellingPrice]) : undefined;
    const keywords = colMap.keywords >= 0 ? String(row[colMap.keywords] ?? '').trim() : '';
    const sttVal = colMap.stt >= 0 ? Number(row[colMap.stt]) : NaN;
    const lineNo = Number.isFinite(sttVal) && sttVal > 0 ? sttVal : parsedMap.size + 1;

    let finalCode = rawCode;
    let finalName = rawName || rawCode;
    let detectedColor = '';
    let isNormalizedFromColor = false;

    if (normalizeColoredPlastic) {
      const normRes = normalizeColoredPlasticPart(rawCode, rawName, specGroup, extraColors);
      finalCode = normRes.partCode;
      finalName = normRes.partName || rawName || finalCode;
      detectedColor = normRes.detectedColor;
      isNormalizedFromColor = normRes.codeWasStripped || normRes.nameWasStripped;
      if (isNormalizedFromColor) {
        normalizedColoredCount++;
      }
    }

    if (parsedMap.has(finalCode)) {
      const existing = parsedMap.get(finalCode)!;
      if (existing._rawCodesSeen.has(rawCode)) {
        // Trùng y hệt mã gốc trong cùng 1 file BOM -> cộng dồn số lượng
        existing.qty = Number((existing.qty + qty).toFixed(4));
        warnings.push(`Mã ${finalCode} (gốc ${rawCode}) xuất hiện lặp lại ở dòng ${r + 1} -> đã tự cộng dồn số lượng (${existing.qty}).`);
      } else {
        // Khác màu nhưng quy về cùng 1 Phôi -> giữ định mức lớn nhất (không nhân đôi SL/xe)
        existing._rawCodesSeen.add(rawCode);
        existing.qty = Math.max(existing.qty, qty);
        if (detectedColor && existing.detectedColor && !existing.detectedColor.includes(detectedColor)) {
          existing.detectedColor = `${existing.detectedColor}, ${detectedColor}`;
        } else if (detectedColor && !existing.detectedColor) {
          existing.detectedColor = detectedColor;
        }
      }
      if (note && !existing.note.includes(note)) {
        existing.note = existing.note ? `${existing.note}; ${note}` : note;
      }
      if (!existing.supplierName && supplierName) existing.supplierName = supplierName;
      if (existing.stockQty === undefined && stockQty !== undefined) existing.stockQty = stockQty;
      if (existing.purchasePrice === undefined && purchasePrice !== undefined) existing.purchasePrice = purchasePrice;
      if (existing.sellingPrice === undefined && sellingPrice !== undefined) existing.sellingPrice = sellingPrice;
      if (!existing.keywords && keywords) existing.keywords = keywords;
    } else {
      parsedMap.set(finalCode, {
        lineNo,
        partCode: finalCode,
        partName: finalName,
        specGroup,
        unit,
        qty,
        note,
        rawRowNumber: r + 1,
        rawPartCode: rawCode,
        rawPartName: rawName,
        detectedColor,
        isNormalizedFromColor,
        stockQty,
        ecountStatus,
        supplierName,
        purchasePrice,
        sellingPrice,
        keywords,
        _rawCodesSeen: new Set([rawCode])
      });
    }
  }

  const rows: EcountParsedBomRow[] = Array.from(parsedMap.values()).map(({ _rawCodesSeen, ...item }, idx) => ({
    ...item,
    lineNo: idx + 1
  }));

  if (rows.length === 0) {
    throw new Error('Không đọc được dòng linh kiện hợp lệ nào. Vui lòng kiểm tra cột "Mã mặt hàng" và "Tên mặt hàng".');
  }

  return { rows, warnings, normalizedColoredCount };
}

function applyStyledSheet(
  titleText: string,
  metaText: string,
  headers: string[],
  dataRows: (string | number)[][],
  colWidths: number[],
  sheetName: string,
  fileName: string
): void {
  const colCount = headers.length;
  const aoa: (string | number)[][] = [
    [BRAND_TITLE, ...Array(colCount - 1).fill('')],
    [BRAND_SUB, ...Array(colCount - 1).fill('')],
    [titleText, ...Array(colCount - 1).fill('')],
    [metaText, ...Array(colCount - 1).fill('')],
    [],
    headers,
    ...dataRows
  ];

  const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } }
  ];
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  ws['!rows'] = [
    { hpt: 24 },
    { hpt: 18 },
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 26 },
    ...dataRows.map(() => ({ hpt: 22 }))
  ];

  const setCellStyle = (r: number, c: number, style: any) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
    ws[addr].s = style;
  };

  for (let c = 0; c < colCount; c++) {
    setCellStyle(0, c, {
      font: { name: 'Arial', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
      fill: HEADER_FILL,
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    setCellStyle(1, c, {
      font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '1E3A8A' } },
      fill: SUBHEADER_FILL,
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    setCellStyle(2, c, {
      font: { name: 'Arial', sz: 11.5, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    setCellStyle(3, c, {
      font: { name: 'Arial', sz: 9.5, color: { rgb: '475569' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    setCellStyle(5, c, {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      fill: TH_FILL,
      border: BORDER_THIN,
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    });
  }

  for (let r = 0; r < dataRows.length; r++) {
    const rowIdx = 6 + r;
    const isEven = r % 2 === 1;
    for (let c = 0; c < colCount; c++) {
      const h = headers[c].toLowerCase();
      const align =
        h === 'stt' || h === 'đơn vị' || h === 'trạng thái'
          ? 'center'
          : h === 'số lượng' || h.includes('số model') || h.includes('tồn kho') || h.includes('giá')
            ? 'right'
            : 'left';

      setCellStyle(rowIdx, c, {
        font: { name: 'Arial', sz: 10, bold: c === 1, color: { rgb: '0F172A' } },
        fill: isEven ? ZEBRA_FILL : undefined,
        border: BORDER_THIN,
        alignment: { horizontal: align, vertical: 'center', wrapText: true }
      });
    }
  }

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSXStyle.writeFile(wb, fileName);
}

/**
 * Xuất Excel BOM theo Model:
 * - mode 'ecount': đúng các cột bảng Ecount (STT, Mã mặt hàng, Tên mặt hàng, Thông số, Đơn vị, Số lượng, Ghi chú)
 * - mode 'full': bổ sung thêm Tồn kho, Giá bán, (Giá mua nếu có quyền), Nhà cung cấp, Từ khóa, Thông số kỹ thuật, Trạng thái, Dùng chung
 */
export function exportModelBomExcel(params: {
  modelName: string;
  colorCount: number;
  lines: BomModelLineItem[];
  partsByCode: Map<string, BomPartMasterItem>;
  whereUsedByCode: Map<string, string[]>;
  mode: 'ecount' | 'full';
  includePurchasePrice?: boolean;
}): void {
  const { modelName, colorCount, lines, partsByCode, whereUsedByCode, mode, includePurchasePrice = false } = params;
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const safeFileModel = modelName.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');

  if (mode === 'ecount') {
    const headers = ['STT', 'Mã mặt hàng', 'Tên mặt hàng', 'Thông số', 'Đơn vị', 'Số lượng', 'Ghi chú'];
    const rows = lines.map((line, idx) => {
      const code = line.partCode.trim().toUpperCase();
      const part = partsByCode.get(code);
      return [
        idx + 1,
        code,
        part?.partName || code,
        part?.specGroup || '',
        line.unit || part?.unit || 'Cái',
        line.qty,
        line.note || part?.note || ''
      ];
    });
    applyStyledSheet(
      `ĐỊNH MỨC LINH KIỆN (BOM) THEO MODEL: ${modelName.toUpperCase()}`,
      `Ngày xuất: ${todayStr}   |   Tổng số linh kiện: ${lines.length} mã   |   Số màu xe: ${colorCount}   |   Chuẩn cột Ecount`,
      headers,
      rows,
      [7, 18, 42, 16, 10, 12, 32],
      `BOM_${safeFileModel}`,
      `BOM_Ecount_${safeFileModel}.xlsx`
    );
    return;
  }

  const headers = [
    'STT',
    'Mã mặt hàng',
    'Tên mặt hàng',
    'Thông số',
    'Đơn vị',
    'Định mức tiêu thụ',
    'Số lượng tồn kho',
    ...(includePurchasePrice ? ['Giá mua'] : []),
    'Giá bán',
    'Nhà cung cấp',
    'Từ khóa',
    'Thông số kỹ thuật',
    'Trạng thái',
    'Model dùng chung',
    'Ghi chú'
  ];

  const rows = lines.map((line, idx) => {
    const code = line.partCode.trim().toUpperCase();
    const part = partsByCode.get(code);
    const sharedModels = whereUsedByCode.get(code) || [modelName];
    return [
      idx + 1,
      code,
      part?.partName || code,
      part?.specGroup || '',
      line.unit || part?.unit || 'Cái',
      line.qty,
      part?.stockQty ?? '',
      ...(includePurchasePrice ? [part?.purchasePrice ?? ''] : []),
      part?.sellingPrice ?? '',
      part?.supplierName || '',
      part?.keywords || '',
      part?.techSpecs || '',
      part?.status || 'Đang dùng',
      sharedModels.join(', '),
      line.note || part?.note || ''
    ];
  });

  const widths = [
    7, 18, 38, 15, 10, 14, 14,
    ...(includePurchasePrice ? [14] : []),
    14, 28, 24, 34, 15, 34, 24
  ];

  applyStyledSheet(
    `DANH MỤC LINH KIỆN & THÔNG SỐ KỸ THUẬT: ${modelName.toUpperCase()}`,
    `Ngày xuất: ${todayStr}   |   Tổng số linh kiện: ${lines.length} mã   |   Số màu xe: ${colorCount}`,
    headers,
    rows,
    widths,
    `BOM_${safeFileModel}`,
    `BOM_QLCL_${safeFileModel}.xlsx`
  );
}

/**
 * Xuất Excel toàn bộ Kho Linh kiện & Danh sách Model dùng chung (Where-Used).
 */
export function exportPartsMasterExcel(params: {
  parts: BomPartMasterItem[];
  whereUsedByCode: Map<string, string[]>;
  includePurchasePrice?: boolean;
}): void {
  const { parts, whereUsedByCode, includePurchasePrice = false } = params;
  const todayStr = new Date().toLocaleDateString('vi-VN');
  const headers = [
    'STT',
    'Mã mặt hàng',
    'Tên mặt hàng',
    'Thông số',
    'Đơn vị',
    'Số lượng tồn kho',
    ...(includePurchasePrice ? ['Giá mua'] : []),
    'Giá bán',
    'Nhà cung cấp',
    'Từ khóa',
    'Thông số kỹ thuật',
    'Trạng thái',
    'Số ảnh',
    'Số Model dùng chung',
    'Các Model sử dụng',
    'Ghi chú'
  ];

  const rows = parts.map((p, idx) => {
    const code = p.partCode.trim().toUpperCase();
    const models = whereUsedByCode.get(code) || [];
    return [
      idx + 1,
      code,
      p.partName,
      p.specGroup || '',
      p.unit || 'Cái',
      p.stockQty ?? '',
      ...(includePurchasePrice ? [p.purchasePrice ?? ''] : []),
      p.sellingPrice ?? '',
      p.supplierName || '',
      p.keywords || '',
      p.techSpecs || '',
      p.status || 'Đang dùng',
      Array.isArray(p.images) ? p.images.length : 0,
      models.length,
      models.join(', '),
      p.note || ''
    ];
  });

  const widths = [
    7, 18, 38, 15, 10, 14,
    ...(includePurchasePrice ? [14] : []),
    14, 28, 24, 34, 15, 10, 14, 40, 24
  ];

  applyStyledSheet(
    'KHO LINH KIỆN GỐC & DANH SÁCH MODEL DÙNG CHUNG (WHERE-USED)',
    `Ngày xuất: ${todayStr}   |   Tổng số mã linh kiện: ${parts.length}`,
    headers,
    rows,
    widths,
    'Kho_Linh_Kien_DKBike',
    `Kho_Linh_Kien_DKBike_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
