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
  supplierId?: string;        // Mã Nhà cung cấp đồng bộ 1:1 với dk_suppliers (VD: NCC00174)
  supplierName?: string;      // Tên Nhà cung cấp chuẩn hóa từ dk_suppliers
  stockQty?: number;          // Số lượng tồn kho
  purchasePrice?: number;     // Giá mua (chỉ hiển thị khi đăng nhập Google được cấp quyền)
  sellingPrice?: number;      // Giá bán (hiển thị cả ở chế độ mật khẩu tra cứu)
  keywords?: string;          // Từ khóa tìm kiếm (Ecount)
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
  isDiscontinued?: boolean;   // Đánh dấu xe đã ngừng sản xuất (ẩn mặc định khỏi danh sách chính)
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
  rawPartCode?: string;
  rawPartName?: string;
  detectedColor?: string;
  isNormalizedFromColor?: boolean;
  stockQty?: number;
  ecountStatus?: string;
  supplierName?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  keywords?: string;
}
