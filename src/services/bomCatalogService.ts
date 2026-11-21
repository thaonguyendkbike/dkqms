import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_OQC_PART_CODES, OqcPartCodeItem } from '../oqcPartCodesData';
import { safeStorage, sanitizeFirestorePayload } from '../safeStorage';
import {
  BomModelLineItem,
  BomModelRecord,
  BomPartMasterItem,
  EcountParsedBomRow,
  OqcModelSummary
} from '../types/bomCatalog';

const BOM_MODELS_COLLECTION = 'dk_bom_models';
const BOM_PARTS_COLLECTION = 'dk_bom_parts';
const CACHE_MODELS_KEY = 'qms_bom_models_cache_v1';
const CACHE_PARTS_KEY = 'qms_bom_parts_cache_v1';

/**
 * Chuẩn hóa chuỗi (Mã linh kiện hoặc Tên Model) thành Document ID hợp lệ trên Firestore.
 */
export function toSafeDocId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\/\\.#$\[\]\s]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return `ID_${Date.now()}`;
  }
  return cleaned.slice(0, 120);
}

export function normalizeModelKey(modelName: string): string {
  return String(modelName || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function inferPartImageMode(specGroup?: string): 'single' | 'multi' {
  const norm = String(specGroup || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  if (norm.includes('nhua')) {
    return 'single';
  }
  return 'multi';
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

export function isColoredPlasticSpec(specGroup?: string): boolean {
  const norm = normalizeViText(specGroup || '');
  return norm.includes('nhua mau');
}

const DEFAULT_COLOR_PHRASES = [
  'đỏ đun bóng',
  'đỏ đun pha lê',
  'đỏ đun',
  'đỏ hồng khói',
  'đỏ cherry',
  'đỏ đen',
  'đỏ',
  'đen khói',
  'đen pha lê',
  'đen bóng',
  'đen sần',
  'đen nhám',
  'đen mờ',
  'đen bạc',
  'đen cam',
  'đen cửu long',
  'đen trắng',
  'đen đỏ',
  'đen',
  'trắng ngọc trai',
  'trắng khói tuyết',
  'trắng pha lê',
  'trắng thiên thanh',
  'trắng cà phê',
  'trắng cafe',
  'trắng camay',
  'trắng bóng',
  'trắng sữa',
  'trắng hồng',
  'trắng tím',
  'trắng cam',
  'trắng đen',
  'trắng ghi',
  'trắng',
  'xám khói tuyết',
  'xám khói',
  'xám xi măng',
  'xám',
  'ghi pha lê',
  'ghi khói',
  'ghi sần',
  'ghi bóng',
  'ghi bạc',
  'ghi cam',
  'ghi đen',
  'ghi hồng',
  'ghi',
  'xanh thiên thanh',
  'xanh ngân hà',
  'xanh ngọc bích',
  'xanh ngọc',
  'xanh rêu nhám',
  'xanh rêu',
  'xanh cửu long',
  'xanh dương',
  'xanh lam',
  'xanh lá',
  'xanh mint',
  'xanh magic',
  'xanh rubi',
  'xanh ghi',
  'xanh xám',
  'xanh bơ',
  'xanh đá',
  'xanh',
  'vàng cát sa mạc',
  'vàng đồng',
  'vàng kem',
  'vàng trắng',
  'vàng chanh',
  'vàng',
  'hồng khói nhạt',
  'hồng khói',
  'hồng pha lê',
  'hồng baby',
  'hồng baky',
  'hồng rose',
  'hồng',
  'tím thiên thanh khói',
  'tím thiên thanh',
  'tím mix khói',
  'tím ngân hà',
  'tím pha lê',
  'tím ánh',
  'tím nhạt',
  'tím',
  'ánh tím',
  'cam kẹo ngọt',
  'cam pha lê',
  'cam trắng',
  'cam đen',
  'cam',
  'cà phê gold',
  'cafe gold',
  'cà phê',
  'cafe',
  'nâu cà phê',
  'nâu đất',
  'nâu',
  'rêu pha lê',
  'rêu khói',
  'đồng khói',
  'cửu long pha lê',
  'cửu long',
  'thiên thanh',
  'baby blue',
  'bạc blue',
  'bạc',
  'be mờ',
  'be',
  'nhũ bạc',
  'mộc'
];

const FINISH_MODIFIER_WORDS = [
  'bong',
  'san',
  'nham',
  'mo',
  'nhat',
  'dam',
  'tuoi',
  'pha le',
  'khoi',
  'tuyet',
  'ngoc trai',
  'kim loai',
  'gold',
  'camay'
];

/**
 * Chuẩn hóa linh kiện Nhựa màu về linh kiện chuẩn (Phôi - không màu):
 * - Mã mặt hàng: bỏ 4 số cuối (VD: LEMROM0101050224 -> LEMROM010105)
 * - Tên mặt hàng: nhận dạng & cắt tên màu ở cuối (VD: "Chân yếm trước trái Roma SX Đỏ đun bóng" -> "Chân yếm trước trái Roma SX")
 */
export function normalizeColoredPlasticPart(
  rawCode: string,
  rawName: string,
  specGroup?: string,
  extraColors: string[] = []
): {
  partCode: string;
  partName: string;
  detectedColor: string;
  codeWasStripped: boolean;
  nameWasStripped: boolean;
} {
  const cleanCode = String(rawCode || '').trim().toUpperCase();
  const cleanName = String(rawName || '').trim().replace(/\s+/g, ' ');

  if (!isColoredPlasticSpec(specGroup)) {
    return {
      partCode: cleanCode,
      partName: cleanName,
      detectedColor: '',
      codeWasStripped: false,
      nameWasStripped: false
    };
  }

  // 1. Bỏ 4 số cuối nếu mã đủ dài (tránh cắt nhầm mã quá ngắn)
  let baseCode = cleanCode;
  let codeWasStripped = false;
  if (cleanCode.length > 6 && /\d{4}$/.test(cleanCode)) {
    baseCode = cleanCode.slice(0, -4);
    codeWasStripped = true;
  }

  // 2. Tạo tập hợp tên màu đã chuẩn hóa (ưu tiên cụm dài trước)
  const colorPool = new Set<string>();
  [...DEFAULT_COLOR_PHRASES, ...extraColors].forEach((c) => {
    const cleaned = String(c || '').trim();
    if (!cleaned || cleaned.length < 2) return;
    // Bỏ qua các giá trị màu ở OQC bị dính tiền tố tên xe (như "DK Roma SX ...")
    if (/^(dk\s|xinba\s|roma\s)/i.test(cleaned)) return;
    if (normalizeViText(cleaned) === 'mau') return;
    colorPool.add(cleaned);
    // Thêm biến thể kết hợp modifier ở cuối (VD: "Đỏ đun" + " bóng" -> "Đỏ đun bóng")
    FINISH_MODIFIER_WORDS.forEach((mod) => {
      colorPool.add(`${cleaned} ${mod}`);
    });
  });

  const sortedColors = Array.from(colorPool)
    .map((orig) => ({ orig, norm: normalizeViText(orig) }))
    .filter((x) => x.norm.length >= 2)
    .sort((a, b) => b.norm.length - a.norm.length);

  // Tách từ trong cleanName kèm vị trí ký tự gốc để cắt giữ nguyên dấu và chữ hoa/thường
  const wordMatches = Array.from(cleanName.matchAll(/[^\s]+/g));
  let baseName = cleanName;
  let detectedColor = '';
  let nameWasStripped = false;

  if (wordMatches.length >= 2) {
    // Khớp từ cuối ngược về trước theo cụm màu chuẩn hóa
    for (const colorItem of sortedColors) {
      const colorWords = colorItem.norm.split(' ');
      if (colorWords.length >= wordMatches.length) continue;

      const tailSlice = wordMatches.slice(wordMatches.length - colorWords.length);
      const tailNorm = tailSlice.map((m) => normalizeViText(m[0].replace(/^[-–:,]+|[-–:,]+$/g, ''))).join(' ');

      if (tailNorm === colorItem.norm) {
        const cutPos = tailSlice[0].index ?? cleanName.length;
        let prefix = cleanName.slice(0, cutPos).trim();
        // Xóa dấu ngăn cách thừa ở cuối tên phôi (VD: "Đế logo Roma SX, GT -" -> "Đế logo Roma SX, GT")
        prefix = prefix.replace(/[-–:,]+$/g, '').trim();
        if (prefix.length >= 2) {
          baseName = prefix;
          detectedColor = tailSlice.map((m) => m[0]).join(' ').replace(/^[-–:,]+/g, '').trim();
          nameWasStripped = true;
          break;
        }
      }
    }

    // Fallback: nếu tên có dạng "... - <Tên màu bất kỳ>" sau dấu gạch ngang ở cuối
    if (!nameWasStripped) {
      const dashMatch = cleanName.match(/^(.+?)\s+[-–]\s+([^\-–]+)$/);
      if (dashMatch) {
        const candidatePrefix = dashMatch[1].trim();
        const candidateColor = dashMatch[2].trim();
        const normCandidate = normalizeViText(candidateColor);
        const looksLikeColor = sortedColors.some(
          (c) => normCandidate === c.norm || normCandidate.startsWith(`${c.norm} `)
        );
        if (looksLikeColor && candidatePrefix.length >= 2) {
          baseName = candidatePrefix;
          detectedColor = candidateColor;
          nameWasStripped = true;
        }
      }
    }
  }

  return {
    partCode: baseCode,
    partName: baseName,
    detectedColor,
    codeWasStripped,
    nameWasStripped
  };
}

function groupPartCodesByModel(items: OqcPartCodeItem[]): OqcModelSummary[] {
  const map = new Map<string, OqcModelSummary>();
  items.forEach((item) => {
    const modelName = String(item?.model || '').trim();
    if (!modelName) return;
    const modelKey = toSafeDocId(modelName);
    if (!map.has(modelKey)) {
      map.set(modelKey, {
        modelKey,
        modelName,
        colors: []
      });
    }
    const entry = map.get(modelKey)!;
    const partCode = String(item.partCode || '').trim();
    const color = String(item.color || '').trim();
    if (partCode || color) {
      entry.colors.push({
        partCode,
        color,
        nameWithColor: String(item.nameWithColor || `${modelName} - ${color}`).trim()
      });
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.modelName.localeCompare(b.modelName, 'vi')
  );
}

/**
 * Đọc danh sách Model & Màu sắc từ Bảng mã xe (OQC).
 * Ưu tiên đọc live trên Firestore (`dk_db_sync/dk_oqc_part_codes`) để khách `/lk` luôn nhận dữ liệu mới nhất,
 * fallback sang `safeStorage` và `INITIAL_OQC_PART_CODES`.
 */
export async function loadOqcModelGroups(): Promise<OqcModelSummary[]> {
  let localList: OqcPartCodeItem[] = INITIAL_OQC_PART_CODES;
  try {
    const saved = safeStorage.getItem('dk_oqc_part_codes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localList = parsed;
      }
    }
  } catch {
    // fallback to INITIAL_OQC_PART_CODES
  }

  try {
    const snap = await getDoc(doc(db, 'dk_db_sync', 'dk_oqc_part_codes'));
    if (snap.exists()) {
      const payload = snap.data();
      const cloudList = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : null;
      if (cloudList && cloudList.length > 0) {
        return groupPartCodesByModel(cloudList);
      }
    }
  } catch (err) {
    console.warn('[BOM Catalog] Không đọc được dk_oqc_part_codes từ Cloud, dùng dữ liệu cục bộ:', err);
  }

  return groupPartCodesByModel(localList);
}

/**
 * Lắng nghe realtime danh sách Model & Màu sắc từ `dk_db_sync/dk_oqc_part_codes` (chỉ tốn 1 lượt đọc khi mở trang).
 * Tự động cập nhật ngay khi Bảng mã xe ở App chính có thay đổi.
 */
export function subscribeOqcModelGroups(
  onModels: (groups: OqcModelSummary[]) => void
): () => void {
  let localList: OqcPartCodeItem[] = INITIAL_OQC_PART_CODES;
  try {
    const saved = safeStorage.getItem('dk_oqc_part_codes');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localList = parsed;
      }
    }
  } catch {
    // fallback
  }

  onModels(groupPartCodesByModel(localList));

  const docRef = doc(db, 'dk_db_sync', 'dk_oqc_part_codes');
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) return;
      if (safeStorage.getItem('dk_oqc_part_codes_is_dirty') === 'true') {
        return;
      }
      const payload = snap.data();
      const cloudList = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : null;
      if (cloudList && cloudList.length > 0) {
        safeStorage.setItem('dk_oqc_part_codes', JSON.stringify(cloudList));
        onModels(groupPartCodesByModel(cloudList));
      }
    },
    (err) => {
      console.warn('[BOM Catalog] Lắng nghe Bảng mã xe tạm ngắt, dùng dữ liệu cục bộ:', err?.message || err);
    }
  );
}

