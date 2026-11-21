import {
  isColoredPlasticSpec,
  normalizeColoredPlasticPart
} from '../services/bomCatalogService';
import { BomPartMasterItem } from '../types/bomCatalog';

export interface LarkSyncAttachment {
  file_token: string;
  name: string;
  type?: string;
  size?: number;
  caption: 'Tổng quan' | 'Kích thước';
}

export interface LarkSyncRecord {
  recordId: string;
  partCode: string;
  partName: string;
  specGroup: string;
  techSpecs: string;
  supplierName: string;
  overviewImages: LarkSyncAttachment[];
  sizeImages: LarkSyncAttachment[];
}

export interface LarkSyncPlanItem {
  targetPart: BomPartMasterItem;
  matchedLarkCodes: string[];
  matchType: 'exact' | 'plastic_merged';
  attachmentsToUpload: LarkSyncAttachment[];
  nextTechSpecs?: string;
}

export interface LarkUnmatchedRow {
  partCode: string;
  partName: string;
  specGroup: string;
  imageCount: number;
}

export interface LarkSyncPlanSummary {
  plans: LarkSyncPlanItem[];
  skippedExistingCount: number;
  unmatchedWithImages: LarkUnmatchedRow[];
  totalLarkRecords: number;
  totalLarkRecordsWithImages: number;
  plasticMergedCount: number;
  totalImagesToUpload: number;
}

function normalizeViText(val: string): string {
  return String(val || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlasticRelatedGroup(specGroup?: string): boolean {
  const norm = normalizeViText(specGroup || '');
  return isColoredPlasticSpec(specGroup) || norm.includes('nhua');
}

async function postJsonWithLocalFallback(
  endpoint: string,
  payload: Record<string, any>
): Promise<{ data: any; activeBaseUrl: string }> {
  const candidates = [''];
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    candidates.push('http://localhost:3000');
  }

  let lastError = 'Không kết nối được cầu nối Lark API trên máy chủ local (npm run dev).';

  for (const baseUrl of candidates) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        // Trên Firebase Hosting static, route /api/* sẽ fallback về index.html (HTML)
        lastError =
          'Trang đang chạy bản tĩnh Firebase Hosting (không có /api/lark). Hãy mở hoặc chạy `npm run dev` trên máy tính rồi thử lại.';
        continue;
      }

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }
      return { data: json, activeBaseUrl: baseUrl };
    } catch (err: any) {
      if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      lastError =
        'Không kết nối được cầu nối Lark API trên localhost:3000. Hãy chạy `npm run dev` trên máy tính (trên web tĩnh dkqms.cloud cần bật `npm run dev` local hoặc mở http://localhost:3000/lk).';
    }
  }

  throw new Error(lastError);
}

/**
 * Đọc toàn bộ bản ghi & thông tin đính kèm từ bảng Lark Base thông qua API proxy /api/lark/records.
 */
export async function fetchLarkRecordsViaProxy(params: {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  domain?: string;
}): Promise<{
  records: LarkSyncRecord[];
  totalRawRecords: number;
  activeBaseUrl: string;
}> {
  const { data, activeBaseUrl } = await postJsonWithLocalFallback('/api/lark/records', params);
  return {
    records: Array.isArray(data.records) ? data.records : [],
    totalRawRecords: Number(data.totalRawRecords) || 0,
    activeBaseUrl
  };
}

/**
 * Tải file ảnh gốc từ Lark Drive qua proxy và đóng gói thành File để upload lên Firebase Storage.
 */
