import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  Image as ImageIcon,
  Layers,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { compressImageFile } from '../imageCompressor';
import { safeStorage } from '../safeStorage';

export interface AppModuleShowcaseItem {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  images: string[];
}

const SHOWCASE_STORAGE_KEY = 'dk_qms_app_showcase_v1';

const DEFAULT_APP_MODULES: AppModuleShowcaseItem[] = [
  {
    id: 'mod-1-dashboard',
    order: 1,
    title: '1. Dashboard tổng',
    subtitle: 'Trung tâm điều hành & giám sát chất lượng toàn diện',
    description:
      'Tổng hợp chỉ số sức khỏe chất lượng toàn nhà máy theo thời gian thực: tỷ lệ đạt IQC, PQC, OQC, hồ sơ CAPA quá hạn, phản ánh thị trường và tiến độ công việc QLCL.',
    highlights: [
      'Theo dõi KPI trọng tâm (OQC Yield, IQC, PQC, CAPA, Báo ngày)',
      'Cảnh báo điểm nóng chất lượng & việc cần xử lý ngay',
      'Liên kết nhanh tới từng phân hệ nghiệp vụ'
    ],
    images: []
  },
  {
    id: 'mod-2-copq',
    order: 2,
    title: '2. Chi phí chất lượng',
    subtitle: 'Quản lý chi phí kém chất lượng (COPQ) & đối chiếu Kế toán',
    description:
      'Ghi nhận chi phí sửa chữa, tái chế, bảo hành, vật tư tiêu hao, thiết bị dây chuyền và văn phòng 5S. Hỗ trợ nhập bảng hàng loạt từ Excel, kiểm tra chênh lệch và phân bổ theo Tài khoản Kế toán (TK 621–642).',
    highlights: [
      'Nhập liệu dạng bảng & dán hàng loạt từ Excel (Ctrl+V)',
      '3 biểu đồ Dashboard tương tác: Theo tháng, Nhóm COPQ, TK Kế toán',
      'Xuất Excel danh sách đối chiếu phòng Kế toán'
    ],
    images: []
  },
  {
    id: 'mod-3-weekly-monthly-report',
    order: 3,
    title: '3. Báo cáo tuần/tháng',
    subtitle: 'Tổng hợp Q-Index, phân tích QC & xuất báo cáo ISO',
    description:
      'Tự động tổng hợp dữ liệu IQC, PQC, OQC, Thị trường, CAPA, ECO và Báo ngày theo từng Tuần (ISO 8601) hoặc Tháng. Tích hợp công cụ QC (Pareto, p-chart) và xuất file Excel / PDF chuẩn trình ban lãnh đạo.',
    highlights: [
      'Chấm điểm Q-Index tự động theo trọng số phòng QLCL',
      'Biểu đồ Pareto lỗi & kiểm soát p-chart theo chu kỳ',
      'Xuất báo cáo Excel & In/PDF định dạng chuẩn ISO'
    ],
    images: []
  },
  {
    id: 'mod-4-planning',
    order: 4,
    title: '4. Kế hoạch tuần/tháng',
    subtitle: 'Lập kế hoạch chất lượng tổng thể & phân bổ tác vụ',
    description:
      'Xây dựng kế hoạch kiểm soát chất lượng tuần/tháng, gắn mục tiêu sản lượng lắp ráp, cung ứng và phân công đầu việc cụ thể cho từng nhân sự QLCL.',
    highlights: [
      'Quản lý mục tiêu kế hoạch theo Tuần và Tháng',
      'Theo dõi tỷ lệ hoàn thành & tồn đọng giữa các kỳ',
      'Xuất file Excel kế hoạch trực quan'
    ],
    images: []
  },
  {
    id: 'mod-5-iqc',
    order: 5,
    title: '5. Báo cáo IQC',
    subtitle: 'Kiểm tra chất lượng linh kiện đầu vào (AQL)',
    description:
      'Ghi nhận kết quả kiểm tra lô hàng nhập từ Nhà cung cấp theo tiêu chuẩn lấy mẫu AQL, lưu ảnh minh chứng lỗi, quản lý chi tiết từng mã hàng trong lô và đánh giá chất lượng NCC.',
    highlights: [
      'Tính cỡ mẫu kiểm tra tự động theo bảng chuẩn AQL',
      'Quản lý chi tiết từng dòng mã linh kiện trong phiếu IQC',
      'Xuất phiếu IQC ra Excel & đồng bộ cảnh báo NCC'
    ],
    images: []
  },
  {
    id: 'mod-6-pqc',
    order: 6,
    title: '6. Báo cáo PQC',
    subtitle: 'Kiểm soát chất lượng quá trình trên chuyền lắp ráp',
    description:
      'Theo dõi các điểm kiểm soát tại từng công đoạn lắp ráp, ghi nhận lỗi phát sinh tại chuyền, tình trạng xử lý tức thời và tỷ lệ đạt công đoạn.',
    highlights: [
      'Kiểm soát các hạng mục trọng yếu theo công đoạn sản xuất',
      'Ghi nhận lỗi tức thời kèm hình ảnh hiện trường',
      'Cảnh báo lỗi lặp lại để khoanh vùng xử lý sớm'
    ],
    images: []
  },
  {
    id: 'mod-7-oqc',
    order: 7,
    title: '7. Báo cáo OQC',
    subtitle: 'Kiểm tra xe thành phẩm xuất xưởng & TV Dashboard',
    description:
      'Quản lý kiểm tra 100% xe thành phẩm theo số khung, phân loại lỗi, theo dõi bàn giao xe đạt chất lượng và hiển thị trực tiếp lên màn hình TV nhà máy (/tv).',
    highlights: [
      'Quản lý dữ liệu lớn theo số khung (tối ưu tốc độ & đồng bộ)',
      'Theo dõi tỷ lệ Đạt lần đầu (FPY/Yield) & danh sách bàn giao',
      'Màn hình hiển thị Kiosk TV realtime cho phân xưởng'
    ],
    images: []
  },
  {
    id: 'mod-8-market',
    order: 8,
    title: '8. Phản ánh thị trường',
    subtitle: 'Tiếp nhận & xử lý sự cố chất lượng từ đại lý/khách hàng',
    description:
      'Theo dõi toàn bộ phản ánh lỗi thị trường, đề xuất cải tiến (DEF), phân loại mức độ nghiêm trọng, dòng xe, đại lý và trạng thái đóng/mở hồ sơ xử lý.',
    highlights: [
      'Phân loại theo dòng xe, đại lý, mức độ nghiêm trọng',
      'Theo dõi tiến độ khắc phục & tỷ lệ đóng phản ánh 100%',
      'Liên kết dữ liệu trực tiếp sang báo cáo tuần/tháng'
    ],
    images: []
  },
  {
    id: 'mod-9-part-eval',
    order: 9,
    title: '9. Thẩm định lỗi linh kiện',
    subtitle: 'Tổng hợp đánh giá & kết luận nguyên nhân linh kiện lỗi (BM-KTTD-01)',
    description:
      'Lập biên bản thẩm định kỹ thuật đối với linh kiện lỗi gửi về từ thị trường hoặc xưởng, xác định nguyên nhân gốc (Lỗi NCC, Lỗi lắp ráp, Người dùng...) và hướng xử lý (Đổi mới BH, Từ chối BH...).',
    highlights: [
      'Lưu biên bản kèm tối đa 3 ảnh minh chứng thực tế',
      'Tổng hợp thống kê theo Linh kiện, Model, NCC, Đại lý',
      'Xuất báo cáo Excel gồm sheet Tổng hợp & Chi tiết BM-KTTD-01'
    ],
    images: []
  },
  {
    id: 'mod-10-daily-log',
    order: 10,
    title: '10. Báo cáo ngày',
    subtitle: 'Nhật ký công việc hàng ngày & theo dõi tiến độ từng nhân sự QLCL',
    description:
      'Ghi nhận đầu việc phát sinh hàng ngày theo từng quy trình QMS, giao người phụ trách, cập nhật tỷ lệ hoàn thành (%) và tự động tổng hợp dữ liệu tuân thủ báo cáo ngày sang Báo cáo tuần/tháng.',
    highlights: [
      'Gom nhóm công việc theo ngày từ mới nhất đến cũ nhất',
      'Theo dõi tiến độ (%) & tỷ lệ hoàn thành trung bình của phòng QLCL',
      'Đồng bộ tự động lên chỉ số Tuân thủ Báo ngày ở Dashboard & Báo cáo tuần/tháng'
    ],
    images: []
  },
  {
    id: 'mod-11-eco',
    order: 11,
    title: '11. Quản lý Thay đổi Kỹ thuật',
    subtitle: 'Kiểm soát đề xuất & triển khai thay đổi kỹ thuật (ECO)',
    description:
      'Quản lý toàn bộ hồ sơ thay đổi kỹ thuật (ECO): nội dung cải tiến linh kiện/kết cấu, dòng xe áp dụng, bộ phận liên quan, trạng thái phê duyệt và lịch sử áp dụng thực tế trên dây chuyền.',
    highlights: [
      'Theo dõi vòng đời hồ sơ ECO từ đề xuất đến phê duyệt & áp dụng',
      'Gắn chặt dòng xe, mã linh kiện và người chịu trách nhiệm',
      'Tổng hợp tự động vào sheet CAPA, ECO & Công việc trong Báo cáo tuần/tháng'
    ],
    images: []
  }
];

