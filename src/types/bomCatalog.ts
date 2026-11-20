/**
 * Kiểu dữ liệu cho phân hệ Danh mục Linh kiện & BOM theo Model (dkqms.cloud/lk)
 */

export type PartQualityStatus = 'Đang dùng' | 'Cảnh báo lỗi' | 'Đang ECO' | 'Ngừng dùng';

export type PartImageMode = 'single' | 'multi';

export interface BomPartImageItem {
  id: string;
  url: string;
  path?: string;
  caption?: string;
  updatedAt: string;
}

export interface BomPartMasterItem {
  id: string;                 // Document ID chuẩn hóa từ partCode
  partCode: string;           // Mã mặt hàng Ecount (VD: LEMROM010214)
  partName: string;           // Tên mặt hàng
  specGroup: string;          // Cột "Thông số" trên Ecount (VD: Nhựa chung, PT điện, PT khung, PT ốc)
  unit: string;               // Đơn vị (Cái, Bộ, Đôi...)
  techSpecs?: string;         // Thông số kỹ thuật chi tiết
  supplierName?: string;      // Nhà cung cấp
  status: PartQualityStatus;  // Trạng thái chất lượng
  imageMode: PartImageMode;   // 'single' cho nhựa/nhựa màu (1 ảnh), 'multi' cho linh kiện cần nhiều ảnh
  images: BomPartImageItem[]; // Danh sách URL ảnh từ Firebase Storage
  note?: string;              // Ghi chú kỹ thuật
  updatedAt: string;
  updatedBy?: string;
}

export interface BomModelLineItem {
  lineNo: number;
  partCode: string;           // Tham chiếu tới BomPartMasterItem.partCode
  qty: number;                // Định mức số lượng / 1 xe
  unit?: string;              // Đơn vị (ưu tiên dùng từ dòng BOM hoặc Part Master)
  note?: string;              // Ghi chú riêng trên model này
}

export interface BomModelRecord {
  id: string;                 // Document ID chuẩn hóa từ modelName
  modelName: string;          // Tên Model khớp Bảng mã xe (VD: DK S1, DK ROMA SX V2)
  imageUrl?: string;          // 1 ảnh đại diện của Model (URL Firebase Storage)
  imagePath?: string;         // Storage path để xóa/thay thế gọn
  items: BomModelLineItem[];  // Danh sách ~100 linh kiện theo định mức BOM
  updatedAt: string;
  updatedBy?: string;
}

export interface OqcModelColorVariant {
  partCode: string;
  color: string;
  nameWithColor: string;
}

export interface OqcModelSummary {
  modelKey: string;
  modelName: string;
  colors: OqcModelColorVariant[];
}

export interface EcountParsedBomRow {
  lineNo: number;
  partCode: string;
  partName: string;
  specGroup: string;
  unit: string;
  qty: number;
  note: string;
  rawRowNumber: number;
}