export async function fetchLarkMediaFileViaProxy(params: {
  activeBaseUrl: string;
  appId: string;
  appSecret: string;
  attachment: LarkSyncAttachment;
  domain?: string;
}): Promise<File> {
  const { activeBaseUrl, appId, appSecret, attachment, domain } = params;
  const res = await fetch(`${activeBaseUrl}/api/lark/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId,
      appSecret,
      fileToken: attachment.file_token,
      domain
    })
  });

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok || ct.includes('application/json') || ct.includes('text/html')) {
    let msg = `Không tải được ảnh ${attachment.name} (${res.status})`;
    if (ct.includes('application/json')) {
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch {}
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  return new File([blob], attachment.name || `${attachment.file_token}.jpg`, {
    type: blob.type || attachment.type || 'image/jpeg'
  });
}

/**
 * Khớp danh sách bản ghi Lark Base vào Kho Linh kiện (`partsByCode`),
 * hỗ trợ tự động gom các mã Nhựa màu dài trên Lark Base (chưa cắt 4 số đuôi màu) về đúng mã Phôi trên `/lk`.
 */
export function buildLarkSyncPlan(params: {
  larkRecords: LarkSyncRecord[];
  partsByCode: Map<string, BomPartMasterItem>;
  extraColors: string[];
  syncMode: 'skip_existing' | 'append';
  mergePlasticLongCodes: boolean;
  limitPlasticImages: boolean;
  updateEmptyTechSpecs: boolean;
}): LarkSyncPlanSummary {
  const {
    larkRecords,
    partsByCode,
    extraColors,
    syncMode,
    mergePlasticLongCodes,
    limitPlasticImages,
    updateEmptyTechSpecs
  } = params;

  const grouped = new Map<
    string,
    {
      targetPart: BomPartMasterItem;
      matchedLarkCodes: Set<string>;
      matchType: 'exact' | 'plastic_merged';
      attachments: LarkSyncAttachment[];
      seenAttachmentKeys: Set<string>;
      techSpecsCandidate: string;
    }
  >();

  const unmatchedWithImages: LarkUnmatchedRow[] = [];
  let totalLarkRecordsWithImages = 0;

  for (const rec of larkRecords) {
    const rawCode = rec.partCode.trim().toUpperCase();
    if (!rawCode) continue;

    const allRowAttachments = [...(rec.overviewImages || []), ...(rec.sizeImages || [])];
    if (allRowAttachments.length > 0) {
      totalLarkRecordsWithImages++;
    }

    let matchedPart: BomPartMasterItem | undefined;
    let matchType: 'exact' | 'plastic_merged' = 'exact';

    // 1. Nếu bật gom mã Nhựa màu dài về Phôi: kiểm tra trước trường hợp mã dài 4 số màu cuối
    if (mergePlasticLongCodes && rawCode.length > 6 && /\d{4}$/.test(rawCode)) {
      const base4 = rawCode.slice(0, -4);
      const baseCandidate = partsByCode.get(base4);
      if (
        baseCandidate &&
        (isPlasticRelatedGroup(rec.specGroup) || isPlasticRelatedGroup(baseCandidate.specGroup))
      ) {
        matchedPart = baseCandidate;
        matchType = 'plastic_merged';
      }
    }

    // 2. Thử bộ chuẩn hóa Nhựa màu chính thức của hệ thống
    if (!matchedPart && mergePlasticLongCodes && rec.specGroup) {
      const normRes = normalizeColoredPlasticPart(rawCode, rec.partName, rec.specGroup, extraColors);
      if (normRes.partCode && normRes.partCode !== rawCode) {
        const cand = partsByCode.get(normRes.partCode);
        if (cand) {
          matchedPart = cand;
          matchType = 'plastic_merged';
        }
      }
    }

    // 3. Khớp trực tiếp theo Mã mặt hàng
    if (!matchedPart) {
      matchedPart = partsByCode.get(rawCode);
      matchType = 'exact';
    }

    // 4. Fallback cuối: nếu không ghi Nhóm LK trên Lark nhưng mã là Nhựa dài khớp với 1 mã Phôi nhựa trong Kho LK
    if (!matchedPart && mergePlasticLongCodes && !rec.specGroup && rawCode.length > 6 && /\d{4}$/.test(rawCode)) {
      const base4 = rawCode.slice(0, -4);
      const baseCandidate = partsByCode.get(base4);
      if (baseCandidate && isPlasticRelatedGroup(baseCandidate.specGroup)) {
        matchedPart = baseCandidate;
        matchType = 'plastic_merged';
      }
    }

    if (!matchedPart) {
      if (allRowAttachments.length > 0) {
        unmatchedWithImages.push({
          partCode: rawCode,
          partName: rec.partName,
          specGroup: rec.specGroup,
          imageCount: allRowAttachments.length
        });
      }
      continue;
    }

    const targetCode = matchedPart.partCode.trim().toUpperCase();
    let bucket = grouped.get(targetCode);
    if (!bucket) {
      bucket = {
        targetPart: matchedPart,
        matchedLarkCodes: new Set<string>(),
        matchType,
        attachments: [],
        seenAttachmentKeys: new Set<string>(),
        techSpecsCandidate: ''
      };
      grouped.set(targetCode, bucket);
    }

    bucket.matchedLarkCodes.add(rawCode);
    if (matchType === 'plastic_merged') {
      bucket.matchType = 'plastic_merged';
    }
    if (!bucket.techSpecsCandidate && rec.techSpecs?.trim()) {
      bucket.techSpecsCandidate = rec.techSpecs.trim();
    }

    for (const att of allRowAttachments) {
      const dedupKey = `${att.file_token}`;
      const sameFileAcrossVariantsKey = `${att.caption}|${att.name.toLowerCase()}|${att.size ?? 0}`;
      if (
        bucket.seenAttachmentKeys.has(dedupKey) ||
        bucket.seenAttachmentKeys.has(sameFileAcrossVariantsKey)
      ) {
        continue;
      }
      bucket.seenAttachmentKeys.add(dedupKey);
      bucket.seenAttachmentKeys.add(sameFileAcrossVariantsKey);
      bucket.attachments.push(att);
    }
  }

  const plans: LarkSyncPlanItem[] = [];
  let skippedExistingCount = 0;
  let plasticMergedCount = 0;
  let totalImagesToUpload = 0;

  grouped.forEach((bucket) => {
    const existingCount = Array.isArray(bucket.targetPart.images) ? bucket.targetPart.images.length : 0;
    const isPlasticTarget =
      bucket.matchType === 'plastic_merged' ||
      bucket.targetPart.imageMode === 'single' ||
      isPlasticRelatedGroup(bucket.targetPart.specGroup);

    let chosenAttachments = bucket.attachments;
    if (limitPlasticImages && isPlasticTarget && chosenAttachments.length > 0) {
      const oneOverview = chosenAttachments.find((a) => a.caption === 'Tổng quan');
      const oneSize = chosenAttachments.find((a) => a.caption === 'Kích thước');
      const compact: LarkSyncAttachment[] = [];
      if (oneOverview) compact.push(oneOverview);
      if (oneSize) compact.push(oneSize);
      if (compact.length === 0) compact.push(chosenAttachments[0]);
      chosenAttachments = compact;
    }

    const needTechSpecs =
      updateEmptyTechSpecs &&
      Boolean(bucket.techSpecsCandidate) &&
      !String(bucket.targetPart.techSpecs || '').trim();

    if (chosenAttachments.length === 0 && !needTechSpecs) {
      return;
    }

    if (syncMode === 'skip_existing' && existingCount > 0) {
      // Nếu đã có ảnh rồi -> bỏ qua upload ảnh ở chế độ skip_existing
      if (!needTechSpecs) {
        skippedExistingCount++;
        return;
      }
      chosenAttachments = [];
    }

    if (bucket.matchType === 'plastic_merged') {
      plasticMergedCount++;
    }
    totalImagesToUpload += chosenAttachments.length;

    plans.push({
      targetPart: bucket.targetPart,
      matchedLarkCodes: Array.from(bucket.matchedLarkCodes),
      matchType: bucket.matchType,
      attachmentsToUpload: chosenAttachments,
      nextTechSpecs: needTechSpecs ? bucket.techSpecsCandidate : undefined
    });
  });

  plans.sort((a, b) => a.targetPart.partCode.localeCompare(b.targetPart.partCode));

  return {
    plans,
    skippedExistingCount,
    unmatchedWithImages,
    totalLarkRecords: larkRecords.length,
    totalLarkRecordsWithImages,
    plasticMergedCount,
    totalImagesToUpload
  };
}
