import React, { useState } from 'react';
import { ClipboardPaste, Plus, Trash2, Zap, ImagePlus, X, Layers } from 'lucide-react';
import { IQCLineItem } from '../qualityTestData';
import { compressImageFile } from '../imageCompressor';
import {
  parseEcountVoucherDetail,
  recalcIqcItemsAql,
  getIqcAqlGroups,
  summarizeIqcItems,
  getAqlGroupName,
  IQC_DEFECT_TYPES,
  IQC_MAX_IMAGES_PER_LINE,
  IQC_MAX_ITEM_IMAGES_PER_RECORD
} from '../utils/iqcLineItems';

interface IqcLineItemsEditorProps {
  items: IQCLineItem[];
  onChange: (items: IQCLineItem[]) => void;
  onZoomImage?: (url: string) => void;
}

/**
 * Bảng chi tiết dòng linh kiện của phiếu IQC (dùng chung cho Form Thêm mới & Modal Sửa).
 * - Dán bảng mặt hàng từ phiếu Ecount -> tự tách dòng
 * - Tự tính cỡ mẫu AQL theo nhóm cùng tên khác màu
 * - Mặc định mọi dòng "Đạt", chỉ cần nhập dòng lỗi
 */
const IqcLineItemsEditor: React.FC<IqcLineItemsEditorProps> = ({ items, onChange, onZoomImage }) => {
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(items.length === 0);

  const totalImages = items.reduce((s, it) => s + (it.imageUrls?.length || 0), 0);
  const sum = summarizeIqcItems(items);
  const groups = getIqcAqlGroups(items);

  const applyPaste = (mode: 'replace' | 'append') => {
    const parsed = parseEcountVoucherDetail(pasteText);
    if (parsed.length === 0) {
      alert('Không nhận diện được dòng linh kiện nào. Anh vui lòng copy các dòng theo thứ tự: STT | Mã hàng | Tên mặt hàng | Đơn vị | Số lượng | Gia mua | Thành tiền | Ghi chú | Q. lý rồi dán lại.');
      return;
    }
    const merged = mode === 'append' ? [...items, ...parsed] : parsed;
    onChange(recalcIqcItemsAql(merged));
    setPasteText('');
    setShowPaste(false);
  };

  const updateLine = (idx: number, patch: Partial<IQCLineItem>, recalc = false) => {
    const next = items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      merged.result = (Number(merged.failedQty) || 0) > 0 ? 'Lỗi' : 'Đạt';
      return merged;
    });
    onChange(recalc ? recalcIqcItemsAql(next) : next);
  };

  const removeLine = (idx: number) => {
    onChange(recalcIqcItemsAql(items.filter((_, i) => i !== idx)));
  };

  const addLine = () => {
    onChange([
      ...items,
      {
        lineNo: items.length + 1,
        partCode: '',
        partName: '',
        spec: '',
        unit: 'Cái',
        qty: 0,
        aqlGroup: '',
        sampleQty: 0,
        failedQty: 0,
        defectType: '',
        defectDetail: '',
        result: 'Đạt',
        imageUrls: []
      }
    ]);
  };

  const handleLineImage = async (idx: number, file?: File) => {
    if (!file) return;
    if (totalImages >= IQC_MAX_ITEM_IMAGES_PER_RECORD) {
      alert(`Mỗi phiếu chỉ lưu tối đa ${IQC_MAX_ITEM_IMAGES_PER_RECORD} ảnh chi tiết để tránh vượt dung lượng đồng bộ Cloud.`);
      return;
    }
    try {
      const compressed = await compressImageFile(file, 500, 500, 0.4);
      if (compressed) {
        const current = items[idx].imageUrls || [];
        updateLine(idx, { imageUrls: [...current, compressed].slice(0, IQC_MAX_IMAGES_PER_LINE) });
      }
    } catch (err) {
      console.error('Lỗi nén ảnh dòng linh kiện IQC:', err);
      alert('Không nén được ảnh, vui lòng thử ảnh khác.');
    }
  };

  const inputCls = 'w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:border-indigo-500';

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50/30 p-2.5 space-y-2" id="iqc_line_items_editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-indigo-900 tracking-wide">
          <Layers className="w-3.5 h-3.5 text-indigo-600" /> Chi tiết linh kiện trong phiếu ({items.length} dòng)
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setShowPaste(v => !v)} className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer">
            <ClipboardPaste className="w-3 h-3" /> Dán chi tiết từ Ecount
          </button>
          <button type="button" onClick={addLine} className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Thêm dòng
          </button>
          {items.length > 0 && (
            <>
              <button type="button" onClick={() => onChange(recalcIqcItemsAql(items))} className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 flex items-center gap-1 cursor-pointer" title="Tính lại cỡ mẫu AQL theo nhóm cùng tên khác màu">
                <Zap className="w-3 h-3" /> Tính lại AQL
              </button>
              <button
                type="button"
                onClick={() => { if (window.confirm('Xóa toàn bộ chi tiết linh kiện của phiếu này?')) onChange([]); }}
                className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Xóa hết
              </button>
            </>
          )}
        </div>
      </div>

      {showPaste && (
        <div className="bg-white border border-dashed border-indigo-300 rounded-lg p-2 space-y-1.5">
          <div className="text-[10px] font-bold text-indigo-800 bg-indigo-50/70 px-2 py-1 rounded border border-indigo-100">
            Thứ tự cột chuẩn khi Copy/Paste: <span className="font-mono text-indigo-950">STT &rarr; Mã hàng &rarr; Tên mặt hàng &rarr; Đơn vị &rarr; Số lượng &rarr; Gia mua &rarr; Thành tiền &rarr; Ghi chú &rarr; Q. lý</span> <span className="text-slate-500 font-normal">(Tự động bỏ mã L777777777 Chi phí khác)</span>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={'Bôi đen các dòng chi tiết linh kiện (có hoặc không có dòng tiêu đề) → Ctrl+C → dán vào đây (Ctrl+V).\nThứ tự cột: STT\tMã hàng\tTên mặt hàng\tĐơn vị\tSố lượng\tGia mua\tThành tiền\tGhi chú\tQ. lý'}
            className="w-full h-24 text-[11px] font-mono border border-slate-200 rounded p-1.5 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-1.5">
            {items.length > 0 && (
              <button type="button" onClick={() => applyPaste('append')} disabled={!pasteText.trim()} className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 cursor-pointer">
                Thêm nối tiếp
              </button>
            )}
            <button type="button" onClick={() => applyPaste('replace')} disabled={!pasteText.trim()} className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer">
              {items.length > 0 ? 'Thay thế toàn bộ' : 'Phân tích & nạp dòng'}
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
            <table className="w-full text-[11px] min-w-[900px]">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                <tr>
                  <th className="p-1.5 w-7">#</th>
                  <th className="p-1.5 text-left w-28">Mã hàng</th>
                  <th className="p-1.5 text-left">Tên mặt hàng</th>
                  <th className="p-1.5 text-center w-14">Đơn vị</th>
                  <th className="p-1.5 text-left w-36">Nhóm AQL</th>
                  <th className="p-1.5 w-16">Số lượng</th>
                  <th className="p-1.5 w-14">Mẫu</th>
                  <th className="p-1.5 w-14 text-red-600">Lỗi</th>
                  <th className="p-1.5 text-left w-48">Loại lỗi / Mô tả</th>
                  <th className="p-1.5 w-20">Ảnh</th>
                  <th className="p-1.5 w-12">KQ</th>
                  <th className="p-1.5 w-7"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, idx) => {
                  const isFail = (Number(it.failedQty) || 0) > 0;
                  return (
                    <tr key={idx} className={isFail ? 'bg-red-50/60' : ''}>
                      <td className="p-1 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-1"><input className={`${inputCls} font-mono`} value={it.partCode} onChange={e => updateLine(idx, { partCode: e.target.value })} /></td>
                      <td className="p-1">
                        <input
                          className={inputCls}
                          value={it.partName}
                          onChange={e => {
                            const name = e.target.value;
                            const autoGroup = !it.aqlGroup || it.aqlGroup === getAqlGroupName(it.partName);
                            updateLine(idx, autoGroup ? { partName: name, aqlGroup: getAqlGroupName(name) } : { partName: name }, autoGroup);
                          }}
                        />
                        {it.spec && <span className="text-[9px] text-slate-400 italic">Ghi chú: {it.spec}</span>}
                      </td>
                      <td className="p-1"><input className={`${inputCls} text-center`} value={it.unit || ''} onChange={e => updateLine(idx, { unit: e.target.value })} placeholder="ĐVT" /></td>
                      <td className="p-1"><input className={`${inputCls} text-indigo-800`} value={it.aqlGroup || ''} onChange={e => updateLine(idx, { aqlGroup: e.target.value }, true)} title="Các dòng cùng nhóm sẽ gộp tổng SL để tính cỡ mẫu AQL" /></td>
                      <td className="p-1"><input type="number" min={0} className={`${inputCls} text-right font-mono font-bold`} value={it.qty} onChange={e => updateLine(idx, { qty: Number(e.target.value) }, true)} /></td>
                      <td className="p-1"><input type="number" min={0} className={`${inputCls} text-right font-mono text-indigo-800 bg-indigo-50/50`} value={it.sampleQty} onChange={e => updateLine(idx, { sampleQty: Number(e.target.value) })} /></td>
                      <td className="p-1"><input type="number" min={0} className={`${inputCls} text-right font-mono font-bold text-red-600`} value={it.failedQty} onChange={e => updateLine(idx, { failedQty: Number(e.target.value) })} /></td>
                      <td className="p-1 space-y-0.5">
                        {isFail ? (
                          <>
                            <input list="iqc_defect_type_list" className={inputCls} placeholder="Loại lỗi..." value={it.defectType || ''} onChange={e => updateLine(idx, { defectType: e.target.value })} />
                            <input className={inputCls} placeholder="Mô tả lỗi..." value={it.defectDetail || ''} onChange={e => updateLine(idx, { defectDetail: e.target.value })} />
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">— nhập SL lỗi để mô tả —</span>
                        )}
                      </td>
                      <td className="p-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(it.imageUrls || []).map((url, imgIdx) => (
                            <div key={imgIdx} className="relative w-7 h-7 rounded border border-slate-200 overflow-hidden">
                              <img src={url} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => onZoomImage?.(url)} />
                              <button type="button" onClick={() => updateLine(idx, { imageUrls: (it.imageUrls || []).filter((_, k) => k !== imgIdx) })} className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center cursor-pointer">
                                <X className="w-2 h-2" />
                              </button>
                            </div>
                          ))}
                          {isFail && (it.imageUrls?.length || 0) < IQC_MAX_IMAGES_PER_LINE && (
                            <label className="w-7 h-7 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 cursor-pointer">
                              <ImagePlus className="w-3.5 h-3.5" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => { handleLineImage(idx, e.target.files?.[0]); e.target.value = ''; }} />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="p-1 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${isFail ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{isFail ? 'Lỗi' : 'Đạt'}</span>
                      </td>
                      <td className="p-1 text-center">
                        <button type="button" onClick={() => removeLine(idx)} className="text-rose-500 hover:text-rose-700 cursor-pointer" title="Xóa dòng">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-[11px]">
                <tr>
                  <td colSpan={5} className="p-1.5 text-right text-slate-500 uppercase text-[10px]">Tổng phiếu</td>
                  <td className="p-1.5 text-right font-mono">{sum.totalQty.toLocaleString('vi-VN')}</td>
                  <td className="p-1.5 text-right font-mono text-indigo-700">{sum.checkedQty.toLocaleString('vi-VN')}</td>
                  <td className="p-1.5 text-right font-mono text-red-600">{sum.failedQty.toLocaleString('vi-VN')}</td>
                  <td colSpan={2} className="p-1.5 text-slate-600">{sum.failedLines}/{sum.lineCount} dòng lỗi · {totalImages} ảnh</td>
                  <td colSpan={2} className="p-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${sum.result === 'Lỗi' ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>{sum.result}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
            <datalist id="iqc_defect_type_list">
              {IQC_DEFECT_TYPES.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {groups.map(g => (
              <span key={g.group} className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${g.accepted ? 'bg-white border-slate-200 text-slate-600' : 'bg-red-50 border-red-200 text-red-600'}`} title="Cỡ mẫu AQL 1.5 - Mức II tính theo tổng SL của nhóm">
                {g.group}: {g.qty} sp · Mã {g.codeLetter} · mẫu {g.sampleSize} · Ac {g.ac}/Re {g.re}{g.failedQty > 0 ? ` · lỗi ${g.failedQty}` : ''}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IqcLineItemsEditor;