function loadModules(): { list: AppModuleShowcaseItem[]; customized: boolean } {
  try {
    const raw = safeStorage.getItem(SHOWCASE_STORAGE_KEY);
    if (!raw) return { list: DEFAULT_APP_MODULES, customized: false };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Bổ sung tự động các mục mặc định mới (như 10, 11) nếu chưa có trong bản đã lưu
      const existingIds = new Set(parsed.map((x: AppModuleShowcaseItem) => x.id));
      const missingDefaults = DEFAULT_APP_MODULES.filter((d) => !existingIds.has(d.id));
      return { list: [...parsed, ...missingDefaults], customized: true };
    }
    return { list: DEFAULT_APP_MODULES, customized: false };
  } catch {
    return { list: DEFAULT_APP_MODULES, customized: false };
  }
}

export default function QmsAppShowcaseTab({ readOnly = false }: { readOnly?: boolean }) {
  const initial = useMemo(() => loadModules(), []);
  const [modules, setModules] = useState<AppModuleShowcaseItem[]>(initial.list);
  const [hasCustomEdits, setHasCustomEdits] = useState<boolean>(initial.customized);
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<AppModuleShowcaseItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [editingItem, setEditingItem] = useState<AppModuleShowcaseItem | null>(null);
  const [highlightsText, setHighlightsText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleRemoteSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.key === SHOWCASE_STORAGE_KEY && Array.isArray(detail.data) && detail.data.length > 0) {
        const existingIds = new Set(detail.data.map((x: AppModuleShowcaseItem) => x.id));
        const missingDefaults = DEFAULT_APP_MODULES.filter((d) => !existingIds.has(d.id));
        setModules([...detail.data, ...missingDefaults]);
        setHasCustomEdits(true);
      }
    };
    window.addEventListener('dk_local_module_remote_sync', handleRemoteSync);
    return () => window.removeEventListener('dk_local_module_remote_sync', handleRemoteSync);
  }, []);

  const persistModules = (next: AppModuleShowcaseItem[]) => {
    setModules(next);
    setHasCustomEdits(true);
    safeStorage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify(next));
    safeStorage.setItem(`${SHOWCASE_STORAGE_KEY}_is_dirty`, 'true');
    try {
      window.localStorage.setItem(`${SHOWCASE_STORAGE_KEY}_is_dirty`, 'true');
    } catch {}
    (window as any).syncToServer?.(SHOWCASE_STORAGE_KEY, next);
  };

  const handleResetDefault = () => {
    if (!window.confirm('Khôi phục toàn bộ thông tin giới thiệu 9 phân hệ về mặc định ban đầu?')) return;
    setModules(DEFAULT_APP_MODULES);
    setHasCustomEdits(false);
    safeStorage.setItem(SHOWCASE_STORAGE_KEY, JSON.stringify(DEFAULT_APP_MODULES));
    safeStorage.setItem(`${SHOWCASE_STORAGE_KEY}_is_dirty`, 'true');
    try {
      window.localStorage.setItem(`${SHOWCASE_STORAGE_KEY}_is_dirty`, 'true');
    } catch {}
    (window as any).syncToServer?.(SHOWCASE_STORAGE_KEY, DEFAULT_APP_MODULES);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) =>
      [m.title, m.subtitle, m.description, ...m.highlights].join(' ').toLowerCase().includes(q)
    );
  }, [modules, search]);

  const openDetail = (item: AppModuleShowcaseItem) => {
    setActiveImageIdx(0);
    setDetailItem(item);
  };

  const openEdit = (item: AppModuleShowcaseItem) => {
    setDetailItem(null);
    setEditingItem({ ...item, images: [...item.images], highlights: [...item.highlights] });
    setHighlightsText(item.highlights.join('\n'));
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingItem) return;
    setCompressing(true);
    try {
      const nextImages = [...editingItem.images];
      for (let i = 0; i < files.length; i++) {
        if (nextImages.length >= 4) break;
        const compressed = await compressImageFile(files[i], 500, 500, 0.4);
        if (compressed) nextImages.push(compressed);
      }
      setEditingItem({ ...editingItem, images: nextImages });
    } catch {
      alert('Không thể xử lý ảnh. Vui lòng chọn ảnh khác.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const cleanedHighlights = highlightsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const updatedItem: AppModuleShowcaseItem = {
      ...editingItem,
      title: editingItem.title.trim() || 'Phân hệ DK QMS',
      subtitle: editingItem.subtitle.trim(),
      description: editingItem.description.trim(),
      highlights: cleanedHighlights
    };
    persistModules(modules.map((m) => (m.id === updatedItem.id ? updatedItem : m)));
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Header giới thiệu */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Giới Thiệu Các Chức Năng Hệ Thống DK QMS</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Công ty TNHH Xe điện DK Việt Nhật (DKBike) • Phòng Quản lý chất lượng (QLCL) — {modules.length} phân hệ vận hành chính.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên phân hệ, tính năng..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 w-60 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          {!readOnly && hasCustomEdits && (
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Khôi phục mô tả mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mặc định</span>
            </button>
          )}
        </div>
      </div>

      {/* Lưới 9 phân hệ */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          Không tìm thấy phân hệ nào khớp với từ khóa "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
            >
              {/* Khung ảnh chụp màn hình */}
              <div
                onClick={() => openDetail(item)}
                className="relative h-48 bg-slate-100 border-b border-slate-200 flex items-center justify-center cursor-pointer group overflow-hidden"
              >
                {item.images.length > 0 ? (
                  <>
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-200"
                    />
                    {item.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-bold">
                        +{item.images.length - 1} ảnh
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400 px-4 text-center">
                    <ImageIcon className="w-9 h-9 stroke-[1.5]" />
                    <span className="text-[11px] font-medium">
                      {readOnly ? 'Chưa có ảnh chụp màn hình' : 'Chưa có ảnh — bấm Sửa để thêm ảnh chụp'}
                    </span>
                  </div>
                )}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black shadow-2xs">
                  #{String(item.order).padStart(2, '0')}
                </span>
              </div>

              {/* Nội dung mô tả */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{item.title}</h3>
                    <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">{item.subtitle}</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                  {item.highlights.length > 0 && (
                    <ul className="space-y-1 pt-1">
                      {item.highlights.slice(0, 3).map((hl, idx) => (
                        <li key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                          <span className="text-emerald-600 font-black mt-0.5">•</span>
                          <span className="line-clamp-1">{hl}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openDetail(item)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem chi tiết</span>
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Thêm ảnh chụp & chỉnh sửa mô tả"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Sửa / Ảnh</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Xem chi tiết */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{detailItem.title}</h3>
                <p className="text-xs font-semibold text-indigo-700">{detailItem.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {detailItem.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="h-[55vh] max-h-[540px] rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={detailItem.images[Math.min(activeImageIdx, detailItem.images.length - 1)]}
                      alt={detailItem.title}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  {detailItem.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {detailItem.images.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImageIdx(i)}
                          className={`w-16 h-12 rounded-lg border overflow-hidden shrink-0 cursor-pointer ${
                            activeImageIdx === i ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center gap-1.5 text-slate-400 text-xs">
                  <ImageIcon className="w-9 h-9 stroke-[1.5]" />
                  <span>Chưa có ảnh chụp màn hình cho phân hệ này</span>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px]">Mô tả chức năng</h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{detailItem.description}</p>
              </div>

              {detailItem.highlights.length > 0 && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <h4 className="font-extrabold text-indigo-950 uppercase text-[11px]">Điểm nổi bật</h4>
                  <ul className="space-y-1">
                    {detailItem.highlights.map((hl, i) => (
                      <li key={i} className="text-indigo-950 flex items-start gap-2">
                        <span className="font-black text-indigo-600">•</span>
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => openEdit(detailItem)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa / Thêm ảnh</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa & Tải ảnh chụp màn hình */}
      {editingItem && !readOnly && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-base font-extrabold text-slate-900">
                Chỉnh sửa giới thiệu: {editingItem.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Ảnh chụp giới thiệu */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800">Ảnh chụp màn hình giới thiệu (tối đa 4 ảnh)</div>
                    <p className="text-[11px] text-slate-500">
                      Nén chất lượng cao (1600px, 88%, tối đa ~350KB/ảnh) giữ chữ &amp; số liệu sắc nét. Hoặc dán trực tiếp URL ảnh gốc bên dưới.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagePick}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={compressing || editingItem.images.length >= 4}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{compressing ? 'Đang xử lý ảnh...' : 'Chọn ảnh từ máy'}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Hoặc dán link ảnh gốc (https://... hoặc /docs/...)"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <button
                    type="button"
                    disabled={!imageUrlInput.trim() || editingItem.images.length >= 4}
                    onClick={() => {
                      const u = imageUrlInput.trim();
                      if (!u) return;
                      setEditingItem({ ...editingItem, images: [...editingItem.images, u] });
                      setImageUrlInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Thêm link
                  </button>
                </div>

                {editingItem.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {editingItem.images.map((img, i) => (
                      <div key={i} className="relative h-24 rounded-lg border border-slate-200 bg-white overflow-hidden group">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setEditingItem({
                              ...editingItem,
                              images: editingItem.images.filter((_, idx) => idx !== i)
                            })
                          }
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-90 hover:opacity-100 cursor-pointer"
                          title="Xóa ảnh này"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên phân hệ *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiêu đề phụ</label>
                  <input
                    type="text"
                    value={editingItem.subtitle}
                    onChange={(e) => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={4}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tính năng nổi bật (mỗi dòng 1 ý)</label>
                <textarea
                  rows={3}
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
