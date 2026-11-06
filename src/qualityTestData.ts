import { SupplierProductionAudit } from './types';

// Dòng linh kiện chi tiết trong 1 phiếu nhập kho Ecount (PNK)
export interface IQCLineItem {
  lineNo: number;
  partCode: string;        // Mã mặt hàng Ecount
  partName: string;        // Tên mặt hàng
  spec?: string;           // Thông số
  unit?: string;           // Đơn vị
  qty: number;             // Số lượng nhập
  aqlGroup?: string;       // Nhóm AQL (cùng tên khác màu gộp chung)
  sampleQty: number;       // Số mẫu kiểm phân bổ cho dòng
  failedQty: number;       // Số lỗi phát hiện
  defectType?: string;     // Loại lỗi
  defectDetail?: string;   // Mô tả lỗi
  result: 'Đạt' | 'Lỗi';
  imageUrls?: string[];    // Ảnh minh chứng (đã nén)
}

export interface IQCRecord {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  content: string;
  totalQty: number;
  checkedQty: number;
  checkedBy: string;
  failedQty: number;
  defectRate: number;
  itemSummary: string;
  result: 'Đạt' | 'Lỗi';
  defectDetail?: string;
  imageUrl?: string;
  imageUrls?: string[];
  updatedAt?: string;
  ecountVoucherNo?: string;  // Số phiếu Ecount (VD: PNK 11005)
  items?: IQCLineItem[];     // Chi tiết từng dòng linh kiện (optional - phiếu cũ không có)
}

export interface PQCRecord {
  id: string;
  lsx: string;
  model: string;
  date: string;
  qty: number;
  checkedBy: string;
  findings: string;
  status: 'Đang cải tiến' | 'Đã cải tiến' | 'Đạt hoàn toàn';
  imageUrl?: string;
  imageUrls?: string[];
  treatment?: string;
  updatedAt?: string;
}

export interface OQCRecord {
  id: string;
  partCode: string;
  serialNo: string;
  chassisNo?: string;
  engineNo?: string;
  model: string;
  color: string;
  status: 'Đạt' | 'Lỗi' | 'Chưa kiểm tra';
  passFlag?: number;
  defectDetail: string;
  failedCount: number;
  rootCause: string;
  defectCauseDetail?: string;
  lsx: string;
  checkTime: string;
  date: string;
  month: number;
  year: number;
  totalLsr?: number;
  totalLlr: number;
  checkedBy?: string;
  imageUrl?: string;
  evaluation?: string;
  treatment?: string;
  oldColor?: string;
  oldModel?: string;
  colorChangeDate?: string;
  isColorChanged?: boolean;
  isStatusChanged?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

export interface OqcColorChangeRecord {
  id: string;
  serialNo: string;
  model: string;
  oldColor: string;
  newColor: string;
  date: string; // dd/mm/yyyy
  flag?: string | boolean;
  createdAt?: string;
  note?: string;
  oldModel?: string;
  newModel?: string;
  changeType?: 'color' | 'status' | 'both';
}

export * from './oqcPartCodesData';

export const INITIAL_IQC_DATA: IQCRecord[] = [];
export const INITIAL_PQC_DATA: PQCRecord[] = [];
export const INITIAL_OQC_DATA: OQCRecord[] = [];

export const INITIAL_SUPPLIER_AUDITS: SupplierProductionAudit[] = [];

