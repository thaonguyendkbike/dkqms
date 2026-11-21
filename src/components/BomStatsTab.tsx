import React, { useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bike,
  Building2,
  Camera,
  CheckCircle2,
  ExternalLink,
  ImageOff,
  Package,
  Share2
} from 'lucide-react';
import { BomModelRecord, BomPartMasterItem, OqcModelSummary, PartQualityStatus } from '../types/bomCatalog';

interface BomStatsTabProps {
  bomParts: BomPartMasterItem[];
  combinedModels: Array<{ summary: OqcModelSummary; bom?: BomModelRecord }>;
  partsByCode: Map<string, BomPartMasterItem>;
  whereUsedMap: Map<string, { modelKey: string; modelName: string; qty: number; unit: string }[]>;
  onOpenPartDetail: (partCode: string) => void;
  onOpenModelBom: (modelKey: string) => void;
  onFilterPartsTab: (opts: { specGroup?: string; missingImgOnly?: boolean; status?: 'ALL' | PartQualityStatus }) => void;
}

export const BomStatsTab: React.FC<BomStatsTabProps> = ({
  bomParts,
  combinedModels,
  partsByCode,
  whereUsedMap,
  onOpenPartDetail,
  onOpenModelBom,
  onFilterPartsTab
}) => {
  const stats = useMemo(() => {
    const totalParts = bomParts.length;
    let partsWithImages = 0;
    let totalImagesCount = 0;
    let partsWithTechSpecs = 0;
    let partsWithSupplier = 0;
    let partsWithSellingPrice = 0;
    let partsWithPurchasePrice = 0;

    const statusCounts: Record<PartQualityStatus, number> = {
      'Đang dùng': 0,
      'Cảnh báo lỗi': 0,
      'Đang ECO': 0,
      'Ngừng dùng': 0
    };

    const specMap = new Map<string, { group: string; total: number; withImg: number; alerts: number }>();
    const supplierMap = new Map<string, { name: string; total: number; withImg: number }>();

    for (const p of bomParts) {
      const imgCount = Array.isArray(p.images) ? p.images.length : 0;
      totalImagesCount += imgCount;
      if (imgCount > 0) partsWithImages++;
      if (p.techSpecs && p.techSpecs.trim()) partsWithTechSpecs++;
      if (p.supplierName && p.supplierName.trim()) partsWithSupplier++;
      if (typeof p.sellingPrice === 'number' && p.sellingPrice > 0) partsWithSellingPrice++;
      if (typeof p.purchasePrice === 'number' && p.purchasePrice > 0) partsWithPurchasePrice++;

      const st: PartQualityStatus = p.status || 'Đang dùng';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      const groupKey = p.specGroup?.trim() || 'Chưa phân nhóm';
      const specEntry = specMap.get(groupKey) || { group: groupKey, total: 0, withImg: 0, alerts: 0 };
      specEntry.total++;
      if (imgCount > 0) specEntry.withImg++;
      if (st === 'Cảnh báo lỗi' || st === 'Đang ECO') specEntry.alerts++;
      specMap.set(groupKey, specEntry);

      const supName = p.supplierName?.trim();
      if (supName) {
        const supEntry = supplierMap.get(supName) || { name: supName, total: 0, withImg: 0 };
        supEntry.total++;
        if (imgCount > 0) supEntry.withImg++;
        supplierMap.set(supName, supEntry);
      }
    }

    const partsWithoutImages = totalParts - partsWithImages;
    const imageCoveragePct = totalParts > 0 ? Math.round((partsWithImages / totalParts) * 100) : 0;

    const activeModels = combinedModels.filter((m) => !m.bom?.isDiscontinued);
    const activeModelsWithBom = activeModels.filter((m) => (m.bom?.items?.length || 0) > 0);
    const activeModelsWithPhoto = activeModels.filter((m) => Boolean(m.bom?.imageUrl));

    const modelBomProgress = activeModelsWithBom
      .map(({ summary, bom }) => {
        const items = bom?.items || [];
        let hasImgCount = 0;
        let alertCount = 0;
        items.forEach((line) => {
          const part = partsByCode.get(line.partCode.trim().toUpperCase());
          if (part && Array.isArray(part.images) && part.images.length > 0) hasImgCount++;
          if (part && (part.status === 'Cảnh báo lỗi' || part.status === 'Đang ECO')) alertCount++;
        });
        const pct = items.length > 0 ? Math.round((hasImgCount / items.length) * 100) : 0;
        return {
          modelKey: summary.modelKey,
          modelName: summary.modelName,
          totalItems: items.length,
          hasImgCount,
          missingImgCount: items.length - hasImgCount,
          alertCount,
          pct
        };
      })
      .sort((a, b) => a.pct - b.pct || b.totalItems - a.totalItems);

    const topSharedParts = bomParts
      .map((p) => {
        const code = p.partCode.trim().toUpperCase();
        const usedModels = whereUsedMap.get(code) || [];
        return {
          part: p,
          usedCount: usedModels.length
        };
      })
      .filter((x) => x.usedCount >= 2)
      .sort((a, b) => b.usedCount - a.usedCount)
      .slice(0, 15);

    const sharedPartsCount = Array.from(whereUsedMap.values() as Iterable<unknown[]>).filter((arr) => arr.length >= 2).length;
    const specBreakdown = Array.from(specMap.values()).sort((a, b) => b.total - a.total);
    const topSuppliers = Array.from(supplierMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      totalParts,
      partsWithImages,
      partsWithoutImages,
      totalImagesCount,
      imageCoveragePct,
      partsWithTechSpecs,
      partsWithSupplier,
      partsWithSellingPrice,
      partsWithPurchasePrice,
      statusCounts,
      activeModelsTotal: activeModels.length,
      activeModelsWithBom: activeModelsWithBom.length,
      activeModelsWithPhoto: activeModelsWithPhoto.length,
      discontinuedModelsTotal: combinedModels.length - activeModels.length,
      sharedPartsCount,
      specBreakdown,
      topSuppliers,
      topSharedParts,
      modelBomProgress
    };
  }, [bomParts, combinedModels, partsByCode, whereUsedMap]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase">Kho linh kiện</span>
            <Package className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.totalParts.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-semibold text-slate-500">mã</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Dùng chung ≥ 2 xe:{' '}
            <strong className="text-indigo-700">{stats.sharedPartsCount} mã</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-3.5 sm:p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-emerald-700 uppercase">Độ phủ ảnh LK</span>
            <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              {stats.imageCoveragePct}%
            </span>
            <span className="text-xs font-bold text-slate-600">
              ({stats.partsWithImages}/{stats.totalParts})
            </span>
          </div>
          <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${stats.imageCoveragePct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Tổng: {stats.totalImagesCount.toLocaleString('vi-VN')} ảnh</span>
            {stats.partsWithoutImages > 0 && (
              <button
                type="button"
                onClick={() => onFilterPartsTab({ missingImgOnly: true })}
                className="text-rose-600 font-bold hover:underline cursor-pointer"
              >
                Thiếu {stats.partsWithoutImages}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-200 p-3.5 sm:p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-indigo-700 uppercase">Model đang SX</span>
            <Bike className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-indigo-800">
              {stats.activeModelsWithBom}
              <span className="text-sm font-bold text-slate-400">/{stats.activeModelsTotal}</span>
            </span>
            <span className="text-xs font-semibold text-slate-500">có BOM</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Có ảnh xe: <strong className="text-slate-700">{stats.activeModelsWithPhoto}</strong> • Ngừng SX:{' '}
            <strong className="text-slate-700">{stats.discontinuedModelsTotal}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-3.5 sm:p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-amber-800 uppercase">Lưu ý chất lượng</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-rose-600">
              {stats.statusCounts['Cảnh báo lỗi'] + stats.statusCounts['Đang ECO']}
            </span>
            <span className="text-xs font-semibold text-slate-500">mã</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onFilterPartsTab({ status: 'Cảnh báo lỗi' })}
              className="text-rose-700 font-bold hover:underline cursor-pointer"
            >
              Lỗi: {stats.statusCounts['Cảnh báo lỗi']}
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onFilterPartsTab({ status: 'Đang ECO' })}
              className="text-amber-700 font-bold hover:underline cursor-pointer"
            >
              ECO: {stats.statusCounts['Đang ECO']}
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Ngừng: {stats.statusCounts['Ngừng dùng']}</span>
          </div>
        </div>
      </div>

      {/* Hàng 2: Thống kê theo Nhóm thông số & Độ đầy đủ trường dữ liệu */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Theo Nhóm Thông số */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Phân bố linh kiện &amp; Độ phủ ảnh theo Nhóm
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              Bấm tên nhóm để lọc
            </span>
          </div>

          <div className="space-y-2.5">
            {stats.specBreakdown.map((item) => {
              const imgPct = item.total > 0 ? Math.round((item.withImg / item.total) * 100) : 0;
              return (
                <div key={item.group} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        item.group !== 'Chưa phân nhóm' &&
                        onFilterPartsTab({ specGroup: item.group })
                      }
                      className={`font-bold text-left truncate ${
                        item.group !== 'Chưa phân nhóm'
                          ? 'text-indigo-700 hover:underline cursor-pointer'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.group}
                    </button>
                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      {item.alerts > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">
                          {item.alerts} lưu ý
                        </span>
                      )}
                      <span className="font-bold text-emerald-700">
                        {item.withImg}/{item.total} có ảnh ({imgPct}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${imgPct}%` }}
                      title={`Đã có ảnh: ${item.withImg}`}
                    />
                    <div
                      className="h-full bg-slate-300/70"
                      style={{ width: `${100 - imgPct}%` }}
                      title={`Chưa có ảnh: ${item.total - item.withImg}`}
                    />
                  </div>
                </div>
              );
            })}
            {stats.specBreakdown.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Chưa có dữ liệu linh kiện.</p>
            )}
          </div>
        </div>

        {/* Độ hoàn thiện hồ sơ & Top NCC */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hồ sơ dữ liệu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Mức độ đầy đủ trường dữ liệu
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                { label: 'Có hình ảnh', val: stats.partsWithImages, color: 'text-emerald-700' },
                { label: 'Chưa có ảnh', val: stats.partsWithoutImages, color: 'text-rose-600' },
                { label: 'Có Thông số KT', val: stats.partsWithTechSpecs, color: 'text-indigo-700' },
                { label: 'Có Nhà cung cấp', val: stats.partsWithSupplier, color: 'text-slate-800' },
                { label: 'Có Giá bán', val: stats.partsWithSellingPrice, color: 'text-emerald-700' },
                { label: 'Đang dùng chuẩn', val: stats.statusCounts['Đang dùng'], color: 'text-slate-800' }
              ].map((row) => {
                const pct = stats.totalParts > 0 ? Math.round((row.val / stats.totalParts) * 100) : 0;
                return (
                  <div
                    key={row.label}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
                  >
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      {row.label}
                    </span>
                    <span className={`text-sm font-black ${row.color}`}>
                      {row.val.toLocaleString('vi-VN')}{' '}
                      <span className="text-[11px] font-bold text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Nhà cung cấp */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Top Nhà cung cấp nhiều mã nhất
            </h3>
            {stats.topSuppliers.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có dữ liệu nhà cung cấp.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {stats.topSuppliers.map((sup, idx) => (
                  <div key={sup.name} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-bold w-5 shrink-0">{idx + 1}.</span>
                    <span className="font-semibold text-slate-800 truncate flex-1" title={sup.name}>
                      {sup.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold shrink-0">
                      {sup.total} mã
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hàng 3: Độ phủ ảnh từng Model & Top Linh kiện dùng chung */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tỷ lệ ảnh theo Model có BOM */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Bike className="w-4 h-4 text-indigo-600" />
              Hoàn thiện ảnh BOM theo Model đang SX ({stats.modelBomProgress.length})
            </h3>
          </div>
          {stats.modelBomProgress.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Chưa có Model nào nhập BOM.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto text-xs">
              {stats.modelBomProgress.map((m) => (
                <div key={m.modelKey} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onOpenModelBom(m.modelKey)}
                      className="font-extrabold text-slate-900 hover:text-indigo-700 inline-flex items-center gap-1 cursor-pointer truncate max-w-full"
                    >
                      <span className="truncate">{m.modelName}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </button>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${
                          m.pct >= 80
                            ? 'bg-emerald-500'
                            : m.pct >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-800 block">{m.pct}%</span>
                    <span className="text-[11px] text-slate-500">
                      {m.hasImgCount}/{m.totalItems} LK
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 15 Linh kiện dùng chung */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
            <Share2 className="w-4 h-4 text-indigo-600" />
            Top linh kiện dùng chung nhiều Model nhất
          </h3>
          {stats.topSharedParts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Chưa có linh kiện dùng chung từ 2 model trở lên.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto text-xs">
              {stats.topSharedParts.map(({ part, usedCount }, idx) => {
                const hasImg = Array.isArray(part.images) && part.images.length > 0;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => onOpenPartDetail(part.partCode)}
                    className="w-full py-2 flex items-center justify-between gap-2.5 text-left hover:bg-indigo-50/40 px-1.5 rounded-lg transition cursor-pointer"
                  >
                    <span className="font-bold text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-indigo-700">
                          {part.partCode}
                        </span>
                        {!hasImg && (
                          <span title="Chưa có ảnh" className="text-rose-500 inline-flex items-center">
                            <ImageOff className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-semibold truncate">{part.partName}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-[11px] shrink-0">
                      {usedCount} xe
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
