import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  flushSafeStorageWrites,
  restoreFirestorePayload,
  safeStorage,
  sanitizeFirestorePayload,
} from '../safeStorage';
import { ALL_SYNC_KEYS, CHUNKED_KEYS } from '../syncRegistry';
import { restoreBomBackupPayload } from './bomCatalogService';
import type { BomModelRecord, BomPartMasterItem } from '../types/bomCatalog';

const MAX_CHUNK_BYTES = 650_000;
const AUTO_BACKUP_MAX_KEEP = 7;
const AUTO_BACKUP_DOC_BYTE_BUDGET = 780_000;

export interface FullQmsBackupManifestV2 {
  schemaVersion: 2;
  company: string;
  brand: string;
  slogan: string;
  department: string;
  exportedAt: string;
  exportedBy: string;
  counts: Record<string, number>;
  data: Record<string, any>;
  bom: {
    models: BomModelRecord[];
    parts: BomPartMasterItem[];
  };
}

export interface AutoBackupSummary {
  id: string;
  createdAt: string;
  createdBy: string;
  keyCount: number;
  totalRecords: number;
  oqcCount: number;
  sizeKB: number;
}

function getApproxUtf8Bytes(val: any): number {
  try {
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
}

function triggerBlobDownload(filename: string, obj: any): number {
  const jsonStr = JSON.stringify(obj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return blob.size;
}

function getTodayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function splitArrayToChunks(arr: any[], maxBytes: number, maxItems: number): any[][] {
  const chunks: any[][] = [];
  let current: any[] = [];
  let currentBytes = 2;

  for (const item of arr) {
    const itemBytes = getApproxUtf8Bytes(sanitizeFirestorePayload(item)) + 2;
    if (
      current.length > 0 &&
      (current.length >= maxItems || currentBytes + itemBytes > maxBytes)
    ) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(item);
    currentBytes += itemBytes;
  }
  if (current.length > 0 || chunks.length === 0) {
    chunks.push(current);
  }
  return chunks;
}

async function fetchBomRecordsForBackup(): Promise<{
  models: BomModelRecord[];
  parts: BomPartMasterItem[];
}> {
  let models: BomModelRecord[] = [];
  let parts: BomPartMasterItem[] = [];

  try {
    const [modelsSnap, partsSnap] = await Promise.all([
      getDocs(collection(db, 'dk_db_sync', 'dk_bom_models', 'records')),
      getDocs(collection(db, 'dk_db_sync', 'dk_bom_parts', 'records')),
    ]);
    models = modelsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    parts = partsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch (err) {
    console.warn('[FullBackup] Fallback sang cache BOM cục bộ:', err);
    try {
      const mRaw = await safeStorage.getItemAsync('qms_bom_models_cache_v1');
      const pRaw = await safeStorage.getItemAsync('qms_bom_parts_cache_v1');
      if (mRaw) models = JSON.parse(mRaw);
      if (pRaw) parts = JSON.parse(pRaw);
    } catch {}
  }

  return { models, parts };
}

async function buildFullBackupManifest(exportedBy: string): Promise<FullQmsBackupManifestV2> {
  const data: Record<string, any> = {};
  const counts: Record<string, number> = {};

  for (const key of ALL_SYNC_KEYS) {
    const raw = await safeStorage.getItemAsync(key);
    if (raw === null || raw === undefined) continue;
    try {
      const parsed = JSON.parse(raw);
      data[key] = parsed;
      counts[key] = Array.isArray(parsed)
        ? parsed.length
        : parsed && typeof parsed === 'object'
        ? Object.keys(parsed).length
        : 1;
    } catch {
      data[key] = raw;
      counts[key] = 1;
    }
  }

  const bom = await fetchBomRecordsForBackup();
  counts['dk_bom_models'] = bom.models.length;
  counts['dk_bom_parts'] = bom.parts.length;

  return {
    schemaVersion: 2,
    company: 'Công ty TNHH Xe điện DK Việt Nhật',
    brand: 'DKBike',
    slogan: 'Xe cho cả gia đình',
    department: 'Quản lý chất lượng (QLCL / DK QMS)',
    exportedAt: new Date().toISOString(),
    exportedBy,
    counts,
    data,
    bom,
  };
}

/**
 * Xuất toàn bộ dữ liệu QMS (mọi khóa trong SYNC_REGISTRY + subcollection BOM /lk) ra file JSON qua Blob.
 */
export async function exportFullQmsBackup(
  exportedBy: string,
  filenamePrefix: string = 'DKBike_QMS_FullBackup'
): Promise<{
  totalKeys: number;
  totalRecords: number;
  bomModels: number;
  bomParts: number;
  sizeMB: string;
}> {
  const manifest = await buildFullBackupManifest(exportedBy);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const bytes = triggerBlobDownload(`${filenamePrefix}_${stamp}.json`, manifest);

  const totalRecords = Object.values(manifest.counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  return {
    totalKeys: Object.keys(manifest.data).length,
    totalRecords,
    bomModels: manifest.bom.models.length,
    bomParts: manifest.bom.parts.length,
    sizeMB: (bytes / (1024 * 1024)).toFixed(2),
  };
}

async function writeRestoredKeyToCloud(
  key: string,
  value: any,
  email: string,
  timestamp: string
): Promise<void> {
  const docRef = doc(db, 'dk_db_sync', key);

  // Kiểm tra số chunk cũ trên Cloud (nếu có) để dọn dẹp sạch chunk dư thừa
  let oldChunkCount = 0;
  try {
    const prevSnap = await getDoc(docRef);
    if (prevSnap.exists()) {
      const prevData = prevSnap.data();
      if (prevData?.isChunked && Number(prevData?.chunkCount) > 0) {
        oldChunkCount = Number(prevData.chunkCount);
      }
    }
  } catch {}

  const sanitizedVal = sanitizeFirestorePayload(value);
  const shouldChunk =
    CHUNKED_KEYS.includes(key) ||
    (Array.isArray(value) && getApproxUtf8Bytes(sanitizedVal) > MAX_CHUNK_BYTES);

  const ops: Array<{ type: 'set' | 'delete'; ref: ReturnType<typeof doc>; data?: any }> = [];

  if (shouldChunk && Array.isArray(value)) {
    const maxItems = key === 'dk_part_evaluations' ? 8 : key === 'dk_oqc_records' ? 500 : 250;
    const chunks = splitArrayToChunks(value, MAX_CHUNK_BYTES, maxItems);
    const chunkHashes: string[] = [];

    chunks.forEach((chunkData, idx) => {
      const chunkHash = `${chunkData.length}_${getApproxUtf8Bytes(chunkData)}_${timestamp}`;
      chunkHashes.push(chunkHash);
      ops.push({
        type: 'set',
        ref: doc(db, 'dk_db_sync', `${key}_chunk_${idx}`),
        data: {
          chunkIndex: idx,
          parentKey: key,
          data: chunkData,
          chunkHash,
          updatedAt: timestamp,
        },
      });
    });

    for (let oldIdx = chunks.length; oldIdx < oldChunkCount; oldIdx++) {
      ops.push({
        type: 'delete',
        ref: doc(db, 'dk_db_sync', `${key}_chunk_${oldIdx}`),
      });
    }

    ops.push({
      type: 'set',
      ref: docRef,
      data: {
        isChunked: true,
        chunkCount: chunks.length,
        chunkHashes,
        totalRecords: value.length,
        deletedIds: [],
        updatedBy: email,
        updatedAt: timestamp,
        restoredAt: timestamp,
      },
    });
  } else {
    for (let oldIdx = 0; oldIdx < oldChunkCount; oldIdx++) {
      ops.push({
        type: 'delete',
        ref: doc(db, 'dk_db_sync', `${key}_chunk_${oldIdx}`),
      });
    }

    const payload: any = {
      data: value,
      isChunked: false,
      chunkCount: 0,
      updatedBy: email,
      updatedAt: timestamp,
      restoredAt: timestamp,
      count: Array.isArray(value) ? value.length : 1,
    };
    if (key === 'dk_staff' && Array.isArray(value)) {
      payload.allowedEmails = value
        .map((item: any) => (item?.email ? String(item.email).toLowerCase().trim() : ''))
        .filter(Boolean);
      payload.allowedEditorEmails = value
        .filter((item: any) => item && (item.permission === 'edit' || item.permission === 'admin'))
        .map((item: any) => (item?.email ? String(item.email).toLowerCase().trim() : ''))
        .filter(Boolean);
    }

    ops.push({ type: 'set', ref: docRef, data: payload });
  }

  const BATCH_SIZE = 4;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const slice = ops.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    slice.forEach((op) => {
      if (op.type === 'set') {
        batch.set(op.ref, sanitizeFirestorePayload(op.data));
      } else {
        batch.delete(op.ref);
      }
    });
    await batch.commit();
  }
}

/**
 * Khôi phục chuẩn (Authoritative Restore):
 * 1) Tự động xuất 1 bản sao lưu an toàn trước khi khôi phục.
 * 2) Ghi dữ liệu khôi phục xuống safeStorage + IndexedDB và đẩy trực tiếp lên Firestore (kèm BOM /lk)
 *    để mọi thiết bị khác nhận đúng trạng thái khôi phục qua onSnapshot.
 */
export async function restoreFullQmsBackupFromObject(
  parsed: any,
  email: string,
  onProgress?: (text: string) => void
): Promise<{ restoredKeys: number; bomModels: number; bomParts: number }> {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('File sao lưu không đúng định dạng JSON hợp lệ.');
  }

  let dataMap: Record<string, any> = {};
  let bomPayload: { models: BomModelRecord[]; parts: BomPartMasterItem[] } | null = null;

  if (parsed.schemaVersion === 2 && parsed.data && typeof parsed.data === 'object') {
    dataMap = parsed.data;
    if (parsed.bom && (Array.isArray(parsed.bom.models) || Array.isArray(parsed.bom.parts))) {
      bomPayload = {
        models: Array.isArray(parsed.bom.models) ? parsed.bom.models : [],
        parts: Array.isArray(parsed.bom.parts) ? parsed.bom.parts : [],
      };
    }
  } else {
    // Hỗ trợ tương thích file backup v1 dạng { dk_*: ... }
    Object.keys(parsed).forEach((k) => {
      if (k.startsWith('dk_') && !k.endsWith('_is_dirty')) {
        dataMap[k] = parsed[k];
      }
    });
  }

  const keysToRestore = Object.keys(dataMap).filter((k) => ALL_SYNC_KEYS.includes(k));
  if (keysToRestore.length === 0 && !bomPayload) {
    throw new Error('Không tìm thấy phân hệ dữ liệu QMS hợp lệ nào trong file sao lưu.');
  }

  onProgress?.('Đang tạo bản sao lưu an toàn trước khi khôi phục...');
  await exportFullQmsBackup(email, 'DKBike_QMS_PreRestore_Safety');

  const timestamp = new Date().toISOString();
  let restoredKeys = 0;

  for (let idx = 0; idx < keysToRestore.length; idx++) {
    const key = keysToRestore[idx];
    const val = dataMap[key];
    onProgress?.(`Đang khôi phục (${idx + 1}/${keysToRestore.length}): ${key}...`);

    const serialized = typeof val === 'string' ? val : JSON.stringify(val);
    safeStorage.setItem(key, serialized);
    safeStorage.setItem(`${key}_deleted_ids`, '[]');

    if (auth.currentUser) {
      await writeRestoredKeyToCloud(key, val, email, timestamp);
      safeStorage.setItem(`${key}_is_dirty`, 'false');
      safeStorage.setItem(`${key}_last_synced_at`, timestamp);
    } else {
      safeStorage.setItem(`${key}_is_dirty`, 'true');
    }
    restoredKeys++;
  }

  let bomModels = 0;
  let bomParts = 0;
  if (bomPayload && auth.currentUser && (bomPayload.models.length > 0 || bomPayload.parts.length > 0)) {
    onProgress?.(`Đang khôi phục danh mục BOM /lk (${bomPayload.models.length} dòng xe, ${bomPayload.parts.length} linh kiện)...`);
    const bomRes = await restoreBomBackupPayload(bomPayload);
    bomModels = bomRes.modelsCount;
    bomParts = bomRes.partsCount;
  }

  await flushSafeStorageWrites();
  return { restoredKeys, bomModels, bomParts };
}

export async function restoreFullQmsBackupFromFile(
  file: File,
  email: string,
  onProgress?: (text: string) => void
): Promise<{ restoredKeys: number; bomModels: number; bomParts: number }> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return restoreFullQmsBackupFromObject(parsed, email, onProgress);
}

/**
 * Snapshot tự động theo ngày trên Firestore (`dk_backups/{YYYY-MM-DD}`), tự xoay vòng giữ 7 bản gần nhất.
 * Lưu toàn bộ các phân hệ nghiệp vụ cốt lõi trong giới hạn 1MB/doc của Firestore (OQC >10MB được lưu riêng trên dk_db_sync + xuất full JSON).
 */
export async function runDailyAutoBackupIfNeeded(email: string): Promise<boolean> {
  if (!auth.currentUser) return false;
  const todayId = getTodayYmdLocal();
  const localFlagKey = 'dk_last_auto_backup_ymd';
  if (safeStorage.getItem(localFlagKey) === todayId) return false;

  try {
    const snapRef = doc(db, 'dk_backups', todayId);
    const existing = await getDoc(snapRef);
    if (existing.exists()) {
      safeStorage.setItem(localFlagKey, todayId);
      return false;
    }

    const compactData: Record<string, any> = {};
    const counts: Record<string, number> = {};
    let usedBytes = 0;
    let oqcCount = 0;

    // Ưu tiên các khóa quản trị & nghiệp vụ quan trọng (bỏ qua mảng OQC 12MB vượt quá 1MB/doc)
    for (const key of ALL_SYNC_KEYS) {
      const raw = await safeStorage.getItemAsync(key);
      if (!raw) continue;
      let parsed: any = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {}

      const itemCount = Array.isArray(parsed)
        ? parsed.length
        : parsed && typeof parsed === 'object'
        ? Object.keys(parsed).length
        : 1;
      counts[key] = itemCount;

      if (key === 'dk_oqc_records') {
        oqcCount = itemCount;
        continue;
      }

      const keyBytes = getApproxUtf8Bytes(raw);
      if (keyBytes > 300_000 || usedBytes + keyBytes > AUTO_BACKUP_DOC_BYTE_BUDGET) {
        continue;
      }
      compactData[key] = parsed;
      usedBytes += keyBytes;
    }

    const totalRecords = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);
    const payload = {
      schemaVersion: 2,
      id: todayId,
      company: 'Công ty TNHH Xe điện DK Việt Nhật',
      createdAt: new Date().toISOString(),
      createdBy: email || auth.currentUser.email || 'system',
      keyCount: Object.keys(compactData).length,
      totalRecords,
      oqcCount,
      sizeKB: Math.round(usedBytes / 1024),
      counts,
      data: compactData,
    };

    await setDoc(snapRef, sanitizeFirestorePayload(payload));
    safeStorage.setItem(localFlagKey, todayId);

    // Xoay vòng giữ đúng 7 bản gần nhất
    const allSnaps = await getDocs(collection(db, 'dk_backups'));
    const sortedIds = allSnaps.docs.map((d) => d.id).sort((a, b) => b.localeCompare(a));
    if (sortedIds.length > AUTO_BACKUP_MAX_KEEP) {
      const toDelete = sortedIds.slice(AUTO_BACKUP_MAX_KEEP);
      await Promise.allSettled(toDelete.map((id) => deleteDoc(doc(db, 'dk_backups', id))));
    }

    console.log(`[Auto Backup] Đã lưu snapshot ngày ${todayId} (${payload.keyCount} phân hệ, ${payload.sizeKB} KB).`);
    return true;
  } catch (err) {
    console.warn('[Auto Backup Notice]:', err);
    return false;
  }
}

export async function listAutoBackups(): Promise<AutoBackupSummary[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(collection(db, 'dk_backups'));
    return snap.docs
      .map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          createdAt: String(data.createdAt || d.id),
          createdBy: String(data.createdBy || ''),
          keyCount: Number(data.keyCount || 0),
          totalRecords: Number(data.totalRecords || 0),
          oqcCount: Number(data.oqcCount || 0),
          sizeKB: Number(data.sizeKB || 0),
        };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  } catch (err) {
    console.warn('[Auto Backup List Warning]:', err);
    return [];
  }
}

export async function restoreFromAutoBackup(
  backupId: string,
  email: string,
  onProgress?: (text: string) => void
): Promise<{ restoredKeys: number; bomModels: number; bomParts: number }> {
  const snap = await getDoc(doc(db, 'dk_backups', backupId));
  if (!snap.exists()) {
    throw new Error(`Không tìm thấy bản snapshot ${backupId} trên Cloud.`);
  }
  const restoredDoc = restoreFirestorePayload(snap.data());
  return restoreFullQmsBackupFromObject(restoredDoc, email, onProgress);
}
