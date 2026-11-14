import React, { useMemo, useRef, useState } from 'react';
import {
  Bike,
  Camera,
  Check,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { compressImageFile } from '../imageCompressor';
import { safeStorage } from '../safeStorage';

export type ProductCategory = 'Xe máy điện' | 'Xe đạp điện' | 'Xe 50cc' | 'Khác';

export interface ProductSpecItem {
  id: string;
  code: string;
  name: string;
  category: ProductCategory;
  image?: string;
  motor: string;
  battery: string;
  speed: string;
  brake: string;
  tire: string;
  dimensions: string;
  weight: string;
  notes: string;
  updatedAt: string;
}

const PRODUCTS_STORAGE_KEY = 'dk_qms_products_v1';

const DEFAULT_PRODUCTS: ProductSpecItem[] = [
  {
    id: 'dk-roma-sx',
    code: 'DK-ROMA-SX',
    name: 'DK Roma SX',
    category: 'Xe máy điện',
    motor: '1000W',
    battery: '60V - 20Ah (5 bình)',
    speed: '45 - 50 km/h',
    brake: 'Phanh đĩa trước / Tang trống sau',
    tire: '90/90-10 không săm',
    dimensions: '1750 x 690 x 1100 mm',
    weight: '90 kg',
    notes: 'Kiểm tra kỹ độ khít dàn nhựa đầu, cổ phốt, đèn LED và phanh đĩa trước.',
    updatedAt: '2026-11-14'
  },
  {
    id: 'dk-gogo-smart',
    code: 'DK-GOGO-SMART',
    name: 'DK Gogo Smart',
    category: 'Xe máy điện',
    motor: '1000W',
    battery: '60V - 20Ah',
    speed: '45 - 50 km/h',
    brake: 'Phanh đĩa trước / Đĩa hoặc cơ sau',
    tire: '90/90-10 không săm',
    dimensions: '1720 x 700 x 1080 mm',
    weight: '88 kg',
    notes: 'Chú ý kiểm tra để chân Gogo, độ ồn dàn nhựa và khóa smartkey.',
    updatedAt: '2026-11-14'
  },
  {
    id: 'dk-s5',
    code: 'DK-S5',
    name: 'DK S5',
    category: 'Xe đạp điện',
    motor: '450W - 500W',
    battery: '48V - 12Ah / 20Ah',
    speed: '35 - 40 km/h',
    brake: 'Tang trống trước / sau',
    tire: '14x2.50 / 16x2.50',
    dimensions: '1620 x 640 x 1050 mm',
    weight: '52 kg',
    notes: 'Kiểm tra kỹ cụm xích líp, chân chống giữa và độ cân vành.',
    updatedAt: '2026-11-14'
  },
  {
    id: 'dk-ez5',
    code: 'DK-EZ5',
    name: 'DK EZ5',
    category: 'Xe đạp điện',
    motor: '450W',
    battery: '48V - 12Ah / 20Ah',
    speed: '35 - 40 km/h',
    brake: 'Tang trống trước / sau',
    tire: '14x2.50',
    dimensions: '1580 x 630 x 1030 mm',
    weight: '48 kg',
    notes: 'Kiểm tra sạc chống nước theo model và độ rơ cổ lái.',
    updatedAt: '2026-11-14'
  },
  {
    id: 'dk-samurai',
    code: 'DK-SAMURAI',
    name: 'DK Samurai',
    category: 'Xe đạp điện',
    motor: '600W',
    battery: '48V - 20Ah',
    speed: '40 km/h',
    brake: 'Đĩa trước / Tang trống sau',
    tire: '16x3.0 không săm',
    dimensions: '1660 x 680 x 1060 mm',
    weight: '62 kg',
    notes: 'Kiểm tra giảm xóc sau, hệ thống đèn xi nhan và phanh trước.',
    updatedAt: '2026-11-14'
  },
  {
    id: 'dk-volt-v2',
    code: 'DK-VOLT-V2',
    name: 'DK Volt V2',
    category: 'Xe máy điện',
    motor: '1200W',
    battery: '60V - 20Ah / Pin LFP',
    speed: '50 km/h',
    brake: 'Đĩa trước / Đĩa sau',
    tire: '90/90-12 không săm',
    dimensions: '1820 x 710 x 1120 mm',
    weight: '95 kg',
    notes: 'Kiểm tra đồng hồ hiển thị, ngắt phanh IC và cảm biến chân chống cạnh.',
    updatedAt: '2026-11-14'
  }
];

const CATEGORIES: ProductCategory[] = ['Xe máy điện', 'Xe đạp điện', 'Xe 50cc', 'Khác'];

function loadProducts(): ProductSpecItem[] {
  try {
    const raw = safeStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return DEFAULT_PRODUCTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

const emptyForm = (): Omit<ProductSpecItem, 'id' | 'updatedAt'> => ({
  code: '',
  name: '',
  category: 'Xe máy điện',
  image: undefined,
  motor: '',
  battery: '',
  speed: '',
  brake: '',
  tire: '',
  dimensions: '',
  weight: '',
  notes: ''
});

export default function QmsProductsTab() {
  const [products, setProducts] = useState<ProductSpecItem[]>(() => loadProducts());
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'Tất cả' | ProductCategory>('Tất cả');
  const [detailItem, setDetailItem] = useState<ProductSpecItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<ProductSpecItem, 'id' | 'updatedAt'>>(emptyForm);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const persistProducts = (next: ProductSpecItem[]) => {
    setProducts(next);
    safeStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== 'Tất cả' && p.category !== catFilter) return false;
      if (!q) return true;
      return [p.name, p.code, p.category, p.motor, p.battery, p.brake, p.tire, p.notes]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [products, search, catFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEditModal = (item: ProductSpecItem) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      category: item.category,
      image: item.image,
      motor: item.motor,
      battery: item.battery,
      speed: item.speed,
      brake: item.brake,
      tire: item.tire,
      dimensions: item.dimensions,
      weight: item.weight,
      notes: item.notes
    });
    setDetailItem(null);
    setIsFormOpen(true);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImageFile(file, 500, 500, 0.4);
      setForm((prev) => ({ ...prev, image: compressed }));
    } catch {
      alert('Không thể xử lý ảnh. Vui lòng chọn ảnh khác.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Vui lòng nhập Tên model xe.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const cleanedCode = (form.code.trim() || form.name.trim().toUpperCase().replace(/\s+/g, '-'));

    if (editingId) {
      const next = products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              ...form,
              name: form.name.trim(),
              code: cleanedCode,
              updatedAt: today
            }
          : p
      );
      persistProducts(next);
    } else {
      const newItem: ProductSpecItem = {
        id: `sp-${Date.now()}`,
        ...form,
        name: form.name.trim(),
        code: cleanedCode,
        updatedAt: today
      };
      persistProducts([newItem, ...products]);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (item: ProductSpecItem) => {
    if (!window.confirm(`Xóa model "${item.name}" khỏi danh mục sản phẩm?`)) return;
    persistProducts(products.filter((p) => p.id !== item.id));
    if (detailItem?.id === item.id) setDetailItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Tra Cứu Thông Tin Sản Phẩm DKBike
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Xem thông số kỹ thuật, ảnh model xe và lưu ý kiểm tra QLCL ({products.length} model).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên xe, mã, động cơ, pin..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 w-60 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm sản phẩm</span>
            </button>
          </div>
        </div>

        {/* Chip lọc phân loại */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          {(['Tất cả', ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                catFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lưới thẻ sản phẩm */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          Không tìm thấy sản phẩm nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
            >
              {/* Khung ảnh model xe */}
              <div
                onClick={() => setDetailItem(item)}
                className="relative h-44 bg-slate-100 border-b border-slate-200 flex items-center justify-center cursor-pointer group overflow-hidden"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-200"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <Bike className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-[11px] font-medium">Chưa có ảnh model</span>
                  </div>
                )}

                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 text-[10px] font-extrabold text-slate-700 shadow-2xs">
                  {item.category}
                </span>
              </div>

              {/* Thông tin tóm tắt */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="text-[11px] font-mono font-bold text-indigo-600">{item.code}</div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{item.name}</h3>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-xs">
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 block">Động cơ</span>
                      <span className="font-bold text-slate-800">{item.motor || '—'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 block">Ắc quy / Pin</span>
                      <span className="font-bold text-slate-800">{item.battery || '—'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 block">Phanh</span>
                      <span className="font-bold text-slate-800 line-clamp-1">{item.brake || '—'}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 block">Lốp xe</span>
                      <span className="font-bold text-slate-800 line-clamp-1">{item.tire || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Thanh thao tác */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Chỉnh sửa thông tin & ảnh"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Xóa sản phẩm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Xem chi tiết */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <span className="text-[11px] font-mono font-bold text-indigo-600">{detailItem.code}</span>
                <h3 className="text-base font-extrabold text-slate-900">{detailItem.name}</h3>
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
              <div className="h-56 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {detailItem.image ? (
                  <img src={detailItem.image} alt={detailItem.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <Bike className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs">Chưa có ảnh model xe</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  ['Phân loại', detailItem.category],
                  ['Động cơ', detailItem.motor],
                  ['Ắc quy / Pin', detailItem.battery],
                  ['Tốc độ tối đa', detailItem.speed],
                  ['Hệ thống phanh', detailItem.brake],
                  ['Lốp xe', detailItem.tire],
                  ['Kích thước (D×R×C)', detailItem.dimensions],
                  ['Khối lượng', detailItem.weight]
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <div className="text-[11px] text-slate-500 font-medium">{label}</div>
                    <div className="font-bold text-slate-900 mt-0.5">{val || '—'}</div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                <div className="font-extrabold text-amber-900 mb-1">Lưu ý kiểm tra QLCL / Ghi chú kỹ thuật</div>
                <div className="text-amber-900 whitespace-pre-line">{detailItem.notes || 'Chưa có ghi chú.'}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => openEditModal(detailItem)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Chỉnh sửa / Đổi ảnh</span>
              </button>
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

      {/* Modal Thêm / Sửa Sản phẩm */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Chỉnh sửa thông tin sản phẩm' : 'Thêm sản phẩm / model xe mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Ảnh model xe */}
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-32 h-24 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {form.image ? (
                    <img src={form.image} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Bike className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <div className="font-bold text-slate-800">Ảnh model xe</div>
                  <p className="text-[11px] text-slate-500">
                    Ảnh sẽ được nén tự động dưới 30KB để đồng bộ mượt mà.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImagePick}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={compressing}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{compressing ? 'Đang nén ảnh...' : form.image ? 'Đổi ảnh' : 'Chọn ảnh'}</span>
                    </button>
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, image: undefined }))}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên model xe *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="VD: DK Roma SX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã SP / Model</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    placeholder="VD: DK-ROMA-SX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as ProductCategory }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thông số kỹ thuật */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Động cơ</label>
                  <input
                    type="text"
                    value={form.motor}
                    onChange={(e) => setForm((p) => ({ ...p, motor: e.target.value }))}
                    placeholder="VD: 1000W"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ắc quy / Pin</label>
                  <input
                    type="text"
                    value={form.battery}
                    onChange={(e) => setForm((p) => ({ ...p, battery: e.target.value }))}
                    placeholder="VD: 60V - 20Ah"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tốc độ tối đa</label>
                  <input
                    type="text"
                    value={form.speed}
                    onChange={(e) => setForm((p) => ({ ...p, speed: e.target.value }))}
                    placeholder="VD: 45 - 50 km/h"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hệ thống phanh</label>
                  <input
                    type="text"
                    value={form.brake}
                    onChange={(e) => setForm((p) => ({ ...p, brake: e.target.value }))}
                    placeholder="VD: Đĩa trước / Tang trống sau"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lốp xe</label>
                  <input
                    type="text"
                    value={form.tire}
                    onChange={(e) => setForm((p) => ({ ...p, tire: e.target.value }))}
                    placeholder="VD: 90/90-10 không săm"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kích thước (D×R×C)</label>
                  <input
                    type="text"
                    value={form.dimensions}
                    onChange={(e) => setForm((p) => ({ ...p, dimensions: e.target.value }))}
                    placeholder="VD: 1750 x 690 x 1100 mm"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khối lượng</label>
                  <input
                    type="text"
                    value={form.weight}
                    onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
                    placeholder="VD: 90 kg"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lưu ý kiểm tra QLCL / Ghi chú kỹ thuật</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Các điểm dễ lỗi, thông số cần kiểm tra kỹ khi đánh giá..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu sản phẩm</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
