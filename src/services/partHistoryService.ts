import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { restoreFirestorePayload, safeStorage } from '../safeStorage';
import { parseFlexibleDate } from '../utils/dateUtils';

export type PartHistoryEventType =
  | 'CAPA'
  | 'ECO'
  | 'DEFECT'
  | 'PART_EVAL'
  | 'IQC'
  | 'PQC'
  | 'OQC';

export interface PartHistoryEvent {
  uid: string;
  type: PartHistoryEventType;
  id: string;
  date: string;
  sortMs: number;
  title: string;
  detail: string;
  status: string;
  model?: string;
  supplierName?: string;
  severity?: string;
  isError?: boolean;
}

function normText(v: any): string {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSortMs(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = parseFlexibleDate(dateStr);
  if (d) return d.getTime();
  const parsed = Date.parse(dateStr);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readDatasetArray(key: string): Promise<any[]> {
  try {
    const raw = await safeStorage.getItemAsync(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  // Fallback đọc từ Firestore nếu mở standalone /lk trên trình duyệt mới chưa có cache cục bộ
  if (auth.currentUser && key !== 'dk_oqc_records') {
    try {
      const snap = await getDoc(doc(db, 'dk_db_sync', key));
      if (snap.exists()) {
        const d = snap.data();
        if (d && Array.isArray(d.data)) {
          return restoreFirestorePayload(d.data);
        }
      }
    } catch {}
  }
  return [];
}

/**
 * Tổng hợp toàn bộ lịch sử chất lượng & hoạt động liên quan đến 1 linh kiện (/lk)
 * xuyên suốt các phân hệ: CAPA, ECO, Phản ánh KH, Giám định LK (BM-KTTD-01), IQC, PQC, OQC.
 */
export async function loadPartQmsHistory(
  partCode: string,
  partName?: string
): Promise<PartHistoryEvent[]> {
  const cleanCode = String(partCode || '').trim().toUpperCase();
  const normCode = normText(cleanCode);
  const normName = normText(partName || '');
  const canMatchByName = normName.length >= 5;

  if (!normCode && !canMatchByName) return [];

  const matchesPart = (explicitCode?: string, explicitName?: string, ...haystacks: any[]): boolean => {
    if (explicitCode && normCode && normText(explicitCode) === normCode) return true;
    if (explicitName && canMatchByName && normText(explicitName) === normName) return true;
    const joined = normText(haystacks.filter(Boolean).join(' '));
    if (!joined) return false;
    if (normCode.length >= 4 && joined.includes(normCode)) return true;
    if (canMatchByName && joined.includes(normName)) return true;
    return false;
  };

  const [capas, ecos, defects, partEvals, iqcs, pqcs, oqcs] = await Promise.all([
    readDatasetArray('dk_capas'),
    readDatasetArray('dk_ecos'),
    readDatasetArray('dk_defects'),
    readDatasetArray('dk_part_evaluations'),
    readDatasetArray('dk_iqc_records'),
    readDatasetArray('dk_pqc_records'),
    readDatasetArray('dk_oqc_records'),
  ]);

  const events: PartHistoryEvent[] = [];

  // 1. CAPA
  capas.forEach((c: any) => {
    if (
      matchesPart(
        c?.partCode,
        c?.partName,
        c?.title,
        c?.Issue,
        c?.issue,
        c?.rootCause,
        c?.RootCause,
        c?.actions,
        c?.CorrectiveAction
      )
    ) {
      const dateStr = c?.targetDate || c?.DueDate || c?.dueDate || c?.createdAt || '';
      const st = c?.status || c?.Status || 'Mở';
      events.push({
        uid: `CAPA_${c?.id || c?.CAPAID || events.length}`,
        type: 'CAPA',
        id: c?.id || c?.CAPAID || 'CAPA',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: c?.title || c?.Issue || c?.issue || 'Hồ sơ CAPA',
        detail: c?.rootCause || c?.RootCause || c?.actions || '',
        status: st,
        model: c?.modelName || '',
        supplierName: c?.supplierName || '',
        severity: c?.priority || '',
        isError: st !== 'Đóng' && st !== 'Đã đóng',
      });
    }
  });

  // 2. ECO
  ecos.forEach((e: any) => {
    if (matchesPart(e?.partCode, e?.component, e?.component, e?.content, e?.rootCause)) {
      const dateStr = e?.applyDate || e?.updatedAt || '';
      events.push({
        uid: `ECO_${e?.id || events.length}`,
        type: 'ECO',
        id: e?.id || 'ECO',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: `[${e?.category || 'ECO'}] ${e?.component || e?.content || 'Thay đổi kỹ thuật'}`,
        detail: e?.content || e?.rootCause || '',
        status: e?.status || 'Đề xuất',
        model: e?.model || '',
        isError: e?.status === 'Thất bại',
      });
    }
  });

  // 3. Phản ánh KH / Lỗi thị trường
  defects.forEach((d: any) => {
    if (matchesPart(d?.partCode, d?.partName, d?.type, d?.description, d?.rootCause)) {
      const dateStr = d?.defectDate || d?.sourceDate || d?.saleDate || '';
      events.push({
        uid: `DEF_${d?.id || events.length}`,
        type: 'DEFECT',
        id: d?.id || 'DEF',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: `${d?.feedbackType === 'Đề xuất cải tiến' ? '[Đề xuất]' : '[Lỗi KH]'} ${d?.type || d?.description || 'Phản ánh khách hàng'}`,
        detail: d?.description || d?.rootCause || '',
        status: d?.status || 'Chưa xử lý',
        model: d?.model || '',
        supplierName: d?.supplierName || '',
        severity: d?.severity ? `Mức ${d.severity}` : '',
        isError: d?.feedbackType !== 'Đề xuất cải tiến',
      });
    }
  });

  // 4. Giám định linh kiện lỗi (BM-KTTD-01)
  partEvals.forEach((p: any) => {
    if (matchesPart(p?.partCode, p?.partName, p?.partName, p?.defectSymptom, p?.findingNote)) {
      const dateStr = p?.receivedDate || p?.updatedAt || '';
      events.push({
        uid: `PE_${p?.id || events.length}`,
        type: 'PART_EVAL',
        id: p?.id || 'BM-KTTD-01',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: `[BM-KTTD-01] ${p?.partName || cleanCode} (SL: ${p?.quantity || 1}) — ${p?.rootCauseCategory || ''}`,
        detail: p?.findingNote || p?.defectSymptom || p?.resolution || '',
        status: p?.resolution || 'Đã giám định',
        model: p?.model || '',
        supplierName: p?.supplierName || '',
        isError: p?.rootCauseCategory === 'Lỗi NCC' || p?.rootCauseCategory === 'Lỗi SX',
      });
    }
  });

  // 5. IQC (kiểm tra cả chi tiết dòng `items[]` và thông tin chung phiếu)
  iqcs.forEach((r: any) => {
    const matchedLine = Array.isArray(r?.items)
      ? r.items.find((it: any) => matchesPart(it?.partCode, it?.partName, it?.partName, it?.defectDetail))
      : null;
    if (matchedLine || matchesPart(undefined, undefined, r?.itemSummary, r?.content, r?.defectDetail)) {
      const dateStr = r?.date || '';
      const isErr = matchedLine ? Number(matchedLine.failedQty || 0) > 0 : r?.result === 'Lỗi';
      events.push({
        uid: `IQC_${r?.id || events.length}`,
        type: 'IQC',
        id: r?.id || 'IQC',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: `[IQC] ${r?.supplierName || 'NCC'} — ${matchedLine ? `${matchedLine.partCode || ''} ${matchedLine.partName || ''}`.trim() : (r?.itemSummary || r?.content || 'Lô nhập')}`,
        detail: (matchedLine?.defectDetail || r?.defectDetail)
          ? `Lỗi: ${matchedLine?.defectDetail || r?.defectDetail} (Lỗi ${matchedLine?.failedQty ?? r?.failedQty ?? 0}/${matchedLine?.checkedQty ?? r?.checkedQty ?? r?.totalQty ?? 0})`
          : `Đạt kiểm nhập (SL: ${matchedLine?.totalQty ?? r?.totalQty ?? 0})`,
        status: isErr ? 'Lỗi' : 'Đạt',
        supplierName: r?.supplierName || '',
        isError: isErr,
      });
    }
  });

  // 6. PQC
  pqcs.forEach((r: any) => {
    if (matchesPart(undefined, undefined, r?.findings, r?.stage)) {
      const dateStr = r?.date || '';
      events.push({
        uid: `PQC_${r?.id || events.length}`,
        type: 'PQC',
        id: r?.id || 'PQC',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: `[PQC] ${r?.model || 'Dòng xe'} — ${r?.stage || 'Công đoạn'}`,
        detail: r?.findings || '',
        status: r?.status || '',
        model: r?.model || '',
        isError: r?.status === 'Đang cải tiến',
      });
    }
  });

  // 7. OQC (chỉ quét các xe lỗi để đảm bảo tốc độ mượt mà trên 30.000+ bản ghi, giới hạn 30 bản ghi mới nhất)
  let oqcHits = 0;
  for (let i = 0; i < oqcs.length && oqcHits < 30; i++) {
    const r = oqcs[i];
    if (!r || r.status !== 'Lỗi') continue;
    if (matchesPart(undefined, undefined, r.defectDetail, r.rootCause, r.defectCauseDetail)) {
      oqcHits++;
      const dateStr = r.date || '';
      events.push({
        uid: `OQC_${r.id || r.serialNo || i}`,
        type: 'OQC',
        id: r.serialNo || r.id || 'OQC',
        date: String(dateStr),
        sortMs: toSortMs(dateStr),
        title: `[OQC Lỗi] ${r.model || 'Xe'} (${r.serialNo || '--'})`,
        detail: `${r.defectDetail || ''}${r.rootCause ? ` • Nguyên nhân: ${r.rootCause}` : ''}`,
        status: 'Lỗi',
        model: r.model || '',
        isError: true,
      });
    }
  }

  return events.sort((a, b) => b.sortMs - a.sortMs);
}