export function readCachedBomCatalog(): {
  models: BomModelRecord[];
  parts: BomPartMasterItem[];
} {
  let models: BomModelRecord[] = [];
  let parts: BomPartMasterItem[] = [];
  try {
    const mRaw = safeStorage.getItem(CACHE_MODELS_KEY);
    if (mRaw) {
      const parsed = JSON.parse(mRaw);
      if (Array.isArray(parsed)) models = parsed;
    }
  } catch {
    // ignore
  }
  try {
    const pRaw = safeStorage.getItem(CACHE_PARTS_KEY);
    if (pRaw) {
      const parsed = JSON.parse(pRaw);
      if (Array.isArray(parsed)) parts = parsed;
    }
  } catch {
    // ignore
  }
  return { models, parts };
}

/**
 * Lắng nghe realtime cả 2 subcollection `dk_bom_models` và `dk_bom_parts` dưới `dk_db_sync`.
 */
export function subscribeBomCatalog(
  onModels: (models: BomModelRecord[]) => void,
  onParts: (parts: BomPartMasterItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const modelsRef = collection(db, 'dk_db_sync', BOM_MODELS_COLLECTION, 'records');
  const partsRef = collection(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records');

  const unsubModels = onSnapshot(
    modelsRef,
    (snapshot) => {
      const list: BomModelRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          list.push({
            id: docSnap.id,
            modelName: String(data.modelName || docSnap.id),
            imageUrl: data.imageUrl || undefined,
            imagePath: data.imagePath || undefined,
            isDiscontinued: Boolean(data.isDiscontinued),
            items: Array.isArray(data.items) ? data.items : [],
            updatedAt: String(data.updatedAt || ''),
            updatedBy: data.updatedBy || undefined
          });
        }
      });
      safeStorage.setItem(CACHE_MODELS_KEY, JSON.stringify(list));
      onModels(list);
    },
    (err) => {
      console.error('[BOM Models Listener Error]:', err);
      onError?.(err);
    }
  );

  const unsubParts = onSnapshot(
    partsRef,
    (snapshot) => {
      const list: BomPartMasterItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) {
          const partCode = String(data.partCode || docSnap.id).trim().toUpperCase();
          list.push({
            id: docSnap.id,
            partCode,
            partName: String(data.partName || partCode),
            specGroup: String(data.specGroup || ''),
            unit: String(data.unit || 'Cái'),
            techSpecs: data.techSpecs || '',
            supplierName: data.supplierName || '',
            stockQty: typeof data.stockQty === 'number' ? data.stockQty : undefined,
            purchasePrice: typeof data.purchasePrice === 'number' ? data.purchasePrice : undefined,
            sellingPrice: typeof data.sellingPrice === 'number' ? data.sellingPrice : undefined,
            keywords: data.keywords || '',
            status: data.status || 'Đang dùng',
            imageMode: data.imageMode || inferPartImageMode(data.specGroup),
            images: Array.isArray(data.images) ? data.images : [],
            note: data.note || '',
            updatedAt: String(data.updatedAt || ''),
            updatedBy: data.updatedBy || undefined
          });
        }
      });
      list.sort((a, b) => a.partCode.localeCompare(b.partCode));
      safeStorage.setItem(CACHE_PARTS_KEY, JSON.stringify(list));
      onParts(list);
    },
    (err) => {
      console.error('[BOM Parts Listener Error]:', err);
      onError?.(err);
    }
  );

  return () => {
    unsubModels();
    unsubParts();
  };
}

