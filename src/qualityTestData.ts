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
}

export const INITIAL_IQC_DATA: IQCRecord[] = [];
export const INITIAL_PQC_DATA: PQCRecord[] = [];
export const INITIAL_OQC_DATA: OQCRecord[] = [
  {
    id: "OQC-1001",
    partCode: "MOTO-DK-01",
    serialNo: "DKB-2026-9901",
    model: "DK Roma SX V2",
    color: "Xanh ngọc",
    status: "Đạt",
    defectDetail: "",
    failedCount: 0,
    rootCause: "",
    lsx: "LSX-2026-06-01",
    checkTime: "08:30",
    date: "2026-06-02",
    month: 6,
    year: 2026,
    totalLlr: 0,
    checkedBy: "Hà Khắc Việt"
  },
  {
    id: "OQC-1002",
    partCode: "MOTO-DK-02",
    serialNo: "DKB-2026-9902",
    model: "DK Gogo Smart",
    color: "Màu xám xi măng",
    status: "Lỗi",
    defectDetail: "Sụt áp sụt nguồn BMS khi lên dốc",
    failedCount: 1,
    rootCause: "Cơ cấu chân giắc tiếp xúc BMS pin lỏng lẻo gây phóng hồ quang ngắt điện",
    lsx: "LSX-2026-06-01",
    checkTime: "09:15",
    date: "2026-06-03",
    month: 6,
    year: 2026,
    totalLlr: 1,
    checkedBy: "Liễu Tùng Lâm"
  },
  {
    id: "OQC-1003",
    partCode: "MOTO-DK-01",
    serialNo: "DKB-2026-9903",
    model: "DK Roma SX V2",
    color: "Trắng ánh kim",
    status: "Lỗi",
    defectDetail: "Sụt áp sụt nguồn BMS khi lên dốc",
    failedCount: 1,
    rootCause: "Co ngót và lệch chân hàn bảo vệ rơ-le BMS nhiệt phòng lò hơi sấy sơn quá 65 độ",
    lsx: "LSX-2026-06-01",
    checkTime: "10:00",
    date: "2026-06-05",
    month: 6,
    year: 2026,
    totalLlr: 1,
    checkedBy: "Hà Khắc Việt"
  },
  {
    id: "OQC-1004",
    partCode: "MOTO-DK-03",
    serialNo: "DKB-2026-9904",
    model: "DK V2",
    color: "Đỏ tươi",
    status: "Lỗi",
    defectDetail: "Lệch rãnh dán tem bóng",
    failedCount: 1,
    rootCause: "Công nhân gá rập tem lệch 2mm ở phần yếm sườn trước",
    lsx: "LSX-2026-06-02",
    checkTime: "11:30",
    date: "2026-06-08",
    month: 6,
    year: 2026,
    totalLlr: 1,
    checkedBy: "Lành Xuân Hải"
  },
  {
    id: "OQC-1005",
    partCode: "MOTO-DK-03",
    serialNo: "DKB-2026-9905",
    model: "DK V2",
    color: "Huyền bí Đen",
    status: "Đạt",
    defectDetail: "",
    failedCount: 0,
    rootCause: "",
    lsx: "LSX-2026-06-02",
    checkTime: "14:00",
    date: "2026-06-09",
    month: 6,
    year: 2026,
    totalLlr: 0,
    checkedBy: "Liễu Tùng Lâm"
  },
  {
    id: "OQC-1006",
    partCode: "MOTO-DK-02",
    serialNo: "DKB-2026-9906",
    model: "DK Gogo Smart",
    color: "Vàng cát",
    status: "Lỗi",
    defectDetail: "Lệch rãnh dán tem bóng",
    failedCount: 1,
    rootCause: "Rập định vị cơ học dán tem sườn vè sau bị lệch rơ rọ khuy cài",
    lsx: "LSX-2026-06-02",
    checkTime: "15:10",
    date: "2026-06-10",
    month: 6,
    year: 2026,
    totalLlr: 1,
    checkedBy: "Hà Khắc Việt"
  },
  {
    id: "OQC-1007",
    partCode: "MOTO-DK-01",
    serialNo: "DKB-2026-9907",
    model: "DK Roma SX V2",
    color: "Đen mờ",
    status: "Lỗi",
    defectDetail: "Phanh phanh trước bó cứng sườn",
    failedCount: 1,
    rootCause: "Dầu phanh dồn căng, chưa xả khí bọt dầu phanh đĩa",
    lsx: "LSX-2026-06-03",
    checkTime: "16:45",
    date: "2026-06-10",
    month: 6,
    year: 2026,
    totalLlr: 1,
    checkedBy: "Lành Xuân Hải"
  },
  {
    id: "OQC-1008",
    partCode: "MOTO-DK-03",
    serialNo: "DKB-2026-9908",
    model: "DK V2",
    color: "Xanh dương",
    status: "Đạt",
    defectDetail: "",
    failedCount: 0,
    rootCause: "",
    lsx: "LSX-2026-06-03",
    checkTime: "09:00",
    date: "2026-06-11",
    month: 6,
    year: 2026,
    totalLlr: 0,
    checkedBy: "Liễu Tùng Lâm"
  },
  {
    id: "OQC-1009",
    partCode: "MOTO-DK-01",
    serialNo: "DKB-2026-9909",
    model: "DK Roma SX V2",
    color: "Đỏ tươi",
    status: "Lỗi",
    defectDetail: "Sụt áp sụt nguồn BMS khi lên dốc",
    failedCount: 1,
    rootCause: "Rơ le tản nhiệt của bo mạch BMS quá yếu gây sụt ngắt bảo vệ",
    lsx: "LSX-2026-06-03",
    checkTime: "10:30",
    date: "2026-06-11",
    month: 6,
    year: 2026,
    totalLlr: 1,
    checkedBy: "Hà Khắc Việt"
  },
  {
    id: "OQC-1010",
    partCode: "MOTO-DK-02",
    serialNo: "DKB-2026-9910",
    model: "DK Gogo Smart",
    color: "Trắng sữa",
    status: "Đạt",
    defectDetail: "",
    failedCount: 0,
    rootCause: "",
    lsx: "LSX-2026-06-03",
    checkTime: "11:15",
    date: "2026-06-12",
    month: 6,
    year: 2026,
    totalLlr: 0,
    checkedBy: "Liễu Tùng Lâm"
  }
];

export const INITIAL_SUPPLIER_AUDITS: SupplierProductionAudit[] = [];
