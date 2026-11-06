import XLSXStyle from 'xlsx-js-style';
import { IQCLineItem, IQCRecord } from '../qualityTestData';
import { calculateAQLSample } from './aqlUtils';

// Tiêu chuẩn AQL mặc định của DKBike cho IQC
export const IQC_DEFAULT_AQL = 1.5 as const;
export const IQC_DEFAULT_LEVEL = 'II' as const;

// Giới hạn ảnh toàn phiếu để document Firestore < 1MB (mỗi ảnh nén ~30KB)
export const IQC_MAX_ITEM_IMAGES_PER_RECORD = 20;
export const IQC_MAX_IMAGES_PER_LINE = 2;

export const IQC_DEFECT_TYPES = [
  'Trầy xước',
  'Sai màu / lệch màu',
  'Nứt / vỡ',
  'Biến dạng / cong vênh',
  'Sai kích thước',
  'Bavia / ba via',
  'Lỗi sơn / bong tróc',
  'Rỉ sét / oxy hóa',
  'Thiếu chi tiết',
  'Sai mã / nhầm hàng',
  'Thiếu số lượng',
  'Lỗi chức năng',
  'Bẩn / dính tạp chất',
  'Lỗi đóng gói'
];

/** Lấy tên nhóm AQL: cùng tên khác màu gộp chung (bỏ phần sau dấu " - ") */
export const getAqlGroupName = (partName: string): string => {
  const name = (partName || '').trim();
  if (!name) return '';
  const idx = name.indexOf(' - ');
  return (idx > 0 ? name.slice(0, idx) : name).trim();
};

