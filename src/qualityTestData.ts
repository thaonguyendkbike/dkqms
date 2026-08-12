import { SupplierProductionAudit } from './types';

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
}

export interface OQCRecord {
  id: string;
  partCode: string;
  serialNo: string;
  model: string;
  color: string;
  status: 'Đạt' | 'Lỗi' | 'Chưa kiểm tra';
  defectDetail: string;
  failedCount: number;
  rootCause: string;
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
  colorChangeDate?: string;
  isColorChanged?: boolean;
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
}

export const INITIAL_IQC_DATA: IQCRecord[] = [];
export const INITIAL_PQC_DATA: PQCRecord[] = [];
export const INITIAL_OQC_DATA: OQCRecord[] = [];

export const INITIAL_SUPPLIER_AUDITS: SupplierProductionAudit[] = [];
