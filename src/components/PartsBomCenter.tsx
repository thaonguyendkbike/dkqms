import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Filter,
  FolderArchive,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  LogIn,
  Package,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Upload,
  Wrench,
  X,
  ZoomIn
} from 'lucide-react';
import {
  BomModelLineItem,
  BomModelRecord,
  BomPartImageItem,
  BomPartMasterItem,
  EcountParsedBomRow,
  OqcModelSummary,
  PartImageMode,
  PartQualityStatus
} from '../types/bomCatalog';
import {
  bulkImportModelBom,
  deleteBomPartRecord,
  deleteBomPartsBatch,
  inferPartImageMode,
  isColoredPlasticSpec,
  normalizeColoredPlasticPart,
  readCachedBomCatalog,
  restoreBomBackupPayload,
  saveBomModelRecord,
  saveBomModelsBatch,
  saveBomPartRecord,
  subscribeBomCatalog,
  subscribeOqcModelGroups,
  toSafeDocId
} from '../services/bomCatalogService';
import {
  deleteBomImageFromStorage,
  uploadBomImageToStorage
} from '../services/bomStorageService';
import { LarkBomSyncModal } from './LarkBomSyncModal';
import { BomStatsTab } from './BomStatsTab';
import { CameraCaptureModal } from './CameraCaptureModal';

interface PartsBomCenterProps {
  readOnly?: boolean;
  isLoggedIn?: boolean;
  canViewPurchasePrice?: boolean;
  currentUserName?: string;
  onBackToApp?: () => void;
  onRequestLogin?: () => void;
}

const PART_STATUS_OPTIONS: PartQualityStatus[] = [
  'Đang dùng',
  'Cảnh báo lỗi',
  'Đang ECO',
  'Ngừng dùng'
];

const DEFAULT_SPEC_GROUPS = [
  'PT điện',
  'PT khung',
  'Nhựa chung',
  'Nhựa màu',
  'PT ốc',
  'Động cơ & Pin',
  'Phanh & Bánh xe',
  'Tem & Bao bì',
  'Khác'
];

const STATUS_BADGE_MAP: Record<PartQualityStatus, string> = {
  'Đang dùng': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Cảnh báo lỗi': 'bg-rose-50 text-rose-700 border-rose-200',
  'Đang ECO': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ngừng dùng': 'bg-slate-100 text-slate-600 border-slate-300'
};