export async function saveBomModelRecord(record: BomModelRecord): Promise<void> {
  const docId = record.id || toSafeDocId(record.modelName);
  const ref = doc(db, 'dk_db_sync', BOM_MODELS_COLLECTION, 'records', docId);
  await setDoc(ref, sanitizeFirestorePayload({ ...record, id: docId }));
}

export async function saveBomModelsBatch(records: BomModelRecord[]): Promise<void> {
  const ops = records.map((record) => {
    const docId = record.id || toSafeDocId(record.modelName);
    return {
      ref: doc(db, 'dk_db_sync', BOM_MODELS_COLLECTION, 'records', docId),
      data: { ...record, id: docId }
    };
  });
  await commitWriteBatches(ops);
}

export async function saveBomPartRecord(part: BomPartMasterItem): Promise<void> {
  const code = part.partCode.trim().toUpperCase();
  const docId = part.id || toSafeDocId(code);
  const ref = doc(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records', docId);
  await setDoc(
    ref,
    sanitizeFirestorePayload({
      ...part,
      id: docId,
      partCode: code
    })
  );
}

export async function deleteBomPartRecord(partId: string): Promise<void> {
  const ref = doc(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records', partId);
  await deleteDoc(ref);
}

export async function deleteBomPartsBatch(partIds: string[]): Promise<void> {
  const BATCH_LIMIT = 400;
  for (let i = 0; i < partIds.length; i += BATCH_LIMIT) {
    const chunk = partIds.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      batch.delete(doc(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records', id));
    });
    await batch.commit();
  }
}

async function commitWriteBatches(
  operations: Array<{ ref: ReturnType<typeof doc>; data: any }>
): Promise<void> {
  const BATCH_LIMIT = 400;
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const chunk = operations.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      batch.set(op.ref, sanitizeFirestorePayload(op.data));
    });
    await batch.commit();
  }
}

