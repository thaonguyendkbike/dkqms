import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Square,
  X
} from 'lucide-react';
import { saveBomPartRecord } from '../services/bomCatalogService';
import { uploadBomImageToStorage } from '../services/bomStorageService';
import { BomPartImageItem, BomPartMasterItem } from '../types/bomCatalog';
import {
  buildLarkSyncPlan,
  fetchLarkMediaFileViaProxy,
  fetchLarkRecordsViaProxy,
  LarkSyncRecord
} from '../utils/larkBomSync';

interface LarkBomSyncModalProps {
  open: boolean;
  onClose: () => void;
  partsByCode: Map<string, BomPartMasterItem>;
  extraColors: string[];
  currentUserName?: string;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const LS_LARK_CONFIG_KEY = 'qms_lark_bom_sync_cfg_v1';

interface SavedLarkConfig {
  appId: string;
  appToken: string;
  tableId: string;
  domain: string;
}

function loadSavedLarkConfig(): SavedLarkConfig {
  try {
    const raw = window.localStorage.getItem(LS_LARK_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        appId: parsed.appId || 'cli_ab8b84770161df02',
        appToken: parsed.appToken || 'PxMTwIbqcioknLk0BIilPcaggAe',
        tableId: parsed.tableId || 'tbl6VNEsNJWyPWlO',
        domain: parsed.domain || 'https://open.larksuite.com'
      };
    }
  } catch {}
  return {
    appId: 'cli_ab8b84770161df02',
    appToken: 'PxMTwIbqcioknLk0BIilPcaggAe',
    tableId: 'tbl6VNEsNJWyPWlO',
    domain: 'https://open.larksuite.com'
  };
}