const parseNum = (raw: string | undefined): number => {
  if (!raw) return 0;
  let cleaned = String(raw).replace(/\s/g, '').trim();
  cleaned = cleaned.replace(/\.00$/, '');
  if (/^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

/**
 * Phân tích bảng chi tiết linh kiện trong phiếu copy/paste từ Ecount.
 * Thứ tự cột chuẩn:
 * Mã hàng | Tên mặt hàng | Đơn vị | Số lượng | Gia mua | Thành tiền | Ghi chú | Q. lý
 * (Hỗ trợ cả trường hợp có hoặc không có dòng tiêu đề).
 */
export const parseEcountVoucherDetail = (text: string): IQCLineItem[] => {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const items: IQCLineItem[] = [];

  let header: { code: number; name: number; unit: number; qty: number; spec: number } | null = null;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const rawCols = rawLine.includes('\t')
      ? rawLine.split('\t').map(c => c.replace(/\s+Fn$/i, '').trim())
      : rawLine.split(/\s{2,}/).map(c => c.replace(/\s+Fn$/i, '').trim());
    // Loại bỏ ô nút "Fn" độc lập của Ecount nếu có
    const cols = rawCols.filter(c => c.toLowerCase() !== 'fn');

    const lower = cols.map(c => c.toLowerCase());
    if (lower.some(c => c.includes('mã hàng') || c.includes('mã mặt hàng') || c.includes('tên mặt hàng'))) {
      const find = (pred: (c: string) => boolean) => lower.findIndex(pred);
      header = {
        code: find(c => c === 'mã hàng' || c.includes('mã mặt hàng') || c.includes('mã hàng')),
        name: find(c => c.includes('tên mặt hàng') || c.includes('tên hàng')),
        unit: find(c => c.includes('đơn vị') || c === 'đvt'),
        qty: find(c => c.includes('số lượng') || c === 'sl'),
        spec: find(c => c.includes('ghi chú') || c.includes('thông số') || c.includes('quy cách'))
      };
      continue;
    }

    let code = '', name = '', spec = '', unit = '', qty = 0;
    if (header && (header.code >= 0 || header.name >= 0)) {
      code = header.code >= 0 ? cols[header.code] || '' : '';
      name = header.name >= 0 ? cols[header.name] || '' : '';
      unit = header.unit >= 0 ? cols[header.unit] || '' : '';
      qty = header.qty >= 0 ? parseNum(cols[header.qty]) : 0;
      spec = header.spec >= 0 ? cols[header.spec] || '' : '';
    } else {
      // Không có dòng tiêu đề: mặc định theo thứ tự chuẩn của anh Thao:
      // [0] Mã hàng | [1] Tên mặt hàng | [2] Đơn vị | [3] Số lượng | [4] Gia mua | [5] Thành tiền | [6] Ghi chú | [7] Q. lý
      let ci = 0;
      while (ci < cols.length && !cols[ci]) ci++;
      // Nếu cột đầu chỉ là STT (1, 2, 3...) và cột kế tiếp là Mã hàng
      if (
        /^\d{1,2}$/.test(cols[ci] || '') &&
        cols.length >= ci + 5 &&
        Boolean(cols[ci + 1]) &&
        isNaN(Number(cols[ci + 3])) &&
        parseNum(cols[ci + 4]) > 0
      ) {
        ci++;
      }
      if (ci >= cols.length) continue;

      code = cols[ci] || '';
      name = cols[ci + 1] || '';

      if (cols.length === ci + 3 && parseNum(cols[ci + 2]) > 0) {
        // Trường hợp chỉ dán 3 cột: Mã hàng | Tên mặt hàng | Số lượng
        unit = '';
        qty = parseNum(cols[ci + 2]);
      } else if (
        parseNum(cols[ci + 3]) === 0 &&
        Boolean(cols[ci + 3]) &&
        isNaN(Number(cols[ci + 3])) &&
        parseNum(cols[ci + 4]) > 0
      ) {
        // Trường hợp bảng có thêm cột Thông số trước Đơn vị: Mã | Tên | Thông số | Đơn vị | Số lượng
        spec = cols[ci + 2] || '';
        unit = cols[ci + 3] || '';
        qty = parseNum(cols[ci + 4]);
      } else {
        // Thứ tự chuẩn: Mã hàng (0) | Tên mặt hàng (1) | Đơn vị (2) | Số lượng (3) | Gia mua (4) | Thành tiền (5) | Ghi chú (6) | Q. lý (7)
        unit = cols[ci + 2] || '';
        qty = parseNum(cols[ci + 3]);
        spec = cols[ci + 6] || '';
      }
    }

    name = name.replace(/\s+Fn$/i, '').trim();
    code = code.replace(/\s+Fn$/i, '').trim();
    if (!code && !name) continue;
    if (/^(tổng|total|cộng)/i.test(code) || /^(tổng|total|cộng)/i.test(name)) continue;
    if (qty <= 0 && !name) continue;

    items.push({
      lineNo: items.length + 1,
      partCode: code,
      partName: name,
      spec,
      unit,
      qty: Math.abs(qty),
      aqlGroup: getAqlGroupName(name || code),
      sampleQty: 0,
      failedQty: 0,
      defectType: '',
      defectDetail: '',
      result: 'Đạt',
      imageUrls: []
    });
  }
  return recalcIqcItemsAql(items);
};

export interface IqcAqlGroupInfo {
  group: string;
  qty: number;
  sampleSize: number;
  codeLetter: string;
  ac: number;
  re: number;
  failedQty: number;
  lineCount: number;
  accepted: boolean;
}

export const getIqcAqlGroups = (items: IQCLineItem[]): IqcAqlGroupInfo[] => {
  const map = new Map<string, IQCLineItem[]>();
  items.forEach(it => {
    const g = (it.aqlGroup || getAqlGroupName(it.partName) || it.partCode || `Dòng ${it.lineNo}`).trim();
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(it);
  });
  return Array.from(map.entries()).map(([group, list]) => {
    const qty = list.reduce((s, x) => s + (Number(x.qty) || 0), 0);
    const failedQty = list.reduce((s, x) => s + (Number(x.failedQty) || 0), 0);
    const aql = calculateAQLSample(qty, failedQty, IQC_DEFAULT_AQL, IQC_DEFAULT_LEVEL);
    return {
      group,
      qty,
      sampleSize: qty > 0 ? aql.sampleSize : 0,
      codeLetter: aql.codeLetter,
      ac: aql.ac,
      re: aql.re,
      failedQty,
      lineCount: list.length,
      accepted: failedQty <= aql.ac
    };
  });
};

/** Tính lại cỡ mẫu AQL theo nhóm (cùng tên khác màu gộp tổng SL), phân bổ mẫu về từng dòng theo tỉ lệ SL */
export const recalcIqcItemsAql = (items: IQCLineItem[]): IQCLineItem[] => {
  const groups = getIqcAqlGroups(items);
  const result = items.map(it => ({ ...it }));

  groups.forEach(g => {
    const members = result.filter(it => (it.aqlGroup || getAqlGroupName(it.partName) || it.partCode || `Dòng ${it.lineNo}`).trim() === g.group);
    if (g.qty <= 0) {
      members.forEach(m => { m.sampleQty = 0; });
      return;
    }
    // Phân bổ theo phương pháp phần dư lớn nhất
    const raws = members.map(m => (g.sampleSize * (Number(m.qty) || 0)) / g.qty);
    const floors = raws.map(r => Math.floor(r));
    let remain = g.sampleSize - floors.reduce((s, x) => s + x, 0);
    const order = raws.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
    for (const o of order) {
      if (remain <= 0) break;
      floors[o.i] += 1;
      remain--;
    }
    members.forEach((m, i) => {
      const q = Number(m.qty) || 0;
      let s = floors[i];
      if (q > 0 && s < 1) s = 1; // mỗi màu kiểm tối thiểu 1 mẫu
      m.sampleQty = Math.min(q, s);
    });
  });
  return result.map((it, idx) => ({
    ...it,
    lineNo: idx + 1,
    result: (Number(it.failedQty) || 0) > 0 ? 'Lỗi' : 'Đạt'
  }));
};

export interface IqcItemsSummary {
  lineCount: number;
  failedLines: number;
  totalQty: number;
  checkedQty: number;
  failedQty: number;
  defectRate: number;
  result: 'Đạt' | 'Lỗi';
  defectDetail: string;
  itemSummary: string;
}

export const summarizeIqcItems = (items: IQCLineItem[]): IqcItemsSummary => {
  const totalQty = items.reduce((s, x) => s + (Number(x.qty) || 0), 0);
  const checkedQty = items.reduce((s, x) => s + (Number(x.sampleQty) || 0), 0);
  const failedQty = items.reduce((s, x) => s + (Number(x.failedQty) || 0), 0);
  const failedItems = items.filter(x => (Number(x.failedQty) || 0) > 0);
  const defectDetail = failedItems
    .map(x => {
      const extra = [x.defectType, x.defectDetail].filter(Boolean).join(' - ');
      return `${x.partName || x.partCode}: ${x.failedQty} lỗi${extra ? ` (${extra})` : ''}`;
    })
    .join('; ');
  const groupNames = Array.from(new Set(items.map(x => x.aqlGroup || getAqlGroupName(x.partName)).filter(Boolean)));
  const itemSummary = groupNames.slice(0, 4).join(', ') + (groupNames.length > 4 ? ` +${groupNames.length - 4} nhóm` : '');
  return {
    lineCount: items.length,
    failedLines: failedItems.length,
    totalQty,
    checkedQty,
    failedQty,
    defectRate: totalQty > 0 ? Number(((failedQty / totalQty) * 100).toFixed(2)) : 0,
    result: failedQty > 0 ? 'Lỗi' : 'Đạt',
    defectDetail,
    itemSummary
  };
};

/** Áp tổng hợp từ các dòng linh kiện lên phiếu cha (giữ nguyên các trường khác) */
export const applyIqcItemsToRecord = (record: IQCRecord, items: IQCLineItem[]): IQCRecord => {
  if (!items || items.length === 0) {
    const { items: _omit, ...rest } = record;
    void _omit;
    return rest as IQCRecord;
  }
  const normalized = items.map((it, idx) => ({
    ...it,
    lineNo: idx + 1,
    qty: Number(it.qty) || 0,
    sampleQty: Number(it.sampleQty) || 0,
    failedQty: Number(it.failedQty) || 0,
    result: ((Number(it.failedQty) || 0) > 0 ? 'Lỗi' : 'Đạt') as 'Đạt' | 'Lỗi'
  }));
  const sum = summarizeIqcItems(normalized);
  return {
    ...record,
    items: normalized,
    totalQty: sum.totalQty,
    checkedQty: sum.checkedQty,
    failedQty: sum.failedQty,
    defectRate: sum.defectRate,
    result: sum.result,
    defectDetail: sum.defectDetail,
    itemSummary: record.itemSummary && record.itemSummary !== record.content ? record.itemSummary : (sum.itemSummary || record.itemSummary)
  };
};

/** Đơn vị đếm KPI theo dòng linh kiện: phiếu có chi tiết -> mỗi dòng 1 đơn vị; phiếu cũ -> 1 đơn vị */
export const getIqcLineUnits = (r: IQCRecord): { total: number; failed: number } => {
  if (r.items && r.items.length > 0) {
    return { total: r.items.length, failed: r.items.filter(it => (Number(it.failedQty) || 0) > 0).length };
  }
  const isFailed = r.result === 'Lỗi' || (r.failedQty !== undefined && r.failedQty > 0);
  return { total: 1, failed: isFailed ? 1 : 0 };
};

/** Tách số phiếu Ecount "PNK 11005" từ nội dung */
export const extractEcountVoucherNo = (content: string): string => {
  const m = (content || '').match(/PNK\s*\d+/i);
  return m ? m[0].toUpperCase().replace(/\s+/, ' ') : '';
};

// ======================= XUẤT EXCEL TỪNG PHIẾU (IN BIÊN BẢN) =======================
export const exportIqcRecordToExcel = (record: IQCRecord) => {
  const items: IQCLineItem[] = record.items && record.items.length > 0
    ? record.items
    : [{
        lineNo: 1,
        partCode: '',
        partName: record.itemSummary || record.content,
        spec: '',
        unit: '',
        qty: record.totalQty || 0,
        aqlGroup: record.itemSummary || record.content,
        sampleQty: record.checkedQty || 0,
        failedQty: record.failedQty || 0,
        defectType: '',
        defectDetail: record.defectDetail || '',
        result: record.result
      }];
  const groups = getIqcAqlGroups(items);
  const groupMap = new Map(groups.map(g => [g.group, g]));
  const sum = summarizeIqcItems(items);
  const NCOL = 13;
  const blank = () => Array(NCOL).fill('');

  const aoa: any[][] = [];
  const merges: any[] = [];
  const mergeRow = (r: number, c1: number, c2: number) => merges.push({ s: { r, c: c1 }, e: { r, c: c2 } });

  // Header thương hiệu
  let row = blank(); row[0] = 'CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT'; row[9] = 'DKBike'; aoa.push(row); mergeRow(0, 0, 8); mergeRow(0, 9, 12);
  row = blank(); row[0] = 'Phòng Quản lý chất lượng (QLCL - DK QMS)'; row[9] = 'Xe cho cả gia đình'; aoa.push(row); mergeRow(1, 0, 8); mergeRow(1, 9, 12);
  aoa.push(blank());
  row = blank(); row[0] = 'BIÊN BẢN KIỂM TRA CHẤT LƯỢNG HÀNG NHẬP (IQC)'; aoa.push(row); mergeRow(3, 0, 12);
  row = blank(); row[0] = `Tiêu chuẩn lấy mẫu: ISO 2859-1 - AQL ${IQC_DEFAULT_AQL} - Mức kiểm tra ${IQC_DEFAULT_LEVEL} (gộp mẫu theo nhóm cùng tên khác màu)`; aoa.push(row); mergeRow(4, 0, 12);
  aoa.push(blank());

  const infoStart = aoa.length;
  const infoPairs: [string, string, string, string][] = [
    ['Mã phiếu IQC:', record.id, 'Ngày kiểm:', record.date],
    ['Số phiếu Ecount:', record.ecountVoucherNo || extractEcountVoucherNo(record.content) || '-', 'Người kiểm:', record.checkedBy || ''],
    ['Nhà cung cấp:', `${record.supplierName || ''} (${record.supplierId || ''})`, 'Kết quả phiếu:', sum.result === 'Đạt' ? 'ĐẠT' : 'KHÔNG ĐẠT'],
    ['Nội dung:', record.content || '', '', '']
  ];
  infoPairs.forEach((p, i) => {
    const r = blank(); r[0] = p[0]; r[2] = p[1]; r[9] = p[2]; r[10] = p[3]; aoa.push(r);
    const ri = infoStart + i;
    mergeRow(ri, 0, 1);
    if (i === 3) { mergeRow(ri, 2, 12); } else { mergeRow(ri, 2, 8); mergeRow(ri, 10, 12); }
  });
  aoa.push(blank());

  const tableHeaderRow = aoa.length;
  aoa.push(['STT', 'Mã mặt hàng', 'Tên mặt hàng', 'Thông số', 'ĐVT', 'SL nhập', 'Nhóm AQL', 'SL nhóm / Mã', 'Số mẫu', 'Ac / Re', 'SL lỗi', 'Loại lỗi / Mô tả', 'Kết quả']);
  const firstDataRow = aoa.length;
  items.forEach((it, idx) => {
    const gName = (it.aqlGroup || getAqlGroupName(it.partName) || it.partCode || `Dòng ${it.lineNo}`).trim();
    const g = groupMap.get(gName);
    aoa.push([
      idx + 1,
      it.partCode || '',
      it.partName || '',
      it.spec || '',
      it.unit || '',
      Number(it.qty) || 0,
      gName,
      g ? `${g.qty} / ${g.codeLetter}` : '',
      Number(it.sampleQty) || 0,
      g ? `${g.ac} / ${g.re}` : '',
      Number(it.failedQty) || 0,
      [it.defectType, it.defectDetail].filter(Boolean).join(' - '),
      (Number(it.failedQty) || 0) > 0 ? 'LỖI' : 'ĐẠT'
    ]);
  });
  const totalRow = aoa.length;
  const tr = blank(); tr[0] = 'TỔNG CỘNG'; tr[5] = sum.totalQty; tr[8] = sum.checkedQty; tr[10] = sum.failedQty;
  tr[11] = `${sum.failedLines}/${sum.lineCount} dòng lỗi`; tr[12] = sum.result === 'Đạt' ? 'ĐẠT' : 'LỖI';
  aoa.push(tr); mergeRow(totalRow, 0, 4);

  aoa.push(blank());
  const conclRow = aoa.length;
  const cr = blank();
  cr[0] = `KẾT LUẬN: ${sum.result === 'Đạt' ? 'LÔ HÀNG ĐẠT - ĐỒNG Ý NHẬP KHO' : `LÔ HÀNG KHÔNG ĐẠT - ${sum.failedLines} mã lỗi, tổng ${sum.failedQty} sp lỗi. Đề nghị xử lý: đổi trả / sửa chữa / nhận có điều kiện`}`;
  aoa.push(cr); mergeRow(conclRow, 0, 12);
  const noteRow = aoa.length;
  const nr = blank(); nr[0] = 'Ghi chú: ............................................................................................................................................................';
  aoa.push(nr); mergeRow(noteRow, 0, 12);
  aoa.push(blank());

  const signRow = aoa.length;
  const sr = blank(); sr[0] = 'NGƯỜI KIỂM TRA'; sr[4] = 'TRƯỞNG PHÒNG QLCL'; sr[8] = 'KHO / MUA HÀNG'; sr[11] = 'NHÀ CUNG CẤP';
  aoa.push(sr); mergeRow(signRow, 0, 3); mergeRow(signRow, 4, 7); mergeRow(signRow, 8, 10); mergeRow(signRow, 11, 12);
  const signSub = aoa.length;
  const ss = blank(); ss[0] = '(Ký, ghi rõ họ tên)'; ss[4] = '(Ký, ghi rõ họ tên)'; ss[8] = '(Ký, ghi rõ họ tên)'; ss[11] = '(Ký, ghi rõ họ tên)';
  aoa.push(ss); mergeRow(signSub, 0, 3); mergeRow(signSub, 4, 7); mergeRow(signSub, 8, 10); mergeRow(signSub, 11, 12);
  aoa.push(blank()); aoa.push(blank()); aoa.push(blank());
  const nameRow = aoa.length;
  const nm = blank(); nm[0] = record.checkedBy || '';
  aoa.push(nm); mergeRow(nameRow, 0, 3);

  const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 5 }, { wch: 18 }, { wch: 34 }, { wch: 12 }, { wch: 6 }, { wch: 9 },
    { wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 9 }
  ];
  (ws as any)['!margins'] = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };

  const border = {
    top: { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
    left: { style: 'thin', color: { rgb: '94A3B8' } },
    right: { style: 'thin', color: { rgb: '94A3B8' } }
  };
  const font = (extra: any = {}) => ({ name: 'Times New Roman', sz: 11, ...extra });
  const range = XLSXStyle.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSXStyle.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      const cell = ws[ref];
      let s: any = { font: font(), alignment: { vertical: 'center', wrapText: true } };
      if (r === 0) s = { font: font({ bold: true, sz: 13, color: { rgb: '1E3A8A' } }), alignment: { horizontal: c >= 9 ? 'right' : 'left', vertical: 'center' } };
      else if (r === 1) s = { font: font({ italic: true, sz: 11, color: { rgb: c >= 9 ? 'DC2626' : '334155' } }), alignment: { horizontal: c >= 9 ? 'right' : 'left', vertical: 'center' } };
      else if (r === 3) s = { font: font({ bold: true, sz: 16, color: { rgb: '0F172A' } }), alignment: { horizontal: 'center', vertical: 'center' } };
      else if (r === 4) s = { font: font({ italic: true, sz: 10, color: { rgb: '475569' } }), alignment: { horizontal: 'center', vertical: 'center' } };
      else if (r >= infoStart && r < infoStart + infoPairs.length) {
        const isLabel = c === 0 || c === 9;
        s = { font: font({ bold: isLabel }), alignment: { vertical: 'center', wrapText: true } };
        if (c === 10 && r === infoStart + 2) s.font = font({ bold: true, color: { rgb: sum.result === 'Đạt' ? '047857' : 'DC2626' } });
      } else if (r === tableHeaderRow) {
        s = { font: font({ bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }), fill: { fgColor: { rgb: '1E40AF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border };
      } else if (r >= firstDataRow && r < totalRow) {
        const isFail = (Number(aoa[r][10]) || 0) > 0;
        s = {
          font: font({ sz: 10, bold: c === 12, color: c === 12 || c === 10 ? { rgb: isFail ? 'DC2626' : '047857' } : undefined }),
          fill: isFail ? { fgColor: { rgb: 'FEF2F2' } } : undefined,
          alignment: { horizontal: [0, 4, 5, 7, 8, 9, 10, 12].includes(c) ? 'center' : 'left', vertical: 'center', wrapText: true },
          border
        };
      } else if (r === totalRow) {
        s = { font: font({ bold: true, sz: 10 }), fill: { fgColor: { rgb: 'E2E8F0' } }, alignment: { horizontal: c === 11 ? 'left' : 'center', vertical: 'center' }, border };
      } else if (r === conclRow) {
        s = { font: font({ bold: true, sz: 12, color: { rgb: sum.result === 'Đạt' ? '047857' : 'DC2626' } }), alignment: { vertical: 'center', wrapText: true } };
      } else if (r === signRow) {
        s = { font: font({ bold: true }), alignment: { horizontal: 'center', vertical: 'center' } };
      } else if (r === signSub) {
        s = { font: font({ italic: true, sz: 10, color: { rgb: '64748B' } }), alignment: { horizontal: 'center', vertical: 'center' } };
      } else if (r === nameRow) {
        s = { font: font({ bold: true }), alignment: { horizontal: 'center', vertical: 'center' } };
      }
      cell.s = s;
    }
  }
  ws['!rows'] = aoa.map((_, r) => (r === 3 ? { hpt: 26 } : r === tableHeaderRow ? { hpt: 30 } : { hpt: 18 }));

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Bien_ban_IQC');
  const safe = (s: string) => (s || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  const voucher = record.ecountVoucherNo || extractEcountVoucherNo(record.content);
  XLSXStyle.writeFile(wb, `DKBike_IQC_${safe(record.id)}${voucher ? '_' + safe(voucher) : ''}_${safe(record.date)}.xlsx`);
};