function mapEcountStatusToQuality(raw?: string): BomPartMasterItem['status'] {
  const norm = normalizeViText(raw || '');
  if (norm === 'stop' || norm.includes('ngung') || norm === 'unused' || norm === 'inactive') {
    return 'Ngừng dùng';
  }
  return 'Đang dùng';
}

function findLegacyColoredPartsForBase(
  baseCode: string,
  rawCode: string | undefined,
  existingPartsMap: Map<string, BomPartMasterItem>
): BomPartMasterItem[] {
  const matches: BomPartMasterItem[] = [];
  const rawUpper = (rawCode || '').trim().toUpperCase();
  existingPartsMap.forEach((p) => {
    const pCode = p.partCode.trim().toUpperCase();
    if (pCode === baseCode) return;
    const matchesRaw = rawUpper && rawUpper !== baseCode && pCode === rawUpper;
    const matches4DigitSuffix =
      pCode.startsWith(baseCode) &&
      pCode.length === baseCode.length + 4 &&
      /^\d{4}$/.test(pCode.slice(baseCode.length));
    if (matchesRaw || matches4DigitSuffix) {
      matches.push(p);
    }
  });
  return matches;
}

function mergeUniquePartImages(lists: BomPartMasterItem['images'][]): BomPartMasterItem['images'] {
  const seenUrls = new Set<string>();
  const result: BomPartMasterItem['images'] = [];
  lists.forEach((imgs) => {
    if (!Array.isArray(imgs)) return;
    imgs.forEach((img) => {
      if (!img?.url || seenUrls.has(img.url)) return;
      seenUrls.add(img.url);
      result.push(img);
    });
  });
  return result;
}