export const LarkBomSyncModal: React.FC<LarkBomSyncModalProps> = ({
  open,
  onClose,
  partsByCode,
  extraColors,
  currentUserName,
  onToast
}) => {
  const initialCfg = useMemo(() => loadSavedLarkConfig(), []);
  const [appId, setAppId] = useState(initialCfg.appId);
  const [appSecret, setAppSecret] = useState('');
  const [appToken, setAppToken] = useState(initialCfg.appToken);
  const [tableId, setTableId] = useState(initialCfg.tableId);
  const [domain, setDomain] = useState(initialCfg.domain);

  const [loadingRecords, setLoadingRecords] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [larkRecords, setLarkRecords] = useState<LarkSyncRecord[] | null>(null);
  const [totalRawRecords, setTotalRawRecords] = useState(0);
  const [activeProxyBaseUrl, setActiveProxyBaseUrl] = useState('');

  // Tùy chọn đồng bộ
  const [syncMode, setSyncMode] = useState<'skip_existing' | 'append'>('skip_existing');
  const [mergePlasticLongCodes, setMergePlasticLongCodes] = useState(true);
  const [limitPlasticImages, setLimitPlasticImages] = useState(true);
  const [updateEmptyTechSpecs, setUpdateEmptyTechSpecs] = useState(true);
  const [showUnmatchedList, setShowUnmatchedList] = useState(false);

  // Trạng thái chạy thực tế
  const [syncing, setSyncing] = useState(false);
  const cancelRequestedRef = useRef(false);
  const [progress, setProgress] = useState({
    doneParts: 0,
    totalParts: 0,
    uploadedImages: 0,
    failedImages: 0,
    currentCode: '',
    lastError: ''
  });

  const summary = useMemo(() => {
    if (!larkRecords) return null;
    return buildLarkSyncPlan({
      larkRecords,
      partsByCode,
      extraColors,
      syncMode,
      mergePlasticLongCodes,
      limitPlasticImages,
      updateEmptyTechSpecs
    });
  }, [
    larkRecords,
    partsByCode,
    extraColors,
    syncMode,
    mergePlasticLongCodes,
    limitPlasticImages,
    updateEmptyTechSpecs
  ]);

  if (!open) return null;

  const handleScanLark = async () => {
    if (!appId.trim() || !appSecret.trim() || !appToken.trim() || !tableId.trim()) {
      setFetchError('Vui lòng nhập đầy đủ App ID, App Secret, Base Token và Table ID.');
      return;
    }

    setFetchError(null);
    setLoadingRecords(true);
    setShowUnmatchedList(false);

    try {
      try {
        window.localStorage.setItem(
          LS_LARK_CONFIG_KEY,
          JSON.stringify({
            appId: appId.trim(),
            appToken: appToken.trim(),
            tableId: tableId.trim(),
            domain
          })
        );
      } catch {}

      const result = await fetchLarkRecordsViaProxy({
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        appToken: appToken.trim(),
        tableId: tableId.trim(),
        domain
      });
      setLarkRecords(result.records);
      setTotalRawRecords(result.totalRawRecords);
      setActiveProxyBaseUrl(result.activeBaseUrl);
      onToast(`Đã quét xong ${result.records.length} dòng có mã LK từ Lark Base.`, 'info');
    } catch (err: any) {
      setFetchError(err?.message || 'Không thể kết nối Lark Base.');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleStartSync = async () => {
    if (!summary || summary.plans.length === 0) return;

    cancelRequestedRef.current = false;
    setSyncing(true);
    setProgress({
      doneParts: 0,
      totalParts: summary.plans.length,
      uploadedImages: 0,
      failedImages: 0,
      currentCode: '',
      lastError: ''
    });

    let uploadedImages = 0;
    let failedImages = 0;
    let updatedPartsCount = 0;
    let lastErr = '';

    for (let i = 0; i < summary.plans.length; i++) {
      if (cancelRequestedRef.current) break;

      const plan = summary.plans[i];
      const partCode = plan.targetPart.partCode.trim().toUpperCase();
      setProgress((prev) => ({ ...prev, currentCode: partCode }));

      const newlyUploaded: BomPartImageItem[] = [];
      for (const att of plan.attachmentsToUpload) {
        if (cancelRequestedRef.current) break;
        try {
          const file = await fetchLarkMediaFileViaProxy({
            activeBaseUrl: activeProxyBaseUrl,
            appId: appId.trim(),
            appSecret: appSecret.trim(),
            attachment: att,
            domain
          });
          const uploaded = await uploadBomImageToStorage(file, 'parts', partCode);
          newlyUploaded.push({
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url: uploaded.url,
            path: uploaded.path,
            caption: att.caption,
            updatedAt: new Date().toISOString()
          });
          uploadedImages++;
        } catch (err: any) {
          failedImages++;
          lastErr = `${partCode} (${att.name}): ${err?.message || err}`;
        }
      }

      if (newlyUploaded.length > 0 || plan.nextTechSpecs) {
        const existingImages = Array.isArray(plan.targetPart.images) ? plan.targetPart.images : [];
        const mergedImages = [...existingImages, ...newlyUploaded];
        const nextPart: BomPartMasterItem = {
          ...plan.targetPart,
          images: mergedImages,
          techSpecs: plan.nextTechSpecs ? plan.nextTechSpecs : plan.targetPart.techSpecs,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserName || 'Lark Base Sync'
        };
        try {
          await saveBomPartRecord(nextPart);
          updatedPartsCount++;
        } catch (err: any) {
          lastErr = `Lưu Firestore ${partCode}: ${err?.message || err}`;
        }
      }

      setProgress({
        doneParts: i + 1,
        totalParts: summary.plans.length,
        uploadedImages,
        failedImages,
        currentCode: partCode,
        lastError: lastErr
      });
    }

    setSyncing(false);
    if (cancelRequestedRef.current) {
      onToast(
        `Đã dừng giữa chừng. Đã lưu ${updatedPartsCount} mã LK (${uploadedImages} ảnh).`,
        'info'
      );
    } else {
      onToast(
        `Đồng bộ hoàn tất: ${updatedPartsCount} mã LK (${uploadedImages} ảnh tải lên${
          failedImages > 0 ? `, ${failedImages} ảnh lỗi` : ''
        }).`,
        failedImages > 0 ? 'info' : 'success'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black flex items-center gap-2 truncate">
              <CloudDownload className="w-4 h-4 text-indigo-300 shrink-0" />
              Đồng bộ ảnh từ Lark Base sang Kho LK
            </h3>
            <p className="text-[11px] text-indigo-200 truncate">
              Tự động lấy ảnh Tổng quan &amp; Kích thước, nén HD &amp; gom mã Nhựa màu dài về Phôi
            </p>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Bước 1: Thông tin kết nối Lark App */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider">
                1. Cấu hình kết nối Lark Open Platform
              </h4>
              <select
                value={domain}
                disabled={syncing}
                onChange={(e) => setDomain(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold text-[11px]"
              >
                <option value="https://open.larksuite.com">Lark Quốc tế (open.larksuite.com)</option>
                <option value="https://open.feishu.cn">Feishu CN (open.feishu.cn)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">App ID</label>
                <input
                  type="text"
                  disabled={syncing}
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="cli_..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  App Secret <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  disabled={syncing}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="Nhập App Secret để xác thực phiên này..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Base Token (app_token)</label>
                <input
                  type="text"
                  disabled={syncing}
                  value={appToken}
                  onChange={(e) => setAppToken(e.target.value)}
                  placeholder="PxMTwI..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Table ID</label>
                <input
                  type="text"
                  disabled={syncing}
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  placeholder="tbl..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-slate-500">
                App Secret chỉ dùng tạm trên phiên trình duyệt hiện tại, không lưu lên máy chủ/GitHub.
              </p>
              <button
                type="button"
                disabled={loadingRecords || syncing}
                onClick={handleScanLark}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {loadingRecords ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {loadingRecords ? 'Đang đọc Lark Base...' : 'Quét dữ liệu Lark Base'}
              </button>
            </div>

            {fetchError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{fetchError}</span>
              </div>
            )}
          </div>

          {/* Bước 2: Xem trước kết quả khớp & Quy tắc gom nhựa */}
          {summary && (
            <div className="space-y-3">
              {/* Thống kê nhanh */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Dòng Lark (Có ảnh)
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {summary.totalLarkRecordsWithImages}
                    <span className="text-xs font-semibold text-slate-400">
                      {' '}
                      / {totalRawRecords}
                    </span>
                  </span>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">
                    Mã LK sẽ đồng bộ
                  </span>
                  <span className="text-base font-black text-indigo-800">
                    {summary.plans.length} mã
                  </span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">
                    Gom Nhựa → Phôi
                  </span>
                  <span className="text-base font-black text-amber-900">
                    {summary.plasticMergedCount} mã
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Tổng ảnh chuẩn bị tải
                  </span>
                  <span className="text-base font-black text-emerald-800">
                    {summary.totalImagesToUpload} ảnh
                  </span>
                </div>
              </div>

              {/* Tùy chọn quy tắc */}
              <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="larkSyncMode"
                      disabled={syncing}
                      checked={syncMode === 'skip_existing'}
                      onChange={() => setSyncMode('skip_existing')}
                      className="accent-indigo-600"
                    />
                    Chỉ cập nhật mã chưa có ảnh (bỏ qua {summary.skippedExistingCount} mã đã có ảnh)
                  </label>
                  <label className="inline-flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="larkSyncMode"
                      disabled={syncing}
                      checked={syncMode === 'append'}
                      onChange={() => setSyncMode('append')}
                      className="accent-indigo-600"
                    />
                    Bổ sung thêm ảnh vào cả mã đã có ảnh
                  </label>
                </div>

                <div className="flex flex-col gap-1.5 pt-1 border-t border-indigo-200/70">
                  <label className="inline-flex items-start gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={syncing}
                      checked={mergePlasticLongCodes}
                      onChange={(e) => setMergePlasticLongCodes(e.target.checked)}
                      className="accent-indigo-600 mt-0.5"
                    />
                    <span>
                      <strong>Tự động gom mã Nhựa màu dài</strong> trên Lark Base (bỏ 4 số đuôi màu)
                      để khớp về đúng mã Phôi trong Kho LK
                    </span>
                  </label>

                  <label className="inline-flex items-start gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={syncing}
                      checked={limitPlasticImages}
                      onChange={(e) => setLimitPlasticImages(e.target.checked)}
                      className="accent-indigo-600 mt-0.5"
                    />
                    <span>
                      Với mã <strong>Nhựa đã gom từ nhiều màu</strong>, chỉ lấy tối đa 1 ảnh Tổng
                      quan + 1 ảnh Kích thước đại diện (tránh trùng ảnh các màu)
                    </span>
                  </label>

                  <label className="inline-flex items-start gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={syncing}
                      checked={updateEmptyTechSpecs}
                      onChange={(e) => setUpdateEmptyTechSpecs(e.target.checked)}
                      className="accent-indigo-600 mt-0.5"
                    />
                    <span>
                      Tự động bổ sung cột <strong>Thông số kỹ thuật LK</strong> từ Lark Base nếu mã
                      trong Kho LK đang trống
                    </span>
                  </label>
                </div>
              </div>

              {/* Cảnh báo các mã trên Lark có ảnh nhưng chưa có trong Kho LK */}
              {summary.unmatchedWithImages.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-amber-900">
                      Có {summary.unmatchedWithImages.length} mã trên Lark Base đang có ảnh nhưng
                      chưa khớp với Kho LK hiện tại (cần import BOM Excel chứa các mã này trước hoặc
                      kiểm tra lại mã).
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUnmatchedList((p) => !p)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold text-[11px] cursor-pointer"
                    >
                      {showUnmatchedList ? 'Ẩn danh sách' : 'Xem mã chưa khớp'}
                    </button>
                  </div>
                  {showUnmatchedList && (
                    <div className="max-h-40 overflow-y-auto bg-white rounded-lg border border-amber-200 p-2 space-y-1 text-[11px]">
                      {summary.unmatchedWithImages.slice(0, 100).map((u, idx) => (
                        <div
                          key={`${u.partCode}-${idx}`}
                          className="flex items-center justify-between gap-2 py-0.5 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-mono font-bold text-slate-800">{u.partCode}</span>
                          <span className="text-slate-600 truncate flex-1">{u.partName}</span>
                          <span className="text-amber-700 font-bold shrink-0">
                            {u.specGroup || '—'} • {u.imageCount} ảnh
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bảng Preview các mã sẽ đồng bộ */}
              {summary.plans.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Mã Kho LK</th>
                        <th className="py-2 px-3">Mã gốc từ Lark</th>
                        <th className="py-2 px-3">Tên mặt hàng</th>
                        <th className="py-2 px-3 text-center">Ảnh đồng bộ</th>
                        <th className="py-2 px-3">Loại khớp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {summary.plans.slice(0, 150).map((p) => (
                        <tr key={p.targetPart.partCode}>
                          <td className="py-1.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {p.targetPart.partCode}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-slate-600 max-w-[180px] truncate">
                            {p.matchedLarkCodes.join(', ')}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-800 max-w-[220px] truncate">
                            {p.targetPart.partName}
                          </td>
                          <td className="py-1.5 px-3 text-center font-extrabold text-emerald-700 whitespace-nowrap">
                            {p.attachmentsToUpload.length} ảnh
                            {p.nextTechSpecs ? ' + TSKT' : ''}
                          </td>
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            {p.matchType === 'plastic_merged' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                                <Layers className="w-3 h-3" /> Gom Phôi nhựa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Khớp trực tiếp
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  Không có ảnh mới nào cần đồng bộ theo điều kiện hiện tại.
                </div>
              )}

              {/* Thanh tiến độ khi đang tải */}
              {(syncing || progress.totalParts > 0) && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-indigo-950">
                    <span>
                      {syncing
                        ? `Đang xử lý: ${progress.currentCode} (${progress.doneParts}/${progress.totalParts} mã)`
                        : `Hoàn tất: ${progress.doneParts}/${progress.totalParts} mã`}
                    </span>
                    <span className="text-emerald-700">
                      Đã lên Storage: {progress.uploadedImages} ảnh
                      {progress.failedImages > 0 && (
                        <span className="text-rose-600"> • Lỗi: {progress.failedImages}</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-indigo-200">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200"
                      style={{
                        width: `${
                          progress.totalParts > 0
                            ? Math.round((progress.doneParts / progress.totalParts) * 100)
                            : 0
                        }%`
                      }}
                    />
                  </div>
                  {progress.lastError && (
                    <p className="text-[11px] text-rose-700 font-semibold break-all">
                      Lưu ý lỗi gần nhất: {progress.lastError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-slate-500">
            Mỗi ảnh được nén chuẩn HD 1400×1400px &amp; lưu ngay sau từng mã.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {syncing ? (
              <button
                type="button"
                onClick={() => {
                  cancelRequestedRef.current = true;
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Dừng lại
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
                >
                  Đóng
                </button>
                {summary && summary.plans.length > 0 && (
                  <button
                    type="button"
                    onClick={handleStartSync}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Bắt đầu đồng bộ ({summary.plans.length} mã / {summary.totalImagesToUpload} ảnh)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