const PARTS_PER_PAGE = 20;

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  pageSize = PARTS_PER_PAGE,
  onPageChange
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Tạo danh sách số trang hiển thị gọn (tối đa 5 nút quanh trang hiện tại)
  const pages: (number | 'dots')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - safePage) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'dots') {
      pages.push('dots');
    }
  }

  return (
    <div className="px-3 sm:px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-2.5 text-xs">
      <span className="text-slate-600 font-semibold text-center sm:text-left">
        Hiển thị <strong className="text-slate-900">{startItem}–{endItem}</strong> /{' '}
        <strong className="text-slate-900">{totalItems}</strong> LK{' '}
        <span className="hidden sm:inline">(tối đa {pageSize}/trang)</span>
      </span>

      <div className="flex items-center justify-center gap-1 flex-wrap">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Trước
        </button>

        {pages.map((item, idx) =>
          item === 'dots' ? (
            <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-bold">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`min-w-[30px] px-2.5 py-1.5 rounded-lg border font-extrabold transition cursor-pointer ${item === safePage
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
                }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
        >
          Sau
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

function formatPriceDisplay(val?: number, suffix: string = ''): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return '—';
  return `${val.toLocaleString('vi-VN')}${suffix}`;
}

interface PartFormState {
  partCode: string;
  partName: string;
  specGroup: string;
  unit: string;
  techSpecs: string;
  supplierName: string;
  stockQty: string;
  purchasePrice: string;
  sellingPrice: string;
  keywords: string;
  status: PartQualityStatus;
  imageMode: PartImageMode;
  images: BomPartImageItem[];
  note: string;
}

const EMPTY_PART_FORM: PartFormState = {
  partCode: '',
  partName: '',
  specGroup: 'PT khung',
  unit: 'Cái',
  techSpecs: '',
  supplierName: '',
  stockQty: '',
  purchasePrice: '',
  sellingPrice: '',
  keywords: '',
  status: 'Đang dùng',
  imageMode: 'multi',
  images: [],
  note: ''
};

export const PartsBomCenter: React.FC<PartsBomCenterProps> = ({
  readOnly = true,
  isLoggedIn = false,
  canViewPurchasePrice = false,
  currentUserName = 'QLCL DKBike',
  onBackToApp,
  onRequestLogin
}) => {
  const showPurchasePrice = Boolean(isLoggedIn && canViewPurchasePrice);
  const initialCache = useMemo(() => readCachedBomCatalog(), []);
  const [oqcModels, setOqcModels] = useState<OqcModelSummary[]>([]);
  const [bomModels, setBomModels] = useState<BomModelRecord[]>(initialCache.models);
  const [bomParts, setBomParts] = useState<BomPartMasterItem[]>(initialCache.parts);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Navigation & Filters
  const [activeSubTab, setActiveSubTab] = useState<'models' | 'parts' | 'stats'>('models');
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [modelFilter, setModelFilter] = useState<'active' | 'discontinued' | 'all' | 'has_bom' | 'no_bom' | 'has_alert'>('active');
  const [modelViewMode, setModelViewMode] = useState<'grid' | 'list'>('grid');
  const [bulkModelSelectMode, setBulkModelSelectMode] = useState(false);
  const [selectedModelKeysForBulk, setSelectedModelKeysForBulk] = useState<string[]>([]);
  const [bulkSavingModels, setBulkSavingModels] = useState(false);
  const [openExportMenu, setOpenExportMenu] = useState<'model' | 'parts' | null>(null);

  // BOM detail filters
  const [bomSearch, setBomSearch] = useState('');
  const [bomSpecFilter, setBomSpecFilter] = useState('ALL');
  const [bomStatusFilter, setBomStatusFilter] = useState<'ALL' | PartQualityStatus>('ALL');
  const [bomMissingImgOnly, setBomMissingImgOnly] = useState(false);
  const [bomPage, setBomPage] = useState(1);

  // Parts Master filters
  const [partSearch, setPartSearch] = useState('');
  const [partSpecFilter, setPartSpecFilter] = useState('ALL');
  const [partStatusFilter, setPartStatusFilter] = useState<'ALL' | PartQualityStatus>('ALL');
  const [partSharedOnly, setPartSharedOnly] = useState(false);
  const [partMissingImgOnly, setPartMissingImgOnly] = useState(false);
  const [partViewMode, setPartViewMode] = useState<'grid' | 'list'>('grid');
  const [partsPage, setPartsPage] = useState(1);

  // Modals
  const [colorModalModel, setColorModalModel] = useState<OqcModelSummary | null>(null);
  const [uploadingModelKey, setUploadingModelKey] = useState<string | null>(null);

  // Unified Part Detail / Create / Edit Modal
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [partModalMode, setPartModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partForm, setPartForm] = useState<PartFormState>(EMPTY_PART_FORM);
  const [partImagesUploading, setPartImagesUploading] = useState(false);
  const [partSaving, setPartSaving] = useState(false);
  const [selectedViewImageIdx, setSelectedViewImageIdx] = useState<number>(0);
  const [copiedPartCode, setCopiedPartCode] = useState(false);
  const [showSharedModelsInDetail, setShowSharedModelsInDetail] = useState(false);
  const [attachToCurrentModelQty, setAttachToCurrentModelQty] = useState<number>(1);
  const [attachToCurrentModel, setAttachToCurrentModel] = useState<boolean>(false);

  // Add Existing Part to Model BOM Modal
  const [addExistingModalOpen, setAddExistingModalOpen] = useState(false);
  const [existingPartSearch, setExistingPartSearch] = useState('');
  const [selectedExistingPartCode, setSelectedExistingPartCode] = useState('');
  const [selectedExistingQty, setSelectedExistingQty] = useState<number>(1);
  const [selectedExistingNote, setSelectedExistingNote] = useState('');

  // Edit single BOM line (qty / note)
  const [editingBomLine, setEditingBomLine] = useState<{
    partCode: string;
    qty: number;
    unit: string;
    note: string;
  } | null>(null);

  // Import Excel Preview Modal
  const [importModalState, setImportModalState] = useState<{
    modelKey: string;
    modelName: string;
    fileName: string;
    rows: EcountParsedBomRow[];
    warnings: string[];
    normalizedColoredCount: number;
    replaceExistingLines: boolean;
  } | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [larkSyncModalOpen, setLarkSyncModalOpen] = useState(false);
  const [cameraCaptureOpen, setCameraCaptureOpen] = useState(false);
  const [cameraSaving, setCameraSaving] = useState(false);

  // Lightbox Zoom
  const [lightboxState, setLightboxState] = useState<{
    title: string;
    images: { url: string; caption?: string }[];
    index: number;
  } | null>(null);

  const modelPhotoInputRef = useRef<HTMLInputElement>(null);
  const modelPhotoTargetRef = useRef<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const backupRestoreInputRef = useRef<HTMLInputElement>(null);
  const partImageInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    let active = true;
    const unsubOqc = subscribeOqcModelGroups((groups) => {
      if (active) setOqcModels(groups);
    });

    const unsub = subscribeBomCatalog(
      (models) => {
        if (!active) return;
        setBomModels(models);
        setLoadingCatalog(false);
      },
      (parts) => {
        if (!active) return;
        setBomParts(parts);
        setLoadingCatalog(false);
      },
      (err) => {
        if (!active) return;
        setLoadingCatalog(false);
        showToast(`Lỗi kết nối dữ liệu Cloud: ${err.message}`, 'error');
      }
    );

    return () => {
      active = false;
      unsubOqc();
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!openExportMenu) return;
    const handleDocClick = () => setOpenExportMenu(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, [openExportMenu]);

  // Maps để tra cứu cực nhanh O(1)
  const bomModelsMap = useMemo(() => {
    const map = new Map<string, BomModelRecord>();
    bomModels.forEach((m) => {
      map.set(m.id || toSafeDocId(m.modelName), m);
    });
    return map;
  }, [bomModels]);

  const partsByCode = useMemo(() => {
    const map = new Map<string, BomPartMasterItem>();
    bomParts.forEach((p) => {
      map.set(p.partCode.trim().toUpperCase(), p);
    });
    return map;
  }, [bomParts]);

  // Hợp nhất 64 Model từ Bảng mã xe với dữ liệu BOM đã lưu
  const combinedModels = useMemo(() => {
    const map = new Map<
      string,
      {
        summary: OqcModelSummary;
        bom?: BomModelRecord;
      }
    >();

    oqcModels.forEach((summary) => {
      map.set(summary.modelKey, {
        summary,
        bom: bomModelsMap.get(summary.modelKey)
      });
    });

    bomModels.forEach((bom) => {
      const key = bom.id || toSafeDocId(bom.modelName);
      if (!map.has(key)) {
        map.set(key, {
          summary: {
            modelKey: key,
            modelName: bom.modelName,
            colors: []
          },
          bom
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.summary.modelName.localeCompare(b.summary.modelName, 'vi')
    );
  }, [oqcModels, bomModels, bomModelsMap]);

  // Map Where-Used: partCode -> danh sách các Model dùng linh kiện này
  const whereUsedMap = useMemo(() => {
    const map = new Map<string, { modelKey: string; modelName: string; qty: number; unit: string }[]>();
    combinedModels.forEach(({ summary, bom }) => {
      if (!bom || !Array.isArray(bom.items)) return;
      bom.items.forEach((line) => {
        const code = line.partCode.trim().toUpperCase();
        if (!code) return;
        if (!map.has(code)) map.set(code, []);
        map.get(code)!.push({
          modelKey: summary.modelKey,
          modelName: summary.modelName,
          qty: line.qty,
          unit: line.unit || partsByCode.get(code)?.unit || 'Cái'
        });
      });
    });
    return map;
  }, [combinedModels, partsByCode]);

  const whereUsedNamesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    whereUsedMap.forEach((entries, code) => {
      map.set(
        code,
        entries.map((e) => e.modelName)
      );
    });
    return map;
  }, [whereUsedMap]);

  const allSpecGroups = useMemo(() => {
    const set = new Set<string>(DEFAULT_SPEC_GROUPS);
    bomParts.forEach((p) => {
      if (p.specGroup && p.specGroup.trim()) set.add(p.specGroup.trim());
    });
    return Array.from(set);
  }, [bomParts]);

  const selectedModelEntry = useMemo(() => {
    if (!selectedModelKey) return null;
    return combinedModels.find((m) => m.summary.modelKey === selectedModelKey) || null;
  }, [combinedModels, selectedModelKey]);

  // Thống kê tổng quan
  const overviewStats = useMemo(() => {
    const totalModels = combinedModels.length;
    const discontinuedModels = combinedModels.filter((m) => Boolean(m.bom?.isDiscontinued)).length;
    const activeModels = totalModels - discontinuedModels;
    const modelsWithBom = combinedModels.filter((m) => (m.bom?.items?.length || 0) > 0).length;
    const modelsWithPhoto = combinedModels.filter((m) => Boolean(m.bom?.imageUrl)).length;
    const totalColors = combinedModels.reduce((acc, m) => acc + m.summary.colors.length, 0);
    const sharedPartsCount = Array.from(whereUsedMap.values() as Iterable<unknown[]>).filter((arr) => arr.length >= 2).length;
    return {
      totalModels,
      activeModels,
      discontinuedModels,
      modelsWithBom,
      modelsWithPhoto,
      totalColors,
      totalParts: bomParts.length,
      sharedPartsCount
    };
  }, [combinedModels, bomParts.length, whereUsedMap]);

  // Lọc danh sách Model
  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return combinedModels.filter(({ summary, bom }) => {
      const isDisc = Boolean(bom?.isDiscontinued);
      const items = bom?.items || [];
      const hasBom = items.length > 0;
      const hasAlert = items.some((line) => {
        const st = partsByCode.get(line.partCode.trim().toUpperCase())?.status;
        return st === 'Cảnh báo lỗi' || st === 'Đang ECO';
      });

      if (modelFilter === 'active' && isDisc) return false;
      if (modelFilter === 'discontinued' && !isDisc) return false;
      if (modelFilter === 'has_bom' && (isDisc || !hasBom)) return false;
      if (modelFilter === 'no_bom' && (isDisc || hasBom)) return false;
      if (modelFilter === 'has_alert' && (isDisc || !hasAlert)) return false;

      if (!q) return true;
      if (summary.modelName.toLowerCase().includes(q)) return true;
      return summary.colors.some(
        (c) =>
          c.partCode.toLowerCase().includes(q) ||
          c.color.toLowerCase().includes(q)
      );
    });
  }, [combinedModels, modelSearch, modelFilter, partsByCode]);

  const bomMissingImgCount = useMemo(() => {
    if (!selectedModelEntry?.bom?.items) return 0;
    return selectedModelEntry.bom.items.filter((line) => {
      const part = partsByCode.get(line.partCode.trim().toUpperCase());
      const imgCount = Array.isArray(part?.images) ? part.images.length : 0;
      return imgCount === 0;
    }).length;
  }, [selectedModelEntry, partsByCode]);

  // Lọc danh sách linh kiện trong BOM của Model đang mở
  const filteredModelBomLines = useMemo(() => {
    if (!selectedModelEntry?.bom?.items) return [];
    const q = bomSearch.trim().toLowerCase();
    return selectedModelEntry.bom.items.filter((line) => {
      const code = line.partCode.trim().toUpperCase();
      const part = partsByCode.get(code);
      const specGroup = part?.specGroup || '';
      const status = part?.status || 'Đang dùng';
      const imgCount = Array.isArray(part?.images) ? part.images.length : 0;

      if (bomSpecFilter !== 'ALL' && specGroup !== bomSpecFilter) return false;
      if (bomStatusFilter !== 'ALL' && status !== bomStatusFilter) return false;
      if (bomMissingImgOnly && imgCount > 0) return false;
      if (!q) return true;

      return (
        code.toLowerCase().includes(q) ||
        (part?.partName || '').toLowerCase().includes(q) ||
        (part?.techSpecs || '').toLowerCase().includes(q) ||
        (part?.supplierName || '').toLowerCase().includes(q) ||
        (part?.keywords || '').toLowerCase().includes(q) ||
        (line.note || '').toLowerCase().includes(q)
      );
    });
  }, [selectedModelEntry, bomSearch, bomSpecFilter, bomStatusFilter, bomMissingImgOnly, partsByCode]);

  // Lọc Kho Linh kiện (Tab 2)
  const filteredPartsMaster = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    return bomParts.filter((p) => {
      const code = p.partCode.trim().toUpperCase();
      const usedCount = whereUsedMap.get(code)?.length || 0;
      const imgCount = Array.isArray(p.images) ? p.images.length : 0;

      if (partSpecFilter !== 'ALL' && p.specGroup !== partSpecFilter) return false;
      if (partStatusFilter !== 'ALL' && p.status !== partStatusFilter) return false;
      if (partSharedOnly && usedCount < 2) return false;
      if (partMissingImgOnly && imgCount > 0) return false;

      if (!q) return true;
      return (
        code.toLowerCase().includes(q) ||
        p.partName.toLowerCase().includes(q) ||
        (p.techSpecs || '').toLowerCase().includes(q) ||
        (p.supplierName || '').toLowerCase().includes(q) ||
        (p.keywords || '').toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q)
      );
    });
  }, [bomParts, partSearch, partSpecFilter, partStatusFilter, partSharedOnly, partMissingImgOnly, whereUsedMap]);

  useEffect(() => {
    setBomPage(1);
  }, [selectedModelKey, bomSearch, bomSpecFilter, bomStatusFilter, bomMissingImgOnly]);

  useEffect(() => {
    setPartsPage(1);
  }, [partSearch, partSpecFilter, partStatusFilter, partSharedOnly, partMissingImgOnly]);

  const safeBomPage = Math.min(
    Math.max(1, bomPage),
    Math.max(1, Math.ceil(filteredModelBomLines.length / PARTS_PER_PAGE))
  );
  const paginatedBomLines = useMemo(() => {
    const start = (safeBomPage - 1) * PARTS_PER_PAGE;
    return filteredModelBomLines.slice(start, start + PARTS_PER_PAGE);
  }, [filteredModelBomLines, safeBomPage]);

  const safePartsPage = Math.min(
    Math.max(1, partsPage),
    Math.max(1, Math.ceil(filteredPartsMaster.length / PARTS_PER_PAGE))
  );
  const paginatedPartsMaster = useMemo(() => {
    const start = (safePartsPage - 1) * PARTS_PER_PAGE;
    return filteredPartsMaster.slice(start, start + PARTS_PER_PAGE);
  }, [filteredPartsMaster, safePartsPage]);

  // ==================== HANDLERS ====================

  const handleTriggerModelPhotoUpload = (modelKey: string) => {
    if (readOnly) return;
    modelPhotoTargetRef.current = modelKey;
    modelPhotoInputRef.current?.click();
  };

  const handleModelPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetKey = modelPhotoTargetRef.current;
    if (!file || !targetKey || readOnly) return;

    const entry = combinedModels.find((m) => m.summary.modelKey === targetKey);
    if (!entry) return;

    setUploadingModelKey(targetKey);
    try {
      const { url, path } = await uploadBomImageToStorage(
        file,
        `models/${targetKey}`,
        targetKey
      );
      const oldPath = entry.bom?.imagePath;
      const updatedModel: BomModelRecord = {
        id: targetKey,
        modelName: entry.summary.modelName,
        imageUrl: url,
        imagePath: path,
        isDiscontinued: Boolean(entry.bom?.isDiscontinued),
        items: entry.bom?.items || [],
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName
      };
      await saveBomModelRecord(updatedModel);
      if (oldPath && oldPath !== path) {
        await deleteBomImageFromStorage(oldPath);
      }
      showToast(`Đã cập nhật ảnh đại diện cho ${entry.summary.modelName}`, 'success');
    } catch (err: any) {
      console.error('[Model Photo Upload Error]:', err);
      showToast(`Lỗi tải ảnh Model: ${err?.message || 'Vui lòng kiểm tra kết nối Storage'}`, 'error');
    } finally {
      setUploadingModelKey(null);
    }
  };

  const handleToggleModelDiscontinued = async (modelKey: string, nextDiscontinued: boolean) => {
    if (readOnly) return;
    const entry = combinedModels.find((m) => m.summary.modelKey === modelKey);
    if (!entry) return;
    try {
      await saveBomModelRecord({
        id: modelKey,
        modelName: entry.summary.modelName,
        imageUrl: entry.bom?.imageUrl,
        imagePath: entry.bom?.imagePath,
        isDiscontinued: nextDiscontinued,
        items: entry.bom?.items || [],
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName
      });
      showToast(
        nextDiscontinued
          ? `Đã chuyển "${entry.summary.modelName}" sang Ngừng sản xuất (ẩn khỏi danh sách chính).`
          : `Đã khôi phục "${entry.summary.modelName}" về Đang sản xuất.`,
        'info'
      );
    } catch (err: any) {
      showToast(`Lỗi cập nhật trạng thái Model: ${err?.message || err}`, 'error');
    }
  };

  const handleBulkSetModelsDiscontinued = async (nextDiscontinued: boolean) => {
    if (readOnly || selectedModelKeysForBulk.length === 0) return;
    setBulkSavingModels(true);
    try {
      const nowIso = new Date().toISOString();
      const records: BomModelRecord[] = [];
      selectedModelKeysForBulk.forEach((key) => {
        const entry = combinedModels.find((m) => m.summary.modelKey === key);
        if (!entry) return;
        records.push({
          id: key,
          modelName: entry.summary.modelName,
          imageUrl: entry.bom?.imageUrl,
          imagePath: entry.bom?.imagePath,
          isDiscontinued: nextDiscontinued,
          items: entry.bom?.items || [],
          updatedAt: nowIso,
          updatedBy: currentUserName
        });
      });
      await saveBomModelsBatch(records);
      setSelectedModelKeysForBulk([]);
      setBulkModelSelectMode(false);
      showToast(
        nextDiscontinued
          ? `Đã ẩn ${records.length} xe Ngừng sản xuất khỏi danh sách chính.`
          : `Đã khôi phục ${records.length} xe về Đang sản xuất.`,
        'success'
      );
    } catch (err: any) {
      showToast(`Lỗi cập nhật hàng loạt: ${err?.message || err}`, 'error');
    } finally {
      setBulkSavingModels(false);
    }
  };

  const knownOqcColors = useMemo(() => {
    const set = new Set<string>();
    oqcModels.forEach((m) => {
      m.colors.forEach((c) => {
        if (c.color && c.color.trim()) set.add(c.color.trim());
      });
    });
    return Array.from(set);
  }, [oqcModels]);

  const handleExcelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedModelEntry || readOnly) return;

    try {
      const { parseEcountBomExcel } = await import('../utils/bomExcel');
      const parsed = await parseEcountBomExcel(file, {
        normalizeColoredPlastic: true,
        extraColors: knownOqcColors
      });
      setImportModalState({
        modelKey: selectedModelEntry.summary.modelKey,
        modelName: selectedModelEntry.summary.modelName,
        fileName: file.name,
        rows: parsed.rows,
        warnings: parsed.warnings,
        normalizedColoredCount: parsed.normalizedColoredCount,
        replaceExistingLines: true
      });
    } catch (err: any) {
      showToast(err?.message || 'Không đọc được file Excel Ecount.', 'error');
    }
  };

  const handleConfirmImportExcel = async () => {
    if (!importModalState || readOnly) return;
    setImportingExcel(true);
    try {
      const existingModel = bomModelsMap.get(importModalState.modelKey);
      const res = await bulkImportModelBom({
        modelKey: importModalState.modelKey,
        modelName: importModalState.modelName,
        existingModel,
        rows: importModalState.rows,
        existingPartsMap: partsByCode,
        replaceExistingLines: importModalState.replaceExistingLines,
        updatedBy: currentUserName
      });
      setImportModalState(null);
      const inheritNote =
        res.inheritedImagesCount > 0
          ? `, tự động kế thừa ảnh cho ${res.inheritedImagesCount} mã Phôi từ mã màu cũ`
          : '';
      showToast(
        `Đã import ${res.totalLines} dòng BOM cho ${importModalState.modelName} (${res.newPartsCount} mã mới, ${res.updatedExistingCount} mã cập nhật thông tin mới${inheritNote}).`,
        'success'
      );
    } catch (err: any) {
      console.error('[Import BOM Error]:', err);
      showToast(`Lỗi lưu dữ liệu BOM: ${err?.message || err}`, 'error');
    } finally {
      setImportingExcel(false);
    }
  };

  const openPartModalForView = (partCode: string) => {
    const code = partCode.trim().toUpperCase();
    const existing = partsByCode.get(code);
    if (!existing) {
      showToast(`Mã ${code} chưa có thông tin chi tiết trong Kho Linh kiện.`, 'info');
      return;
    }
    setEditingPartId(existing.id);
    setPartForm({
      partCode: existing.partCode,
      partName: existing.partName,
      specGroup: existing.specGroup || 'PT khung',
      unit: existing.unit || 'Cái',
      techSpecs: existing.techSpecs || '',
      supplierName: existing.supplierName || '',
      stockQty: existing.stockQty !== undefined ? String(existing.stockQty) : '',
      purchasePrice: existing.purchasePrice !== undefined ? String(existing.purchasePrice) : '',
      sellingPrice: existing.sellingPrice !== undefined ? String(existing.sellingPrice) : '',
      keywords: existing.keywords || '',
      status: existing.status || 'Đang dùng',
      imageMode: existing.imageMode || inferPartImageMode(existing.specGroup),
      images: Array.isArray(existing.images) ? existing.images : [],
      note: existing.note || ''
    });
    setAttachToCurrentModel(false);
    setSelectedViewImageIdx(0);
    setCopiedPartCode(false);
    setShowSharedModelsInDetail(false);
    setPartModalMode('view');
    setPartModalOpen(true);
  };

  const openPartModalForEdit = (part: BomPartMasterItem) => {
    if (readOnly) {
      openPartModalForView(part.partCode);
      return;
    }
    setEditingPartId(part.id);
    setPartForm({
      partCode: part.partCode,
      partName: part.partName,
      specGroup: part.specGroup || 'PT khung',
      unit: part.unit || 'Cái',
      techSpecs: part.techSpecs || '',
      supplierName: part.supplierName || '',
      stockQty: part.stockQty !== undefined ? String(part.stockQty) : '',
      purchasePrice: part.purchasePrice !== undefined ? String(part.purchasePrice) : '',
      sellingPrice: part.sellingPrice !== undefined ? String(part.sellingPrice) : '',
      keywords: part.keywords || '',
      status: part.status || 'Đang dùng',
      imageMode: part.imageMode || inferPartImageMode(part.specGroup),
      images: Array.isArray(part.images) ? part.images : [],
      note: part.note || ''
    });
    setAttachToCurrentModel(false);
    setPartModalMode('edit');
    setPartModalOpen(true);
  };

  const openPartModalForCreate = (attachToModel: boolean = false) => {
    if (readOnly) return;
    setEditingPartId(null);
    setPartForm({ ...EMPTY_PART_FORM });
    setAttachToCurrentModel(attachToModel && Boolean(selectedModelEntry));
    setAttachToCurrentModelQty(1);
    setPartModalMode('create');
    setPartModalOpen(true);
  };

  const isStoragePathShared = (storagePath?: string, excludePartId?: string | null): boolean => {
    if (!storagePath) return false;
    return bomParts.some(
      (p) =>
        p.id !== excludePartId &&
        Array.isArray(p.images) &&
        p.images.some((img) => img.path === storagePath)
    );
  };

  const orphanedLegacyColoredParts = useMemo(() => {
    return bomParts.filter((p) => {
      const code = p.partCode.trim().toUpperCase();
      if (!isColoredPlasticSpec(p.specGroup)) return false;
      if (code.length <= 6 || !/\d{4}$/.test(code)) return false;
      const baseCode = code.slice(0, -4);
      const baseExists = partsByCode.has(baseCode);
      const usedCount = whereUsedMap.get(code)?.length || 0;
      return baseExists && usedCount === 0;
    });
  }, [bomParts, partsByCode, whereUsedMap]);

  const handleCleanupOrphanedLegacyParts = async () => {
    if (readOnly || orphanedLegacyColoredParts.length === 0) return;
    if (
      !window.confirm(
        `Dọn ${orphanedLegacyColoredParts.length} mã Nhựa màu cũ (có 4 số đuôi) đã được chuyển sang mã Phôi và không còn Model nào dùng?\n\n(Ảnh đã kế thừa trên mã Phôi sẽ được giữ nguyên an toàn 100%).`
      )
    ) {
      return;
    }
    try {
      await deleteBomPartsBatch(orphanedLegacyColoredParts.map((p) => p.id));
      showToast(
        `Đã dọn gọn ${orphanedLegacyColoredParts.length} mã Nhựa màu cũ dư thừa khỏi Kho Linh kiện.`,
        'success'
      );
    } catch (err: any) {
      showToast(`Lỗi dọn mã cũ: ${err?.message || err}`, 'error');
    }
  };

  const persistUpdatedPartImages = async (
    code: string,
    nextImages: BomPartImageItem[],
    nextImageMode: PartImageMode
  ) => {
    const existing = partsByCode.get(code);
    if (!existing) return;
    const updatedRecord: BomPartMasterItem = {
      ...existing,
      imageMode: nextImageMode,
      images: nextImages,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserName
    };
    await saveBomPartRecord(updatedRecord);
  };

  const handlePartImagesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = fileList ? Array.from(fileList as ArrayLike<File>) : [];
    e.target.value = '';
    if (files.length === 0 || readOnly) return;

    const code = partForm.partCode.trim().toUpperCase();
    if (!code) {
      showToast('Anh vui lòng nhập "Mã mặt hàng" trước khi tải ảnh linh kiện lên nhé!', 'error');
      return;
    }

    const isViewQuickAdd = partModalMode === 'view';
    const filesToUpload: File[] =
      !isViewQuickAdd && partForm.imageMode === 'single' ? [files[0]] : files;

    setPartImagesUploading(true);
    try {
      const safeFolder = `parts/${toSafeDocId(code)}`;
      const uploadedItems: BomPartImageItem[] = [];
      for (const file of filesToUpload) {
        const { url, path } = await uploadBomImageToStorage(file, safeFolder, code);
        uploadedItems.push({
          id: `IMG_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url,
          path,
          caption: !isViewQuickAdd && partForm.imageMode === 'single' ? 'Ảnh linh kiện' : '',
          updatedAt: new Date().toISOString()
        });
      }

      if (isViewQuickAdd) {
        const prevCount = partForm.images.length;
        const nextImages = [...partForm.images, ...uploadedItems];
        const nextImageMode: PartImageMode = nextImages.length > 1 ? 'multi' : partForm.imageMode;
        await persistUpdatedPartImages(code, nextImages, nextImageMode);
        setPartForm((prev) => ({
          ...prev,
          imageMode: nextImageMode,
          images: nextImages
        }));
        setSelectedViewImageIdx(prevCount);
        showToast(`Đã thêm và lưu ${uploadedItems.length} ảnh cho mã ${code}.`, 'success');
      } else if (partForm.imageMode === 'single') {
        // Xóa ảnh cũ nếu chế độ 1 ảnh (chỉ xóa file Storage nếu không có mã khác dùng chung)
        for (const oldImg of partForm.images) {
          if (oldImg.path && !isStoragePathShared(oldImg.path, editingPartId)) {
            await deleteBomImageFromStorage(oldImg.path);
          }
        }
        setPartForm((prev) => ({ ...prev, images: uploadedItems }));
        showToast(`Đã tải lên ${uploadedItems.length} ảnh sắc nét cho mã ${code}.`, 'success');
      } else {
        setPartForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedItems] }));
        showToast(`Đã tải lên ${uploadedItems.length} ảnh sắc nét cho mã ${code}.`, 'success');
      }
    } catch (err: any) {
      console.error('[Part Image Upload Error]:', err);
      showToast(`Lỗi tải ảnh: ${err?.message || 'Vui lòng kiểm tra kết nối Firebase Storage'}`, 'error');
    } finally {
      setPartImagesUploading(false);
    }
  };

  const handleRemovePartFormImage = async (imgId: string) => {
    if (readOnly) return;
    const target = partForm.images.find((i) => i.id === imgId);
    setPartForm((prev) => ({
      ...prev,
      images: prev.images.filter((i) => i.id !== imgId)
    }));
    if (target?.path && !isStoragePathShared(target.path, editingPartId)) {
      await deleteBomImageFromStorage(target.path);
    }
  };

  const handleConfirmCameraCapture = async (
    shots: Array<{ file: File; caption: string }>
  ) => {
    if (shots.length === 0 || readOnly) return;

    const targetCode = partForm.partCode.trim().toUpperCase();
    if (!targetCode) {
      showToast('Anh vui lòng nhập "Mã mặt hàng" trước khi chụp ảnh nhé!', 'error');
      return;
    }

    setCameraSaving(true);
    try {
      const isViewQuickAdd = partModalMode === 'view';
      const safeFolder = `parts/${toSafeDocId(targetCode)}`;
      const nowIso = new Date().toISOString();
      const uploadedItems: BomPartImageItem[] = [];

      for (const shot of shots) {
        const { url, path } = await uploadBomImageToStorage(shot.file, safeFolder, targetCode);
        uploadedItems.push({
          id: `IMG_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url,
          path,
          caption: shot.caption || (!isViewQuickAdd && partForm.imageMode === 'single' ? 'Ảnh linh kiện' : ''),
          updatedAt: nowIso
        });
      }

      if (isViewQuickAdd) {
        const prevCount = partForm.images.length;
        const nextImages = [...partForm.images, ...uploadedItems];
        const nextImageMode: PartImageMode = nextImages.length > 1 ? 'multi' : partForm.imageMode;
        await persistUpdatedPartImages(targetCode, nextImages, nextImageMode);
        setPartForm((prev) => ({
          ...prev,
          imageMode: nextImageMode,
          images: nextImages
        }));
        setSelectedViewImageIdx(prevCount);
        showToast(`Đã chụp và lưu ${uploadedItems.length} ảnh cho ${targetCode}.`, 'success');
      } else if (partForm.imageMode === 'single') {
        for (const oldImg of partForm.images) {
          if (oldImg.path && !isStoragePathShared(oldImg.path, editingPartId)) {
            await deleteBomImageFromStorage(oldImg.path);
          }
        }
        setPartForm((prev) => ({ ...prev, images: [uploadedItems[0]] }));
        showToast(`Đã chụp và tải lên ${uploadedItems.length} ảnh cho ${targetCode} (nhớ bấm Lưu).`, 'success');
      } else {
        setPartForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedItems] }));
        showToast(`Đã chụp và tải lên ${uploadedItems.length} ảnh cho ${targetCode} (nhớ bấm Lưu).`, 'success');
      }
      setCameraCaptureOpen(false);
    } catch (err: any) {
      console.error('[Camera Capture Upload Error]:', err);
      showToast(`Lỗi lưu ảnh chụp: ${err?.message || 'Kiểm tra kết nối Firebase Storage'}`, 'error');
    } finally {
      setCameraSaving(false);
    }
  };

  const handleSavePartModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    const code = partForm.partCode.trim().toUpperCase();
    const name = partForm.partName.trim();
    if (!code || !name) {
      showToast('Vui lòng nhập đầy đủ Mã mặt hàng và Tên mặt hàng.', 'error');
      return;
    }

    if (partModalMode === 'create' && partsByCode.has(code)) {
      showToast(`Mã mặt hàng ${code} đã tồn tại trong Kho Linh kiện!`, 'error');
      return;
    }

    setPartSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const docId = editingPartId || toSafeDocId(code);
      const existingMaster = partsByCode.get(code);
      const parseNum = (s: string): number | undefined => {
        const trimmed = s.trim().replace(/,/g, '');
        if (!trimmed) return undefined;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : undefined;
      };
      const record: BomPartMasterItem = {
        id: docId,
        partCode: code,
        partName: name,
        specGroup: partForm.specGroup.trim(),
        unit: partForm.unit.trim() || 'Cái',
        techSpecs: partForm.techSpecs.trim(),
        supplierName: partForm.supplierName.trim(),
        stockQty: parseNum(partForm.stockQty),
        purchasePrice: showPurchasePrice ? parseNum(partForm.purchasePrice) : existingMaster?.purchasePrice,
        sellingPrice: parseNum(partForm.sellingPrice),
        keywords: partForm.keywords.trim(),
        status: partForm.status,
        imageMode: partForm.imageMode,
        images: partForm.images,
        note: partForm.note.trim(),
        updatedAt: nowIso,
        updatedBy: currentUserName
      };

      await saveBomPartRecord(record);

      // Nếu tạo mới từ bên trong 1 Model BOM -> tự động gắn vào BOM của Model đó
      if (attachToCurrentModel && selectedModelEntry) {
        const currentItems = selectedModelEntry.bom?.items || [];
        const existsInBom = currentItems.some((i) => i.partCode.trim().toUpperCase() === code);
        if (!existsInBom) {
          const nextLines: BomModelLineItem[] = [
            ...currentItems,
            {
              lineNo: currentItems.length + 1,
              partCode: code,
              qty: Math.max(0.01, Number(attachToCurrentModelQty) || 1),
              unit: record.unit,
              note: ''
            }
          ];
          await saveBomModelRecord({
            id: selectedModelEntry.summary.modelKey,
            modelName: selectedModelEntry.summary.modelName,
            imageUrl: selectedModelEntry.bom?.imageUrl,
            imagePath: selectedModelEntry.bom?.imagePath,
            isDiscontinued: Boolean(selectedModelEntry.bom?.isDiscontinued),
            items: nextLines,
            updatedAt: nowIso,
            updatedBy: currentUserName
          });
        }
      }

      setPartModalOpen(false);
      showToast(`Đã lưu linh kiện ${code} (${name})`, 'success');
    } catch (err: any) {
      console.error('[Save Part Error]:', err);
      showToast(`Lỗi lưu linh kiện: ${err?.message || err}`, 'error');
    } finally {
      setPartSaving(false);
    }
  };

  const handleDeletePartMaster = async (part: BomPartMasterItem) => {
    if (readOnly) return;
    const usedModels = whereUsedNamesMap.get(part.partCode.trim().toUpperCase()) || [];
    const confirmMsg =
      usedModels.length > 0
        ? `Linh kiện ${part.partCode} đang nằm trong BOM của ${usedModels.length} model (${usedModels.slice(0, 4).join(', ')}...). Anh Thao chắc chắn muốn xóa khỏi Kho Linh kiện gốc không?`
        : `Anh Thao chắc chắn muốn xóa linh kiện ${part.partCode} - ${part.partName}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      for (const img of part.images || []) {
        if (img.path && !isStoragePathShared(img.path, part.id)) {
          await deleteBomImageFromStorage(img.path);
        }
      }
      await deleteBomPartRecord(part.id);
      setPartModalOpen(false);
      showToast(`Đã xóa linh kiện ${part.partCode}`, 'info');
    } catch (err: any) {
      showToast(`Lỗi xóa linh kiện: ${err?.message || err}`, 'error');
    }
  };

  const handleAddExistingPartToBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !selectedModelEntry || !selectedExistingPartCode) return;

    const code = selectedExistingPartCode.trim().toUpperCase();
    const part = partsByCode.get(code);
    if (!part) return;

    const currentItems = selectedModelEntry.bom?.items || [];
    const existsIdx = currentItems.findIndex((i) => i.partCode.trim().toUpperCase() === code);
    let nextItems: BomModelLineItem[];

    if (existsIdx >= 0) {
      nextItems = currentItems.map((item, idx) =>
        idx === existsIdx
          ? {
            ...item,
            qty: Math.max(0.01, Number(selectedExistingQty) || 1),
            note: selectedExistingNote.trim()
          }
          : item
      );
    } else {
      nextItems = [
        ...currentItems,
        {
          lineNo: currentItems.length + 1,
          partCode: code,
          qty: Math.max(0.01, Number(selectedExistingQty) || 1),
          unit: part.unit || 'Cái',
          note: selectedExistingNote.trim()
        }
      ];
    }

    try {
      await saveBomModelRecord({
        id: selectedModelEntry.summary.modelKey,
        modelName: selectedModelEntry.summary.modelName,
        imageUrl: selectedModelEntry.bom?.imageUrl,
        imagePath: selectedModelEntry.bom?.imagePath,
        isDiscontinued: Boolean(selectedModelEntry.bom?.isDiscontinued),
        items: nextItems,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName
      });
      setAddExistingModalOpen(false);
      setSelectedExistingPartCode('');
      setExistingPartSearch('');
      setSelectedExistingQty(1);
      setSelectedExistingNote('');
      showToast(`Đã gắn mã ${code} vào BOM ${selectedModelEntry.summary.modelName}`, 'success');
    } catch (err: any) {
      showToast(`Lỗi cập nhật BOM: ${err?.message || err}`, 'error');
    }
  };

  const handleSaveBomLineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !selectedModelEntry || !editingBomLine) return;

    const currentItems = selectedModelEntry.bom?.items || [];
    const nextItems = currentItems.map((item) =>
      item.partCode.trim().toUpperCase() === editingBomLine.partCode.trim().toUpperCase()
        ? {
          ...item,
          qty: Math.max(0.01, Number(editingBomLine.qty) || 1),
          unit: editingBomLine.unit.trim() || item.unit,
          note: editingBomLine.note.trim()
        }
        : item
    );

    try {
      await saveBomModelRecord({
        id: selectedModelEntry.summary.modelKey,
        modelName: selectedModelEntry.summary.modelName,
        imageUrl: selectedModelEntry.bom?.imageUrl,
        imagePath: selectedModelEntry.bom?.imagePath,
        isDiscontinued: Boolean(selectedModelEntry.bom?.isDiscontinued),
        items: nextItems,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName
      });
      setEditingBomLine(null);
      showToast(`Đã cập nhật định mức cho mã ${editingBomLine.partCode}`, 'success');
    } catch (err: any) {
      showToast(`Lỗi cập nhật dòng BOM: ${err?.message || err}`, 'error');
    }
  };

  const handleRemoveBomLine = async (partCode: string) => {
    if (readOnly || !selectedModelEntry) return;
    if (!window.confirm(`Gỡ linh kiện ${partCode} khỏi BOM của ${selectedModelEntry.summary.modelName}? (Không xóa khỏi Kho Linh kiện gốc)`)) {
      return;
    }
    const currentItems = selectedModelEntry.bom?.items || [];
    const nextItems = currentItems
      .filter((item) => item.partCode.trim().toUpperCase() !== partCode.trim().toUpperCase())
      .map((item, idx) => ({ ...item, lineNo: idx + 1 }));

    try {
      await saveBomModelRecord({
        id: selectedModelEntry.summary.modelKey,
        modelName: selectedModelEntry.summary.modelName,
        imageUrl: selectedModelEntry.bom?.imageUrl,
        imagePath: selectedModelEntry.bom?.imagePath,
        isDiscontinued: Boolean(selectedModelEntry.bom?.isDiscontinued),
        items: nextItems,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserName
      });
      showToast(`Đã gỡ ${partCode} khỏi BOM ${selectedModelEntry.summary.modelName}`, 'info');
    } catch (err: any) {
      showToast(`Lỗi gỡ dòng BOM: ${err?.message || err}`, 'error');
    }
  };

  const handleExportBackupJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'dkqms.cloud/lk',
      models: bomModels,
      parts: bomParts
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DKBike_BOM_Parts_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống file Backup JSON Danh mục Linh kiện & BOM.', 'success');
  };

  const handleRestoreBackupJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || readOnly) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed?.models) || !Array.isArray(parsed?.parts)) {
        throw new Error('File JSON không đúng định dạng Backup của /lk.');
      }
      if (!window.confirm(`Khôi phục ${parsed.models.length} Model BOM và ${parsed.parts.length} Mã linh kiện từ file backup?`)) {
        return;
      }
      const res = await restoreBomBackupPayload({
        models: parsed.models,
        parts: parsed.parts
      });
      showToast(`Đã khôi phục ${res.modelsCount} Model và ${res.partsCount} Linh kiện lên Cloud.`, 'success');
    } catch (err: any) {
      showToast(`Lỗi khôi phục backup: ${err?.message || err}`, 'error');
    }
  };

  const openLightbox = (title: string, images: { url: string; caption?: string }[], index: number = 0) => {
    if (!images || images.length === 0) return;
    setLightboxState({ title, images, index });
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Hidden File Inputs */}
      <input
        ref={modelPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleModelPhotoSelected}
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleExcelFileSelected}
      />
      <input
        ref={backupRestoreInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleRestoreBackupJson}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[110] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 max-w-md text-xs font-bold ${toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : toast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
        >
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Brand Header */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg sm:sticky sm:top-0 z-30 border-b border-indigo-800/40">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {onBackToApp && isLoggedIn && (
              <button
                type="button"
                onClick={onBackToApp}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
                title="Quay lại hệ thống DK QMS"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Bike className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-base font-black tracking-tight truncate">
                  DANH MỤC LINH KIỆN &amp; BOM (/lk)
                </h1>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${readOnly
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                    }`}
                >
                  {readOnly ? 'Tra cứu' : 'Biên tập QLCL'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-indigo-200/90 truncate">
                Công ty TNHH Xe điện DK Việt Nhật — DKBike | QLCL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!isLoggedIn && onRequestLogin && (
              <button
                type="button"
                onClick={onRequestLogin}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Đăng nhập</span>
              </button>
            )}
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleExportBackupJson}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Tải file JSON sao lưu dữ liệu Danh mục Linh kiện & BOM"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
                <button
                  type="button"
                  onClick={() => backupRestoreInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Khôi phục dữ liệu từ file JSON Backup"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Khôi phục</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub-nav & KPI Strip */}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 pb-2.5 sm:pb-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 bg-slate-950/50 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveSubTab('models')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${activeSubTab === 'models'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
            >
              <Bike className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Model ({overviewStats.activeModels}/{overviewStats.totalModels})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('parts')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${activeSubTab === 'parts'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Kho LK ({overviewStats.totalParts})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('stats')}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${activeSubTab === 'stats'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Thống kê</span>
            </button>
          </div>

          <div className="hidden md:flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-semibold">
              Đang SX: <strong className="text-white">{overviewStats.activeModels}</strong>
              {overviewStats.discontinuedModels > 0 && (
                <> | Ngừng SX: <strong className="text-slate-300">{overviewStats.discontinuedModels}</strong></>
              )}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-semibold">
              Model có BOM: <strong className="text-white">{overviewStats.modelsWithBom}/{overviewStats.totalModels}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-semibold">
              Tổng mã màu xe: <strong className="text-white">{overviewStats.totalColors}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-indigo-100 font-semibold">
              LK dùng chung (≥2 xe): <strong className="text-emerald-300">{overviewStats.sharedPartsCount}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-2.5 sm:px-6 py-3 sm:py-5">
        {loadingCatalog && bomModels.length === 0 && bomParts.length === 0 && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang đồng bộ danh mục Model &amp; Linh kiện từ máy chủ DK QMS...
          </div>
        )}

        {/* TAB 1: DANH SÁCH MODEL & CHI TIẾT BOM */}
        {activeSubTab === 'models' && !selectedModelEntry && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-xs flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="relative w-full sm:flex-1 sm:min-w-[230px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Tìm Model, màu sắc hoặc mã xe..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'active', label: `Đang SX (${overviewStats.activeModels})` },
                  { id: 'has_bom', label: `Có BOM (${overviewStats.modelsWithBom})` },
                  { id: 'has_alert', label: 'Lưu ý/ECO' },
                  { id: 'discontinued', label: `Ngừng SX (${overviewStats.discontinuedModels})` },
                  { id: 'all', label: `Tất cả (${overviewStats.totalModels})` }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setModelFilter(opt.id as any);
                      setSelectedModelKeysForBulk([]);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${modelFilter === opt.id
                      ? opt.id === 'discontinued'
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setBulkModelSelectMode((prev) => !prev);
                    setSelectedModelKeysForBulk([]);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition cursor-pointer ${bulkModelSelectMode
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  title="Chọn nhiều xe để đánh dấu Ngừng sản xuất & ẩn hàng loạt"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  {bulkModelSelectMode ? 'Xong' : 'Chọn ẩn'}
                </button>
              )}

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
                <button
                  type="button"
                  onClick={() => setModelViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${modelViewMode === 'grid'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="Hiển thị dạng lưới thẻ"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lưới</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModelViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${modelViewMode === 'list'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                  title="Hiển thị dạng danh sách bảng"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Danh sách</span>
                </button>
              </div>
            </div>

            {!readOnly && bulkModelSelectMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-extrabold text-amber-950">
                    Đã chọn {selectedModelKeysForBulk.length} / {filteredModels.length} xe đang hiển thị
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedModelKeysForBulk(filteredModels.map((m) => m.summary.modelKey))}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold cursor-pointer"
                  >
                    Chọn tất cả đang hiện
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModelKeysForBulk([])}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {modelFilter !== 'discontinued' && (
                    <button
                      type="button"
                      disabled={selectedModelKeysForBulk.length === 0 || bulkSavingModels}
                      onClick={() => handleBulkSetModelsDiscontinued(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {bulkSavingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                      Ngừng SX ({selectedModelKeysForBulk.length})
                    </button>
                  )}
                  {(modelFilter === 'discontinued' || modelFilter === 'all') && (
                    <button
                      type="button"
                      disabled={selectedModelKeysForBulk.length === 0 || bulkSavingModels}
                      onClick={() => handleBulkSetModelsDiscontinued(false)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {bulkSavingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Khôi phục ({selectedModelKeysForBulk.length})
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Grid / List 64 Models */}
            {modelViewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredModels.map(({ summary, bom }) => {
                  const items = bom?.items || [];
                  const alertCount = items.filter((line) => {
                    const st = partsByCode.get(line.partCode.trim().toUpperCase())?.status;
                    return st === 'Cảnh báo lỗi' || st === 'Đang ECO';
                  }).length;
                  const isUploading = uploadingModelKey === summary.modelKey;
                  const isDiscontinued = Boolean(bom?.isDiscontinued);
                  const isBulkChecked = selectedModelKeysForBulk.includes(summary.modelKey);

                  return (
                    <div
                      key={summary.modelKey}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col ${isBulkChecked
                        ? 'border-amber-500 ring-2 ring-amber-200'
                        : isDiscontinued
                          ? 'border-slate-300 opacity-85 hover:border-slate-400'
                          : 'border-slate-200 hover:border-indigo-300'
                        }`}
                    >
                      {/* 1 Ảnh đại diện Model */}
                      <div className="relative h-44 bg-slate-100 border-b border-slate-100 flex items-center justify-center group overflow-hidden">
                        {bom?.imageUrl ? (
                          <img
                            src={bom.imageUrl}
                            alt={summary.modelName}
                            loading="lazy"
                            onClick={() =>
                              openLightbox(summary.modelName, [{ url: bom.imageUrl!, caption: `Ảnh đại diện ${summary.modelName}` }], 0)
                            }
                            className="w-full h-full object-contain p-2 cursor-zoom-in transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="text-center text-slate-400 space-y-1 p-4">
                            <Bike className="w-10 h-10 mx-auto opacity-40" />
                            <p className="text-[11px] font-medium">Chưa có ảnh Model</p>
                          </div>
                        )}

                        {!readOnly && bulkModelSelectMode && (
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-amber-300 shadow cursor-pointer text-[11px] font-extrabold text-amber-900"
                          >
                            <input
                              type="checkbox"
                              checked={isBulkChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedModelKeysForBulk((prev) =>
                                  checked
                                    ? [...prev, summary.modelKey]
                                    : prev.filter((k) => k !== summary.modelKey)
                                );
                              }}
                              className="accent-amber-600"
                            />
                            Chọn
                          </label>
                        )}

                        {bom?.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openLightbox(summary.modelName, [{ url: bom.imageUrl!, caption: summary.modelName }], 0)
                            }
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Phóng to ảnh Model"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!readOnly && (
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerModelPhotoUpload(summary.modelKey);
                            }}
                            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-white/95 hover:bg-indigo-600 hover:text-white text-slate-700 border border-slate-200 text-[11px] font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
                            title="Tải 1 ảnh đại diện cho Model"
                          >
                            {isUploading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Camera className="w-3 h-3" />
                            )}
                            {bom?.imageUrl ? 'Đổi ảnh' : 'Ảnh xe'}
                          </button>
                        )}

                        {isDiscontinued && !bulkModelSelectMode && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-800 text-white text-[10px] font-extrabold shadow">
                            Ngừng SX
                          </span>
                        )}

                        {alertCount > 0 && !isDiscontinued && !bulkModelSelectMode && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {alertCount} LK lưu ý
                          </span>
                        )}
                      </div>

                      {/* Thông tin Model */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 truncate" title={summary.modelName}>
                            {summary.modelName}
                          </h3>
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setColorModalModel(summary)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-[11px] font-bold border border-slate-200 transition cursor-pointer"
                              title="Xem danh sách mã màu từ Bảng mã xe OQC"
                            >
                              <Palette className="w-3 h-3" />
                              {summary.colors.length} màu xe
                            </button>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${items.length > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}
                            >
                              <Layers className="w-3 h-3" />
                              {items.length} linh kiện BOM
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedModelKey(summary.modelKey);
                              setBomSearch('');
                              setBomSpecFilter('ALL');
                              setBomStatusFilter('ALL');
                              setBomMissingImgOnly(false);
                            }}
                            className="flex-1 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem BOM
                          </button>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleToggleModelDiscontinued(summary.modelKey, !isDiscontinued)}
                              className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 ${isDiscontinued
                                ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200'
                                : 'bg-slate-100 hover:bg-slate-700 text-slate-600 hover:text-white border-slate-200'
                                }`}
                              title={
                                isDiscontinued
                                  ? 'Khôi phục về Đang sản xuất'
                                  : 'Đánh dấu Ngừng sản xuất & ẩn khỏi danh sách chính'
                              }
                            >
                              {isDiscontinued ? (
                                <RotateCcw className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                        {!readOnly && bulkModelSelectMode && (
                          <th className="py-3 px-3 text-center w-10">Chọn</th>
                        )}
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-3 w-20 text-center">Ảnh xe</th>
                        <th className="py-3 px-3">Tên Model xe</th>
                        <th className="py-3 px-3 text-center">Màu sắc OQC</th>
                        <th className="py-3 px-3 text-center">Số LK BOM</th>
                        <th className="py-3 px-3">Trạng thái SX / LK</th>
                        <th className="py-3 px-3">Cập nhật</th>
                        <th className="py-3 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredModels.map(({ summary, bom }, idx) => {
                        const items = bom?.items || [];
                        const alertCount = items.filter((line) => {
                          const st = partsByCode.get(line.partCode.trim().toUpperCase())?.status;
                          return st === 'Cảnh báo lỗi' || st === 'Đang ECO';
                        }).length;
                        const isUploading = uploadingModelKey === summary.modelKey;
                        const isDiscontinued = Boolean(bom?.isDiscontinued);
                        const isBulkChecked = selectedModelKeysForBulk.includes(summary.modelKey);

                        return (
                          <tr
                            key={summary.modelKey}
                            className={`hover:bg-indigo-50/40 transition ${isDiscontinued ? 'bg-slate-50/70 text-slate-500' : ''
                              }`}
                          >
                            {!readOnly && bulkModelSelectMode && (
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isBulkChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedModelKeysForBulk((prev) =>
                                      checked
                                        ? [...prev, summary.modelKey]
                                        : prev.filter((k) => k !== summary.modelKey)
                                    );
                                  }}
                                  className="accent-amber-600 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex justify-center">
                                {bom?.imageUrl ? (
                                  <img
                                    src={bom.imageUrl}
                                    alt={summary.modelName}
                                    loading="lazy"
                                    onClick={() =>
                                      openLightbox(
                                        summary.modelName,
                                        [{ url: bom.imageUrl!, caption: summary.modelName }],
                                        0
                                      )
                                    }
                                    className="w-14 h-11 rounded-lg border border-slate-200 object-contain bg-white p-0.5 cursor-zoom-in"
                                  />
                                ) : (
                                  <div className="w-14 h-11 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Bike className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModelKey(summary.modelKey);
                                  setBomSearch('');
                                  setBomSpecFilter('ALL');
                                  setBomStatusFilter('ALL');
                                  setBomMissingImgOnly(false);
                                }}
                                className="font-black text-slate-900 hover:text-indigo-700 text-left cursor-pointer text-sm"
                              >
                                {summary.modelName}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setColorModalModel(summary)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold border border-slate-200 cursor-pointer"
                              >
                                <Palette className="w-3 h-3" />
                                {summary.colors.length} màu
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-extrabold border ${items.length > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}
                              >
                                {items.length} LK
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap items-center gap-1">
                                {isDiscontinued ? (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                                    Ngừng SX
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                    Đang SX
                                  </span>
                                )}
                                {alertCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                                    <AlertTriangle className="w-3 h-3" />
                                    {alertCount} lưu ý
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {bom?.updatedAt
                                ? new Date(bom.updatedAt).toLocaleDateString('vi-VN')
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {!readOnly && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleModelDiscontinued(summary.modelKey, !isDiscontinued)
                                      }
                                      className={`px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer ${isDiscontinued
                                        ? 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                                        : 'bg-slate-100 hover:bg-slate-700 text-slate-700 hover:text-white'
                                        }`}
                                      title={isDiscontinued ? 'Khôi phục đang sản xuất' : 'Ẩn (Ngừng sản xuất)'}
                                    >
                                      {isDiscontinued ? (
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                      )}
                                      {isDiscontinued ? 'Khôi phục' : 'Ngừng SX'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isUploading}
                                      onClick={() => handleTriggerModelPhotoUpload(summary.modelKey)}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                                      title="Tải / Đổi 1 ảnh xe"
                                    >
                                      {isUploading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Camera className="w-3.5 h-3.5" />
                                      )}
                                      {bom?.imageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedModelKey(summary.modelKey);
                                    setBomSearch('');
                                    setBomSpecFilter('ALL');
                                    setBomStatusFilter('ALL');
                                    setBomMissingImgOnly(false);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Xem BOM
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredModels.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm space-y-2.5">
                <p>Không tìm thấy Model nào phù hợp với điều kiện lọc hiện tại.</p>
                {modelFilter !== 'all' && modelFilter !== 'discontinued' && overviewStats.discontinuedModels > 0 && (
                  <button
                    type="button"
                    onClick={() => setModelFilter('all')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer"
                  >
                    Tìm cả trong {overviewStats.discontinuedModels} xe đã ngừng sản xuất
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* CHI TIẾT BOM CỦA 1 MODEL */}
        {activeSubTab === 'models' && selectedModelEntry && (
          <div className="space-y-4">
            {/* Top Bar + Model Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-2.5 sm:gap-4 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedModelKey(null)}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1 transition cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Model</span>
                  </button>

                  {/* Model thumbnail */}
                  <div className="w-16 h-14 sm:w-24 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {selectedModelEntry.bom?.imageUrl ? (
                      <img
                        src={selectedModelEntry.bom.imageUrl}
                        alt={selectedModelEntry.summary.modelName}
                        onClick={() =>
                          openLightbox(
                            selectedModelEntry.summary.modelName,
                            [{ url: selectedModelEntry.bom!.imageUrl!, caption: selectedModelEntry.summary.modelName }],
                            0
                          )
                        }
                        className="w-full h-full object-contain p-1 cursor-zoom-in"
                      />
                    ) : (
                      <Bike className="w-8 h-8 text-slate-400" />
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleTriggerModelPhotoUpload(selectedModelEntry.summary.modelKey)}
                        className="absolute inset-x-1 bottom-1 py-0.5 rounded bg-slate-900/75 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        Đổi ảnh
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                        {selectedModelEntry.summary.modelName}
                      </h2>
                      {selectedModelEntry.bom?.isDiscontinued && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-extrabold">
                          Đã ngừng sản xuất
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                        Định mức BOM: {(selectedModelEntry.bom?.items || []).length} linh kiện
                      </span>
                      <button
                        type="button"
                        onClick={() => setColorModalModel(selectedModelEntry.summary)}
                        className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Palette className="w-3 h-3" />
                        {selectedModelEntry.summary.colors.length} mã màu OQC
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleModelDiscontinued(
                              selectedModelEntry.summary.modelKey,
                              !Boolean(selectedModelEntry.bom?.isDiscontinued)
                            )
                          }
                          className={`px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 cursor-pointer ${selectedModelEntry.bom?.isDiscontinued
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                        >
                          {selectedModelEntry.bom?.isDiscontinued ? (
                            <>
                              <RotateCcw className="w-3 h-3" />
                              Khôi phục
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Ngừng SX
                            </>
                          )}
                        </button>
                      )}
                      {selectedModelEntry.bom?.updatedAt && (
                        <span className="text-[11px] text-slate-500">
                          Cập nhật: {new Date(selectedModelEntry.bom.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={(selectedModelEntry.bom?.items || []).length === 0}
                      onClick={() =>
                        setOpenExportMenu((prev) => (prev === 'model' ? null : 'model'))
                      }
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Xuất Excel
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openExportMenu === 'model' && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-40 text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenExportMenu(null);
                            const { exportModelBomExcel } = await import('../utils/bomExcel');
                            exportModelBomExcel({
                              modelName: selectedModelEntry.summary.modelName,
                              colorCount: selectedModelEntry.summary.colors.length,
                              lines: selectedModelEntry.bom?.items || [],
                              partsByCode,
                              whereUsedByCode: whereUsedNamesMap,
                              mode: 'ecount',
                              includePurchasePrice: showPurchasePrice
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 flex items-start gap-2 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">File Ecount (mẫu đã up)</p>
                            <p className="text-[10px] text-slate-500">Đúng cột file gốc Ecount</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenExportMenu(null);
                            const { exportModelBomExcel } = await import('../utils/bomExcel');
                            exportModelBomExcel({
                              modelName: selectedModelEntry.summary.modelName,
                              colorCount: selectedModelEntry.summary.colors.length,
                              lines: selectedModelEntry.bom?.items || [],
                              partsByCode,
                              whereUsedByCode: whereUsedNamesMap,
                              mode: 'full',
                              includePurchasePrice: showPurchasePrice
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 flex items-start gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">Báo cáo QLCL đầy đủ</p>
                            <p className="text-[10px] text-slate-500">Kèm TSKT, trạng thái, dùng chung</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => excelInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Import Excel
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddExistingModalOpen(true)}
                        className="px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Kho LK
                      </button>

                      <button
                        type="button"
                        onClick={() => openPartModalForCreate(true)}
                        className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tạo LK
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Filter inside BOM */}
              <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bomSearch}
                    onChange={(e) => setBomSearch(e.target.value)}
                    placeholder="Tìm Mã, Tên LK, TSKT, NCC..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  <select
                    value={bomSpecFilter}
                    onChange={(e) => setBomSpecFilter(e.target.value)}
                    className="w-full sm:w-auto px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="ALL">Tất cả Thông số</option>
                    {allSpecGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>

                  <select
                    value={bomStatusFilter}
                    onChange={(e) => setBomStatusFilter(e.target.value as any)}
                    className="w-full sm:w-auto px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                  >
                    <option value="ALL">Tất cả Trạng thái</option>
                    {PART_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setBomMissingImgOnly((prev) => !prev)}
                    aria-pressed={bomMissingImgOnly}
                    className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl border text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
                      bomMissingImgOnly
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Chưa có ảnh ({bomMissingImgCount})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOM Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {filteredModelBomLines.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <Package className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600">
                    {(selectedModelEntry.bom?.items || []).length === 0
                      ? `Model ${selectedModelEntry.summary.modelName} chưa có dữ liệu định mức BOM.`
                      : 'Không có linh kiện nào khớp bộ lọc tìm kiếm.'}
                  </p>
                  {!readOnly && (selectedModelEntry.bom?.items || []).length === 0 && (
                    <button
                      type="button"
                      onClick={() => excelInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Import ngay từ file Excel Ecount
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Mobile Card List (BOM) */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {paginatedBomLines.map((line, idx) => {
                      const globalIdx = (safeBomPage - 1) * PARTS_PER_PAGE + idx + 1;
                      const code = line.partCode.trim().toUpperCase();
                      const part = partsByCode.get(code);
                      const images = part?.images || [];
                      const firstImg = images[0]?.url;
                      const sharedList = whereUsedMap.get(code) || [];
                      const status: PartQualityStatus = part?.status || 'Đang dùng';

                      return (
                        <div
                          key={code}
                          onClick={() => openPartModalForView(code)}
                          className="p-3 flex gap-3 hover:bg-indigo-50/30 active:bg-indigo-50/50 transition cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (firstImg) {
                                openLightbox(
                                  `${code} - ${part?.partName || ''}`,
                                  images.map((i) => ({ url: i.url, caption: i.caption })),
                                  0
                                );
                              } else {
                                openPartModalForView(code);
                              }
                            }}
                            className={`relative w-18 h-18 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 ${
                              firstImg ? 'cursor-zoom-in' : 'cursor-pointer'
                            }`}
                          >
                            {firstImg ? (
                              <img
                                src={firstImg}
                                alt={part?.partName || code}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-300" />
                            )}
                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-slate-900/75 text-white text-[9px] font-black">
                              #{globalIdx}
                            </span>
                            {images.length > 1 && (
                              <span className="absolute bottom-1 right-1 px-1 rounded bg-slate-900/80 text-white text-[9px] font-extrabold">
                                +{images.length - 1}
                              </span>
                            )}
                          </button>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[13px] font-extrabold text-slate-900 line-clamp-2 leading-snug">
                                {part?.partName || code}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE_MAP[status]}`}>
                                {status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-slate-400">
                                {code}
                              </span>
                              {part?.specGroup && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                  {part.specGroup}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                              <span className="font-black text-slate-800">
                                ĐM: {line.qty} {line.unit || part?.unit || 'Cái'}
                              </span>
                              <span className="font-extrabold text-emerald-700">
                                • {formatPriceDisplay(part?.sellingPrice, ' đ')}
                              </span>
                            </div>

                            {part?.supplierName && (
                              <p className="text-[11px] text-indigo-700/90 font-semibold truncate">
                                NCC: {part.supplierName}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span className="text-[11px] font-bold text-slate-400">
                                Dùng chung: {sharedList.length} model
                              </span>
                              {!readOnly && part && (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingBomLine({
                                        partCode: code,
                                        qty: line.qty,
                                        unit: line.unit || part.unit || 'Cái',
                                        note: line.note || ''
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-700 cursor-pointer"
                                    title="Sửa ĐM / QL Kho"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBomLine(code)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-700 cursor-pointer"
                                    title="Gỡ khỏi BOM"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table (BOM) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                          <th className="py-3 px-3 text-center w-12">STT</th>
                          <th className="py-3 px-3 w-20 text-center">Ảnh</th>
                          <th className="py-3 px-3">Mã mặt hàng</th>
                          <th className="py-3 px-3 min-w-[230px]">Tên mặt hàng &amp; NCC</th>
                          <th className="py-3 px-3">Thông số</th>
                          <th className="py-3 px-3 text-center">Đơn vị</th>
                          <th className="py-3 px-3 text-right">Định mức</th>
                          <th className="py-3 px-3 text-right">Giá bán</th>
                          <th className="py-3 px-3">Trạng thái</th>
                          <th className="py-3 px-3">Dùng chung</th>
                          <th className="py-3 px-3">QL Kho</th>
                          <th className="py-3 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {paginatedBomLines.map((line, idx) => {
                          const globalIdx = (safeBomPage - 1) * PARTS_PER_PAGE + idx + 1;
                          const code = line.partCode.trim().toUpperCase();
                          const part = partsByCode.get(code);
                          const images = part?.images || [];
                          const firstImg = images[0]?.url;
                          const sharedList = whereUsedMap.get(code) || [];
                          const status: PartQualityStatus = part?.status || 'Đang dùng';

                          return (
                            <tr
                              key={code}
                              className="hover:bg-indigo-50/40 transition"
                            >
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                                {globalIdx}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex justify-center">
                                  {firstImg ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openLightbox(
                                          `${code} - ${part?.partName || ''}`,
                                          images.map((i) => ({ url: i.url, caption: i.caption })),
                                          0
                                        )
                                      }
                                      className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white hover:border-indigo-500 cursor-zoom-in shrink-0"
                                    >
                                      <img
                                        src={firstImg}
                                        alt={part?.partName || code}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                      {images.length > 1 && (
                                        <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-slate-900/80 text-white text-[9px] font-extrabold rounded-tl">
                                          +{images.length - 1}
                                        </span>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        part ? openPartModalForEdit(part) : openPartModalForView(code)
                                      }
                                      className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 cursor-pointer"
                                      title="Chưa có ảnh"
                                    >
                                      <ImageIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-extrabold text-indigo-700 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openPartModalForView(code)}
                                  className="hover:underline cursor-pointer text-left"
                                >
                                  {code}
                                </button>
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => openPartModalForView(code)}
                                  className="font-bold text-slate-900 hover:text-indigo-700 text-left cursor-pointer"
                                >
                                  {part?.partName || code}
                                </button>
                                {part?.supplierName && (
                                  <p className="text-[11px] text-indigo-700/90 font-semibold line-clamp-1 mt-0.5">
                                    NCC: {part.supplierName}
                                  </p>
                                )}
                                {part?.techSpecs && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    TSKT: {part.techSpecs}
                                  </p>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {part?.specGroup ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                    {part.specGroup}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                {line.unit || part?.unit || 'Cái'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                {line.qty}
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                                {formatPriceDisplay(part?.sellingPrice, ' đ')}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_BADGE_MAP[status]}`}>
                                  {status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => openPartModalForView(code)}
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 cursor-pointer ${sharedList.length >= 2
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                >
                                  <Share2 className="w-3 h-3" />
                                  {sharedList.length} model
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-[200px]">
                                <span className="line-clamp-2">{line.note || part?.note || '—'}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openPartModalForView(code)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 cursor-pointer"
                                    title="Xem ảnh & thông số chi tiết"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {!readOnly && part && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openPartModalForEdit(part)}
                                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 cursor-pointer"
                                        title="Sửa thông tin & ảnh linh kiện gốc"
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingBomLine({
                                            partCode: code,
                                            qty: line.qty,
                                            unit: line.unit || part.unit || 'Cái',
                                            note: line.note || ''
                                          })
                                        }
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer"
                                        title="Sửa định mức SL / QL Kho trên model này"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBomLine(code)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                        title="Gỡ linh kiện khỏi BOM model này"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <PaginationBar
                currentPage={safeBomPage}
                totalItems={filteredModelBomLines.length}
                onPageChange={setBomPage}
              />
            </div>
          </div>
        )}

        {/* TAB 2: KHO LINH KIỆN & DÙNG CHUNG (WHERE-USED) */}
        {activeSubTab === 'parts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                    placeholder="Tìm Mã mặt hàng, Tên linh kiện, TSKT, NCC..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={filteredPartsMaster.length === 0}
                      onClick={() =>
                        setOpenExportMenu((prev) => (prev === 'parts' ? null : 'parts'))
                      }
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Xuất Excel
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openExportMenu === 'parts' && (
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-40 text-xs">
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenExportMenu(null);
                            const { exportPartsMasterExcel } = await import('../utils/bomExcel');
                            exportPartsMasterExcel({
                              parts: filteredPartsMaster,
                              whereUsedByCode: whereUsedNamesMap,
                              mode: 'ecount',
                              includePurchasePrice: showPurchasePrice
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 flex items-start gap-2 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">File Ecount (mẫu đã up)</p>
                            <p className="text-[10px] text-slate-500">Đúng cột file gốc Ecount</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setOpenExportMenu(null);
                            const { exportPartsMasterExcel } = await import('../utils/bomExcel');
                            exportPartsMasterExcel({
                              parts: filteredPartsMaster,
                              whereUsedByCode: whereUsedNamesMap,
                              mode: 'full',
                              includePurchasePrice: showPurchasePrice
                            });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 text-slate-800 flex items-start gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold">Báo cáo QLCL đầy đủ</p>
                            <p className="text-[10px] text-slate-500">Kèm TSKT, trạng thái, dùng chung</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {!readOnly && (
                    <>
                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={() => setLarkSyncModalOpen(true)}
                          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                          title="Đồng bộ ảnh hàng loạt từ Lark Base sang Kho LK"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          Lark Base
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openPartModalForCreate(false)}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm LK
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={partSpecFilter}
                  onChange={(e) => setPartSpecFilter(e.target.value)}
                  className="flex-1 min-w-[140px] sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 font-bold bg-white"
                >
                  <option value="ALL">Tất cả Thông số</option>
                  {allSpecGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>

                <select
                  value={partStatusFilter}
                  onChange={(e) => setPartStatusFilter(e.target.value as any)}
                  className="flex-1 min-w-[140px] sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 font-bold bg-white"
                >
                  <option value="ALL">Tất cả Trạng thái</option>
                  {PART_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partSharedOnly}
                    onChange={(e) => setPartSharedOnly(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Dùng chung (≥2)
                </label>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partMissingImgOnly}
                    onChange={(e) => setPartMissingImgOnly(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  Chưa có ảnh
                </label>

                <span className="ml-auto text-slate-500 font-semibold">
                  Hiển thị {filteredPartsMaster.length} / {bomParts.length} mã
                </span>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPartViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${partViewMode === 'grid'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                    title="Hiển thị dạng lưới thẻ"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lưới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartViewMode('list')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition cursor-pointer ${partViewMode === 'list'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                    title="Hiển thị dạng danh sách bảng"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Danh sách</span>
                  </button>
                </div>
              </div>
            </div>

            {!readOnly && orphanedLegacyColoredParts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-amber-900">
                  <p className="font-extrabold">
                    Phát hiện {orphanedLegacyColoredParts.length} mã &ldquo;Nhựa màu&rdquo; kiểu cũ (có 4 số đuôi) đã quy về mã Phôi và không còn Model nào dùng.
                  </p>
                  <p className="text-[11px] text-amber-800/90">
                    Ảnh cũ đã được kế thừa sang mã Phôi; anh có thể dọn gọn các mã cũ dư thừa này để Kho sạch sẽ hơn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCleanupOrphanedLegacyParts}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold shrink-0 cursor-pointer"
                >
                  Dọn {orphanedLegacyColoredParts.length} mã cũ
                </button>
              </div>
            )}

            {filteredPartsMaster.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2 text-slate-500 text-sm">
                <Wrench className="w-10 h-10 mx-auto text-slate-300" />
                <p>Chưa có mã linh kiện nào khớp bộ lọc.</p>
              </div>
            ) : partViewMode === 'grid' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {paginatedPartsMaster.map((part) => {
                    const code = part.partCode.trim().toUpperCase();
                    const images = part.images || [];
                    const usedModels = whereUsedMap.get(code) || [];

                    return (
                      <div
                        key={part.id}
                        onClick={() => openPartModalForView(code)}
                        className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs hover:shadow-md hover:border-indigo-300 transition flex gap-3.5 cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (images[0]?.url) {
                              openLightbox(
                                `${code} - ${part.partName}`,
                                images.map((i) => ({ url: i.url, caption: i.caption })),
                                0
                              );
                            } else {
                              openPartModalForView(code);
                            }
                          }}
                          className={`w-22 h-22 sm:w-24 sm:h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center ${
                            images[0]?.url ? 'cursor-zoom-in' : 'cursor-pointer'
                          }`}
                        >
                          {images[0]?.url ? (
                            <img
                              src={images[0].url}
                              alt={part.partName}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-7 h-7 text-slate-300" />
                          )}
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/75 text-white text-[10px] font-bold">
                            {images.length} ảnh
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[13px] sm:text-sm font-extrabold text-slate-900 line-clamp-2 text-left leading-snug">
                                {part.partName}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE_MAP[part.status || 'Đang dùng']}`}>
                                {part.status || 'Đang dùng'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[11px] font-semibold text-slate-400 truncate">
                                {code}
                              </span>
                              {part.specGroup && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                                  {part.specGroup}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500">ĐVT: {part.unit || 'Cái'}</span>
                            </div>
                            {part.supplierName && (
                              <p className="mt-1 text-[11px] font-semibold text-indigo-700/90 line-clamp-1">
                                NCC: {part.supplierName}
                              </p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="font-extrabold text-emerald-700">
                                Giá bán: {formatPriceDisplay(part.sellingPrice, ' đ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 truncate">
                              Dùng chung: {usedModels.length} model
                            </span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPartModalForEdit(part);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                                title="Chỉnh sửa linh kiện"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <PaginationBar
                    currentPage={safePartsPage}
                    totalItems={filteredPartsMaster.length}
                    onPageChange={setPartsPage}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Mobile Card List (Kho LK List mode) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paginatedPartsMaster.map((part, idx) => {
                    const globalIdx = (safePartsPage - 1) * PARTS_PER_PAGE + idx + 1;
                    const code = part.partCode.trim().toUpperCase();
                    const images = part.images || [];
                    const firstImg = images[0]?.url;
                    const usedModels = whereUsedMap.get(code) || [];

                    return (
                      <div
                        key={part.id}
                        onClick={() => openPartModalForView(code)}
                        className="p-3 flex gap-3 hover:bg-indigo-50/30 active:bg-indigo-50/50 transition cursor-pointer"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (firstImg) {
                              openLightbox(
                                `${code} - ${part.partName}`,
                                images.map((i) => ({ url: i.url, caption: i.caption })),
                                0
                              );
                            } else {
                              openPartModalForView(code);
                            }
                          }}
                          className={`relative w-18 h-18 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 ${
                            firstImg ? 'cursor-zoom-in' : 'cursor-pointer'
                          }`}
                        >
                          {firstImg ? (
                            <img
                              src={firstImg}
                              alt={part.partName}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          )}
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-slate-900/75 text-white text-[9px] font-black">
                            #{globalIdx}
                          </span>
                          {images.length > 1 && (
                            <span className="absolute bottom-1 right-1 px-1 rounded bg-slate-900/80 text-white text-[9px] font-extrabold">
                              +{images.length - 1}
                            </span>
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[13px] font-extrabold text-slate-900 line-clamp-2 leading-snug">
                              {part.partName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${STATUS_BADGE_MAP[part.status || 'Đang dùng']
                                }`}
                            >
                              {part.status || 'Đang dùng'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-slate-400">
                              {code}
                            </span>
                            {part.specGroup && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                {part.specGroup}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                            <span>ĐVT: {part.unit || 'Cái'}</span>
                            <span className="font-extrabold text-emerald-700">
                              • {formatPriceDisplay(part.sellingPrice, ' đ')}
                            </span>
                          </div>

                          {part.supplierName && (
                            <p className="text-[11px] text-indigo-700/90 font-semibold truncate">
                              NCC: {part.supplierName}
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[11px] font-bold text-slate-400">
                              Dùng chung: {usedModels.length} model
                            </span>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPartModalForEdit(part);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 cursor-pointer"
                                title="Chỉnh sửa linh kiện"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (Kho LK List mode) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3 text-center w-12">STT</th>
                        <th className="py-3 px-3 w-20 text-center">Ảnh</th>
                        <th className="py-3 px-3">Mã mặt hàng</th>
                        <th className="py-3 px-3 min-w-[230px]">Tên mặt hàng &amp; NCC</th>
                        <th className="py-3 px-3">Thông số</th>
                        <th className="py-3 px-3 text-center">ĐVT</th>
                        <th className="py-3 px-3 text-right">Giá bán</th>
                        <th className="py-3 px-3">Trạng thái</th>
                        <th className="py-3 px-3">Dùng chung</th>
                        <th className="py-3 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedPartsMaster.map((part, idx) => {
                        const globalIdx = (safePartsPage - 1) * PARTS_PER_PAGE + idx + 1;
                        const code = part.partCode.trim().toUpperCase();
                        const images = part.images || [];
                        const firstImg = images[0]?.url;
                        const usedModels = whereUsedMap.get(code) || [];

                        return (
                          <tr key={part.id} className="hover:bg-indigo-50/40 transition">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                              {globalIdx}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex justify-center">
                                {firstImg ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openLightbox(
                                        `${code} - ${part.partName}`,
                                        images.map((i) => ({ url: i.url, caption: i.caption })),
                                        0
                                      )
                                    }
                                    className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white hover:border-indigo-500 cursor-zoom-in shrink-0"
                                  >
                                    <img
                                      src={firstImg}
                                      alt={part.partName}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                    />
                                    {images.length > 1 && (
                                      <span className="absolute bottom-0 right-0 px-1 bg-slate-900/80 text-white text-[9px] font-extrabold rounded-tl">
                                        +{images.length - 1}
                                      </span>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openPartModalForEdit(part)}
                                    className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 cursor-pointer"
                                    title="Chưa có ảnh"
                                  >
                                    <ImageIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-extrabold text-indigo-700 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openPartModalForView(code)}
                                className="hover:underline cursor-pointer text-left"
                              >
                                {code}
                              </button>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => openPartModalForView(code)}
                                className="font-bold text-slate-900 hover:text-indigo-700 text-left cursor-pointer"
                              >
                                {part.partName}
                              </button>
                              {part.supplierName && (
                                <p className="text-[11px] text-indigo-700/90 font-semibold line-clamp-1 mt-0.5">
                                  NCC: {part.supplierName}
                                </p>
                              )}
                              {part.techSpecs && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  TSKT: {part.techSpecs}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {part.specGroup ? (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                  {part.specGroup}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                              {part.unit || 'Cái'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                              {formatPriceDisplay(part.sellingPrice, ' đ')}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_BADGE_MAP[part.status || 'Đang dùng']
                                  }`}
                              >
                                {part.status || 'Đang dùng'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openPartModalForView(code)}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 cursor-pointer ${usedModels.length >= 2
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}
                              >
                                <Share2 className="w-3 h-3" />
                                {usedModels.length} model
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openPartModalForView(code)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-[11px] font-extrabold transition cursor-pointer"
                                >
                                  Chi tiết
                                </button>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => openPartModalForEdit(part)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                    title="Chỉnh sửa linh kiện"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={safePartsPage}
                  totalItems={filteredPartsMaster.length}
                  onPageChange={setPartsPage}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: THỐNG KÊ TỔNG HỢP LINH KIỆN & BOM */}
        {activeSubTab === 'stats' && (
          <BomStatsTab
            bomParts={bomParts}
            combinedModels={combinedModels}
            partsByCode={partsByCode}
            whereUsedMap={whereUsedMap}
            onOpenPartDetail={(code) => openPartModalForView(code)}
            onOpenModelBom={(modelKey) => {
              setActiveSubTab('models');
              setSelectedModelKey(modelKey);
              setBomSearch('');
              setBomSpecFilter('ALL');
              setBomStatusFilter('ALL');
              setBomMissingImgOnly(false);
            }}
            onFilterPartsTab={({ specGroup, missingImgOnly, status }) => {
              setPartSearch('');
              setPartSpecFilter(specGroup || 'ALL');
              setPartStatusFilter(status || 'ALL');
              setPartSharedOnly(false);
              setPartMissingImgOnly(Boolean(missingImgOnly));
              setActiveSubTab('parts');
            }}
          />
        )}
      </main>

      {/* MODAL DANH SÁCH MÃ MÀU THEO MODEL (TỪ BẢNG MÃ XE OQC) */}
      {colorModalModel && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">
                  Bảng Mã Xe &amp; Màu Sắc — {colorModalModel.modelName}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Đồng bộ từ Tab OQC &gt; Bảng mã xe ({colorModalModel.colors.length} mã màu)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setColorModalModel(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {colorModalModel.colors.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  Model này chưa có mã quy cách màu trong Bảng mã xe OQC.
                </p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="py-2 px-3">STT</th>
                      <th className="py-2 px-3">Mã quy cách xe</th>
                      <th className="py-2 px-3">Màu sắc</th>
                      <th className="py-2 px-3">Tên đầy đủ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {colorModalModel.colors.map((c, idx) => (
                      <tr key={`${c.partCode}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{c.partCode}</td>
                        <td className="py-2 px-3 font-semibold">{c.color}</td>
                        <td className="py-2 px-3 text-slate-600">{c.nameWithColor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT / TẠO MỚI / CHỈNH SỬA LINH KIỆN (UNIFIED FORM + VIEW SPEC SHEET) */}
      {partModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className={`bg-white rounded-t-2xl sm:rounded-2xl w-full max-h-[95vh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden ${partModalMode === 'view' ? 'max-w-5xl' : 'max-w-4xl'
              }`}
          >
            {/* Header */}
            <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black truncate">
                  {partModalMode === 'create'
                    ? 'Thêm Mã Linh Kiện Mới vào Kho'
                    : partModalMode === 'edit'
                      ? `Chỉnh sửa Linh Kiện: ${partForm.partCode}`
                      : `Chi tiết Linh Kiện: ${partForm.partCode}`}
                </h3>
                <p className="text-[11px] text-indigo-200 truncate">
                  Công ty TNHH Xe điện DK Việt Nhật — DKBike (Xe cho cả gia đình) | Quản lý chất lượng (QLCL)
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {partModalMode === 'view' && !readOnly && (
                  <button
                    type="button"
                    onClick={() => setPartModalMode('edit')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Chỉnh sửa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPartModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!readOnly && (
              <input
                ref={partImageInputRef}
                type="file"
                accept="image/*"
                multiple={partModalMode === 'view' || partForm.imageMode === 'multi'}
                className="hidden"
                onChange={handlePartImagesSelected}
              />
            )}

            {/* CHẾ ĐỘ XEM CHI TIẾT 1 LINH KIỆN (LAYOUT 2 CỘT RÕ NÉT) */}
            {partModalMode === 'view' ? (
              (() => {
                const codeUpper = partForm.partCode.trim().toUpperCase();
                const currentPartObj = partsByCode.get(codeUpper);
                const images = partForm.images || [];
                const safeIdx = Math.min(selectedViewImageIdx, Math.max(0, images.length - 1));
                const activeImage = images[safeIdx];
                const usedModels = whereUsedMap.get(codeUpper) || [];

                return (
                  <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                      {/* CỘT TRÁI: TRÌNH XEM ẢNH CHÍNH + THUMBNAILS */}
                      <div className="lg:col-span-6 space-y-2.5 sm:space-y-3">
                        <div className="relative h-56 sm:h-80 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group">
                          {activeImage ? (
                            <>
                              <img
                                src={activeImage.url}
                                alt={activeImage.caption || partForm.partName}
                                onClick={() =>
                                  openLightbox(
                                    `${codeUpper} - ${partForm.partName}`,
                                    images.map((i) => ({ url: i.url, caption: i.caption })),
                                    safeIdx
                                  )
                                }
                                className="w-full h-full object-contain p-3 cursor-zoom-in transition group-hover:scale-[1.02]"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  openLightbox(
                                    `${codeUpper} - ${partForm.partName}`,
                                    images.map((i) => ({ url: i.url, caption: i.caption })),
                                    safeIdx
                                  )
                                }
                                className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-slate-900/75 hover:bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                Phóng to
                              </button>
                              {images.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedViewImageIdx(
                                        (safeIdx - 1 + images.length) % images.length
                                      )
                                    }
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow border border-slate-200 cursor-pointer"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedViewImageIdx((safeIdx + 1) % images.length)
                                    }
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow border border-slate-200 cursor-pointer"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-bold truncate">
                                  {activeImage.caption || `Ảnh ${safeIdx + 1}`}
                                </span>
                                <span className="px-2 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-extrabold shrink-0">
                                  {safeIdx + 1} / {images.length}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-6 space-y-2.5">
                              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                              <p className="text-xs font-semibold text-slate-500">
                                Chưa có hình ảnh cho mã linh kiện này
                              </p>
                              {!readOnly && (
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    disabled={partImagesUploading || cameraSaving}
                                    onClick={() => partImageInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                                  >
                                    {partImagesUploading ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5" />
                                    )}
                                    Thêm ảnh
                                  </button>
                                  <button
                                    type="button"
                                    disabled={partImagesUploading || cameraSaving}
                                    onClick={() => setCameraCaptureOpen(true)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    Chụp ảnh
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!readOnly && activeImage && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={partImagesUploading || cameraSaving}
                              onClick={() => partImageInputRef.current?.click()}
                              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                              {partImagesUploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              Thêm ảnh
                            </button>
                            <button
                              type="button"
                              disabled={partImagesUploading || cameraSaving}
                              onClick={() => setCameraCaptureOpen(true)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              Chụp ảnh
                            </button>
                          </div>
                        )}

                        {images.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {images.map((img, idx) => (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() => setSelectedViewImageIdx(idx)}
                                className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-white shrink-0 transition cursor-pointer ${idx === safeIdx
                                  ? 'border-indigo-600 ring-2 ring-indigo-200'
                                  : 'border-slate-200 opacity-75 hover:opacity-100'
                                  }`}
                                title={img.caption || `Ảnh ${idx + 1}`}
                              >
                                <img
                                  src={img.url}
                                  alt={img.caption || `Ảnh ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* CỘT PHẢI: HỒ SƠ THÔNG TIN & THÔNG SỐ KỸ THUẬT */}
                      <div className="lg:col-span-6 flex flex-col justify-between gap-4">
                        <div className="space-y-4">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${STATUS_BADGE_MAP[partForm.status || 'Đang dùng']
                                }`}
                            >
                              {partForm.status || 'Đang dùng'}
                            </span>
                            {partForm.specGroup && (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                                {partForm.specGroup}
                              </span>
                            )}
                            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                              ĐVT: {partForm.unit || 'Cái'}
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                              {partForm.imageMode === 'single' ? '1 ảnh' : `${images.length} ảnh`}
                            </span>
                          </div>

                          {/* Tên & Mã mặt hàng */}
                          <div className="space-y-2">
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                              {partForm.partName}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-mono text-xs sm:text-sm font-black tracking-wide">
                                {codeUpper}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(codeUpper);
                                  setCopiedPartCode(true);
                                  setTimeout(() => setCopiedPartCode(false), 1500);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                              >
                                {copiedPartCode ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    Đã chép mã
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy mã
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Giá bán / Giá mua */}
                          <div className={`grid gap-2.5 text-xs ${showPurchasePrice ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                              <span className="block text-[10px] font-extrabold text-emerald-700 uppercase">
                                Giá bán
                              </span>
                              <span className="mt-0.5 block text-sm font-black text-emerald-800">
                                {formatPriceDisplay(currentPartObj?.sellingPrice, ' đ')}
                              </span>
                            </div>
                            {showPurchasePrice && (
                              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                                <span className="block text-[10px] font-extrabold text-amber-800 uppercase">
                                  Giá mua (Nội bộ)
                                </span>
                                <span className="mt-0.5 block text-sm font-black text-amber-900">
                                  {formatPriceDisplay(currentPartObj?.purchasePrice)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Thông số kỹ thuật */}
                          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                              Thông số kỹ thuật chi tiết
                            </p>
                            <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                              {partForm.techSpecs?.trim()
                                ? partForm.techSpecs
                                : 'Chưa cập nhật thông số kỹ thuật chi tiết.'}
                            </p>
                          </div>

                          {/* Nhà cung cấp */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                            <span className="block text-[11px] font-bold text-slate-400 uppercase">
                              Nhà cung cấp
                            </span>
                            <span className="mt-1 block font-bold text-slate-800">
                              {partForm.supplierName?.trim() || 'Chưa cập nhật'}
                            </span>
                          </div>
                        </div>

                        {currentPartObj?.updatedAt && (
                          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                            Cập nhật lần cuối:{' '}
                            {new Date(currentPartObj.updatedAt).toLocaleString('vi-VN')}
                            {currentPartObj.updatedBy ? ` bởi ${currentPartObj.updatedBy}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* DANH SÁCH MODEL DÙNG CHUNG (WHERE-USED - TỰ ĐỘNG ẨN, MỞ BẰNG NÚT TAM GIÁC) */}
                    <div className="bg-indigo-50/70 rounded-2xl border border-indigo-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowSharedModelsInDetail((prev) => !prev)}
                        aria-expanded={showSharedModelsInDetail}
                        className="w-full px-3.5 sm:px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-indigo-100/60 transition cursor-pointer"
                      >
                        <h4 className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                          <Share2 className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Model dùng chung ({usedModels.length} model)</span>
                        </h4>
                        <span
                          className="w-7 h-7 rounded-lg bg-white border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-2xs shrink-0"
                          title={showSharedModelsInDetail ? 'Thu gọn danh sách model' : 'Mở danh sách model dùng chung'}
                        >
                          <svg
                            viewBox="0 0 12 12"
                            className={`w-3 h-3 fill-current transition-transform duration-200 ${showSharedModelsInDetail ? 'rotate-180' : 'rotate-0'
                              }`}
                          >
                            <path d="M2 4l4 5 4-5H2z" />
                          </svg>
                        </span>
                      </button>

                      {showSharedModelsInDetail && (
                        <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 border-t border-indigo-200/70">
                          {usedModels.length === 0 ? (
                            <p className="text-xs text-slate-500 pt-2">
                              Mã linh kiện này chưa được gắn vào BOM của Model nào.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                              {usedModels.map((entry) => {
                                const modelObj = bomModelsMap.get(entry.modelKey);
                                return (
                                  <button
                                    key={entry.modelKey}
                                    type="button"
                                    onClick={() => {
                                      setPartModalOpen(false);
                                      setActiveSubTab('models');
                                      setSelectedModelKey(entry.modelKey);
                                    }}
                                    className="p-2.5 rounded-xl bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-indigo-200 shadow-2xs transition flex items-center gap-2.5 text-left group cursor-pointer"
                                  >
                                    <div className="w-11 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                      {modelObj?.imageUrl ? (
                                        <img
                                          src={modelObj.imageUrl}
                                          alt={entry.modelName}
                                          className="w-full h-full object-contain"
                                        />
                                      ) : (
                                        <Bike className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-black truncate">{entry.modelName}</p>
                                      <p className="text-[11px] text-slate-500 group-hover:text-indigo-100 font-semibold">
                                        Định mức: {entry.qty} {entry.unit} / xe
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer View */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => setPartModalMode('edit')}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Sửa / Ảnh
                        </button>
                      ) : (
                        <div />
                      )}
                      <button
                        type="button"
                        onClick={() => setPartModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* CHẾ ĐỘ TẠO MỚI / CHỈNH SỬA (UNIFIED FORM) */
              <form onSubmit={handleSavePartModal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                {/* GALLERY ẢNH LINH KIỆN */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase">
                        Hình ảnh linh kiện ({partForm.images.length} ảnh)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {partForm.imageMode === 'single'
                          ? 'Chế độ 1 ảnh (phù hợp linh kiện nhựa / nhựa màu đơn giản).'
                          : 'Chế độ Nhiều ảnh (phù hợp dây tổng, cụm điện, động cơ, phanh... cần nhiều góc chụp).'}
                      </p>
                    </div>

                    {partModalMode !== 'view' && !readOnly && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={partForm.imageMode}
                          onChange={(e) =>
                            setPartForm((prev) => ({
                              ...prev,
                              imageMode: e.target.value as PartImageMode
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                        >
                          <option value="single">1 ảnh (Nhựa / Đơn giản)</option>
                          <option value="multi">Nhiều ảnh (Chi tiết / Cụm)</option>
                        </select>

                        <button
                          type="button"
                          disabled={partImagesUploading || cameraSaving}
                          onClick={() => {
                            if (!partForm.partCode.trim()) {
                              showToast('Anh vui lòng nhập "Mã mặt hàng" trước khi chụp ảnh nhé!', 'error');
                              return;
                            }
                            setCameraCaptureOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Chụp ảnh
                        </button>

                        <button
                          type="button"
                          disabled={partImagesUploading}
                          onClick={() => partImageInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                          {partImagesUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          {partForm.imageMode === 'single' ? 'Chọn 1 ảnh' : 'Chọn từ máy'}
                        </button>
                      </div>
                    )}
                  </div>

                  {partForm.images.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-400 text-xs">
                      Chưa có hình ảnh nào cho mã linh kiện này.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {partForm.images.map((img, idx) => (
                        <div
                          key={img.id}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col"
                        >
                          <div className="relative h-36 bg-slate-100 group">
                            <img
                              src={img.url}
                              alt={img.caption || partForm.partName}
                              onClick={() =>
                                openLightbox(
                                  `${partForm.partCode} - ${partForm.partName}`,
                                  partForm.images.map((i) => ({ url: i.url, caption: i.caption })),
                                  idx
                                )
                              }
                              className="w-full h-full object-contain p-1 cursor-zoom-in"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                openLightbox(
                                  `${partForm.partCode} - ${partForm.partName}`,
                                  partForm.images.map((i) => ({ url: i.url, caption: i.caption })),
                                  idx
                                )
                              }
                              className="absolute top-1.5 left-1.5 p-1 rounded bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
                            {partModalMode !== 'view' && !readOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemovePartFormImage(img.id)}
                                className="absolute top-1.5 right-1.5 p-1 rounded bg-rose-600 text-white opacity-90 hover:opacity-100 cursor-pointer"
                                title="Xóa ảnh này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="p-1.5 border-t border-slate-100">
                            {partModalMode === 'view' || readOnly ? (
                              <p className="text-[11px] font-semibold text-slate-600 truncate text-center">
                                {img.caption || `Ảnh ${idx + 1}`}
                              </p>
                            ) : (
                              <input
                                type="text"
                                value={img.caption || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPartForm((prev) => ({
                                    ...prev,
                                    images: prev.images.map((x) =>
                                      x.id === img.id ? { ...x, caption: val } : x
                                    )
                                  }));
                                }}
                                placeholder="Chú thích (VD: Đầu giắc)..."
                                className="w-full px-2 py-1 rounded border border-slate-200 text-[11px]"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* THÔNG TIN & THÔNG SỐ KỸ THUẬT (UNIFIED FIELDS) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã mặt hàng (Ecount) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={partModalMode !== 'create' || readOnly}
                      value={partForm.partCode}
                      onChange={(e) =>
                        setPartForm((prev) => ({ ...prev, partCode: e.target.value.toUpperCase() }))
                      }
                      placeholder="VD: LEMROM010214"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên mặt hàng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={partModalMode === 'view' || readOnly}
                      value={partForm.partName}
                      onChange={(e) => setPartForm((prev) => ({ ...prev, partName: e.target.value }))}
                      placeholder="VD: Dây tổng Roma SX v2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Thông số / Nhóm vật tư (Ecount)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        list="dk_bom_spec_groups"
                        disabled={partModalMode === 'view' || readOnly}
                        value={partForm.specGroup}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPartForm((prev) => ({
                            ...prev,
                            specGroup: val,
                            imageMode:
                              partModalMode === 'create' ? inferPartImageMode(val) : prev.imageMode
                          }));
                        }}
                        placeholder="VD: PT điện, PT khung, Nhựa chung..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                      />
                      {partModalMode === 'create' && !readOnly && isColoredPlasticSpec(partForm.specGroup) && (
                        <button
                          type="button"
                          onClick={() => {
                            const norm = normalizeColoredPlasticPart(
                              partForm.partCode,
                              partForm.partName,
                              partForm.specGroup,
                              knownOqcColors
                            );
                            setPartForm((prev) => ({
                              ...prev,
                              partCode: norm.partCode,
                              partName: norm.partName
                            }));
                            showToast('Đã chuẩn hóa về mã & tên Phôi (bỏ 4 số cuối & tên màu).', 'info');
                          }}
                          className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-extrabold shrink-0 cursor-pointer"
                          title="Bỏ 4 số cuối của mã & bỏ tên màu ở cuối tên (nhựa màu -> phôi)"
                        >
                          Bỏ màu (Phôi)
                        </button>
                      )}
                    </div>
                    <datalist id="dk_bom_spec_groups">
                      {allSpecGroups.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Đơn vị</label>
                      <input
                        type="text"
                        disabled={partModalMode === 'view' || readOnly}
                        value={partForm.unit}
                        onChange={(e) => setPartForm((prev) => ({ ...prev, unit: e.target.value }))}
                        placeholder="Cái / Bộ / Đôi"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Trạng thái QLCL</label>
                      <select
                        disabled={partModalMode === 'view' || readOnly}
                        value={partForm.status}
                        onChange={(e) =>
                          setPartForm((prev) => ({ ...prev, status: e.target.value as PartQualityStatus }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold disabled:bg-slate-100"
                      >
                        {PART_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nhà cung cấp</label>
                    <input
                      type="text"
                      disabled={partModalMode === 'view' || readOnly}
                      value={partForm.supplierName}
                      onChange={(e) => setPartForm((prev) => ({ ...prev, supplierName: e.target.value }))}
                      placeholder="Tên nhà cung cấp chính..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">QL Kho</label>
                    <input
                      type="text"
                      disabled={partModalMode === 'view' || readOnly}
                      value={partForm.note}
                      onChange={(e) => setPartForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Nhân sự quản lý kho (VD: Thành, Long, Sự)..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>

                  <div className={`grid gap-2.5 sm:col-span-2 ${showPurchasePrice ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Số lượng tồn kho</label>
                      <input
                        type="number"
                        step="any"
                        disabled={partModalMode === 'view' || readOnly}
                        value={partForm.stockQty}
                        onChange={(e) => setPartForm((prev) => ({ ...prev, stockQty: e.target.value }))}
                        placeholder="VD: 161"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold disabled:bg-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Giá bán (VNĐ)</label>
                      <input
                        type="number"
                        step="any"
                        disabled={partModalMode === 'view' || readOnly}
                        value={partForm.sellingPrice}
                        onChange={(e) => setPartForm((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                        placeholder="VD: 30000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold disabled:bg-slate-100"
                      />
                    </div>
                    {showPurchasePrice && (
                      <div>
                        <label className="block font-bold text-amber-800 mb-1">Giá mua (Nội bộ)</label>
                        <input
                          type="number"
                          step="any"
                          disabled={partModalMode === 'view' || readOnly}
                          value={partForm.purchasePrice}
                          onChange={(e) => setPartForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                          placeholder="VD: 3.5 hoặc 173000"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/40 font-bold disabled:bg-slate-100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Từ khóa tìm kiếm (Ecount)</label>
                    <input
                      type="text"
                      disabled={partModalMode === 'view' || readOnly}
                      value={partForm.keywords}
                      onChange={(e) => setPartForm((prev) => ({ ...prev, keywords: e.target.value }))}
                      placeholder="VD: S1 喇叭, Trước Roma..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Thông số kỹ thuật chi tiết
                    </label>
                    <textarea
                      rows={3}
                      disabled={partModalMode === 'view' || readOnly}
                      value={partForm.techSpecs}
                      onChange={(e) => setPartForm((prev) => ({ ...prev, techSpecs: e.target.value }))}
                      placeholder="VD: Điện áp 48V/60V, kích thước ren M12x70x19, vật liệu nhựa ABS nguyên sinh, chân giắc 6 pin..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>

                  {partModalMode === 'create' && attachToCurrentModel && selectedModelEntry && (
                    <div className="sm:col-span-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="font-bold text-indigo-900">
                        Tự động gắn vào BOM của model: {selectedModelEntry.summary.modelName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-800">Số lượng / xe:</span>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={attachToCurrentModelQty}
                          onChange={(e) => setAttachToCurrentModelQty(Number(e.target.value) || 1)}
                          className="w-24 px-2.5 py-1 rounded-lg border border-indigo-300 bg-white font-bold text-right"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DANH SÁCH MODEL DÙNG CHUNG (WHERE-USED) */}
                {partModalMode !== 'create' && (
                  <div className="bg-indigo-50/60 rounded-2xl border border-indigo-200 p-4 space-y-2.5">
                    <h4 className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-indigo-600" />
                      Các Model xe đang dùng chung linh kiện này (
                      {(whereUsedMap.get(partForm.partCode.trim().toUpperCase()) || []).length} model)
                    </h4>
                    {(whereUsedMap.get(partForm.partCode.trim().toUpperCase()) || []).length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Mã linh kiện này chưa được gắn vào BOM của Model nào.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(whereUsedMap.get(partForm.partCode.trim().toUpperCase()) || []).map((entry) => (
                          <button
                            key={entry.modelKey}
                            type="button"
                            onClick={() => {
                              setPartModalOpen(false);
                              setActiveSubTab('models');
                              setSelectedModelKey(entry.modelKey);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-600 text-slate-800 hover:text-white border border-indigo-200 text-xs font-bold shadow-2xs transition cursor-pointer"
                          >
                            {entry.modelName} <span className="opacity-75">({entry.qty} {entry.unit})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  {partModalMode === 'edit' && !readOnly && editingPartId ? (
                    <button
                      type="button"
                      onClick={() => {
                        const existing = partsByCode.get(partForm.partCode.trim().toUpperCase());
                        if (existing) handleDeletePartMaster(existing);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPartModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold cursor-pointer"
                    >
                      Đóng
                    </button>
                    {partModalMode !== 'view' && !readOnly && (
                      <button
                        type="submit"
                        disabled={partSaving || partImagesUploading}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        {partSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Lưu
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL CHỌN LINH KIỆN CÓ SẴN TỪ KHO ĐỂ GẮN VÀO MODEL BOM */}
      {addExistingModalOpen && selectedModelEntry && !readOnly && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddExistingPartToBom}
            className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Gắn Linh Kiện Có Sẵn vào {selectedModelEntry.summary.modelName}
              </h3>
              <button
                type="button"
                onClick={() => setAddExistingModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700">Tìm mã linh kiện trong Kho:</label>
              <input
                type="text"
                value={existingPartSearch}
                onChange={(e) => setExistingPartSearch(e.target.value)}
                placeholder="Gõ mã Ecount hoặc tên linh kiện..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {bomParts
                  .filter((p) => {
                    const q = existingPartSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      p.partCode.toLowerCase().includes(q) ||
                      p.partName.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 50)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedExistingPartCode(p.partCode)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-indigo-50 cursor-pointer ${selectedExistingPartCode === p.partCode ? 'bg-indigo-100' : ''
                        }`}
                    >
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-indigo-700">{p.partCode}</span>
                        <span className="ml-2 font-semibold text-slate-800">{p.partName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {(p.images || []).length} ảnh
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số lượng / xe</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={selectedExistingQty}
                  onChange={(e) => setSelectedExistingQty(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">QL Kho / Ghi chú riêng Model</label>
                <input
                  type="text"
                  value={selectedExistingNote}
                  onChange={(e) => setSelectedExistingNote(e.target.value)}
                  placeholder="Tùy chọn..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddExistingModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!selectedExistingPartCode}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer"
              >
                Thêm vào BOM
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SỬA NHANH DÒNG BOM (SL / GHI CHÚ RIÊNG MODEL) */}
      {editingBomLine && selectedModelEntry && !readOnly && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBomLineEdit}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                Cập nhật định mức: {editingBomLine.partCode}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBomLine(null)}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số lượng / xe</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={editingBomLine.qty}
                  onChange={(e) =>
                    setEditingBomLine((prev) =>
                      prev ? { ...prev, qty: Number(e.target.value) || 1 } : null
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Đơn vị</label>
                <input
                  type="text"
                  value={editingBomLine.unit}
                  onChange={(e) =>
                    setEditingBomLine((prev) => (prev ? { ...prev, unit: e.target.value } : null))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                QL Kho / Ghi chú riêng cho model {selectedModelEntry.summary.modelName}
              </label>
              <input
                type="text"
                value={editingBomLine.note}
                onChange={(e) =>
                  setEditingBomLine((prev) => (prev ? { ...prev, note: e.target.value } : null))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBomLine(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL XEM TRƯỚC IMPORT EXCEL ECOUNT */}
      {importModalState && !readOnly && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">
                  Xác nhận Import BOM Excel Ecount — {importModalState.modelName}
                </h3>
                <p className="text-[11px] text-indigo-200">
                  File: {importModalState.fileName} | Đọc được {importModalState.rows.length} mã linh kiện
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalState(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {(() => {
                const existingCount = importModalState.rows.filter((r) =>
                  partsByCode.has(r.partCode.trim().toUpperCase())
                ).length;
                const newCount = importModalState.rows.length - existingCount;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-semibold">Tổng dòng BOM</span>
                      <p className="text-lg font-black text-slate-900">{importModalState.rows.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-700 font-semibold">Mã đã có trong Kho (giữ nguyên ảnh)</span>
                      <p className="text-lg font-black text-emerald-800">{existingCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                      <span className="text-indigo-700 font-semibold">Mã mới sẽ tạo vào Kho</span>
                      <p className="text-lg font-black text-indigo-800">{newCount}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <p className="font-bold">
                  Tự động nhận diện các cột mới: <span className="text-indigo-700">Định mức tiêu thụ</span>, <span className="text-indigo-700">Số lượng tồn kho</span>, <span className="text-indigo-700">Tên khách hàng/nhà cung cấp</span>, {showPurchasePrice && <><span className="text-amber-800">Giá mua</span>, </>}<span className="text-emerald-700">Giá bán</span>, <span className="text-indigo-700">Từ khóa</span>.
                  <span className="text-slate-500"> (Tự động bỏ qua các cột Giá nhập, Thành tiền nhập, Thành tiền bán).</span>
                </p>
              </div>

              {importModalState.normalizedColoredCount > 0 && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900">
                  <p className="font-extrabold">
                    Đã tự động chuẩn hóa {importModalState.normalizedColoredCount} dòng &ldquo;Nhựa màu&rdquo; về Phôi chuẩn (bỏ 4 số cuối mã &amp; bỏ tên màu sau tên linh kiện).
                  </p>
                </div>
              )}

              {importModalState.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <p className="font-extrabold">Lưu ý khi đọc file:</p>
                  {importModalState.warnings.slice(0, 5).map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={importModalState.replaceExistingLines}
                  onChange={(e) =>
                    setImportModalState((prev) =>
                      prev ? { ...prev, replaceExistingLines: e.target.checked } : null
                    )
                  }
                  className="accent-indigo-600"
                />
                Thay thế toàn bộ danh sách dòng BOM cũ của {importModalState.modelName} (nếu bỏ chọn sẽ gộp/cập nhật thêm)
              </label>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">STT</th>
                      <th className="py-2 px-3">Mã mặt hàng</th>
                      <th className="py-2 px-3">Tên mặt hàng</th>
                      <th className="py-2 px-3">Thông số</th>
                      <th className="py-2 px-3">ĐVT</th>
                      <th className="py-2 px-3 text-right">Định mức</th>
                      <th className="py-2 px-3 text-right">Tồn kho</th>
                      <th className="py-2 px-3">Nhà cung cấp</th>
                      {showPurchasePrice && <th className="py-2 px-3 text-right">Giá mua</th>}
                      <th className="py-2 px-3 text-right">Giá bán</th>
                      <th className="py-2 px-3">Trạng thái Kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importModalState.rows.map((r) => {
                      const exists = partsByCode.has(r.partCode.trim().toUpperCase());
                      return (
                        <tr key={r.partCode}>
                          <td className="py-1.5 px-3 font-bold text-slate-500">{r.lineNo}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-indigo-700">
                            <div>{r.partCode}</div>
                            {r.rawPartCode && r.rawPartCode !== r.partCode && (
                              <div className="text-[10px] font-normal text-slate-400">
                                Gốc: {r.rawPartCode}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-semibold">
                            <div>{r.partName}</div>
                            {r.detectedColor && (
                              <div className="text-[10px] font-normal text-amber-700">
                                Đã tách màu: {r.detectedColor}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-3">{r.specGroup || '—'}</td>
                          <td className="py-1.5 px-3">{r.unit}</td>
                          <td className="py-1.5 px-3 text-right font-bold">{r.qty}</td>
                          <td className="py-1.5 px-3 text-right font-semibold">{formatPriceDisplay(r.stockQty)}</td>
                          <td className="py-1.5 px-3 max-w-[180px] truncate" title={r.supplierName || ''}>
                            {r.supplierName || '—'}
                          </td>
                          {showPurchasePrice && (
                            <td className="py-1.5 px-3 text-right font-bold text-amber-800">
                              {formatPriceDisplay(r.purchasePrice)}
                            </td>
                          )}
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                            {formatPriceDisplay(r.sellingPrice, ' đ')}
                          </td>
                          <td className="py-1.5 px-3">
                            {exists ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Cập nhật &amp; giữ ảnh
                              </span>
                            ) : (
                              <span className="text-indigo-700 font-bold">+ Tạo mới</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportModalState(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-extrabold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={importingExcel}
                onClick={handleConfirmImportExcel}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                {importingExcel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Import Cloud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX PHÓNG TO GALLERY ẢNH SẮC NÉT */}
      {lightboxState && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/92 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxState(null)}
        >
          <div
            className="w-full max-w-5xl flex items-center justify-between text-white pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 className="text-sm font-black">{lightboxState.title}</h4>
              <p className="text-xs text-slate-300">
                Ảnh {lightboxState.index + 1} / {lightboxState.images.length}
                {lightboxState.images[lightboxState.index]?.caption
                  ? ` — ${lightboxState.images[lightboxState.index].caption}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLightboxState(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxState.images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxState((prev) =>
                    prev
                      ? {
                        ...prev,
                        index: (prev.index - 1 + prev.images.length) % prev.images.length
                      }
                      : null
                  )
                }
                className="absolute left-2 p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white cursor-pointer z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={lightboxState.images[lightboxState.index]?.url}
              alt={lightboxState.title}
              className="max-h-[80vh] max-w-full object-contain rounded-xl bg-white/5 shadow-2xl"
            />

            {lightboxState.images.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxState((prev) =>
                    prev
                      ? {
                        ...prev,
                        index: (prev.index + 1) % prev.images.length
                      }
                      : null
                  )
                }
                className="absolute right-2 p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white cursor-pointer z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}
      {/* MODAL CHỤP ẢNH TRỰC TIẾP TỪ CAMERA APP (TRONG FORM TẠO/SỬA) */}
      <CameraCaptureModal
        open={cameraCaptureOpen}
        title={`Chụp ảnh: ${partForm.partCode || 'Linh kiện mới'}`}
        multiple={partModalMode === 'view' || partForm.imageMode === 'multi'}
        saving={cameraSaving}
        onClose={() => {
          if (!cameraSaving) setCameraCaptureOpen(false);
        }}
        onConfirmFiles={handleConfirmCameraCapture}
      />

      {/* MODAL ĐỒNG BỘ ẢNH HÀNG LOẠT TỪ LARK BASE */}
      <LarkBomSyncModal
        open={larkSyncModalOpen}
        onClose={() => setLarkSyncModalOpen(false)}
        partsByCode={partsByCode}
        extraColors={knownOqcColors}
        currentUserName={currentUserName}
        onToast={showToast}
      />
    </div>
  );
};

export default PartsBomCenter;