/**
 * Import hàng loạt định mức BOM từ Excel/CSV Ecount cho 1 Model:
 * - Mã đã tồn tại trong Kho Linh kiện -> giữ nguyên 100% ảnh, thông số kỹ thuật, cảnh báo QLCL;
 *   đồng thời tự động cập nhật thêm Nhà cung cấp, Tồn kho, Giá mua, Giá bán, Từ khóa từ file mới nếu có.
 * - Nếu là mã Nhựa màu đã quy về Phôi (bỏ 4 số cuối) mà trước đó từng up ảnh vào mã dài cũ:
 *   tự động kế thừa toàn bộ ảnh & thông số kỹ thuật từ mã dài cũ sang mã Phôi!
 * - Mã chưa có -> tạo mới bản ghi trong Kho Linh kiện.
 */
export async function bulkImportModelBom(params: {
  modelKey: string;
  modelName: string;
  existingModel?: BomModelRecord;
  rows: EcountParsedBomRow[];
  existingPartsMap: Map<string, BomPartMasterItem>;
  replaceExistingLines: boolean;
  updatedBy: string;
}): Promise<{
  newPartsCount: number;
  updatedExistingCount: number;
  linkedExistingCount: number;
  inheritedImagesCount: number;
  totalLines: number;
}> {
  const {
    modelKey,
    modelName,
    existingModel,
    rows,
    existingPartsMap,
    replaceExistingLines,
    updatedBy
  } = params;

  const nowIso = new Date().toISOString();
  const ops: Array<{ ref: ReturnType<typeof doc>; data: any }> = [];
  let newPartsCount = 0;
  let updatedExistingCount = 0;
  let linkedExistingCount = 0;
  let inheritedImagesCount = 0;

  rows.forEach((row) => {
    const code = row.partCode.trim().toUpperCase();
    const existingPart = existingPartsMap.get(code);
    const legacyMatches =
      row.isNormalizedFromColor || isColoredPlasticSpec(row.specGroup)
        ? findLegacyColoredPartsForBase(code, row.rawPartCode, existingPartsMap)
        : [];

    if (existingPart) {
      linkedExistingCount++;

      // Nếu mã Phôi hiện tại chưa có ảnh nhưng mã nhựa màu dài cũ có ảnh -> tự kế thừa sang
      const inheritedImages =
        (!existingPart.images || existingPart.images.length === 0) && legacyMatches.length > 0
          ? mergeUniquePartImages(legacyMatches.map((m) => m.images))
          : existingPart.images || [];
      const didInheritImg =
        (!existingPart.images || existingPart.images.length === 0) && inheritedImages.length > 0;
      if (didInheritImg) inheritedImagesCount++;

      const inheritedTechSpecs =
        existingPart.techSpecs?.trim() ||
        legacyMatches.find((m) => m.techSpecs?.trim())?.techSpecs ||
        '';

      // Kiểm tra nếu có thông tin mới (NCC, Tồn kho, Giá mua, Giá bán, Từ khóa...) cần bổ sung/cập nhật
      const nextSupplier = row.supplierName?.trim() || existingPart.supplierName || '';
      const nextStockQty = row.stockQty !== undefined ? row.stockQty : existingPart.stockQty;
      const nextPurchasePrice = row.purchasePrice !== undefined ? row.purchasePrice : existingPart.purchasePrice;
      const nextSellingPrice = row.sellingPrice !== undefined ? row.sellingPrice : existingPart.sellingPrice;
      const nextKeywords = row.keywords?.trim() || existingPart.keywords || '';
      const nextSpecGroup = row.specGroup?.trim() || existingPart.specGroup || '';
      const nextUnit = row.unit?.trim() || existingPart.unit || 'Cái';
      const nextNote = row.note?.trim() || existingPart.note || '';

      const hasChanges =
        didInheritImg ||
        inheritedTechSpecs !== (existingPart.techSpecs || '') ||
        nextSupplier !== (existingPart.supplierName || '') ||
        nextStockQty !== existingPart.stockQty ||
        nextPurchasePrice !== existingPart.purchasePrice ||
        nextSellingPrice !== existingPart.sellingPrice ||
        nextKeywords !== (existingPart.keywords || '') ||
        nextSpecGroup !== (existingPart.specGroup || '') ||
        nextUnit !== (existingPart.unit || 'Cái') ||
        nextNote !== (existingPart.note || '');

      if (hasChanges) {
        updatedExistingCount++;
        const docId = existingPart.id || toSafeDocId(code);
        const mergedPart: BomPartMasterItem = {
          ...existingPart,
          id: docId,
          partCode: code,
          specGroup: nextSpecGroup,
          unit: nextUnit,
          techSpecs: inheritedTechSpecs,
          supplierName: nextSupplier,
          stockQty: nextStockQty,
          purchasePrice: nextPurchasePrice,
          sellingPrice: nextSellingPrice,
          keywords: nextKeywords,
          images: inheritedImages,
          note: nextNote,
          updatedAt: nowIso,
          updatedBy
        };
        ops.push({
          ref: doc(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records', docId),
          data: mergedPart
        });
      }
      return;
    }

    newPartsCount++;
    const inheritedImages =
      legacyMatches.length > 0 ? mergeUniquePartImages(legacyMatches.map((m) => m.images)) : [];
    if (inheritedImages.length > 0) {
      inheritedImagesCount++;
    }
    const inheritedTechSpecs = legacyMatches.find((m) => m.techSpecs?.trim())?.techSpecs || '';
    const inheritedWarningStatus = legacyMatches.find(
      (m) => m.status === 'Cảnh báo lỗi' || m.status === 'Đang ECO'
    )?.status;
    const inheritedNote = legacyMatches.find((m) => m.note?.trim())?.note || '';

    const docId = toSafeDocId(code);
    const newPart: BomPartMasterItem = {
      id: docId,
      partCode: code,
      partName: row.partName || code,
      specGroup: row.specGroup || '',
      unit: row.unit || 'Cái',
      techSpecs: inheritedTechSpecs,
      supplierName: row.supplierName?.trim() || '',
      stockQty: row.stockQty,
      purchasePrice: row.purchasePrice,
      sellingPrice: row.sellingPrice,
      keywords: row.keywords?.trim() || '',
      status: inheritedWarningStatus || mapEcountStatusToQuality(row.ecountStatus),
      imageMode: inferPartImageMode(row.specGroup),
      images: inheritedImages,
      note: row.note || inheritedNote,
      updatedAt: nowIso,
      updatedBy
    };
    ops.push({
      ref: doc(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records', docId),
      data: newPart
    });
  });

  const importedLines: BomModelLineItem[] = rows.map((row, idx) => ({
    lineNo: idx + 1,
    partCode: row.partCode.trim().toUpperCase(),
    qty: row.qty,
    unit: row.unit || 'Cái',
    note: row.note || ''
  }));

  let finalLines: BomModelLineItem[] = importedLines;
  if (!replaceExistingLines && existingModel?.items?.length) {
    const lineMap = new Map<string, BomModelLineItem>();
    existingModel.items.forEach((item) => {
      lineMap.set(item.partCode.trim().toUpperCase(), { ...item });
    });
    importedLines.forEach((item) => {
      lineMap.set(item.partCode, item);
    });
    finalLines = Array.from(lineMap.values()).map((item, idx) => ({
      ...item,
      lineNo: idx + 1
    }));
  }

  const modelRecord: BomModelRecord = {
    id: modelKey,
    modelName,
    imageUrl: existingModel?.imageUrl,
    imagePath: existingModel?.imagePath,
    isDiscontinued: Boolean(existingModel?.isDiscontinued),
    items: finalLines,
    updatedAt: nowIso,
    updatedBy
  };

  ops.push({
    ref: doc(db, 'dk_db_sync', BOM_MODELS_COLLECTION, 'records', modelKey),
    data: modelRecord
  });

  await commitWriteBatches(ops);
  return {
    newPartsCount,
    updatedExistingCount,
    linkedExistingCount,
    inheritedImagesCount,
    totalLines: finalLines.length
  };
}

/**
 * Khôi phục dữ liệu Backup JSON cho phân hệ /lk.
 */
export async function restoreBomBackupPayload(payload: {
  models: BomModelRecord[];
  parts: BomPartMasterItem[];
}): Promise<{ modelsCount: number; partsCount: number }> {
  const ops: Array<{ ref: ReturnType<typeof doc>; data: any }> = [];

  (payload.parts || []).forEach((part) => {
    if (!part?.partCode) return;
    const code = part.partCode.trim().toUpperCase();
    const docId = part.id || toSafeDocId(code);
    ops.push({
      ref: doc(db, 'dk_db_sync', BOM_PARTS_COLLECTION, 'records', docId),
      data: { ...part, id: docId, partCode: code }
    });
  });

  (payload.models || []).forEach((model) => {
    if (!model?.modelName) return;
    const docId = model.id || toSafeDocId(model.modelName);
    ops.push({
      ref: doc(db, 'dk_db_sync', BOM_MODELS_COLLECTION, 'records', docId),
      data: { ...model, id: docId }
    });
  });

  await commitWriteBatches(ops);
  return {
    modelsCount: (payload.models || []).length,
    partsCount: (payload.parts || []).length
  };
}
