/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, FormEvent, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  CalendarRange, 
  Sparkles, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Check, 
  User, 
  Wrench, 
  Clock, 
  ChevronRight, 
  FileCheck, 
  AlertTriangle,
  Info,
  Layers,
  ArrowRightLeft,
  Settings,
  Truck,
  Cpu,
  Target,
  Edit,
  Workflow,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import XLSXStyle from 'xlsx-js-style';
import { QualityStaff, DKBikeModel, Supplier, CAPA } from '../types';
import { safeStorage as localStorage } from '../safeStorage';
import { OQCRecord } from '../qualityTestData';
import { DAILY_LOG_DATA, DailyLogRecord } from '../dailyLogsData';

// Danh sách nhân viên lấy làm chuẩn từ hệ thống DKBike
const DEFAULT_STAFF: QualityStaff[] = [
  { id: 'STF-01', name: 'Nguyễn Xuân Thao', role: 'Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (QA/QC Head)', email: 'thaonguyendkbike@gmail.com' },
  { id: 'STF-02', name: 'Hà Khắc Việt', role: 'Phụ trách kiểm tra đầu ra (OQC Section Lead)', email: 'khacviet.ha@dkbike.vn' },
  { id: 'STF-03', name: 'Hoàng Văn Phấn', role: 'Tổ trưởng Tổ kiểm soát chất lượng lắp ráp (PQC Line Supervisor)', email: 'vanphan.hoang@dkbike.vn' },
  { id: 'STF-04', name: 'Đoàn Anh Hùng', role: 'Chuyên viên kiểm tra linh kiện đầu vào IQC', email: 'anhhung.doan@dkbike.vn' },
  { id: 'STF-05', name: 'Liễu Tùng Lâm', role: 'Sát hạch viên, nhân viên kiểm thử OQC', email: 'tunglam.lieu@dkbike.vn' },
  { id: 'STF-06', name: 'Lành Xuân Hải', role: 'Sát hạch viên, nhân viên kiểm thử OQC', email: 'xuanhai.lanh@dkbike.vn' },
  { id: 'STF-07', name: 'Nguyễn Văn Diệm', role: 'Kỹ sư giám sát quy trình, kiểm soát SQC/IQC Specialist', email: 'vandiem.nguyen@dkbike.vn' }
];

// Các model sản xuất thực tế tại nhà máy DKBike
const DEFAULT_MODELS = [
  { id: 'MDL-01', name: 'DK D2', status: 'Đang sản xuất' },
  { id: 'MDL-02', name: 'DK EZ3', status: 'Đang sản xuất' },
  { id: 'MDL-03', name: 'DK Gogo Smart', status: 'Đang sản xuất' },
  { id: 'MDL-04', name: 'DK Nova', status: 'Đang sản xuất' },
  { id: 'MDL-05', name: 'DK Roma SX V2', status: 'Đang sản xuất' },
  { id: 'MDL-06', name: 'DK S3', status: 'Đang sản xuất' },
  { id: 'MDL-07', name: 'DK V1', status: 'Đang sản xuất' },
  { id: 'MDL-08', name: 'DK V2', status: 'Đang sản xuất' }
];

// Danh sách nhà cung cấp linh kiện lớn liên kết trong hệ thống
const DEFAULT_SUPPLIERS = [
  { id: 'NCC-01', name: 'Nhà cung cấp Việt Nhật', material: 'Khung sườn, bát phuốc, chén bi' },
  { id: 'NCC-02', name: 'Nhà cung cấp Shin-Etsu', material: 'Rắc sạc đúc, vỏ nhựa cắm chịu nhiệt' },
  { id: 'NCC-03', name: 'Phụ tùng điện MOTO-DK', material: 'Động cơ điện, bộ điều tốc IC' },
  { id: 'NCC-04', name: 'Nhựa đúc Á Châu', material: 'Ốp nhựa đầu, yếm quây dập bavia' },
  { id: 'NCC-05', name: 'Ắc quy Chilwee Việt Nam', material: 'Lô ắc quy khô chì-axit' },
  { id: 'NCC-06', name: 'Taizhou Tianping Vehicle industry (CTy Thiên Bình)', material: 'Vành xe, nan hoa, đùm xe' },
  { id: 'NCC-07', name: 'Cty TNHH CT PTXGM ZHUAHAI (Giang Nam)', material: 'Cụm phanh dầu, đĩa phanh' },
  { id: 'NCC-08', name: 'Cty TNHH XNK Heli Bằng Tường_VN', material: 'Đèn pha LED, rắc kết nối nhôm' },
  { id: 'NCC-09', name: 'Nhà cung cấp Lương Huy', material: 'Gá để chân, giảm sóc sau' },
  { id: 'NCC-10', name: 'Công ty TNHH LICHUANG VIỆT NAM', material: 'Khung thép định hình, giảm chấn cổ' },
  { id: 'NCC-11', name: 'Công ty CP UNITED MOTOR Việt Nam (UMV)', material: 'Động cơ điện không chổi than' },
  { id: 'NCC-12', name: 'CTCPCN Sản xuất Lucky Bike', material: 'Xích tải, nhông xích' },
  { id: 'NCC-13', name: 'Công ty Hảo Vương (GN - khung)', material: 'Khung sườn hàn cơ khí' },
  { id: 'NCC-14', name: 'CÔNG TY TNHH NCI (VIỆT NAM)', material: 'Yên xe, da bọc cao cấp' },
  { id: 'NCC-15', name: 'CÔNG TY NHU BÌNH', material: 'Bộ chắn bùn nhựa composite' },
  { id: 'NCC-16', name: 'Cty TNHH TM và DV QUỐC TẾ THANH HÀ', material: 'Vỏ lót xích, hộp phụ tùng' },
  { id: 'NCC-17', name: 'CT TNHH CÔNG THƯƠNG TINH NHUỆ HƯNG YÊN', material: 'Cảng sau xe, giá đỡ hàng' },
  { id: 'NCC-18', name: 'Công ty TNHH Công nghệ cao Hồng Nhung', material: 'Sạc điện thông minh 12V-24V' },
  { id: 'NCC-19', name: 'Cty TNHH Công nghiệp Hoa Thái (Tem)', material: 'Tem nhãn chống lóa, đề can dán phủ' },
  { id: 'NCC-20', name: 'Công ty TNHH Thương Mại Và Dịch vụ Liên Hà', material: 'Gương chiếu hậu chống nhòe' },
  { id: 'NCC-21', name: 'Công ty Cao Su KENDA Việt Nam', material: 'Lốp không săm KENDA 10 inch' },
  { id: 'NCC-22', name: 'Cty CP Toàn Lực', material: 'Bộ sườn chịu lực inox' },
  { id: 'NCC-23', name: 'Cty CP Đúc CNC Việt Nam', material: 'Mâm đúc hợp kim nhôm nguyên bản' },
  { id: 'NCC-24', name: 'Công ty TNHH Liên Doanh Thiên Hoá', material: 'Dây cáp phanh, lõi thép bọc chống nước' }
];

// Bản đồ phân công chuyên môn chất lượng theo đúng chỉ định mới năm 2026
function getSupplierSpecialists(supplierName: string): { sqc: string; iqc: string } {
  if (!supplierName) {
    return { sqc: 'Nguyễn Văn Diệm', iqc: 'Đoàn Anh Hùng' };
  }
  const nameL = supplierName.toLowerCase();
  
  if (nameL.includes('tianping') || nameL.includes('thiên bình')) {
    return { sqc: 'Thao', iqc: 'Thao, Việt, Phấn' };
  }
  if (nameL.includes('zhuahai') || nameL.includes('giang nam')) {
    return { sqc: 'Thao', iqc: 'Thao, Việt, Phấn' };
  }
  if (nameL.includes('heli') || nameL.includes('bằng tường')) {
    return { sqc: 'Thao', iqc: 'Thao, Việt, Phấn' };
  }
  if (nameL.includes('lương huy')) {
    return { sqc: 'Thao', iqc: 'Phấn, Kiêm, Nhâm' };
  }
  if (nameL.includes('lichuang')) {
    return { sqc: 'Thao', iqc: 'Kiêm, Nhâm' };
  }
  if (nameL.includes('united motor') || nameL.includes('umv')) {
    return { sqc: 'Thao', iqc: 'Thao, Việt, Phấn, Sự' };
  }
  if (nameL.includes('lucky bike') || nameL.includes('luckybike')) {
    return { sqc: 'Xuyên', iqc: 'Long' };
  }
  if (nameL.includes('hảo vương') || nameL.includes('hao vuong')) {
    return { sqc: 'Thao', iqc: 'Việt, Phấn, Sự' };
  }
  if (nameL.includes('nci')) {
    return { sqc: 'Xuyên', iqc: 'Mến' };
  }
  if (nameL.includes('nhu bình') || nameL.includes('nhu binh')) {
    return { sqc: 'Xuyên', iqc: 'Mến' };
  }
  if (nameL.includes('thanh hà') || nameL.includes('thanh ha')) {
    return { sqc: 'Xuyên', iqc: 'Mến' };
  }
  if (nameL.includes('tinh nhuệ') || nameL.includes('hưng yên') || nameL.includes('tinh nhue') || nameL.includes('hung yen')) {
    return { sqc: 'Thao', iqc: 'Việt, Phấn, Sự, Tân' };
  }
  if (nameL.includes('hồng nhung') || nameL.includes('hong nhung')) {
    return { sqc: 'Thao', iqc: 'Việt, Mến' };
  }
  if (nameL.includes('hoa thái') || nameL.includes('hoa thai') || nameL.includes('tem')) {
    return { sqc: 'Xuyên', iqc: 'Mến' };
  }
  if (nameL.includes('liên hà') || nameL.includes('lien ha')) {
    return { sqc: 'Thao', iqc: 'Lỷ' };
  }
  if (nameL.includes('kenda')) {
    return { sqc: 'Thao', iqc: 'Sự' };
  }
  if (nameL.includes('toàn lực') || nameL.includes('toan luc')) {
    return { sqc: 'Thao', iqc: 'Phấn, Lỷ' };
  }
  if (nameL.includes('đúc cnc') || nameL.includes('duc cnc')) {
    return { sqc: 'Thao', iqc: 'Phấn, Lỷ' };
  }
  if (nameL.includes('thiên hoá') || nameL.includes('thiên hóa') || nameL.includes('thien hoa')) {
    return { sqc: 'Thao', iqc: 'Lâm' };
  }
  
  // Các nhà cung cấp cũ hệ thống giữ nguyên phân công mặc định
  if (nameL.includes('việt nhật') || nameL.includes('viet nhat')) {
    return { sqc: 'Nguyễn Văn Diệm', iqc: 'Đoàn Anh Hùng' };
  }
  if (nameL.includes('shin-etsu')) {
    return { sqc: 'Nguyễn Xuân Thao', iqc: 'Nguyễn Văn Diệm' };
  }
  if (nameL.includes('moto-dk')) {
    return { sqc: 'Nguyễn Văn Diệm', iqc: 'Nguyễn Văn Diệm' };
  }
  if (nameL.includes('á châu') || nameL.includes('a chau')) {
    return { sqc: 'Đoàn Anh Hùng', iqc: 'Đoàn Anh Hùng' };
  }
  
  return { sqc: 'Đoàn Anh Hùng', iqc: 'Kiểm định viên' };
}

// Lịch sử phát hiện lỗi thị trường / OQC kỳ trước để sử dụng trong cảnh báo thông minh PQC
const HISTORICAL_OQC_DEFECTS = [
  { model: 'DK Gogo Smart', defect: 'Sụt áp, sụt nguồn BMS đột ngột khi tải dốc cao', action: 'Yêu cầu PQC siết chặt lực kẹp tiếp tiếp điểm BMS 25N và sấy hạt keo keo phẳng đạt 65°C' },
  { model: 'DK Roma SX V2', defect: 'Rơ nhẹ trục cổ phuốc xe dốc hãm phanh gấp', action: 'Chú ý PQC kiểm tra lực ép thủy lực gá cổ phuốc chén bi đạt dung sai ±0.03mm' },
  { model: 'DK V2', defect: 'Lỗi rắc cắm sạc bị nóng chảy cao su bảo vệ khi sạc 15A', action: 'Thử nghiệm cắm rút sạc 100% lô rắc sạc đầu vào tại IQC, sấy nhiệt lò vòi súc đạt đúng chuẩn' }
];

// Hàm tự động sinh các hạng mục kiểm soát PQC thiết lập riêng cho từng dòng xe máy điện
const getDefaultControlItems = (model: string) => {
  const items: Array<{ id: string; type: 'incoming' | 'process'; name: string; frequencyDesc: string; explanation: string }> = [];
  const mLower = model.toLowerCase();

  if (mLower.includes('gogo')) {
    items.push({
      id: 'PQC-IN-GOGO',
      type: 'incoming',
      name: 'Kiểm soát chất lượng bộ đấu dây & sạc dự phòng đầu cực ắc quy xuất từ kho',
      frequencyDesc: '3 lượt / ca',
      explanation: 'Xử lý kiểm định độ khít, dập khuôn giắc kết nối nguồn trước khi bốc dỡ vào dây chuyền lắp ráp.'
    });
    items.push({
      id: 'PQC-PR-GOGO',
      type: 'process',
      name: 'Kiểm tra mô-men siết kẹp BMS và hơ lò sấy keo sáp chống nứt rụng rắc nối',
      frequencyDesc: '8 lượt / ca (Tăng cao do lịch sử cảnh báo lỗi sụt áp)',
      explanation: 'Giám sát siết kẹp lực 25N và sấy bọc dán epoxy bảo đảm tiếp tiếp điểm kín dính tuyệt đối, ngăn rủi ro sụt nguồn.'
    });
    items.push({
      id: 'PQC-PR-GOGO-2',
      type: 'process',
      name: 'Kiểm nghiệm thao tác gá đặt cách điện tấm chắn sườn khoang ắc quy',
      frequencyDesc: '4 lượt / ca',
      explanation: 'Giám sát kỹ thuật lắp màng lót cách điện sườn, hạn chế tối đa nguy cơ dập sát xước vỏ pin.'
    });
  } else if (mLower.includes('roma')) {
    items.push({
      id: 'PQC-IN-ROMA',
      type: 'incoming',
      name: 'Đo kiểm quang học bavia bệ cổ phuốc chén bi sườn xe mộc từ kho xuất',
      frequencyDesc: '3 lượt / ca',
      explanation: 'Kiểm định thủ công kích cỡ bệ đỡ, độ nhẵn bóng của bát phuốc chén mộc trước khi sơn mạ/lắp ráp.'
    });
    items.push({
      id: 'PQC-PR-ROMA',
      type: 'process',
      name: 'Thử áp lực ép thủy lực gá chén bát cổ phuốc (Chỉ tiêu ±0.03mm)',
      frequencyDesc: '6 lượt / ca (Tăng cao do lịch sử cảnh báo lỗi rơ cổ phuốc)',
      explanation: 'Bật định mức đập ép thủy lực, kiểm góc lái lệch và rơ cơ học phuốc bánh xe trước dốc dập phanh hãm.'
    });
    items.push({
      id: 'PQC-PR-ROMA-2',
      type: 'process',
      name: 'Hao chỉnh lực căng lò xo & kiểm tra dung dịch giảm chấn dầu thụt trước',
      frequencyDesc: '2 lượt / ca',
      explanation: 'Ráp thử hành trình nén nhô để định giá năng lực triệt rung lắc phuốc trước hâm phanh đột ngột.'
    });
  } else if (mLower.includes('volt') || mLower.includes('v2') || mLower.includes('v1')) {
    items.push({
      id: 'PQC-IN-VOLT',
      type: 'incoming',
      name: 'Kiểm tra độ dày tiết diện lõi đồng bộ dải dây dẫn điện xe Dòng V (DK V1, DK V2) từ kho',
      frequencyDesc: '3 lượt / ca',
      explanation: 'Đảm bảo lõi cáp truyền lực đạt tiêu chuẩn lõi lớn chịu tải an toàn.'
    });
    items.push({
      id: 'PQC-IN-VOLT-2',
      type: 'incoming',
      name: 'Thử cơ lý cắm rút nguội 100% lô rắc cắm sạc chịu nhiệt 15A nhập xưởng',
      frequencyDesc: '6 lượt / ca (Tăng cao do rủi ro nóng chảy rắc sạc)',
      explanation: 'Kiểm tra độ chặt mút rắc dán nếp đồng tiếp mát sạc dự trữ trước khi đưa lên sườn xe.'
    });
    items.push({
      id: 'PQC-PR-VOLT',
      type: 'process',
      name: 'Kiểm soát lò hơ sấy co sấy ống sáp keo Epoxy đầu rắc kết nối sạc',
      frequencyDesc: '6 lượt / ca (Tăng cao do lịch sử lỗi của rắc sạc sấy không chuẩn)',
      explanation: 'Giám sát kỹ thuật hơ sấy lò sấy đúng tiêu chuẩn 65°C liên tục 12 phút để keo đúc kết kết dính kiên cố.'
    });
  } else {
    items.push({
      id: `PQC-IN-${model}`,
      type: 'incoming',
      name: `Kiểm soát linh kiện kim loại lắp ráp cơ bản của dòng xe ${model}`,
      frequencyDesc: '2 lượt / ca',
      explanation: 'Sơ sát ngoại quan bề mặt, gỉ sét cục bộ, bavia ren lỗ bắt vít trước khi chuyển tới dây chuyền.'
    });
    items.push({
      id: `PQC-PR-${model}`,
      type: 'process',
      name: 'Kiểm tra lực siết tô vít điện bắn vít gá bắt khung bệ chính',
      frequencyDesc: '3 lượt / ca (Chuẩn SOP phòng ngừa)',
      explanation: 'Dùng tua-vít cân lực rà soát thử ngẫu nhiên mẻ bắn đảm bảo mô-men siết đúng thông số SOP.'
    });
  }
  return items;
};

// Hàm động sinh các hạng mục kiểm soát PQC thiết lập dựa trên dữ liệu lỗi OQC thực tế của từng dòng xe
const getDynamicControlItems = (model: string, matchingDefects: OQCRecord[]) => {
  const items: Array<{ id: string; type: 'incoming' | 'process'; name: string; frequencyDesc: string; explanation: string }> = [];
  
  if (matchingDefects.length > 0) {
    // Sắp xếp các lỗi theo tần suất xuất hiện (failedCount) từ cao xuống thấp
    const sortedDefects = [...matchingDefects].sort((a, b) => {
      const countA = typeof a.failedCount === 'number' ? a.failedCount : 0;
      const countB = typeof b.failedCount === 'number' ? b.failedCount : 0;
      return countB - countA;
    });

    // Chỉ lấy tối đa 3 lỗi có số lượng cao nhất
    const top3Defects = sortedDefects.slice(0, 3);

    // Có lỗi OQC thực tế! Sinh hạng mục kiểm soát đặc trưng dựa trên lỗi thực tế
    top3Defects.forEach((rec, index) => {
      const defectLower = (rec.defectDetail || '').toLowerCase();
      // Phân loại lỗi thuộc về 'incoming' (linh kiện đầu vào) hay 'process' (thao tác lắp ráp) dựa trên từ khoá
      const isIncoming = defectLower.includes('linh kiện') || 
                         defectLower.includes('phụ tùng') ||
                         defectLower.includes('bms') ||
                         defectLower.includes('rắc cắm') ||
                         defectLower.includes('pin') ||
                         defectLower.includes('vỏ nhựa') ||
                         defectLower.includes('ắc quy') ||
                         defectLower.includes('đèn') ||
                         defectLower.includes('má phanh');
      
      items.push({
        id: `PQC-OQC-ERR-${rec.id || index}`,
        type: isIncoming ? 'incoming' : 'process',
        name: `Kiểm soát ngăn ngừa lỗi KCS OQC thực tế: ${rec.defectDetail}`,
        frequencyDesc: `Top ${index + 1} lỗi nhiều nhất (${rec.failedCount} lượt) - ${rec.failedCount > 1 ? Math.min(rec.failedCount * 3, 10) : 5} lượt / ca`,
        explanation: `Biện pháp phòng ngừa triệt để lỗi xuất xưởng: "${rec.defectDetail}". Nguyên nhân gốc: ${rec.rootCause || 'Được báo cáo thực tế từ xưởng kiểm định'}. ${rec.treatment ? `Phương án xử lý: ${rec.treatment}` : 'Yêu cầu kiểm tra kỹ càng trước khi xuất xưởng và tu chuẩn lắp ráp.'}`
      });
    });
  } else {
    // Không có lỗi OQC thực tế, sinh ra các hạng mục cơ bản phòng ngừa dự phòng để không bỏ trống
    items.push({
      id: `PQC-STD-IN-${model.replace(/\s+/g, '')}`,
      type: 'incoming',
      name: `Kiểm soát linh kiện kim loại & cụm mạch kho của dòng xe ${model}`,
      frequencyDesc: '2 lượt / ca',
      explanation: 'Hạng mục chuẩn phòng ngừa (Hệ thống không ghi nhận lỗi OQC lỗi cũ). Kiểm tra ngoại quan bavia kim loại mộc trước khi phân bổ vào chuyền.'
    });
    items.push({
      id: `PQC-STD-PR-${model.replace(/\s+/g, '')}`,
      type: 'process',
      name: `Rà soát lực vặn mô-men siết ren sườn của dòng xe ${model}`,
      frequencyDesc: '3 lượt / ca',
      explanation: 'Hạng mục chuẩn phòng ngừa (Hệ thống không ghi nhận lỗi OQC lỗi cũ). Rà siết lực đòn xoắn bục cơ điện theo SOP.'
    });
  }
  return items;
};

// Interface cho Tác vụ quản lý kế hoạch
interface QualityTask {
  id: string;
  section: 'backlog' | 'capa' | 'ptsp' | 'coordination' | 'eco';
  title: string;
  assignee: string;
  deadline: string;
  status: 'Pending' | 'In_Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
  modelOrSupplier?: string;
  month?: number;
  year?: number;
  week?: string;
}

export const getInitialQmsPlanningTasks = (month: number, year: number): QualityTask[] => {
  return [];
};

// Các hàm sinh dữ liệu kế hoạch mẫu thông minh khác biệt cho từng tuần / từng tháng để người dùng thấy sự thay đổi rõ rệt
function getDefaultWeeklyAssembly(year: number, month: number, week: string, masterModels: string[]) {
  return {};
}

function getDefaultMonthlyAssembly(year: number, month: number, masterModels: string[]) {
  return {};
}

function getDefaultWeeklySupply(year: number, month: number, week: string, masterSuppliers: string[]) {
  return {};
}

function getDefaultMonthlySupply(year: number, month: number, masterSuppliers: string[]) {
  return {};
}

const isStringArrayEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
};

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
  containerClassName?: string;
  focusColor?: 'indigo' | 'emerald';
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className = '',
  containerClassName = '',
  focusColor = 'indigo'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search input with value when changed from outside or initially
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!search || search === value) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [search, options, value]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to current value if they click away
        setSearch(value);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [value]);

  const activeFocusClass = focusColor === 'emerald' 
    ? 'focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500' 
    : 'focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500';

  const hoverOptionClass = focusColor === 'emerald'
    ? 'hover:bg-emerald-50 hover:text-emerald-900'
    : 'hover:bg-indigo-50 hover:text-indigo-900';

  const selectedOptionClass = focusColor === 'emerald'
    ? 'bg-emerald-500 text-white'
    : 'bg-indigo-500 text-white';

  return (
    <div ref={containerRef} className={`relative text-xs inline-block text-left ${containerClassName || 'w-[240px]'}`}>
      {/* Hidden select for compatibility with any CSS selector-based automations or tests */}
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="sr-only" 
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>

      {/* Visible Combobox UI */}
      <div className={`flex items-center bg-white border border-slate-300 rounded-lg shadow-xs transition duration-150 ${activeFocusClass} ${className}`}>
        <input
          type="text"
          className="w-full px-3 py-1.5 bg-transparent border-0 focus:outline-hidden font-bold text-slate-700"
          placeholder={placeholder}
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            // If they clear it, notify parent
            if (!e.target.value) {
              onChange('');
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1 text-slate-400 hover:text-slate-600 focus:outline-hidden"
        >
          <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto font-bold text-slate-700">
          <div className="py-1">
            <div 
              onClick={() => {
                onChange('');
                setSearch('');
                setIsOpen(false);
              }}
              className="px-3 py-2 text-slate-400 hover:bg-slate-50 cursor-pointer italic font-normal"
            >
              {placeholder}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-slate-400 text-center font-normal">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setSearch(opt);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 cursor-pointer transition ${
                    value === opt ? selectedOptionClass : `text-slate-700 ${hoverOptionClass}`
                  }`}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to parse date string and get year & month robustly
export function parseDateYearMonth(dateStr: string | undefined, defaultMonth: number, defaultYear: number) {
  if (!dateStr || typeof dateStr !== 'string') return { month: defaultMonth, year: defaultYear };
  const clean = dateStr.trim();
  const matchesYMD = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const matchesDMY = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchesYMD) {
    return { month: Number(matchesYMD[2]), year: Number(matchesYMD[1]) };
  } else if (matchesDMY) {
    return { month: Number(matchesDMY[2]), year: Number(matchesDMY[3]) };
  } else {
    const parts = clean.split(/[-/. ]+/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        return { month: Number(parts[1]) || defaultMonth, year: Number(parts[0]) || defaultYear };
      } else {
        return { month: Number(parts[1]) || defaultMonth, year: Number(parts[2]) || defaultYear };
      }
    }
  }
  return { month: defaultMonth, year: defaultYear };
}

// Helper to get Monday Date object for a given week number in a month/year according to solar calendar
export function getMondayOfWeek(year: number, month: number, weekNum: number): Date {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const dow = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  
  let mon1Day: number;
  if (dow === 1) mon1Day = 1;
  else if (dow === 2) mon1Day = 0;
  else if (dow === 3) mon1Day = -1;
  else if (dow === 4) mon1Day = -2;
  else if (dow === 5) mon1Day = 4;
  else if (dow === 6) mon1Day = 3;
  else if (dow === 0) mon1Day = 2;
  else mon1Day = 1;

  return new Date(year, month - 1, mon1Day + (weekNum - 1) * 7);
}

// Helper to get start and end date of a week in a month
export function getWeekDates(year: number, month: number, weekKey: string): string {
  const weekNum = parseInt((weekKey || 'W1').replace(/\D/g, '')) || 1;
  const monTarget = getMondayOfWeek(year, month, weekNum);
  const sunTarget = new Date(monTarget);
  sunTarget.setDate(monTarget.getDate() + 6);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startStr = `${pad(monTarget.getDate())}/${pad(monTarget.getMonth() + 1)}`;
  const endStr = `${pad(sunTarget.getDate())}/${pad(sunTarget.getMonth() + 1)}`;

  return `${startStr} - ${endStr}`;
}

// Helper to get exact date (DD/MM) for a weekday in a given week, month, year
export function getExactDateForWeekDay(year: number, month: number, weekKey: string, dayIndex: number, timeLabel?: string): string {
  const weekNum = parseInt((weekKey || 'W1').replace(/\D/g, '')) || 1;
  const monTarget = getMondayOfWeek(year, month, weekNum);

  // Determine day offset (0 = Mon, 1 = Tue, ..., 6 = Sun)
  let dayOffset = dayIndex;
  if (timeLabel) {
    const norm = timeLabel.trim().toLowerCase();
    if (norm.includes('thứ 2') || norm.includes('thứ hai') || norm === 't2') dayOffset = 0;
    else if (norm.includes('thứ 3') || norm.includes('thứ ba') || norm === 't3') dayOffset = 1;
    else if (norm.includes('thứ 4') || norm.includes('thứ tư') || norm === 't4') dayOffset = 2;
    else if (norm.includes('thứ 5') || norm.includes('thứ năm') || norm === 't5') dayOffset = 3;
    else if (norm.includes('thứ 6') || norm.includes('thứ sáu') || norm === 't6') dayOffset = 4;
    else if (norm.includes('thứ 7') || norm.includes('thứ bảy') || norm === 't7') dayOffset = 5;
    else if (norm.includes('chủ nhật') || norm.includes('cn')) dayOffset = 6;
  }

  const targetDate = new Date(monTarget);
  targetDate.setDate(monTarget.getDate() + dayOffset);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dStr = pad(targetDate.getDate());
  const mStr = pad(targetDate.getMonth() + 1);

  return `${dStr}/${mStr}`;
}

// Helper to get a sample target YYYY-MM-DD date within a week
export function getDateInWeek(year: number, month: number, weekKey: string): string {
  const weekNum = parseInt((weekKey || 'W1').replace(/\D/g, '')) || 1;
  const monTarget = getMondayOfWeek(year, month, weekNum);
  const targetDate = new Date(monTarget);
  targetDate.setDate(monTarget.getDate() + 2); // Wednesday of target week

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
}

// Helper to determine week of month (W1-W5) from a date string
export function getWeekFromDateString(dateStr: string | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return 'W1';
  const clean = dateStr.trim();
  let day = 1;
  let month = 8;
  let year = 2026;

  const matchesYMD = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  const matchesDMY = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchesYMD) {
    day = Number(matchesYMD[3]);
    month = Number(matchesYMD[2]);
    year = Number(matchesYMD[1]);
  } else if (matchesDMY) {
    day = Number(matchesDMY[1]);
    month = Number(matchesDMY[2]);
    year = Number(matchesDMY[3]);
  } else {
    const parts = clean.split(/[-/. ]+/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        day = Number(parts[2]) || 1;
        month = Number(parts[1]) || 8;
        year = Number(parts[0]) || 2026;
      } else {
        day = Number(parts[0]) || 1;
        month = Number(parts[1]) || 8;
        year = Number(parts[2]) || 2026;
      }
    }
  }

  const target = new Date(year, month - 1, day);

  for (let w = 1; w <= 5; w++) {
    const mon = getMondayOfWeek(year, month, w);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    if (w === 1 && target < mon) return 'W1';
    if (w === 5 && target > sun) return 'W5';
    if (target >= mon && target <= sun) return `W${w}`;
  }

  return 'W1';
}

export default function QualityPlanning({ 
  modelsProp, 
  suppliersProp,
  weeklyPlans,
  setWeeklyPlans,
  monthlyPlans,
  setMonthlyPlans
}: { 
  modelsProp?: any[]; 
  suppliersProp?: any[];
  weeklyPlans?: any[];
  setWeeklyPlans?: (plans: any[]) => void;
  monthlyPlans?: any[];
  setMonthlyPlans?: (plans: any[]) => void;
} = {}) {
  const currentDate = new Date();
  const defaultYear = currentDate.getFullYear();
  const defaultMonth = currentDate.getMonth() + 1;
  const defaultWeek = getWeekFromDateString(currentDate.toISOString());

  const [planningMode, setPlanningMode] = useState<'weekly' | 'monthly'>('weekly');
  const [forceRefresh, setForceRefresh] = useState(0);
  const [planStatus, setPlanStatus] = useState<'Draft' | 'Chờ phê duyệt' | 'Đã phê duyệt'>('Draft');
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedWeek, setSelectedWeek] = useState<string>(defaultWeek);
  const [fpyTarget, setFpyTarget] = useState<number>(98.5); // % chỉ tiêu sản phẩm đạt ngay từ lần đầu cho OQC
  const [oqcRecords, setOqcRecords] = useState<OQCRecord[]>(() => {
    try {
      const saved = localStorage.getItem('dk_oqc_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading oqcRecords in QualityPlanning', e);
    }
    return [];
  });

  // Master Models from 'dk_models' or modelsProp
  const [masterStaff, setMasterStaff] = useState<QualityStaff[]>(() => {
    try {
      const saved = localStorage.getItem('dk_staff');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading Master Staff in QualityPlanning', e);
    }
    return DEFAULT_STAFF;
  });

  const [masterModelNames, setMasterModelNames] = useState<string[]>(() => {
    if (modelsProp && Array.isArray(modelsProp) && modelsProp.length > 0) {
      return Array.from(new Set(modelsProp.map((m: any) => m.name || m.id).filter(Boolean)));
    }
    try {
      const saved = localStorage.getItem('dk_models');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Array.from(new Set(parsed.map((m: any) => m.name || m.id).filter(Boolean)));
        }
      }
    } catch (e) {
      console.error('Error loading Master Models in QualityPlanning', e);
    }
    // Fallback if empty to static list
    return DEFAULT_MODELS.map(m => m.name);
  });

  // Master Suppliers from 'dk_suppliers' or suppliersProp
  const [masterSupplierNames, setMasterSupplierNames] = useState<string[]>(() => {
    if (suppliersProp && Array.isArray(suppliersProp) && suppliersProp.length > 0) {
      const loadedNames = suppliersProp.map((s: any) => s.SupplierName || s.name || s.id).filter(Boolean);
      return Array.from(new Set([...loadedNames, ...DEFAULT_SUPPLIERS.map(s => s.name)]));
    }
    try {
      const saved = localStorage.getItem('dk_suppliers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loadedNames = parsed.map((s: any) => s.SupplierName || s.name || s.id).filter(Boolean);
          return Array.from(new Set([...loadedNames, ...DEFAULT_SUPPLIERS.map(s => s.name)]));
        }
      }
    } catch (e) {
      console.error('Error loading Master Suppliers in QualityPlanning', e);
    }
    // Fallback if empty to static list
    return DEFAULT_SUPPLIERS.map(s => s.name);
  });

  // Listen and sync immediately when modelsProp or suppliersProp change in parent state
  useEffect(() => {
    if (modelsProp && Array.isArray(modelsProp)) {
      const newVal = Array.from(new Set(modelsProp.map((m: any) => m.name || m.id).filter(Boolean)));
      setMasterModelNames(prev => isStringArrayEqual(prev, newVal) ? prev : newVal);
    }
  }, [modelsProp]);

  useEffect(() => {
    if (suppliersProp && Array.isArray(suppliersProp)) {
      const loadedNames = suppliersProp.map((s: any) => s.SupplierName || s.name || s.id).filter(Boolean);
      const newVal = Array.from(new Set([...loadedNames, ...DEFAULT_SUPPLIERS.map(s => s.name)]));
      setMasterSupplierNames(prev => isStringArrayEqual(prev, newVal) ? prev : newVal);
    }
  }, [suppliersProp]);

  // Tự động đồng bộ hoá dữ liệu OQC & Master từ localStorage khi có sự kiện thay đổi dữ liệu
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dk_oqc_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setOqcRecords(parsed);
        }
      }
    } catch (e) {
      console.error('Error refreshing oqc_records', e);
    }

    try {
      const savedStaff = localStorage.getItem('dk_staff');
      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMasterStaff(parsed);
        }
      }
    } catch (e) {
      console.error('Error refreshing Master Staff in QualityPlanning', e);
    }

    try {
      const savedModels = localStorage.getItem('dk_models');
      if (savedModels) {
        const parsed = JSON.parse(savedModels);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newVal = Array.from(new Set(parsed.map((m: any) => m.name || m.id).filter(Boolean)));
          setMasterModelNames(prev => isStringArrayEqual(prev, newVal) ? prev : newVal);
        }
      }
    } catch (e) {
      console.error('Error refreshing Master Models in QualityPlanning', e);
    }

    try {
      const savedSuppliers = localStorage.getItem('dk_suppliers');
      if (savedSuppliers) {
        const parsed = JSON.parse(savedSuppliers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loadedNames = parsed.map((s: any) => s.SupplierName || s.name || s.id).filter(Boolean);
          const newVal = Array.from(new Set([...loadedNames, ...DEFAULT_SUPPLIERS.map(s => s.name)]));
          setMasterSupplierNames(prev => isStringArrayEqual(prev, newVal) ? prev : newVal);
        }
      }
    } catch (e) {
      console.error('Error refreshing Master Suppliers in QualityPlanning', e);
    }
  }, [forceRefresh]);

  // --- KHO KHỞI TẠO BẢNG NHẬP LIỆU (INPUT GRIDS) ---

  // Derived active period keys
  const weekSuffix = `${selectedYear}_M${selectedMonth}_${selectedWeek}`;
  const monthSuffix = `${selectedYear}_M${selectedMonth}`;

  // 1. Weekly Assembly Support State
  const [weeklyAssembly, setWeeklyAssemblyState] = useState<{ [model: string]: { [day: string]: number } }>(() => {
    try {
      const saved = localStorage.getItem(`dk_weekly_assembly_${weekSuffix}`);
      if (saved) return JSON.parse(saved);
      const savedAll = localStorage.getItem('dk_weekly_assemblies_all');
      if (savedAll) {
        const parsed = JSON.parse(savedAll);
        if (parsed[weekSuffix]) return parsed[weekSuffix];
      }
      const oldLegacy = localStorage.getItem('dk_weekly_assembly');
      if (oldLegacy) return JSON.parse(oldLegacy);
    } catch (e) {}
    return getDefaultWeeklyAssembly(defaultYear, defaultMonth, defaultWeek, DEFAULT_MODELS.map(m => m.name));
  });

  // 2. Monthly Assembly Support State
  const [monthlyAssembly, setMonthlyAssemblyState] = useState<{ [model: string]: { [week: string]: number } }>(() => {
    try {
      const saved = localStorage.getItem(`dk_monthly_assembly_${monthSuffix}`);
      if (saved) return JSON.parse(saved);
      const savedAll = localStorage.getItem('dk_monthly_assemblies_all');
      if (savedAll) {
        const parsed = JSON.parse(savedAll);
        if (parsed[monthSuffix]) return parsed[monthSuffix];
      }
      const oldLegacy = localStorage.getItem('dk_monthly_assembly');
      if (oldLegacy) return JSON.parse(oldLegacy);
    } catch (e) {}
    return getDefaultMonthlyAssembly(defaultYear, defaultMonth, DEFAULT_MODELS.map(m => m.name));
  });

  // 3. Weekly Supply Support State
  const [weeklySupply, setWeeklySupplyState] = useState<{ [supplier: string]: { [day: string]: string } }>(() => {
    try {
      const saved = localStorage.getItem(`dk_weekly_supply_${weekSuffix}`);
      if (saved) return JSON.parse(saved);
      const savedAll = localStorage.getItem('dk_weekly_supplies_all');
      if (savedAll) {
        const parsed = JSON.parse(savedAll);
        if (parsed[weekSuffix]) return parsed[weekSuffix];
      }
      const oldLegacy = localStorage.getItem('dk_weekly_supply');
      if (oldLegacy) return JSON.parse(oldLegacy);
    } catch (e) {}
    return getDefaultWeeklySupply(defaultYear, defaultMonth, defaultWeek, DEFAULT_SUPPLIERS.map(s => s.name));
  });

  // 4. Monthly Supply Support State
  const [monthlySupply, setMonthlySupplyState] = useState<{ [supplier: string]: { [week: string]: string } }>(() => {
    try {
      const saved = localStorage.getItem(`dk_monthly_supply_${monthSuffix}`);
      if (saved) return JSON.parse(saved);
      const savedAll = localStorage.getItem('dk_monthly_supplies_all');
      if (savedAll) {
        const parsed = JSON.parse(savedAll);
        if (parsed[monthSuffix]) return parsed[monthSuffix];
      }
      const oldLegacy = localStorage.getItem('dk_monthly_supply');
      if (oldLegacy) return JSON.parse(oldLegacy);
    } catch (e) {}
    return getDefaultMonthlySupply(defaultYear, defaultMonth, DEFAULT_SUPPLIERS.map(s => s.name));
  });

  // 5. Weekly Timeline Support State
  const [weeklyTimeline, setWeeklyTimelineState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`dk_weekly_timeline_${weekSuffix}`);
      if (saved) return JSON.parse(saved);
      const savedAll = localStorage.getItem('dk_weekly_timelines_all');
      if (savedAll) {
        const parsed = JSON.parse(savedAll);
        if (parsed[weekSuffix]) return parsed[weekSuffix];
      }
      const oldLegacy = localStorage.getItem('dk_weekly_timeline');
      if (oldLegacy) return JSON.parse(oldLegacy);
    } catch (e) {}
    return ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  });

  // 6. Monthly Timeline Support State
  const [monthlyTimeline, setMonthlyTimelineState] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`dk_monthly_timeline_${monthSuffix}`);
      if (saved) return JSON.parse(saved);
      const savedAll = localStorage.getItem('dk_monthly_timelines_all');
      if (savedAll) {
        const parsed = JSON.parse(savedAll);
        if (parsed[monthSuffix]) return parsed[monthSuffix];
      }
      const oldLegacy = localStorage.getItem('dk_monthly_timeline');
      if (oldLegacy) return JSON.parse(oldLegacy);
    } catch (e) {}
    return ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];
  });

  // --- DYNAMICALLY SYNC / LOAD CORRESPONDING PERIOD DATA WHEN TIME/MODE MODIFIED ---
  useEffect(() => {
    // Sync Weekly Assembly
    try {
      const saved = localStorage.getItem(`dk_weekly_assembly_${weekSuffix}`);
      if (saved) {
        setWeeklyAssemblyState(JSON.parse(saved));
      } else {
        const savedAll = localStorage.getItem('dk_weekly_assemblies_all');
        let parsedAll: any = {};
        if (savedAll) parsedAll = JSON.parse(savedAll);
        if (parsedAll[weekSuffix]) {
          setWeeklyAssemblyState(parsedAll[weekSuffix]);
        } else {
          setWeeklyAssemblyState(getDefaultWeeklyAssembly(selectedYear, selectedMonth, selectedWeek, masterModelNames));
        }
      }
    } catch (e) {
      setWeeklyAssemblyState(getDefaultWeeklyAssembly(selectedYear, selectedMonth, selectedWeek, masterModelNames));
    }

    // Sync Monthly Assembly
    try {
      const saved = localStorage.getItem(`dk_monthly_assembly_${monthSuffix}`);
      if (saved) {
        setMonthlyAssemblyState(JSON.parse(saved));
      } else {
        const savedAll = localStorage.getItem('dk_monthly_assemblies_all');
        let parsedAll: any = {};
        if (savedAll) parsedAll = JSON.parse(savedAll);
        if (parsedAll[monthSuffix]) {
          setMonthlyAssemblyState(parsedAll[monthSuffix]);
        } else {
          setMonthlyAssemblyState(getDefaultMonthlyAssembly(selectedYear, selectedMonth, masterModelNames));
        }
      }
    } catch (e) {
      setMonthlyAssemblyState(getDefaultMonthlyAssembly(selectedYear, selectedMonth, masterModelNames));
    }

    // Sync Weekly Supply
    try {
      const saved = localStorage.getItem(`dk_weekly_supply_${weekSuffix}`);
      if (saved) {
        setWeeklySupplyState(JSON.parse(saved));
      } else {
        const savedAll = localStorage.getItem('dk_weekly_supplies_all');
        let parsedAll: any = {};
        if (savedAll) parsedAll = JSON.parse(savedAll);
        if (parsedAll[weekSuffix]) {
          setWeeklySupplyState(parsedAll[weekSuffix]);
        } else {
          setWeeklySupplyState(getDefaultWeeklySupply(selectedYear, selectedMonth, selectedWeek, masterSupplierNames));
        }
      }
    } catch (e) {
      setWeeklySupplyState(getDefaultWeeklySupply(selectedYear, selectedMonth, selectedWeek, masterSupplierNames));
    }

    // Sync Monthly Supply
    try {
      const saved = localStorage.getItem(`dk_monthly_supply_${monthSuffix}`);
      if (saved) {
        setMonthlySupplyState(JSON.parse(saved));
      } else {
        const savedAll = localStorage.getItem('dk_monthly_supplies_all');
        let parsedAll: any = {};
        if (savedAll) parsedAll = JSON.parse(savedAll);
        if (parsedAll[monthSuffix]) {
          setMonthlySupplyState(parsedAll[monthSuffix]);
        } else {
          setMonthlySupplyState(getDefaultMonthlySupply(selectedYear, selectedMonth, masterSupplierNames));
        }
      }
    } catch (e) {
      setMonthlySupplyState(getDefaultMonthlySupply(selectedYear, selectedMonth, masterSupplierNames));
    }

    // Sync Weekly Timeline
    try {
      const saved = localStorage.getItem(`dk_weekly_timeline_${weekSuffix}`);
      if (saved) {
        setWeeklyTimelineState(JSON.parse(saved));
      } else {
        const savedAll = localStorage.getItem('dk_weekly_timelines_all');
        let parsedAll: any = {};
        if (savedAll) parsedAll = JSON.parse(savedAll);
        if (parsedAll[weekSuffix]) {
          setWeeklyTimelineState(parsedAll[weekSuffix]);
        } else {
          setWeeklyTimelineState(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']);
        }
      }
    } catch (e) {
      setWeeklyTimelineState(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']);
    }

    // Sync Monthly Timeline
    try {
      const saved = localStorage.getItem(`dk_monthly_timeline_${monthSuffix}`);
      if (saved) {
        setMonthlyTimelineState(JSON.parse(saved));
      } else {
        const savedAll = localStorage.getItem('dk_monthly_timelines_all');
        let parsedAll: any = {};
        if (savedAll) parsedAll = JSON.parse(savedAll);
        if (parsedAll[monthSuffix]) {
          setMonthlyTimelineState(parsedAll[monthSuffix]);
        } else {
          setMonthlyTimelineState(['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5']);
        }
      }
    } catch (e) {
      setMonthlyTimelineState(['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5']);
    }
  }, [selectedYear, selectedMonth, selectedWeek, masterModelNames, masterSupplierNames, weekSuffix, monthSuffix]);

  // --- UNIFIED WRAPPED SETTERS THAT SAVE SYNCHRONOUSLY TO PREVENT RACE CONDITIONS ---
  const saveAndSync = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof (window as any).syncToServer === 'function') {
      (window as any).syncToServer(key, data);
    } else {
      try {
        window.dispatchEvent(new CustomEvent('dk_planning_reload_state', { detail: { key, value: JSON.stringify(data) } }));
      } catch (err) {}
    }
  };

  const setWeeklyAssembly = (updateFnOrValue: any) => {
    setWeeklyAssemblyState(prev => {
      const nextVal = typeof updateFnOrValue === 'function' ? updateFnOrValue(prev) : updateFnOrValue;
      localStorage.setItem(`dk_weekly_assembly_${weekSuffix}`, JSON.stringify(nextVal));
      localStorage.setItem('dk_weekly_assembly', JSON.stringify(nextVal));
      
      const savedDictStr = localStorage.getItem('dk_weekly_assemblies_all');
      let savedDict = {};
      try {
        if (savedDictStr) savedDict = JSON.parse(savedDictStr);
      } catch (e) {}
      const targetVal = { ...savedDict, [weekSuffix]: nextVal };
      saveAndSync('dk_weekly_assemblies_all', targetVal);
      return nextVal;
    });
  };

  const setMonthlyAssembly = (updateFnOrValue: any) => {
    setMonthlyAssemblyState(prev => {
      const nextVal = typeof updateFnOrValue === 'function' ? updateFnOrValue(prev) : updateFnOrValue;
      localStorage.setItem(`dk_monthly_assembly_${monthSuffix}`, JSON.stringify(nextVal));
      localStorage.setItem('dk_monthly_assembly', JSON.stringify(nextVal));
      
      const savedDictStr = localStorage.getItem('dk_monthly_assemblies_all');
      let savedDict = {};
      try {
        if (savedDictStr) savedDict = JSON.parse(savedDictStr);
      } catch (e) {}
      const targetVal = { ...savedDict, [monthSuffix]: nextVal };
      saveAndSync('dk_monthly_assemblies_all', targetVal);
      return nextVal;
    });
  };

  const setWeeklySupply = (updateFnOrValue: any) => {
    setWeeklySupplyState(prev => {
      const nextVal = typeof updateFnOrValue === 'function' ? updateFnOrValue(prev) : updateFnOrValue;
      localStorage.setItem(`dk_weekly_supply_${weekSuffix}`, JSON.stringify(nextVal));
      localStorage.setItem('dk_weekly_supply', JSON.stringify(nextVal));
      
      const savedDictStr = localStorage.getItem('dk_weekly_supplies_all');
      let savedDict = {};
      try {
        if (savedDictStr) savedDict = JSON.parse(savedDictStr);
      } catch (e) {}
      const targetVal = { ...savedDict, [weekSuffix]: nextVal };
      saveAndSync('dk_weekly_supplies_all', targetVal);
      return nextVal;
    });
  };

  const setMonthlySupply = (updateFnOrValue: any) => {
    setMonthlySupplyState(prev => {
      const nextVal = typeof updateFnOrValue === 'function' ? updateFnOrValue(prev) : updateFnOrValue;
      localStorage.setItem(`dk_monthly_supply_${monthSuffix}`, JSON.stringify(nextVal));
      localStorage.setItem('dk_monthly_supply', JSON.stringify(nextVal));
      
      const savedDictStr = localStorage.getItem('dk_monthly_supplies_all');
      let savedDict = {};
      try {
        if (savedDictStr) savedDict = JSON.parse(savedDictStr);
      } catch (e) {}
      const targetVal = { ...savedDict, [monthSuffix]: nextVal };
      saveAndSync('dk_monthly_supplies_all', targetVal);
      return nextVal;
    });
  };

  const setWeeklyTimeline = (updateFnOrValue: any) => {
    setWeeklyTimelineState(prev => {
      const nextVal = typeof updateFnOrValue === 'function' ? updateFnOrValue(prev) : updateFnOrValue;
      localStorage.setItem(`dk_weekly_timeline_${weekSuffix}`, JSON.stringify(nextVal));
      localStorage.setItem('dk_weekly_timeline', JSON.stringify(nextVal));
      
      const savedDictStr = localStorage.getItem('dk_weekly_timelines_all');
      let savedDict = {};
      try {
        if (savedDictStr) savedDict = JSON.parse(savedDictStr);
      } catch (e) {}
      const targetVal = { ...savedDict, [weekSuffix]: nextVal };
      saveAndSync('dk_weekly_timelines_all', targetVal);
      return nextVal;
    });
  };

  const setMonthlyTimeline = (updateFnOrValue: any) => {
    setMonthlyTimelineState(prev => {
      const nextVal = typeof updateFnOrValue === 'function' ? updateFnOrValue(prev) : updateFnOrValue;
      localStorage.setItem(`dk_monthly_timeline_${monthSuffix}`, JSON.stringify(nextVal));
      localStorage.setItem('dk_monthly_timeline', JSON.stringify(nextVal));
      
      const savedDictStr = localStorage.getItem('dk_monthly_timelines_all');
      let savedDict = {};
      try {
        if (savedDictStr) savedDict = JSON.parse(savedDictStr);
      } catch (e) {}
      const targetVal = { ...savedDict, [monthSuffix]: nextVal };
      saveAndSync('dk_monthly_timelines_all', targetVal);
      return nextVal;
    });
  };

  // States cho việc tạo mới trực tiếp trên bảng
  const [newModelInput, setNewModelInput] = useState('');
  const [newSupplierInput, setNewSupplierInput] = useState('');
  const [newTimelineInput, setNewTimelineInput] = useState('');

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // --- TRẠNG THÁI QUẢN TRỊ CHI TIẾT CHO THÊM / SỬA / XÓA PQC CONTROL ITEMS ---
  const [customPqcItems, setCustomPqcItems] = useState<{ [model: string]: Array<{ id: string; type: 'incoming' | 'process'; name: string; frequencyDesc: string; explanation: string }> }>(() => {
    try {
      const saved = localStorage.getItem('dk_custom_pqc_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading custom PQC items', e);
    }
    return {};
  });

  // Tự động lưu trữ dứt điểm hạng mục PQC tùy biến
  useEffect(() => {
    const serialized = JSON.stringify(customPqcItems);
    if (localStorage.getItem('dk_custom_pqc_items') !== serialized) {
      saveAndSync('dk_custom_pqc_items', customPqcItems);
    }
  }, [customPqcItems]);

  // Trạng thái lưu trữ lịch sử tiêu chí PQC thiết lập riêng để tái sử dụng xuyên suốt các dòng xe và tháng/kế hoạch khác nhau
  const [pqcSavedHistoryTemplates, setPqcSavedHistoryTemplates] = useState<Array<{ id?: string; type: 'incoming' | 'process'; name: string; frequencyDesc: string; explanation: string }>>(() => {
    try {
      const saved = localStorage.getItem('dk_pqc_saved_history_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Tự động đồng bộ dốc mẫu định dạng PQC lịch sử khi có biến động
  useEffect(() => {
    const serialized = JSON.stringify(pqcSavedHistoryTemplates);
    if (localStorage.getItem('dk_pqc_saved_history_templates') !== serialized) {
      saveAndSync('dk_pqc_saved_history_templates', pqcSavedHistoryTemplates);
    }
  }, [pqcSavedHistoryTemplates]);

  // Trạng thái FPY tùy biến theo model sản phẩm (cho OQC)
  const [customFpyTargets, setCustomFpyTargets] = useState<{ [model: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('dk_custom_fpy_targets');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const updateModelFpyTarget = (model: string, value: number) => {
    setCustomFpyTargets(prev => {
      const next = { ...prev, [model]: value };
      saveAndSync('dk_custom_fpy_targets', next);
      return next;
    });
  };

  // Trạng thái SQC tùy biến theo nhà cung cấp
  const [customSqcItems, setCustomSqcItems] = useState<{ [supplier: string]: { taskDescription: string; targetSpecs: string } }>(() => {
    try {
      const saved = localStorage.getItem('dk_custom_sqc_items');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const updateCustomSqcItem = (supplier: string, taskDescription: string, targetSpecs: string) => {
    setCustomSqcItems(prev => {
      const next = { ...prev, [supplier]: { taskDescription, targetSpecs } };
      saveAndSync('dk_custom_sqc_items', next);
      return next;
    });
  };

  const [editingSqcSupplier, setEditingSqcSupplier] = useState<string | null>(null);
  const [sqcFormTask, setSqcFormTask] = useState('');
  const [sqcFormSpecs, setSqcFormSpecs] = useState('');

  // SỬA ĐỔI GHI CHÚ IQC KIỂM TRA ĐẦU VÀO (Lưu giữ để lần sau chọn)
  const [customIqcNotes, setCustomIqcNotes] = useState<{ [key: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('dk_custom_iqc_notes');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [savedIqcNoteTemplates, setSavedIqcNoteTemplates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dk_iqc_saved_notes');
      return saved ? JSON.parse(saved) : [
        'Kiểm tra kích thước lỗ hàn, vết móp sườn gá sườn',
        'Đo lực uốn sản phẩm mẫu, kiểm độ dày lớp sơn tĩnh điện chống sét gỉ',
        'Đánh giá kiểm tra khả năng tỳ lực khít pin BMS',
        'Đo dung lượng áp đầu vào bộ sạc và dây co điện nhiệt',
        'Thử ngâm nước kiểm rò rỉ khớp nối silicon bảo vệ sạc',
        'Kiểm ngoại quan mâm đúc nhôm chống bavia sắc cạnh mối hàn',
        'Kiểm tra độ khít nẹp nhựa chắn bùn và mô-men xoắn siết ốc sườn xe'
      ];
    } catch (e) {
      return [];
    }
  });

  const [editingIqcRowId, setEditingIqcRowId] = useState<string | null>(null);
  const [iqcRowNoteText, setIqcRowNoteText] = useState('');
  const [showNoteTemplateDropdown, setShowNoteTemplateDropdown] = useState(false);

  const updateIqcNote = (supplier: string, material: string, note: string) => {
    const compositeKey = `${supplier}||${material}`;
    setCustomIqcNotes(prev => {
      const next = { ...prev, [compositeKey]: note };
      saveAndSync('dk_custom_iqc_notes', next);
      return next;
    });

    if (note.trim().length > 3) {
      setSavedIqcNoteTemplates(prev => {
        const trimmed = note.trim();
        if (!prev.includes(trimmed)) {
          const next = [trimmed, ...prev].slice(0, 50); // Giới hạn tối đa 50 mẫu tiện ích
          saveAndSync('dk_iqc_saved_notes', next);
          return next;
        }
        return prev;
      });
    }
    setEditingIqcRowId(null);
  };

  // Bộ sưu tập các hạng mục lưu trữ hoặc mẫu gợi ý nhanh chuyên biệt
  const pqcHistorySuggestions = useMemo(() => {
    const list: Array<{ name: string; frequencyDesc: string; explanation: string; type: 'incoming' | 'process' }> = [];
    const seen = new Set<string>();

    // 1. Nạp từ danh sách lịch sử chính thức do người dùng tự lưu thiết lập riêng (Được ưu tiên lên đầu)
    if (Array.isArray(pqcSavedHistoryTemplates)) {
      pqcSavedHistoryTemplates.forEach(item => {
        const key = `${(item.name || '').trim().toLowerCase()}||${item.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            name: item.name,
            frequencyDesc: item.frequencyDesc,
            explanation: item.explanation,
            type: item.type
          });
        }
      });
    }
    
    // 2. Thu thập từ customPqcItems hiện có của tất cả dòng máy để làm gợi ý cho xưởng
    Object.keys(customPqcItems || {}).forEach(model => {
      const items = customPqcItems[model];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const key = `${(item.name || '').trim().toLowerCase()}||${item.type}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              name: item.name,
              frequencyDesc: item.frequencyDesc,
              explanation: item.explanation,
              type: item.type
            });
          }
        });
      }
    });

    // Các mẫu gợi ý mặc định chất lượng cao của hãng để người dùng không cần gõ phím nhiều
    const fallbackTemplates: Array<{ name: string; frequencyDesc: string; explanation: string; type: 'incoming' | 'process' }> = [
      { type: 'incoming', name: 'Kiểm soát bộ đấu cáp tín hiệu & dải dây dẫn nguồn điện', frequencyDesc: '3 lượt / ca', explanation: 'Đảm bảo lõi dải điện tải cực lớn bọc silicone dán kín, lực bóp rắc pin vừa mút tuyệt đối.' },
      { type: 'process', name: 'Đo mẻ mô-men siết tô vít cân lực bắt gá cụm máy động cơ', frequencyDesc: '4 lượt / ca (SOP cải tiến)', explanation: 'Rút ngẫu nhiên mẻ bắn rô-to đạt dung sai siết siết chặt 35 N.m, kiểm sóng hồi vô hại.' },
      { type: 'incoming', name: 'Kiểm tra 100% rắc cắm sạc hơ sấy lò sấy Epoxy', frequencyDesc: '6 lượt / ca', explanation: 'Sấy vòi lò sấy thun chuẩn 65°C liên tục 12 phút để chống rò điện, co keo gỉ rác cực.' },
      { type: 'incoming', name: 'Đo nhẵn nhẵn quang học bệ dập cơ bản cổ phuốc xe mộc', frequencyDesc: '2 lượt / ca', explanation: 'Kiểm định bavia khuôn ép bát phuốc chén mộc trước khi sơn phủ, loại trừ lệch dốc lái.' },
      { type: 'process', name: 'Ép thủy lực gá đặt màng đệm cao su giảm chấn giảm xóc trước', frequencyDesc: '6 lượt / ca', explanation: 'Đập hành trình nhả nén nún thử rơ nhẹ cổ phuốc chép bi của dòng xe dốc dập phanh khẩn cấp.' },
      { type: 'incoming', name: 'Kiểm soát ma sát má phanh dầu, đĩa phanh trước/sau nhập xưởng', frequencyDesc: '3 lượt / ca', explanation: 'Thử mài nhám, rà trơn bọt cặn dầu phanh để chống nguy cơ bó cứng bánh dốc hãm dột ngột.' },
      { type: 'process', name: 'Kiểm tra độ bám dính nhãn tem chống ẩm & in phản quang', frequencyDesc: '2 lượt / ca', explanation: 'Hút phẳng decal đề can dán không phồng dải hơi nhãn lụa sườn vỏ nhựa bóng.' }
    ];

    fallbackTemplates.forEach(tpl => {
      const key = `${tpl.name.trim().toLowerCase()}||${tpl.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(tpl);
      }
    });

    return list;
  }, [customPqcItems, pqcSavedHistoryTemplates]);

  // Trạng thái modal và form cho PQC Item
  const [showPqcModal, setShowPqcModal] = useState(false);
  const [pqcModalMode, setPqcModalMode] = useState<'add' | 'edit'>('add');
  const [pqcActiveModel, setPqcActiveModel] = useState<string>('');
  const [pqcActiveItemIndex, setPqcActiveItemIndex] = useState<number | null>(null);
  
  const [pqcFormType, setPqcFormType] = useState<'incoming' | 'process'>('incoming');
  const [pqcFormName, setPqcFormName] = useState('');
  const [pqcFormFrequency, setPqcFormFrequency] = useState('');
  const [pqcFormExplanation, setPqcFormExplanation] = useState('');

  const handleOpenAddPqcItem = (model: string) => {
    setPqcActiveModel(model);
    setPqcModalMode('add');
    setPqcActiveItemIndex(null);
    setPqcFormType('incoming');
    setPqcFormName('');
    setPqcFormFrequency('3 lượt / ca');
    setPqcFormExplanation('');
    setShowPqcModal(true);
  };

  const handleOpenEditPqcItem = (model: string, index: number, item: { id: string; type: 'incoming' | 'process'; name: string; frequencyDesc: string; explanation: string }) => {
    setPqcActiveModel(model);
    setPqcModalMode('edit');
    setPqcActiveItemIndex(index);
    setPqcFormType(item.type);
    setPqcFormName(item.name);
    setPqcFormFrequency(item.frequencyDesc);
    setPqcFormExplanation(item.explanation);
    setShowPqcModal(true);
  };

  const handleSavePqcItem = (e: FormEvent) => {
    e.preventDefault();
    if (!pqcFormName.trim() || !pqcFormExplanation.trim()) return;

    const trimmedName = pqcFormName.trim();
    const trimmedFrequency = pqcFormFrequency.trim() || '3 lượt / ca';
    const trimmedExplanation = pqcFormExplanation.trim();
    const curType = pqcFormType;

    setCustomPqcItems(prev => {
      const modelItems = prev[pqcActiveModel] !== undefined 
        ? [...prev[pqcActiveModel]] 
        : [...getDefaultControlItems(pqcActiveModel)];

      const newItem = {
        id: pqcModalMode === 'edit' && pqcActiveItemIndex !== null && modelItems[pqcActiveItemIndex]
          ? modelItems[pqcActiveItemIndex].id 
          : `PQC-CUSTOM-${Date.now()}`,
        type: curType,
        name: trimmedName,
        frequencyDesc: trimmedFrequency,
        explanation: trimmedExplanation
      };

      if (pqcModalMode === 'edit' && pqcActiveItemIndex !== null) {
        modelItems[pqcActiveItemIndex] = newItem;
      } else {
        modelItems.push(newItem);
      }

      return {
        ...prev,
        [pqcActiveModel]: modelItems
      };
    });

    // Tự động lưu hoặc cập nhật vào thư viện lịch sử thiết lập riêng
    setPqcSavedHistoryTemplates(prev => {
      const existingIdx = prev.findIndex(item => 
        (item.name || '').trim().toLowerCase() === trimmedName.toLowerCase() && 
        item.type === curType
      );

      const newHistoryItem = {
        id: `PQC-HIST-${Date.now()}`,
        type: curType,
        name: trimmedName,
        frequencyDesc: trimmedFrequency,
        explanation: trimmedExplanation
      };

      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          frequencyDesc: trimmedFrequency,
          explanation: trimmedExplanation
        };
        return next;
      } else {
        return [newHistoryItem, ...prev].slice(0, 100); // Giới hạn tối đa 100 mẫu lịch sử
      }
    });

    setShowPqcModal(false);
  };

  const handleDeletePqcItem = (model: string, index: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa hạng mục kiểm soát PQC này?')) {
      setCustomPqcItems(prev => {
        const modelItems = prev[model] !== undefined 
          ? [...prev[model]] 
          : [...getDefaultControlItems(model)];
        
        modelItems.splice(index, 1);
        return {
          ...prev,
          [model]: modelItems
        };
      });
    }
  };

  // Danh sách gợi ý các model lấy QUYẾT ĐỊNH từ Quản lý danh sách (master)
  const modelSuggestions = useMemo(() => {
    return masterModelNames;
  }, [masterModelNames]);

  // Bộ lọc model đang gõ
  const filteredModelSuggestions = useMemo(() => {
    if (!newModelInput) return modelSuggestions;
    return modelSuggestions.filter(m => m.toLowerCase().includes(newModelInput.toLowerCase()));
  }, [newModelInput, modelSuggestions]);

  // Danh sách gợi ý các nhà cung cấp lấy QUYẾT ĐỊNH từ Quản lý danh sách (master)
  const supplierSuggestions = useMemo(() => {
    return masterSupplierNames;
  }, [masterSupplierNames]);

  // Bộ lọc nhà cung cấp đang gõ
  const filteredSupplierSuggestions = useMemo(() => {
    if (!newSupplierInput) return supplierSuggestions;
    return supplierSuggestions.filter(s => s.toLowerCase().includes(newSupplierInput.toLowerCase()));
  }, [newSupplierInput, supplierSuggestions]);

  // --- QUẢN LÝ DÒNG XE (MODEL ROWS) ---
  const handleAddModel = () => {
    if (!newModelInput.trim()) return;
    const m = newModelInput.trim();
    
    // Kiểm tra dòng xe bắt buộc phải thuộc danh sách master
    const isValid = masterModelNames.some(name => name.toLowerCase() === m.toLowerCase());
    if (!isValid) {
      alert(`⚠️ Không tìm thấy dòng xe "${m}" trong Quản lý danh sách (master)! Vui lòng đăng ký dòng xe này ở phân hệ quản trị danh mục trước.`);
      return;
    }

    // Lấy tên chuẩn hoa từ master
    const matchedName = masterModelNames.find(name => name.toLowerCase() === m.toLowerCase()) || m;

    if (planningMode === 'weekly') {
      if (weeklyAssembly[matchedName]) {
        alert('Model xe đã tồn tại trong kế hoạch!');
        return;
      }
      setWeeklyAssembly(prev => ({
        ...prev,
        [matchedName]: weeklyTimeline.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})
      }));
    } else {
      if (monthlyAssembly[matchedName]) {
        alert('Model xe đã tồn tại trong kế hoạch!');
        return;
      }
      setMonthlyAssembly(prev => ({
        ...prev,
        [matchedName]: monthlyTimeline.reduce((acc, t) => ({ ...acc, [t]: 0 }), {})
      }));
    }
    setNewModelInput('');
  };

  const handleRenameModel = (oldName: string) => {
    const newName = prompt(`Đổi tên Model "${oldName}" thành:`, oldName);
    if (!newName || !newName.trim() || newName === oldName) return;
    const target = newName.trim();
    if (planningMode === 'weekly') {
      setWeeklyAssembly(prev => {
        const updated = { ...prev };
        updated[target] = updated[oldName] || {};
        delete updated[oldName];
        return updated;
      });
    } else {
      setMonthlyAssembly(prev => {
        const updated = { ...prev };
        updated[target] = updated[oldName] || {};
        delete updated[oldName];
        return updated;
      });
    }
  };

  const handleDeleteModel = (model: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá dòng xe "${model}" khỏi kế hoạchắp ráp?`)) {
      if (planningMode === 'weekly') {
        setWeeklyAssembly(prev => {
          const updated = { ...prev };
          delete updated[model];
          return updated;
        });
      } else {
        setMonthlyAssembly(prev => {
          const updated = { ...prev };
          delete updated[model];
          return updated;
        });
      }
    }
  };

  // --- QUẢN LÝ NHÀ CUNG CẤP (SUPPLIER ROWS) ---
  const handleAddSupplier = () => {
    if (!newSupplierInput.trim()) return;
    const s = newSupplierInput.trim();

    // Kiểm tra nhà cung cấp bắt buộc phải thuộc danh sách master
    const isValid = masterSupplierNames.some(name => name.toLowerCase() === s.toLowerCase());
    if (!isValid) {
      alert(`⚠️ Không tìm thấy nhà cung cấp "${s}" trong Quản lý danh sách (master)! Vui lòng đăng ký nhà cung cấp này ở phân hệ quản trị danh mục trước.`);
      return;
    }

    // Lấy tên chuẩn hoa từ master
    const matchedName = masterSupplierNames.find(name => name.toLowerCase() === s.toLowerCase()) || s;

    if (planningMode === 'weekly') {
      if (weeklySupply[matchedName]) {
        alert('Nhà cung cấp đã tồn tại trong kế hoạch!');
        return;
      }
      setWeeklySupply(prev => ({
        ...prev,
        [matchedName]: weeklyTimeline.reduce((acc, t) => ({ ...acc, [t]: '' }), {})
      }));
    } else {
      if (monthlySupply[matchedName]) {
        alert('Nhà cung cấp đã tồn tại trong kế hoạch!');
        return;
      }
      setMonthlySupply(prev => ({
        ...prev,
        [matchedName]: monthlyTimeline.reduce((acc, t) => ({ ...acc, [t]: '' }), {})
      }));
    }
    setNewSupplierInput('');
  };

  const handleRenameSupplier = (oldName: string) => {
    const newName = prompt(`Đổi tên Nhà cung cấp "${oldName}" thành:`, oldName);
    if (!newName || !newName.trim() || newName === oldName) return;
    const target = newName.trim();
    if (planningMode === 'weekly') {
      setWeeklySupply(prev => {
        const updated = { ...prev };
        updated[target] = updated[oldName] || {};
        delete updated[oldName];
        return updated;
      });
    } else {
      setMonthlySupply(prev => {
        const updated = { ...prev };
        updated[target] = updated[oldName] || {};
        delete updated[oldName];
        return updated;
      });
    }
  };

  const handleDeleteSupplier = (supplier: string) => {
    if (window.confirm(`Bạn có chắc muốn xoá nhà cung cấp "${supplier}" khỏi kế hoạch hàng về?`)) {
      if (planningMode === 'weekly') {
        setWeeklySupply(prev => {
          const updated = { ...prev };
          delete updated[supplier];
          return updated;
        });
      } else {
        setMonthlySupply(prev => {
          const updated = { ...prev };
          delete updated[supplier];
          return updated;
        });
      }
    }
  };

  // --- QUẢN LÝ CỘT THỜI GIAN (COLUMNS) ---
  const handleAddColumn = () => {
    if (!newTimelineInput.trim()) return;
    const col = newTimelineInput.trim();
    if (planningMode === 'weekly') {
      if (weeklyTimeline.includes(col)) {
        alert('Cột mốc thời gian này đã tồn tại!');
        return;
      }
      setWeeklyTimeline(prev => [...prev, col]);
    } else {
      if (monthlyTimeline.includes(col)) {
        alert('Cột mốc thời gian này đã tồn tại!');
        return;
      }
      setMonthlyTimeline(prev => [...prev, col]);
    }
    setNewTimelineInput('');
  };

  const handleRenameColumn = (oldCol: string) => {
    const newCol = prompt(`Đổi tên cột mốc "${oldCol}" thành:`, oldCol);
    if (!newCol || !newCol.trim() || newCol === oldCol) return;
    const target = newCol.trim();

    if (planningMode === 'weekly') {
      setWeeklyTimeline(prev => prev.map(c => c === oldCol ? target : c));
      setWeeklyAssembly(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          if (updated[k][oldCol] !== undefined) {
            updated[k][target] = updated[k][oldCol];
            delete updated[k][oldCol];
          }
        });
        return updated;
      });
      setWeeklySupply(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          if (updated[k][oldCol] !== undefined) {
            updated[k][target] = updated[k][oldCol];
            delete updated[k][oldCol];
          }
        });
        return updated;
      });
    } else {
      setMonthlyTimeline(prev => prev.map(c => c === oldCol ? target : c));
      setMonthlyAssembly(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          if (updated[k][oldCol] !== undefined) {
            updated[k][target] = updated[k][oldCol];
            delete updated[k][oldCol];
          }
        });
        return updated;
      });
      setMonthlySupply(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => {
          if (updated[k][oldCol] !== undefined) {
            updated[k][target] = updated[k][oldCol];
            delete updated[k][oldCol];
          }
        });
        return updated;
      });
    }
  };

  const handleDeleteColumn = (col: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá cột mốc "${col}"? Toàn bộ số liệu đã điền trong cột này sẽ bị loại bỏ!`)) {
      if (planningMode === 'weekly') {
        setWeeklyTimeline(prev => prev.filter(c => c !== col));
      } else {
        setMonthlyTimeline(prev => prev.filter(c => c !== col));
      }
    }
  };

  // --- QUẢN LÝ TÁC VỤ CHẤT LƯỢNG (TASK SECTIONS) ---
  const [tasks, setTasks] = useState<QualityTask[]>(() => {
    try {
      const saved = localStorage.getItem('dk_qms_quality_planning_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return getInitialQmsPlanningTasks(6, 2026);
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(tasks);
      if (localStorage.getItem('dk_qms_quality_planning_tasks') !== serialized) {
        saveAndSync('dk_qms_quality_planning_tasks', tasks);
      }
    } catch (e) {
      console.error(e);
    }
  }, [tasks]);

  const stateRef = useRef({
    customPqcItems,
    pqcSavedHistoryTemplates,
    customFpyTargets,
    customSqcItems,
    customIqcNotes,
    savedIqcNoteTemplates,
    tasks,
    weeklyAssembly,
    monthlyAssembly,
    weeklySupply,
    monthlySupply,
    weeklyTimeline,
    monthlyTimeline
  });

  useEffect(() => {
    stateRef.current = {
      customPqcItems,
      pqcSavedHistoryTemplates,
      customFpyTargets,
      customSqcItems,
      customIqcNotes,
      savedIqcNoteTemplates,
      tasks,
      weeklyAssembly,
      monthlyAssembly,
      weeklySupply,
      monthlySupply,
      weeklyTimeline,
      monthlyTimeline
    };
  }, [
    customPqcItems,
    pqcSavedHistoryTemplates,
    customFpyTargets,
    customSqcItems,
    customIqcNotes,
    savedIqcNoteTemplates,
    tasks,
    weeklyAssembly,
    monthlyAssembly,
    weeklySupply,
    monthlySupply,
    weeklyTimeline,
    monthlyTimeline
  ]);

  // Listen to window storage events & remote db restorations to auto sync state with deep-equality checks
  useEffect(() => {
    const handleStorageChange = () => {
      setForceRefresh(prev => prev + 1);
    };

    const handleReloadState = (e: any) => {
      const { key, value } = e.detail || {};
      if (!key) return;
      try {
        const parsed = JSON.parse(value);
        let updated = false;
        
        const currentStates = stateRef.current;

        if (key === 'dk_custom_pqc_items') {
          if (JSON.stringify(currentStates.customPqcItems) !== value) {
            setCustomPqcItems(parsed);
            updated = true;
          }
        } else if (key === 'dk_pqc_saved_history_templates') {
          if (JSON.stringify(currentStates.pqcSavedHistoryTemplates) !== value) {
            setPqcSavedHistoryTemplates(parsed);
            updated = true;
          }
        } else if (key === 'dk_custom_fpy_targets') {
          if (JSON.stringify(currentStates.customFpyTargets) !== value) {
            setCustomFpyTargets(parsed);
            updated = true;
          }
        } else if (key === 'dk_custom_sqc_items') {
          if (JSON.stringify(currentStates.customSqcItems) !== value) {
            setCustomSqcItems(parsed);
            updated = true;
          }
        } else if (key === 'dk_custom_iqc_notes') {
          if (JSON.stringify(currentStates.customIqcNotes) !== value) {
            setCustomIqcNotes(parsed);
            updated = true;
          }
        } else if (key === 'dk_iqc_saved_notes') {
          if (JSON.stringify(currentStates.savedIqcNoteTemplates) !== value) {
            setSavedIqcNoteTemplates(parsed);
            updated = true;
          }
        } else if (key === 'dk_qms_quality_planning_tasks') {
          if (JSON.stringify(currentStates.tasks) !== value) {
            setTasks(parsed);
            updated = true;
          }
        } else if (key === `dk_weekly_assembly_${weekSuffix}` || (key === 'dk_weekly_assemblies_all' && parsed[weekSuffix])) {
          const targetVal = key === `dk_weekly_assembly_${weekSuffix}` ? parsed : parsed[weekSuffix];
          if (JSON.stringify(currentStates.weeklyAssembly) !== JSON.stringify(targetVal)) {
            setWeeklyAssemblyState(targetVal);
            updated = true;
          }
        } else if (key === `dk_monthly_assembly_${monthSuffix}` || (key === 'dk_monthly_assemblies_all' && parsed[monthSuffix])) {
          const targetVal = key === `dk_monthly_assembly_${monthSuffix}` ? parsed : parsed[monthSuffix];
          if (JSON.stringify(currentStates.monthlyAssembly) !== JSON.stringify(targetVal)) {
            setMonthlyAssemblyState(targetVal);
            updated = true;
          }
        } else if (key === `dk_weekly_supply_${weekSuffix}` || (key === 'dk_weekly_supplies_all' && parsed[weekSuffix])) {
          const targetVal = key === `dk_weekly_supply_${weekSuffix}` ? parsed : parsed[weekSuffix];
          if (JSON.stringify(currentStates.weeklySupply) !== JSON.stringify(targetVal)) {
            setWeeklySupplyState(targetVal);
            updated = true;
          }
        } else if (key === `dk_monthly_supply_${monthSuffix}` || (key === 'dk_monthly_supplies_all' && parsed[monthSuffix])) {
          const targetVal = key === `dk_monthly_supply_${monthSuffix}` ? parsed : parsed[monthSuffix];
          if (JSON.stringify(currentStates.monthlySupply) !== JSON.stringify(targetVal)) {
            setMonthlySupplyState(targetVal);
            updated = true;
          }
        } else if (key === `dk_weekly_timeline_${weekSuffix}` || (key === 'dk_weekly_timelines_all' && parsed[weekSuffix])) {
          const targetVal = key === `dk_weekly_timeline_${weekSuffix}` ? parsed : parsed[weekSuffix];
          if (JSON.stringify(currentStates.weeklyTimeline) !== JSON.stringify(targetVal)) {
            setWeeklyTimelineState(targetVal);
            updated = true;
          }
        } else if (key === `dk_monthly_timeline_${monthSuffix}` || (key === 'dk_monthly_timelines_all' && parsed[monthSuffix])) {
          const targetVal = key === `dk_monthly_timeline_${monthSuffix}` ? parsed : parsed[monthSuffix];
          if (JSON.stringify(currentStates.monthlyTimeline) !== JSON.stringify(targetVal)) {
            setMonthlyTimelineState(targetVal);
            updated = true;
          }
        }

        if (updated) {
          setForceRefresh(prev => prev + 1);
        }
      } catch (err) {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dk_planning_reload_state', handleReloadState);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dk_planning_reload_state', handleReloadState);
    };
  }, [weekSuffix, monthSuffix]);

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<QualityTask | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSection, setNewTaskSection] = useState<'backlog' | 'capa' | 'ptsp' | 'coordination' | 'eco'>('backlog');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskRef, setNewTaskRef] = useState('');
  const [newTaskModel, setNewTaskModel] = useState('');
  const [newTaskSupplier, setNewTaskSupplier] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<'Pending' | 'In_Progress' | 'Completed'>('Pending');

  // Trạng thái mở rộng bảng KanBan và zoom từng phân ban của anh Thao
  const [boardLayout, setBoardLayout] = useState<'grid' | 'scroll'>('grid');
  const [zoomedColumn, setZoomedColumn] = useState<'backlog' | 'capa' | 'ptsp' | 'coordination' | 'eco' | null>(null);

  // --- TỰ ĐỘNG CHUYỂN CÁC CÔNG VIỆC PTSP TRONG BẢNG TỒN ĐỌNG (BACKLOG) SANG BẢNG PTSP ---
  useEffect(() => {
    let changed = false;
    const updatedTasks = tasks.map(t => {
      const titleLower = (t.title || '').toLowerCase().trim();
      const notesLower = (t.notes || '').toLowerCase().trim();
      const refLower = (t.modelOrSupplier || '').toLowerCase().trim();

      const isPtsp = titleLower.includes('ptsp') || 
                     titleLower.includes('phát triển') || 
                     titleLower.includes('mẫu xe') || 
                     titleLower.includes('xe mẫu') || 
                     titleLower.includes('r&d') || 
                     notesLower.includes('ptsp') || 
                     notesLower.includes('phát triển') || 
                     refLower.includes('ptsp');

      if (t.section === 'backlog' && isPtsp) {
        changed = true;
        // Trưởng phòng QLCL Nguyễn Xuân Thao chịu trách nhiệm chính về mảng PTSP
        return { 
          ...t, 
          section: 'ptsp' as const, 
          assignee: t.assignee === 'Đoàn Anh Hùng' ? 'Nguyễn Xuân Thao' : t.assignee 
        };
      }
      return t;
    });

    if (changed) {
      setTasks(updatedTasks);
    }
  }, [tasks]);

  // --- TỰ ĐỘNG PHÂN BỔ TRÁCH NHIỆM CHUẨN QUY TRÌNH QMS ---
  useEffect(() => {
    if (showAddTaskModal && !editingTask) {
      if (newTaskSection === 'backlog') {
        setNewTaskAssignee('Đoàn Anh Hùng');
      } else if (newTaskSection === 'capa') {
        setNewTaskAssignee('Hoàng Văn Phấn');
      } else if (newTaskSection === 'ptsp') {
        setNewTaskAssignee('Nguyễn Xuân Thao');
      } else if (newTaskSection === 'coordination') {
        setNewTaskAssignee('Nguyễn Xuân Thao');
      } else if (newTaskSection === 'eco') {
        setNewTaskAssignee('Nguyễn Xuân Thao');
      }
    }
  }, [newTaskSection, showAddTaskModal, editingTask]);

  const qmsRecommendationText = useMemo(() => {
    switch (newTaskSection) {
      case 'backlog':
        return '';
      case 'capa':
        return 'Khuyến nghị QMS: Giao cho tổ trưởng PQC Hoàng Văn Phấn hoặc tổ trưởng OQC Hà Khắc Việt để kịp thời gá lắp và sửa công đoạn lỗi.';
      case 'ptsp':
        return 'Khuyến nghị QMS: Giao cho Trưởng phòng Nguyễn Xuân Thao (Phụ trách ban phát triển mẫu xe mới) chịu trách nhiệm chính/phê duyệt sản quyền.';
      case 'coordination':
        return 'Khuyến nghị QMS: Giao cho Trưởng phòng Nguyễn Xuân Thao chỉ đạo phối hợp liên xưởng đối tác.';
      case 'eco':
        return 'Khuyến nghị QMS: Giao cho Phòng Kỹ Thuật (Phụ trách ban cải tiến thay đổi kỹ thuật ECO) theo dõi tiến độ áp dụng mẫu.';
      default:
        return '';
    }
  }, [newTaskSection]);

  const timelineKeys = planningMode === 'weekly' ? weeklyTimeline : monthlyTimeline;

  // Tính tổng sản lượng xe lắp ráp theo từng dòng Model
  const modelProductionTotals = useMemo(() => {
    const totals: { [model: string]: number } = {};
    const dataset = (planningMode === 'weekly' ? weeklyAssembly : monthlyAssembly) || {};
    
    Object.keys(dataset).forEach(model => {
      let sum = 0;
      if (Array.isArray(timelineKeys)) {
        timelineKeys.forEach(t => {
          sum += (dataset[model]?.[t] || 0);
        });
      }
      totals[model] = sum;
    });
    return totals;
  }, [planningMode, weeklyAssembly, monthlyAssembly, timelineKeys, forceRefresh]);

  const grandTotalProduction = useMemo(() => {
    return Object.values(modelProductionTotals || {}).reduce((a: number, b: number) => a + b, 0);
  }, [modelProductionTotals]);

  // --- HÀM XỬ LÝ SỰ KIỆN CO GIÃN ĐIỀU CHỈNH CELL NỘI BỘ ---

  // Chỉnh sửa số lượng xe trong biểu đồ lắp ráp trực quan
  const handleAssemblyChange = (model: string, time: string, value: string) => {
    const num = parseInt(value) || 0;
    if (planningMode === 'weekly') {
      setWeeklyAssembly(prev => ({
        ...prev,
        [model]: {
          ...(prev[model] || {}),
          [time]: num
        }
      }));
    } else {
      setMonthlyAssembly(prev => ({
        ...prev,
        [model]: {
          ...(prev[model] || {}),
          [time]: num
        }
      }));
    }
    setForceRefresh(prev => prev + 1);
  };

  // Chỉnh sửa vật tư cung ứng của nhà cung cấp
  const handleSupplyChange = (supplier: string, time: string, value: string) => {
    if (planningMode === 'weekly') {
      setWeeklySupply(prev => ({
        ...prev,
        [supplier]: {
          ...(prev[supplier] || {}),
          [time]: value
        }
      }));
    } else {
      setMonthlySupply(prev => ({
        ...prev,
        [supplier]: {
          ...(prev[supplier] || {}),
          [time]: value
        }
      }));
    }
    setForceRefresh(prev => prev + 1);
  };

  // Reset dữ liệu về ban đầu nhanh chóng
  const handleResetData = () => {
    if (window.confirm("Bạn có chắc muốn nạp lại dữ liệu mẫu gốc của DKBike để đối chiếu hay không?")) {
      // Nạp lại các tác vụ lập kế hoạch chất lượng mẫu
      setTasks(getInitialQmsPlanningTasks(selectedMonth, selectedYear));

      if (planningMode === 'weekly') {
        const defaultWTimeline = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        setWeeklyTimeline(defaultWTimeline);
        setWeeklyAssembly({
          'DK Roma SX V2': { 'Thứ 2': 40, 'Thứ 3': 45, 'Thứ 4': 50, 'Thứ 5': 45, 'Thứ 6': 50, 'Thứ 7': 30, 'Chủ nhật': 0 },
          'DK Gogo Smart': { 'Thứ 2': 50, 'Thứ 3': 60, 'Thứ 4': 55, 'Thứ 5': 50, 'Thứ 6': 70, 'Thứ 7': 40, 'Chủ nhật': 0 },
          'DK Nova': { 'Thứ 2': 20, 'Thứ 3': 25, 'Thứ 4': 20, 'Thứ 5': 30, 'Thứ 6': 25, 'Thứ 7': 15, 'Chủ nhật': 0 },
          'DK V2': { 'Thứ 2': 30, 'Thứ 3': 35, 'Thứ 4': 30, 'Thứ 5': 40, 'Thứ 6': 35, 'Thứ 7': 20, 'Chủ nhật': 0 }
        });
        setWeeklySupply({
          'Nhà cung cấp Việt Nhật': { 'Thứ 2': 'Khung sườn / 100', 'Thứ 4': 'Chén bi / 250', 'Thứ 6': 'Khung sườn / 120' },
          'Nhà cung cấp Shin-Etsu': { 'Thứ 3': 'Rắc sạc đúc / 200', 'Thứ 5': 'Socket thun / 150' },
          'Phụ tùng điện MOTO-DK': { 'Thứ 2': 'Động cơ / 50', 'Thứ 4': 'IC điều tốc / 120', 'Thứ 6': 'Động cơ / 80' },
          'Nhựa đúc Á Châu': { 'Thứ 3': 'Dàn nhựa / 100 bộ', 'Thứ 5': 'Yếm xe / 150 bộ' },
          'Ắc quy Chilwee Việt Nam': { 'Thứ 2': 'Bình điện / 500 hũ', 'Thứ 4': 'Ắc quy khô / 300 bình' }
        });
      } else {
        const defaultMTimeline = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];
        setMonthlyTimeline(defaultMTimeline);
        setMonthlyAssembly({
          'DK Roma SX V2': { 'Tuần 1': 180, 'Tuần 2': 190, 'Tuần 3': 200, 'Tuần 4': 180, 'Tuần 5': 0 },
          'DK Gogo Smart': { 'Tuần 1': 220, 'Tuần 2': 240, 'Tuần 3': 230, 'Tuần 4': 250, 'Tuần 5': 0 },
          'DK Nova': { 'Tuần 1': 100, 'Tuần 2': 110, 'Tuần 3': 100, 'Tuần 4': 120, 'Tuần 5': 0 },
          'DK V2': { 'Tuần 1': 120, 'Tuần 2': 130, 'Tuần 3': 140, 'Tuần 4': 120, 'Tuần 5': 0 }
        });
        setMonthlySupply({
          'Nhà cung cấp Việt Nhật': { 'Tuần 1': 'Khung sườn / 400', 'Tuần 2': 'Chén bi / 1000', 'Tuần 3': 'Khung sườn / 450', 'Tuần 4': 'Chén bi / 800' },
          'Nhà cung cấp Shin-Etsu': { 'Tuần 1': 'Rắc sạc / 800', 'Tuần 3': 'Socket thun / 600' },
          'Phụ tùng điện MOTO-DK': { 'Tuần 1': 'Động cơ / 250', 'Tuần 2': 'IC sườn / 500', 'Tuần 3': 'Động cơ / 300', 'Tuần 4': 'Động cơ / 200' },
          'Nhựa đúc Á Châu': { 'Tuần 2': 'Nhựa ốp / 800 bộ', 'Tuần 4': 'Dàn yếm / 1000 bộ' },
          'Ắc quy Chilwee Việt Nam': { 'Tuần 1': 'Bình điện / 2000 hũ', 'Tuần 3': 'Ắc quy khô / 1500 bình' }
        });
      }
      setForceRefresh(prev => prev + 1);
    }
  };

  // --- LOGIC TỰ ĐỘNG SINH KẾ HOẠCH (AUTO-GENERATED QUALITY TARGETS & INTERVENTIONS) ---

  // 1. KẾ HOẠCH PQC (Sản phẩm dở dang trong chuyền ráp)
  // Quy tắc tự động: Sinh 2-3 hạng mục kiểm soát đặc thù cho mỗi dòng xe (model)
  // Phân chia thành: Kiểm soát linh kiện từ kho xuất vào & Kiểm tra thao tác công đoạn.
  // Số lượt (tần suất) tăng cường đặc thù dựa trên độ cảnh báo / lịch sử lỗi KCS của ô model đó.
  const generatedPqcPlan = useMemo(() => {
    return Object.keys(modelProductionTotals || {}).map(model => {
      const prodQty = modelProductionTotals[model] || 0;
      
      // Khớp chéo cảnh báo lỗi thực tế từ dữ liệu OQC nhập liệu phía trước
      const modelDefects = oqcRecords.filter(rec => {
        if (!rec.model || !model) return false;
        const rModel = rec.model.trim().toLowerCase();
        const mModel = model.trim().toLowerCase();
        return rec.status === 'Lỗi' && (rModel === mModel || rModel.includes(mModel) || mModel.includes(rModel));
      });

      // Sắp xếp các lỗi theo tần suất xuất hiện (failedCount) từ cao xuống thấp
      const sortedDefects = [...modelDefects].sort((a, b) => {
        const countA = typeof a.failedCount === 'number' ? a.failedCount : 0;
        const countB = typeof b.failedCount === 'number' ? b.failedCount : 0;
        return countB - countA;
      });

      // Chỉ lấy tối đa 3 lỗi có số lượng cao nhất
      const top3Defects = sortedDefects.slice(0, 3);

      let defectAlert = null;
      let remedyAction = null;

      if (modelDefects.length > 0) {
        defectAlert = `Phát hiện ${modelDefects.length} lỗi thực tế ở khâu OQC (hiện thị Top 3 lỗi nhiều nhất): ` + top3Defects.map(d => `${d.defectDetail} (${d.failedCount} lượt)`).filter(Boolean).join('; ');
        remedyAction = `Nguyên nhân & Đối sách: ` + top3Defects.map(d => `${d.defectDetail} -> ${d.rootCause || 'Kiểm soát lắp ráp'}${d.treatment ? ` (${d.treatment})` : ''}`).filter(Boolean).join(' | ');
      }

      // Lấy từ custom hoặc sinh động dựa trên lỗi OQC thực tế
      const finalItems = customPqcItems[model] !== undefined 
        ? customPqcItems[model] 
        : getDynamicControlItems(model, modelDefects);

      return {
        model,
        prodQty,
        assignee: 'Hoàng Văn Phấn', // Chuyên môn hóa PQC Line Supervisor
        defectAlert,
        remedyAction,
        controlItems: finalItems
      };
    });
  }, [modelProductionTotals, customPqcItems, oqcRecords, forceRefresh]);

  // 2. KẾ HOẠCH OQC (Kiểm thử vận hành & Sát hạch xe thành phẩm xuất xưởng)
  // Quy tắc tự động: Kiểm thử sụt sạt 100% sản lượng ra lò xe máy để đảm bảo xuất xưởng an toàn tuyệt đối
  const generatedOqcPlan = useMemo(() => {
    return Object.keys(modelProductionTotals || {}).map(model => {
      const prodQty = modelProductionTotals[model] || 0;
      // Do OQC cần sát hạch 100% xe ráp được, số lượng cần test là 100% của sản lượng lắp ráp.
      const oqcTestQty = prodQty;
      
      // Sắp xếp người phụ trách sát hạch viên OQC
      let inspector = 'Liễu Tùng Lâm';
      if (model && (model.includes('Roma') || model.includes('EZ3'))) {
        inspector = 'Lành Xuân Hải';
      } else if (model && (model.includes('Volt') || model.includes('V2') || model.includes('V1'))) {
        inspector = 'Hà Khắc Việt'; // Trưởng ban OQC đích thân giám sát Volt v2 / V2
      }

      const specificFpy = customFpyTargets[model] !== undefined ? customFpyTargets[model] : fpyTarget;

      return {
        model,
        prodQty,
        oqcTestQty,
        fpyTarget: `${specificFpy}%`,
        rawFpyTarget: specificFpy,
        assignee: inspector,
        auditCriteria: model && (model.includes('Gogo') || model.includes('Volt') || model.includes('V2') || model.includes('V1')) 
          ? 'Kiểm tra tỳ lực BMS & đoản mạch nguồn tích hợp sạc nhanh' 
          : 'Thử phuốc giảm chấn cổ & sát hạch phanh thủy lực dốc cao'
      };
    });
  }, [modelProductionTotals, fpyTarget, customFpyTargets, forceRefresh]);

  // 3. KẾ HOẠCH SQC & IQC (Xem xét và tách xuất các lô hàng vật liệu nhập cảng NCC)
  // Quy tắc tự động: Phân rã chuỗi "Linh kiện / Số lượng" từ Kế hoạch nhập hàng để tạo mảng kiểm định IQC
  const generatedIqcSupplyPlan = useMemo(() => {
    const list: Array<{ id: string; supplier: string; material: string; qty: number; timeline: string; assignee: string }> = [];
    const dataset = (planningMode === 'weekly' ? weeklySupply : monthlySupply) || {};
    let index = 1;

    Object.keys(dataset).forEach(supplier => {
      if (Array.isArray(timelineKeys)) {
        timelineKeys.forEach(t => {
          const rawText = dataset[supplier]?.[t];
          const text = typeof rawText === 'string' ? rawText : (rawText != null ? String(rawText) : '');
          if (text.trim() !== '') {
            // Parse tách cụm: "Khung sườn / 100" thành tên="Khung sườn" và qty=100
            const parts = text.split('/');
            const matName = parts[0] ? parts[0].trim() : 'Linh kiện gốc';
            const qtyVal = parts[1] ? (parseInt(parts[1].replace(/[^0-9]/g, '')) || 100) : 100;
            
            // Phân công phụ trách chuyên biệt dựa trên bản đồ phân công 2026 mới
            const specs = getSupplierSpecialists(supplier);
            const assignee = specs.iqc;

            list.push({
              id: `IQC-GEN-${index.toString().padStart(3, '0')}`,
              supplier: supplier || 'Nhà cung cấp gốc',
              material: matName,
              qty: qtyVal,
              timeline: t,
              assignee
            });
            index++;
          }
        });
      }
    });
    return list;
  }, [planningMode, weeklySupply, monthlySupply, timelineKeys, forceRefresh]);

  // 3b. ĐẦU VIỆC KIỂM TRA NHÀ CUNG CẤP (SQC Plan - Supplier Quality Control)
  // Trích lọc các hoạt động can thiệp chất lượng tại nhà xưởng đối tác để ngăn ngừa lỗi dập cục bộ, bavia rỉ sét
  const generatedSqcPlan = useMemo(() => {
    const uniqueSuppliersWithDeliveries = Array.from(new Set(generatedIqcSupplyPlan.map(x => x.supplier))) as string[];
    
    return uniqueSuppliersWithDeliveries.map((sup, idx) => {
      const specs = getSupplierSpecialists(sup);
      let assignee = specs.sqc;

      let taskDesc = 'Chưa thiết lập nội dung giám sát SQC. Vui lòng bấm sửa để ghi nhận.';
      let criteria = 'Chưa thiết lập tiêu chuẩn kiểm soát dứt điểm.';

      if (customSqcItems[sup]) {
        taskDesc = customSqcItems[sup].taskDescription || taskDesc;
        criteria = customSqcItems[sup].targetSpecs || criteria;
      }

      return {
        id: `SQC-GEN-${(idx + 1).toString().padStart(3, '0')}`,
        supplier: sup,
        taskDescription: taskDesc,
        targetSpecs: criteria,
        assignee
      };
    });
  }, [generatedIqcSupplyPlan, customSqcItems, forceRefresh]);

  // Đồng bộ toàn bộ kế hoạch tự động sinh vào Bảng quản lý tác vụ (Thành phần 3)
  const handleSyncAutoPlansToWorkboard = () => {
    const newTasksToSync: QualityTask[] = [];
    const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`;

    // 1. Đồng bộ PQC
    generatedPqcPlan.forEach((plan, pIdx) => {
      if (plan.prodQty > 0) {
        plan.controlItems.forEach((item, iIdx) => {
          const typeLabel = item.type === 'incoming' ? 'KT LK vào chuyền' : 'KT công đoạn';
          newTasksToSync.push({
            id: `T-PQC-${plan.model.replace(/\s+/g, '')}-${iIdx}-${selectedMonth}`,
            section: 'capa',
            title: `[Tự động PQC] ${typeLabel}: ${item.name} dòng xe ${plan.model} (${plan.prodQty} xe, tần suất: ${item.frequencyDesc})`,
            assignee: plan.assignee,
            deadline: dateStr,
            status: 'Pending',
            priority: 'Medium',
            modelOrSupplier: plan.model,
            month: selectedMonth,
            year: selectedYear
          });
        });
      }
    });

    // 2. Đồng bộ OQC
    generatedOqcPlan.forEach((plan, idx) => {
      if (plan.prodQty > 0) {
        newTasksToSync.push({
          id: `T-OQC-${plan.model.replace(/\s+/g, '')}-${selectedMonth}`,
          section: 'backlog',
          title: `[Tự động OQC] Sát hạch kiểm thử xe xuất xưởng ${plan.model} (${plan.oqcTestQty} xe, chỉ tiêu FPY đạt: ${plan.fpyTarget})`,
          assignee: plan.assignee,
          deadline: dateStr,
          status: 'Pending',
          priority: 'High',
          modelOrSupplier: plan.model,
          month: selectedMonth,
          year: selectedYear
        });
      }
    });

    // 3. Đồng bộ IQC nhập linh kiện
    generatedIqcSupplyPlan.forEach((iqc, idx) => {
      if (iqc.qty > 0) {
        newTasksToSync.push({
          id: `T-IQC-${iqc.supplier.replace(/\s+/g, '')}-${idx}-${selectedMonth}`,
          section: 'backlog',
          title: `[Tự động IQC] Kiểm định chất lượng vật tư ${iqc.material} từ NCC ${iqc.supplier} (Số lượng: ${iqc.qty} bộ, mốc: ${iqc.timeline})`,
          assignee: iqc.assignee,
          deadline: dateStr,
          status: 'Pending',
          priority: 'Medium',
          modelOrSupplier: iqc.supplier,
          month: selectedMonth,
          year: selectedYear
        });
      }
    });

    // 4. Đồng bộ SQC đánh giá nhà thầu/đối tác
    generatedSqcPlan.forEach((sqc, idx) => {
      newTasksToSync.push({
        id: `T-SQC-${sqc.supplier.replace(/\s+/g, '')}-${idx}-${selectedMonth}`,
        section: 'coordination',
        title: `[Tự động SQC] Giám sát kỹ thuật tại xưởng ${sqc.supplier}: ${sqc.taskDescription} (${sqc.targetSpecs})`,
        assignee: sqc.assignee,
        deadline: dateStr,
        status: 'Pending',
        priority: 'High',
        modelOrSupplier: sqc.supplier,
        month: selectedMonth,
        year: selectedYear
      });
    });

    if (newTasksToSync.length === 0) {
      alert("⚠️ Không phát hiện sản lượng lắp ráp hoặc mốc bàn giao linh kiện nhà cung cấp nào hằng tuần để đồng bộ! Vui lòng điền thông số vào bảng Kế hoạch lắp ráp hoặc bảng Kế hoạch nhập hàng góc trên trước.");
      return;
    }

    setTasks(prev => {
      // Loại bỏ các tác vụ tự động sinh trước đó ở cùng kỳ tháng/năm để tránh trùng lặp chồng lấn số liệu cũ
      const filtered = prev.filter(t => {
        const isCurrentPeriod = (t.month === selectedMonth && t.year === selectedYear);
        const isAutoTask = t.title.startsWith('[Tự động PQC]') || 
                           t.title.startsWith('[Tự động OQC]') || 
                           t.title.startsWith('[Tự động IQC]') || 
                           t.title.startsWith('[Tự động SQC]');
        return !(isCurrentPeriod && isAutoTask);
      });

      return [...filtered, ...newTasksToSync];
    });

    alert(`✅ Đã cập nhật & đồng bộ thành công ${newTasksToSync.length} tác vụ chuyên môn (PQC/OQC/IQC/SQC) tự động sinh vào Bảng Phân Tác Vụ QMS của Tháng ${selectedMonth}/${selectedYear} ở bên dưới!`);
  };

  const handleSyncPlansToReportsSystem = (quiet = false) => {
    const normWeek = selectedWeek.replace('W', 'T');
    const targetsToPush: any[] = [];
    
    // 1. OQC Targets (from generatedOqcPlan)
    generatedOqcPlan.forEach((plan, idx) => {
      if (plan.prodQty > 0) {
        targetsToPush.push({
          id: `wt-oqc-${plan.model.replace(/\s+/g, '')}-${normWeek}-${selectedMonth}-${selectedYear}`,
          category: "OQC",
          content: `[OQC] Kiểm nghiệm sát hạch xe xuất xưởng dòng xe ${plan.model} (${plan.oqcTestQty} xe, chỉ tiêu FPY đạt: ${plan.fpyTarget})`,
          unit: "Xe",
          targetValue: `${plan.oqcTestQty} xe`,
          actualValue: "",
          achieved: undefined,
          explanation: `Sản lượng lắp ráp kế hoạch: ${plan.prodQty} xe.`,
          assignee: plan.assignee,
          collaborator: "Tổ KCS đầu ra"
        });
      }
    });

    // 2. IQC Targets (from generatedIqcSupplyPlan)
    generatedIqcSupplyPlan.forEach((iqc, idx) => {
      if (iqc.qty > 0) {
        targetsToPush.push({
          id: `wt-iqc-${iqc.supplier.replace(/\s+/g, '')}-${idx}-${normWeek}-${selectedMonth}-${selectedYear}`,
          category: "IQC",
          content: `[IQC] Kiểm định chi tiết linh kiện ${iqc.material} từ nhà cung cấp ${iqc.supplier} (Lô hàng: ${iqc.qty} bộ)`,
          unit: "Lô hàng",
          targetValue: `${iqc.qty} bộ`,
          actualValue: "",
          achieved: undefined,
          explanation: `Bắt buộc kiểm thử mốc giao nhận: ${iqc.timeline}. ${customIqcNotes[iqc.supplier]?.noteText || ''}`,
          assignee: iqc.assignee,
          collaborator: "Bộ phận Kho / Linh kiện"
        });
      }
    });

    // 3. PQC Targets (from generatedPqcPlan)
    generatedPqcPlan.forEach((plan, pIdx) => {
      if (plan.prodQty > 0) {
        plan.controlItems.forEach((item, iIdx) => {
          const typeLabel = item.type === 'incoming' ? 'KT LK vào chuyền' : 'KT công đoạn';
          targetsToPush.push({
            id: `wt-pqc-${plan.model.replace(/\s+/g, '')}-${pIdx}-${iIdx}-${normWeek}-${selectedMonth}-${selectedYear}`,
            category: "PQC",
            content: `[PQC] ${typeLabel}: ${item.name} dòng xe ${plan.model} (${plan.prodQty} xe)`,
            unit: "Lượt",
            targetValue: item.frequencyDesc,
            actualValue: "",
            achieved: undefined,
            explanation: `Tiêu chuẩn kiểm soát công đoạn ráp dứt điểm. ${item.explanation}`,
            assignee: plan.assignee,
            collaborator: "Phòng QLCL & Xưởng lắp ráp"
          });
        });
      }
    });

    // 4. SQC Targets (from generatedSqcPlan)
    generatedSqcPlan.forEach((sqc, idx) => {
      targetsToPush.push({
        id: `wt-sqc-${sqc.supplier.replace(/\s+/g, '')}-${idx}-${normWeek}-${selectedMonth}-${selectedYear}`,
        category: "SQC/QA",
        content: `[SQC] Đánh giá chất lượng trực địa tại nhà máy ${sqc.supplier}: ${sqc.taskDescription}`,
        unit: "Lần",
        targetValue: "1",
        actualValue: "",
        achieved: undefined,
        explanation: `Khắc phục dứt điểm rủi ro: ${sqc.targetSpecs}`,
        assignee: sqc.assignee,
        collaborator: "Tổ SQC & Ban Mua hàng"
      });
    });

    // 5. ECO Targets (from localStorage dk_ecos)
    try {
      const savedEcosStr = localStorage.getItem('dk_ecos');
      if (savedEcosStr) {
        const parsed = JSON.parse(savedEcosStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((eco: any) => {
            const applyD = eco.applyDate || eco.ImplementationDate;
            const { month: ecoMonth, year: ecoYear } = parseDateYearMonth(applyD, selectedMonth, selectedYear);

            if (ecoMonth === selectedMonth && ecoYear === selectedYear) {
              // For weekly planning, check if it matches the selected week
              let matchesPeriod = true;
              if (planningMode === 'weekly') {
                const ecoWeek = getWeekFromDateString(applyD || "");
                matchesPeriod = (ecoWeek === selectedWeek);
              }

              if (matchesPeriod) {
                targetsToPush.push({
                  id: `wt-eco-${eco.id}-${normWeek}-${selectedMonth}-${selectedYear}`,
                  category: "ECO",
                  content: `[Thay đổi ECO - ${eco.category || 'KT'}] ${eco.ecrId || eco.id}: ${eco.content} (Model: ${eco.model || 'Chung'})`,
                  unit: "Bộ phận",
                  targetValue: eco.component || "Cấu kiện thay đổi",
                  actualValue: eco.status === 'Đã áp dụng' ? "Đã áp dụng" : (eco.status || "Chờ thực hiện"),
                  achieved: eco.status === 'Đã áp dụng' ? true : false,
                  explanation: `Người đề xuất: ${eco.proposer || 'Nguyễn Xuân Thao'}. Ngày áp dụng: ${applyD || 'Đang rà soát'}.`,
                  assignee: eco.proposer || 'Nguyễn Xuân Thao',
                  collaborator: "Phòng QLCL & Kỹ Thuật"
                });
              }
            }
          });
        }
      }
    } catch (_) {}

    if (targetsToPush.length === 0) {
      if (!quiet) alert("⚠️ Không biên soạn được chỉ tiêu kiểm soát nào! Vui lòng cập nhật số lượng lắp ráp hoặc giao nhận linh kiện trước.");
      return;
    }

    if (planningMode === 'weekly') {
      if (!setWeeklyPlans || !weeklyPlans) {
        if (!quiet) alert("⚠️ Không tìm thấy hệ thống trạng thái kế hoạch tuần toàn cục.");
        return;
      }

      const planId = `wplan-${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${normWeek}`;
      const existingPlan = weeklyPlans.find(p => p.id === planId);

      if (existingPlan) {
        const mergedTargets = [...existingPlan.targets];
        targetsToPush.forEach(newT => {
          const idx = mergedTargets.findIndex(t => t.id === newT.id || (t.category === newT.category && t.content === newT.content));
          if (idx !== -1) {
            mergedTargets[idx] = { ...mergedTargets[idx], ...newT, actualValue: mergedTargets[idx].actualValue || newT.actualValue };
          } else {
            mergedTargets.push(newT);
          }
        });

        setWeeklyPlans(weeklyPlans.map(p => p.id === planId ? { ...p, targets: mergedTargets } : p));
      } else {
        const newPlan = {
          id: planId,
          year: selectedYear,
          month: selectedMonth,
          week: normWeek,
          status: 'Approved',
          targets: targetsToPush
        };
        setWeeklyPlans([newPlan, ...weeklyPlans]);
      }
      if (!quiet) alert(`✅ Đã đồng bộ thành công ${targetsToPush.length} chỉ tiêu tác vụ vào Kế Hoạch & BÁO CÁO TUẦN ${normWeek} - Tháng ${selectedMonth}/${selectedYear}!`);
    } else {
      if (!setMonthlyPlans || !monthlyPlans) {
        if (!quiet) alert("⚠️ Không tìm thấy hệ thống trạng thái kế hoạch tháng toàn cục.");
        return;
      }

      const planId = `mplan-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const existingPlan = monthlyPlans.find(p => p.id === planId);

      if (existingPlan) {
        const mergedTargets = [...existingPlan.targets];
        targetsToPush.forEach(newT => {
          const idx = mergedTargets.findIndex(t => t.id === newT.id || (t.category === newT.category && t.content === newT.content));
          if (idx !== -1) {
            mergedTargets[idx] = { ...mergedTargets[idx], ...newT, actualValue: mergedTargets[idx].actualValue || newT.actualValue };
          } else {
            mergedTargets.push(newT);
          }
        });

        setMonthlyPlans(monthlyPlans.map(p => p.id === planId ? { ...p, targets: mergedTargets } : p));
      } else {
        const newPlan = {
          id: planId,
          year: selectedYear,
          month: selectedMonth,
          status: 'Approved',
          targets: targetsToPush
        };
        setMonthlyPlans([newPlan, ...monthlyPlans]);
      }
      if (!quiet) alert(`✅ Đã đồng bộ thành công ${targetsToPush.length} chỉ tiêu tác vụ vào Kế Hoạch & BÁO CÁO THÁNG ${selectedMonth}/${selectedYear}!`);
    }
  };

  // --- HÀM XUẤT TOÀN BỘ KẾ HOẠCH RA FILE EXCEL (XLSX STYLE) ---
  const handleExportPlanningExcel = () => {
    const COLOR_ACCENT = "0F172A"; // Slate Accent
    const COLOR_BG_LIGHT = "F8FAFC"; // Light Slate background
    const cellBordersNormal = {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    };

    const styleSheet = (ws: any, rowTracker: any[], columnsCount: number) => {
      const decodedRange = XLSXStyle.utils.decode_range(ws['!ref'] || `A1:K1`);
      
      for (let r = decodedRange.s.r; r <= decodedRange.e.r; r++) {
        const rowInfo = rowTracker[r];
        const type = rowInfo?.type;

        for (let c = decodedRange.s.c; c < columnsCount; c++) {
          const cellRef = XLSXStyle.utils.encode_cell({ r, c });
          let cell = ws[cellRef];
          if (!cell) {
            cell = { t: "s", v: "" };
            ws[cellRef] = cell;
          }

          cell.s = {
            font: { name: "Arial", sz: 9.5, color: { rgb: "334155" } },
            alignment: { horizontal: "left", vertical: "center" }
          };

          if (type === 'header-company') {
            cell.s = {
              font: { name: "Arial", sz: 9, bold: true, color: { rgb: "475569" } },
              alignment: { horizontal: "left", vertical: "center" }
            };
          } else if (type === 'header-slogan') {
            cell.s = {
              font: { name: "Arial", sz: 9, bold: true, color: { rgb: "1E293B" } },
              alignment: { horizontal: c >= (columnsCount - 3) ? "center" : "left", vertical: "center" }
            };
          } else if (type === 'header-meta') {
            cell.s = {
              font: { name: "Arial", sz: 8.5, italic: true, color: { rgb: "64748B" } },
              alignment: { horizontal: c >= (columnsCount - 3) ? "center" : "left", vertical: "center" }
            };
          } else if (type === 'main-title') {
            cell.s = {
              font: { name: "Arial", sz: 14, bold: true, color: { rgb: COLOR_ACCENT } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (type === 'main-subtitle') {
            cell.s = {
              font: { name: "Arial", sz: 9.5, bold: true, italic: true, color: { rgb: "334155" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (type === 'section-heading') {
            cell.s = {
              fill: { fgColor: { rgb: COLOR_ACCENT } },
              font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
              alignment: { horizontal: "left", vertical: "center", indent: 1 },
              border: cellBordersNormal
            };
          } else if (type === 'table-header') {
            cell.s = {
              fill: { fgColor: { rgb: COLOR_BG_LIGHT } },
              font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: COLOR_ACCENT } },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: cellBordersNormal
            };
          } else if (type === 'table-header-group') {
            cell.s = {
              fill: { fgColor: { rgb: "E2E8F0" } },
              font: { name: "Arial", sz: 9.5, bold: true, color: { rgb: COLOR_ACCENT } },
              alignment: { horizontal: "left", vertical: "center", indent: 1 },
              border: cellBordersNormal
            };
          } else if (type === 'table-data-model-plan') {
            cell.s = {
              font: { name: "Arial", sz: 9.5 },
              alignment: (c === 0 || c >= 2) ? { horizontal: "center", vertical: "center" } : { horizontal: "left", vertical: "center" },
              border: cellBordersNormal
            };
            if (c === 1) {
              cell.s.font = { name: "Arial", sz: 9.5, bold: true };
            }
          } else if (type === 'table-data-supplier-plan') {
            cell.s = {
              font: { name: "Arial", sz: 9.5 },
              alignment: (c === 0 || c === columnsCount - 1) ? { horizontal: "center", vertical: "center" } : { horizontal: "left", vertical: "center", wrapText: true },
              border: cellBordersNormal
            };
          } else if (type === 'table-data-plan-target') {
            cell.s = {
              font: { name: "Arial", sz: 9.5 },
              alignment: (c === 0 || c === 1 || c === 3 || c === 5) ? { horizontal: "center", vertical: "center" } : { horizontal: "left", vertical: "center", wrapText: true },
              border: cellBordersNormal
            };
          } else if (type === 'table-data-log') {
            cell.s = {
              font: { name: "Arial", sz: 9.5 },
              alignment: (c === 0 || c === 1 || c === 3 || c === 4 || c === 5 || c === 6 || c === 7) ? { horizontal: "center", vertical: "center" } : { horizontal: "left", vertical: "center", wrapText: true },
              border: cellBordersNormal
            };
            if (c === 6) {
              const val = rowInfo?.pctVal || 0;
              cell.s.fill = { fgColor: { rgb: val === 100 ? "D1FAE5" : "FEF3C7" } };
              cell.s.font = { name: "Arial", sz: 9.2, bold: true, color: { rgb: val === 100 ? "065F46" : "92400E" } };
            }
          } else if (type === 'signature-label') {
            cell.s = {
              font: { name: "Arial", sz: 10, bold: true, color: { rgb: "0F172A" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (type === 'signature-sub') {
            cell.s = {
              font: { name: "Arial", sz: 8.5, italic: true, color: { rgb: "64748B" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (type === 'signature-name') {
            cell.s = {
              font: { name: "Arial", sz: 10.5, bold: true, color: { rgb: "0F172A" } },
              alignment: { horizontal: "center", vertical: "center" }
            };
          } else if (type === 'table-data-empty') {
            cell.s = {
              font: { name: "Arial", sz: 9.5, italic: true, color: { rgb: "64748B" } },
              alignment: { horizontal: "left", vertical: "center" },
              border: cellBordersNormal
            };
          }
        }
      }
    };

    const setRowHeights = (ws: any, rowTracker: any[]) => {
      const heights: any[] = [];
      for (let r = 0; r < rowTracker.length; r++) {
        const rType = rowTracker[r]?.type;
        if (rType === 'header-company' || rType === 'header-slogan' || rType === 'header-meta') heights.push({ hpt: 18 });
        else if (rType === 'spacer') heights.push({ hpt: 8 });
        else if (rType === 'main-title') heights.push({ hpt: 30 });
        else if (rType === 'main-subtitle') heights.push({ hpt: 18 });
        else if (rType === 'section-heading') heights.push({ hpt: 24 });
        else if (rType === 'table-header') heights.push({ hpt: 24 });
        else if (rType === 'table-header-group') heights.push({ hpt: 22 });
        else if (rType === 'spacer-sig') heights.push({ hpt: 45 });
        else if (rType === 'signature-label' || rType === 'signature-name') heights.push({ hpt: 20 });
        else heights.push({ hpt: 20 });
      }
      ws['!rows'] = heights;
    };

    const today = new Date();
    const dateStrLoc = `Lạng Sơn, ngày ${today.getDate().toString().padStart(2, '0')} tháng ${(today.getMonth() + 1).toString().padStart(2, '0')} năm ${today.getFullYear()}`;
    const curPeriodLabel = planningMode === 'weekly' 
      ? `TUÂN ${selectedWeek} - THÁNG ${selectedMonth}/${selectedYear}`
      : `THÁNG ${selectedMonth}/${selectedYear}`;

    // Tính toán số lượt hàng về trên toàn bộ nhà cung cấp
    let totalIncomingDeliveries = 0;
    const calcSupplyDataset = (planningMode === 'weekly' ? weeklySupply : monthlySupply) || {};
    Object.keys(calcSupplyDataset).forEach(sup => {
      if (Array.isArray(timelineKeys)) {
        timelineKeys.forEach(t => {
          const val = calcSupplyDataset[sup]?.[t];
          if (val && val !== '-' && val !== 0 && String(val).trim() !== '') {
            totalIncomingDeliveries++;
          }
        });
      }
    });

    // ==========================================
    // SHEET 1: KẾ HOẠCH LẮP RÁP & CUNG ỨNG VẬT TƯ
    // ==========================================
    const aoaData1: any[][] = [];
    const rowTracker1: any[] = [];
    const merges1: any[] = [];
    const totalCols1 = timelineKeys.length + 3; // STT, Model, timelineKeys..., Total

    function addMerge1(sr: number, sc: number, er: number, ec: number) {
      merges1.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }

    // Company Header
    aoaData1.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", ...new Array(Math.max(0, totalCols1 - 4)).fill(""), "HỆ THỐNG QUẢN TRỊ CHẤT LƯỢNG QMS"]);
    rowTracker1.push({ type: 'header-company' });
    addMerge1(0, 0, 0, 3);
    addMerge1(0, totalCols1 - 3, 0, totalCols1 - 1);

    aoaData1.push(["Phân hệ: Lập kế hoạch chất lượng Tổng thể", "", "", "", ...new Array(Math.max(0, totalCols1 - 4)).fill(""), "Tiêu chuẩn ISO 9001:2015"]);
    rowTracker1.push({ type: 'header-slogan' });
    addMerge1(1, 0, 1, 3);
    addMerge1(1, totalCols1 - 3, 1, totalCols1 - 1);

    const codeForm1 = `Mã kế hoạch: BM-DKB-QLCL-PLAN-${planningMode === 'weekly' ? 'W' : 'M'}-${selectedMonth.toString().padStart(2, '0')}`;
    aoaData1.push([codeForm1, "", "", "", ...new Array(Math.max(0, totalCols1 - 4)).fill(""), dateStrLoc]);
    rowTracker1.push({ type: 'header-meta' });
    addMerge1(2, 0, 2, 3);
    addMerge1(2, totalCols1 - 3, 2, totalCols1 - 1);

    // Spacer
    aoaData1.push(new Array(totalCols1).fill(""));
    rowTracker1.push({ type: 'spacer' });

    // Main Title
    const titleText = `BẢN KẾ HOẠCH LẮP RÁP VÀ CUNG ỨNG VẬT TƯ CHẤT LƯỢNG`;
    aoaData1.push([titleText, ...new Array(totalCols1 - 1).fill("")]);
    rowTracker1.push({ type: 'main-title' });
    addMerge1(4, 0, 4, totalCols1 - 1);

    aoaData1.push([`Chu kỳ triển khai: ${curPeriodLabel} | QMS Auto-Sync`, ...new Array(totalCols1 - 1).fill("")]);
    rowTracker1.push({ type: 'main-subtitle' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, totalCols1 - 1);

    // Chỉ số tổng hợp dốc chất lượng cực chất theo chỉ đạo của anh Thao
    const sumRowLabel = `🔥 CHU KỲ TRIỂN KHAI: [Tổng xe cần lắp ráp: ${grandTotalProduction} xe]  ||  [Tổng số lượt hàng về: ${totalIncomingDeliveries} lượt]`;
    aoaData1.push([sumRowLabel, ...new Array(totalCols1 - 1).fill("")]);
    rowTracker1.push({ type: 'main-subtitle' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, totalCols1 - 1);

    // Spacer
    aoaData1.push(new Array(totalCols1).fill(""));
    rowTracker1.push({ type: 'spacer' });

    // Section 1: Kế hoạch lắp ráp
    aoaData1.push(["I. KẾ HOẠCH LẮP RÁP XE THÀNH PHẨM (PRODUCTION PLAN - UNITS)", ...new Array(totalCols1 - 1).fill("")]);
    rowTracker1.push({ type: 'section-heading' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, totalCols1 - 1);

    // Table Header
    const excelTimelineHeaders = timelineKeys.map((t, idx) => {
      if (planningMode === 'weekly') {
        const dStr = getExactDateForWeekDay(selectedYear, selectedMonth, selectedWeek, idx, t);
        return `${t} (${dStr})`;
      }
      return t;
    });

    aoaData1.push(["STT", "Dòng Model sản phẩm", ...excelTimelineHeaders, "Tổng Sản Lượng"]);
    rowTracker1.push({ type: 'table-header' });

    // Assembly Data
    const assemblyDataset = (planningMode === 'weekly' ? weeklyAssembly : monthlyAssembly) || {};
    const assemblyModels = Object.keys(assemblyDataset);

    if (assemblyModels.length === 0) {
      aoaData1.push(["-", "Chưa điền danh sách model và số lượng sụt sạt xe nào cho kỳ này.", ...new Array(totalCols1 - 2).fill("")]);
      rowTracker1.push({ type: 'table-data-empty' });
      addMerge1(aoaData1.length - 1, 1, aoaData1.length - 1, totalCols1 - 1);
    } else {
      assemblyModels.forEach((model, idx) => {
        let rowSum = 0;
        const rowTimeValues = timelineKeys.map(t => {
          const val = assemblyDataset[model]?.[t] || 0;
          rowSum += val;
          return val;
        });
        aoaData1.push([
          idx + 1,
          model,
          ...rowTimeValues,
          rowSum
        ]);
        rowTracker1.push({ type: 'table-data-model-plan' });
      });
    }

    // Grand total row
    aoaData1.push(["", "TỔNG SẢN LƯỢNG LẮP RÁP TOÀN BAN", ...new Array(timelineKeys.length).fill(""), grandTotalProduction]);
    rowTracker1.push({ type: 'table-data-model-plan' });
    addMerge1(aoaData1.length - 1, 1, aoaData1.length - 1, timelineKeys.length + 1);

    // Spacer
    aoaData1.push(new Array(totalCols1).fill(""));
    rowTracker1.push({ type: 'spacer' });

    // Section 2: Kế hoạch cung ứng
    aoaData1.push(["II. KẾ HOẠCH NHẬP HÀNG - CUNG ỨNG VẬT TƯ NCC (MATERIAL INCOMING PLAN)", ...new Array(totalCols1 - 1).fill("")]);
    rowTracker1.push({ type: 'section-heading' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, totalCols1 - 1);

    aoaData1.push(["STT", "Nhà cung cấp đối tác", ...excelTimelineHeaders, "Yêu cầu quy chuẩn"]);
    rowTracker1.push({ type: 'table-header' });

    const supplyDataset = (planningMode === 'weekly' ? weeklySupply : monthlySupply) || {};
    const supplySuppliers = Object.keys(supplyDataset);

    if (supplySuppliers.length === 0) {
      aoaData1.push(["-", "Chưa lập danh sách nhập linh kiện nhà cung cấp nào cho kỳ này.", ...new Array(totalCols1 - 2).fill("")]);
      rowTracker1.push({ type: 'table-data-empty' });
      addMerge1(aoaData1.length - 1, 1, aoaData1.length - 1, totalCols1 - 1);
    } else {
      supplySuppliers.forEach((sup, idx) => {
        const rowTimeValues = timelineKeys.map(t => supplyDataset[sup]?.[t] || "-");
        aoaData1.push([
          idx + 1,
          sup,
          ...rowTimeValues,
          "Đo kiểm QMS sụt sạt"
        ]);
        rowTracker1.push({ type: 'table-data-supplier-plan' });
      });
    }

    // Spacer
    aoaData1.push(new Array(totalCols1).fill(""));
    rowTracker1.push({ type: 'spacer' });

    // Section VI: Endorsement/Ký duyệt
    aoaData1.push(["Người lập biểu mẫu (KCS xác thực)", ...new Array(Math.floor(totalCols1/2)-1).fill(""), "Trưởng phòng QLCL (Thẩm duyệt số liệu)", ...new Array(Math.ceil(totalCols1/2)-1).fill(""), "Ban Giám Đốc Nhà Máy (Phê duyệt)"]);
    rowTracker1.push({ type: 'signature-label' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, Math.floor(totalCols1/2)-1);
    addMerge1(aoaData1.length - 1, Math.floor(totalCols1/2), aoaData1.length - 1, totalCols1 - 3);
    addMerge1(aoaData1.length - 1, totalCols1 - 2, aoaData1.length - 1, totalCols1 - 1);

    aoaData1.push(["(Bản điện tử phê chuẩn)", ...new Array(Math.floor(totalCols1/2)-1).fill(""), "(Đã duyệt ký trực tuyến)", ...new Array(Math.ceil(totalCols1/2)-1).fill(""), "(Hồ sơ lưu trữ tự động)"]);
    rowTracker1.push({ type: 'signature-sub' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, Math.floor(totalCols1/2)-1);
    addMerge1(aoaData1.length - 1, Math.floor(totalCols1/2), aoaData1.length - 1, totalCols1 - 3);
    addMerge1(aoaData1.length - 1, totalCols1 - 2, aoaData1.length - 1, totalCols1 - 1);

    aoaData1.push(new Array(totalCols1).fill(""));
    rowTracker1.push({ type: 'spacer-sig' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, Math.floor(totalCols1/2)-1);
    addMerge1(aoaData1.length - 1, Math.floor(totalCols1/2), aoaData1.length - 1, totalCols1 - 3);
    addMerge1(aoaData1.length - 1, totalCols1 - 2, aoaData1.length - 1, totalCols1 - 1);

    aoaData1.push(["Chuyên viên QMS Core", ...new Array(Math.floor(totalCols1/2)-1).fill(""), "NGUYỄN XUÂN THAO", ...new Array(Math.ceil(totalCols1/2)-1).fill(""), "BAN GIÁM ĐỐC DKBIKE"]);
    rowTracker1.push({ type: 'signature-name' });
    addMerge1(aoaData1.length - 1, 0, aoaData1.length - 1, Math.floor(totalCols1/2)-1);
    addMerge1(aoaData1.length - 1, Math.floor(totalCols1/2), aoaData1.length - 1, totalCols1 - 3);
    addMerge1(aoaData1.length - 1, totalCols1 - 2, aoaData1.length - 1, totalCols1 - 1);

    const ws1 = XLSXStyle.utils.aoa_to_sheet(aoaData1);
    styleSheet(ws1, rowTracker1, totalCols1);
    ws1['!merges'] = merges1;
    setRowHeights(ws1, rowTracker1);

    const colWidths1 = [
      { wch: 6 },
      { wch: 22 },
      ...new Array(timelineKeys.length).fill({ wch: 12 }),
      { wch: 18 }
    ];
    ws1['!cols'] = colWidths1;


    // =========================================================================
    // SHEET 2: KẾ HOẠCH QMS CHUYÊN BIỆT TỰ ĐỘNG SINH (PQC/OQC/IQC/SQC AUTO PLANS)
    // =========================================================================
    const aoaData2: any[][] = [];
    const rowTracker2: any[] = [];
    const merges2: any[] = [];

    function addMerge2(sr: number, sc: number, er: number, ec: number) {
      merges2.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }

    // Company Header
    aoaData2.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "THÀNH VIÊN BAN KIỂM SOÁT CL QMS CORE", "", ""]);
    rowTracker2.push({ type: 'header-company' });
    addMerge2(0, 0, 0, 3);
    addMerge2(0, 4, 0, 6);

    aoaData2.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Hệ thống liên thông dữ liệu tự động sinh", "", ""]);
    rowTracker2.push({ type: 'header-slogan' });
    addMerge2(1, 0, 1, 3);
    addMerge2(1, 4, 1, 6);

    const codeForm2 = `Mã kiểm soát: BM-DKB-AUTO-QMS-${planningMode === 'weekly' ? 'W' : 'M'}-${selectedMonth.toString().padStart(2, '0')}`;
    aoaData2.push([codeForm2, "", "", "", dateStrLoc, "", ""]);
    rowTracker2.push({ type: 'header-meta' });
    addMerge2(2, 0, 2, 3);
    addMerge2(2, 4, 2, 6);

    // Spacer
    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer' });

    // Title
    aoaData2.push([`KẾ HOẠCH KIỂM SOÁT CHẤT LƯỢNG TỰ ĐỘNG SINH (AUTO-GENERATED QMS)`, "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'main-title' });
    addMerge2(4, 0, 4, 6);

    aoaData2.push([`Áp dụng chu kỳ: ${curPeriodLabel} | Đồng bộ lỗi sụt sát sang dây chuyền`, "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'main-subtitle' });
    addMerge2(5, 0, 5, 6);

    // Spacer
    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer' });

    // PART A: PQC Plans
    aoaData2.push(["I. KẾ HOẠCH KIỂM SOÁT PQC TRONG DÂY CHUYỀN (PQC IN-LINE AUDIT PLAN)", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'section-heading' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 6);

    aoaData2.push(["Model xe", "Sản lượng", "Thao tác công đoạn / Cán bộ phụ trách", "Cảnh báo chất lượng / Tần suất", "Biện pháp kiểm soát chi tiết", "Sản lượng xe kiểm", "Đối sách phòng ngừa"]);
    rowTracker2.push({ type: 'table-header' });

    if (generatedPqcPlan.length === 0) {
      aoaData2.push(["-", "Chưa có dự kiến dòng sản xuất để trích lục kế hoạch PQC tự động.", "", "", "", "", ""]);
      rowTracker2.push({ type: 'table-data-empty' });
      addMerge2(aoaData2.length - 1, 1, aoaData2.length - 1, 6);
    } else {
      generatedPqcPlan.forEach(plan => {
        const firstCtrl = plan.controlItems[0];
        const nextCtrls = plan.controlItems.slice(1);
        
        aoaData2.push([
          plan.model,
          plan.prodQty,
          `${firstCtrl?.name || "Chốt chặn kiểm soát"} (${plan.assignee})`,
          firstCtrl?.frequencyDesc || "100% sụt sạt",
          firstCtrl?.explanation || "Chi tiết mô tả khuyến cáo kỹ thuật, SOP áp dụng hoặc đối sách lỗi",
          plan.prodQty,
          plan.defectAlert || "Không phát hiện tích lũy lỗi OQC từ tháng trước."
        ]);
        rowTracker2.push({ type: 'table-data-plan-target' });

        nextCtrls.forEach(ctrl => {
          aoaData2.push([
            "",
            "",
            ctrl.name,
            ctrl.frequencyDesc,
            ctrl.explanation || "Chi tiết mô tả khuyến cáo kỹ thuật, SOP áp dụng hoặc đối sách lỗi",
            "",
            ""
          ]);
          rowTracker2.push({ type: 'table-data-plan-target' });
        });
      });
    }

    // Spacer
    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer' });

    // PART B: OQC Plans
    aoaData2.push(["II. KIỂM THỬ VẬN HÀNH & SÁT HẠCH XE THÀNH PHẨM XUẤT XƯỞNG (OQC OPERATIONAL TEST PLAN)", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'section-heading' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 6);

    aoaData2.push(["STT", "Dòng Model xe", "Sát hạch viên sụt khảo", "Sản lượng dự kiến", "Tiêu chuẩn kiểm nghiệm nghiêm ngặt", "Lực FPY mục tiêu (%)", "Số lượng xe kiểm (OQC)"]);
    rowTracker2.push({ type: 'table-header' });

    if (generatedOqcPlan.length === 0) {
      aoaData2.push(["-", "Chưa có dòng model xe sản xuất để sinh kế hoạch OQC thành phẩm.", "", "", "", "", ""]);
      rowTracker2.push({ type: 'table-data-empty' });
      addMerge2(aoaData2.length - 1, 1, aoaData2.length - 1, 6);
    } else {
      generatedOqcPlan.forEach((plan, idx) => {
        aoaData2.push([
          idx + 1,
          plan.model,
          plan.assignee,
          plan.prodQty,
          plan.auditCriteria,
          plan.fpyTarget,
          plan.oqcTestQty
        ]);
        rowTracker2.push({ type: 'table-data-plan-target' });
      });
    }

    // Spacer
    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer' });

    // PART C: IQC Plans
    aoaData2.push(["III. KẾ HOẠCH KIỂM NGHIỆM VẬT TƯ ĐẦU CẢP BẾN (IQC INCOMING MATERIALS PLAN)", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'section-heading' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 6);

    aoaData2.push(["Mã QC sinh", "Nhà cung cấp đối tác", "Tên linh kiện bàn giao", "Khối lượng bàn giao bộ", "Ghi chú đo kiểm mẫu", "Kỹ sư IQC phụ trách", "Mốc giao nhận"]);
    rowTracker2.push({ type: 'table-header' });

    if (generatedIqcSupplyPlan.length === 0) {
      aoaData2.push(["-", "Thông tin vật tư nhà cung cấp trống. Vui lòng lập Kế hoạch cung ứng trước.", "", "", "", "", ""]);
      rowTracker2.push({ type: 'table-data-empty' });
      addMerge2(aoaData2.length - 1, 1, aoaData2.length - 1, 6);
    } else {
      generatedIqcSupplyPlan.forEach(iqc => {
        const compositeKey = `${iqc.supplier}||${iqc.material}`;
        const noteVal = customIqcNotes[compositeKey] || "Đo kiểm QMS dung sai mẫu mẫu / Bavia rỉ sét";
        aoaData2.push([
          iqc.id,
          iqc.supplier,
          iqc.material,
          iqc.qty,
          noteVal,
          iqc.assignee,
          iqc.timeline
        ]);
        rowTracker2.push({ type: 'table-data-plan-target' });
      });
    }

    // Spacer
    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer' });

    // PART D: SQC Plans
    aoaData2.push(["IV. KẾ HOẠCH TUÂN TRA CAN THIỆP TRỰC ĐỊA XƯỞNG ĐÚC CỦA ĐỐI TÁC VỆ TINH (SQC SUPPLIER SITE INSPECTION PLAN)", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'section-heading' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 6);

    aoaData2.push(["Mã SQC sinh", "Nhà cung cấp vệ tinh", "Kỹ sư SQC phụ trách tuần tra", "Mục tiêu tuần tra can thiệp trực địa xưởng đúc của đối tác", "Tiêu chuẩn nghiệm thu tại nguồn", "Cơ cấu đo kiểm dung sai đúc khuôn", "Tần suất tuần tra"]);
    rowTracker2.push({ type: 'table-header' });

    if (generatedSqcPlan.length === 0) {
      aoaData2.push(["-", "Không có đầu việc SQC đối tác nhà cung cấp nào phát sinh trong chu kỳ này.", "", "", "", "", ""]);
      rowTracker2.push({ type: 'table-data-empty' });
      addMerge2(aoaData2.length - 1, 1, aoaData2.length - 1, 6);
    } else {
      generatedSqcPlan.forEach(sqc => {
        aoaData2.push([
          sqc.id,
          sqc.supplier,
          sqc.assignee,
          sqc.taskDescription.includes('Chưa thiết lập') ? `Tuần tra trực địa xưởng đúc, can thiệp kiểm soát bọt tĩnh khí, vết mẻ rỗ góc trên khuôn đúc hợp kim của ${sqc.supplier}` : sqc.taskDescription,
          sqc.targetSpecs.includes('Chưa thiết lập') ? `Sát hạch bavia đúc thô hằng ca tại nguồn lực đối tác` : sqc.targetSpecs,
          "Dung sai đúc khuôn ±0.05mm",
          `Tuần tra hiện trường định kỳ hằng tuần`
        ]);
        rowTracker2.push({ type: 'table-data-plan-target' });
      });
    }

    // Spacer
    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer' });

    // Section VI: Endorsement/Ký duyệt
    aoaData2.push(["Người lập biểu mẫu (KCS xác thực)", "", "Trưởng phòng QLCL (Thẩm duyệt số liệu)", "", "Ban Giám Đốc Nhà Máy (Xác nhận thông báo)", "", ""]);
    rowTracker2.push({ type: 'signature-label' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 1);
    addMerge2(aoaData2.length - 1, 2, aoaData2.length - 1, 3);
    addMerge2(aoaData2.length - 1, 4, aoaData2.length - 1, 6);

    aoaData2.push(["(Bản điện tử phê chuẩn)", "", "(Đã duyệt ký trực tuyến)", "", "(Hồ sơ lưu trữ tự động)", "", ""]);
    rowTracker2.push({ type: 'signature-sub' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 1);
    addMerge2(aoaData2.length - 1, 2, aoaData2.length - 1, 3);
    addMerge2(aoaData2.length - 1, 4, aoaData2.length - 1, 6);

    aoaData2.push(["", "", "", "", "", "", ""]);
    rowTracker2.push({ type: 'spacer-sig' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 1);
    addMerge2(aoaData2.length - 1, 2, aoaData2.length - 1, 3);
    addMerge2(aoaData2.length - 1, 4, aoaData2.length - 1, 6);

    aoaData2.push(["Chuyên viên QMS Core", "", "NGUYỄN XUÂN THAO", "", "BAN GIÁM ĐỐC DKBIKE", "", ""]);
    rowTracker2.push({ type: 'signature-name' });
    addMerge2(aoaData2.length - 1, 0, aoaData2.length - 1, 1);
    addMerge2(aoaData2.length - 1, 2, aoaData2.length - 1, 3);
    addMerge2(aoaData2.length - 1, 4, aoaData2.length - 1, 6);

    const ws2 = XLSXStyle.utils.aoa_to_sheet(aoaData2);
    styleSheet(ws2, rowTracker2, 7);
    ws2['!merges'] = merges2;
    setRowHeights(ws2, rowTracker2);

    const colWidths2 = [
      { wch: 15 },
      { wch: 12 },
      { wch: 22 },
      { wch: 20 },
      { wch: 45 },
      { wch: 14 },
      { wch: 25 }
    ];
    ws2['!cols'] = colWidths2;


    // =========================================================================
    // SHEET 3: BẢNG TÁC VỤ CHẤT LƯỢNG & PHÂN CÔNG HÀNH ĐỘNG
    // =========================================================================
    const aoaData3: any[][] = [];
    const rowTracker3: any[] = [];
    const merges3: any[] = [];

    function addMerge3(sr: number, sc: number, er: number, ec: number) {
      merges3.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }

    // Company Header
    aoaData3.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", "", ""]);
    rowTracker3.push({ type: 'header-company' });
    addMerge3(0, 0, 0, 3);
    addMerge3(0, 4, 0, 7);

    aoaData3.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Độc lập - Tự do - Hạnh phúc", "", "", ""]);
    rowTracker3.push({ type: 'header-slogan' });
    addMerge3(1, 0, 1, 3);
    addMerge3(1, 4, 1, 7);

    const codeForm3 = `Hệ thống tracking: BM-DKB-TASK-BOARDS-${selectedMonth}`;
    aoaData3.push([codeForm3, "", "", "", dateStrLoc, "", "", ""]);
    rowTracker3.push({ type: 'header-meta' });
    addMerge3(2, 0, 2, 3);
    addMerge3(2, 4, 2, 7);

    // Spacer
    aoaData3.push(["", "", "", "", "", "", "", ""]);
    rowTracker3.push({ type: 'spacer' });

    // Title
    aoaData3.push([`BẢNG TÁC VỤ QUẢN LÝ CHẤT LƯỢNG & ĐIỀU PHỐI ĐA THÀNH VIÊN`, "", "", "", "", "", "", ""]);
    rowTracker3.push({ type: 'main-title' });
    addMerge3(4, 0, 4, 7);

    aoaData3.push([`Hành động thực thi chu kỳ: ${curPeriodLabel} | QMS Workboard`, "", "", "", "", "", "", ""]);
    rowTracker3.push({ type: 'main-subtitle' });
    addMerge3(5, 0, 5, 7);

    // Spacer
    aoaData3.push(["", "", "", "", "", "", "", ""]);
    rowTracker3.push({ type: 'spacer' });

    // Section Header
    aoaData3.push(["DANH SÁCH CHI TIẾT CÁC TÁC VỤ CHẤT LƯỢNG KHẮC PHỤC (QMS ACTIONS LIST)", "", "", "", "", "", "", ""]);
    rowTracker3.push({ type: 'section-heading' });
    addMerge3(8, 0, 8, 7);

    aoaData3.push(["STT", "Mã tác vụ", "Chi tiết nhiệm vụ hành động / Tác vụ khắc phục", "Người chịu trách nhiệm", "Thời hạn hoàn thành", "Mức độ ưu tiên", "Trạng thái thực thi", "Phân nhóm QMS"]);
    rowTracker3.push({ type: 'table-header' });

    // Filter tasks for current period (dynamically synced to UI board tasks)
    const currentTasks = currentMonthTasks;

    if (currentTasks.length === 0) {
      aoaData3.push(["-", "Tuyệt vời! Không có tác vụ hay chỉ đạo hành động chất lượng nào chưa xử lý tồn đọng trong kỳ này.", "", "", "", "", "", ""]);
      rowTracker3.push({ type: 'table-data-empty' });
      addMerge3(aoaData3.length - 1, 1, aoaData3.length - 1, 7);
    } else {
      currentTasks.forEach((item, idx) => {
        let sectionText = "Đang rà soát";
        if (item.section === 'backlog') sectionText = "Tồn đọng / Sụt sạt (Backlog)";
        else if (item.section === 'capa') sectionText = "Hành động CAPA khắc phục";
        else if (item.section === 'ptsp') sectionText = "Phát triển mẫu xe mới (PTSP)";
        else if (item.section === 'coordination') sectionText = "Phối hợp liên bộ phận";

        const isCompleted = item.status === 'Completed' || item.status === 'Finished';
        const isInProgress = item.status === 'In_Progress' || item.status === 'In Progress' || item.status === 'Developing';
        const progressPct = isCompleted ? 100 : (isInProgress ? 50 : 0);
        const statusText = isCompleted ? "Đã duyệt hoàn thành" : (isInProgress ? "Đang gá biện pháp" : "Chờ kích hoạt xử lý");

        aoaData3.push([
          idx + 1,
          item.id,
          item.title,
          item.assignee,
          item.deadline || "Chu kỳ",
          item.priority,
          statusText,
          sectionText
        ]);
        rowTracker3.push({ type: 'table-data-log', pctVal: progressPct });
      });
    }

    // Spacer
    aoaData3.push(new Array(8).fill(""));
    rowTracker3.push({ type: 'spacer' });

    // Section VI: Endorsement/Ký duyệt
    aoaData3.push(["Người lập biểu mẫu (KCS xác thực)", "", "Trưởng phòng QLCL (Thẩm duyệt số liệu)", "", "Ban Giám Đốc Nhà Máy (Xác nhận thông báo)", "", "", ""]);
    rowTracker3.push({ type: 'signature-label' });
    addMerge3(aoaData3.length - 1, 0, aoaData3.length - 1, 1);
    addMerge3(aoaData3.length - 1, 2, aoaData3.length - 1, 3);
    addMerge3(aoaData3.length - 1, 4, aoaData3.length - 1, 7);

    aoaData3.push(["(Bản điện tử phê chuẩn)", "", "(Đã duyệt ký trực tuyến)", "", "(Hồ sơ lưu trữ tự động)", "", "", ""]);
    rowTracker3.push({ type: 'signature-sub' });
    addMerge3(aoaData3.length - 1, 0, aoaData3.length - 1, 1);
    addMerge3(aoaData3.length - 1, 2, aoaData3.length - 1, 3);
    addMerge3(aoaData3.length - 1, 4, aoaData3.length - 1, 7);

    aoaData3.push(["", "", "", "", "", "", "", ""]);
    rowTracker3.push({ type: 'spacer-sig' });
    addMerge3(aoaData3.length - 1, 0, aoaData3.length - 1, 1);
    addMerge3(aoaData3.length - 1, 2, aoaData3.length - 1, 3);
    addMerge3(aoaData3.length - 1, 4, aoaData3.length - 1, 7);

    aoaData3.push(["Chuyên viên QMS Core", "", "NGUYỄN XUÂN THAO", "", "BAN GIÁM ĐỐC DKBIKE", "", "", ""]);
    rowTracker3.push({ type: 'signature-name' });
    addMerge3(aoaData3.length - 1, 0, aoaData3.length - 1, 1);
    addMerge3(aoaData3.length - 1, 2, aoaData3.length - 1, 3);
    addMerge3(aoaData3.length - 1, 4, aoaData3.length - 1, 7);

    const ws3 = XLSXStyle.utils.aoa_to_sheet(aoaData3);
    styleSheet(ws3, rowTracker3, 8);
    ws3['!merges'] = merges3;
    setRowHeights(ws3, rowTracker3);

    const colWidths3 = [
      { wch: 6 },
      { wch: 12 },
      { wch: 48 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 22 }
    ];
    ws3['!cols'] = colWidths3;

    // ==========================================
    // SHEET 4: CÔNG VIỆC TỒN ĐỌNG QMS (Công việc chưa đạt 100%)
    // ==========================================
    const aoaData4: any[][] = [];
    const rowTracker4: any[] = [];
    const merges4: any[] = [];
    function addMerge4(sr: number, sc: number, er: number, ec: number) {
      merges4.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }
    aoaData4.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", ""]);
    rowTracker4.push({ type: 'header-company' });
    addMerge4(0, 0, 0, 3); addMerge4(0, 4, 0, 6);

    aoaData4.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Độc lập - Tự do - Hạnh phúc", "", ""]);
    rowTracker4.push({ type: 'header-slogan' });
    addMerge4(1, 0, 1, 3); addMerge4(1, 4, 1, 6);

    aoaData4.push([`Hệ thống tracking: BM-DKB-BACKLOGS-${selectedMonth}`, "", "", "", dateStrLoc, "", ""]);
    rowTracker4.push({ type: 'header-meta' });
    addMerge4(2, 0, 2, 3); addMerge4(2, 4, 2, 6);

    aoaData4.push(["", "", "", "", "", "", ""]);
    rowTracker4.push({ type: 'spacer' });

    aoaData4.push([`BÁO CÁO TỔNG HỢP CÁC CÔNG VIỆC CHẤT LƯỢNG TỒN ĐỌNG CHƯA HOÀN THÀNH`, "", "", "", "", "", ""]);
    rowTracker4.push({ type: 'main-title' });
    addMerge4(4, 0, 4, 6);

    aoaData4.push([`Chu kỳ tổng hợp: ${curPeriodLabel} | QMS Backlog Core`, "", "", "", "", "", ""]);
    rowTracker4.push({ type: 'main-subtitle' });
    addMerge4(5, 0, 5, 6);

    aoaData4.push(["", "", "", "", "", "", ""]);
    rowTracker4.push({ type: 'spacer' });

    aoaData4.push(["DANH SÁCH CÁC TÁC VỤ QMS CHƯA HOÀN THÀNH - ĐANG TRONG TIẾN TRÌNH", "", "", "", "", "", ""]);
    rowTracker4.push({ type: 'section-heading' });
    addMerge4(8, 0, 8, 6);

    aoaData4.push(["STT", "Mã tác vụ", "Chi tiết công việc tồn đọng / Chỉ đạo hành động dở dang", "Người phụ trách", "Thời hạn hoàn thành", "Mức ưu tiên", "Phân nhóm QMS"]);
    rowTracker4.push({ type: 'table-header' });

    // Lọc công việc tồn đọng từ currentMonthTasks đã được tối ưu hóa đồng bộ trực quan với UI (loại bỏ các công việc [Tự động OQC] theo yêu cầu của anh Thao)
    const backlogTasks = currentMonthTasks.filter(t => t.section === 'backlog' && t.status !== 'Completed' && t.status !== 'Finished' && !t.title.includes('[Tự động OQC]'));

    if (backlogTasks.length === 0) {
      aoaData4.push(["-", "Tuyệt vời! Không có công việc tồn đọng dở dang nào chưa đạt trong kỳ này.", "", "", "", "", ""]);
      rowTracker4.push({ type: 'table-data-empty' });
      addMerge4(aoaData4.length - 1, 1, aoaData4.length - 1, 6);
    } else {
      backlogTasks.forEach((item, idx) => {
        let grStr = "Tồn đọng chung";
        if (item.section === 'backlog') grStr = "Tồn đọng sụt sạt";
        else if (item.section === 'capa') grStr = "Hành động CAPA khắc phục";
        else if (item.section === 'ptsp') grStr = "Phát triển xe mới (PTSP)";
        else if (item.section === 'coordination') grStr = "Phối hợp liên ban";

        aoaData4.push([
          idx + 1,
          item.id,
          item.title,
          item.assignee,
          item.deadline || "Trong kỳ",
          item.priority,
          grStr
        ]);
        rowTracker4.push({ type: 'table-data-log', pctVal: 30 });
      });
    }

    const ws4 = XLSXStyle.utils.aoa_to_sheet(aoaData4);
    styleSheet(ws4, rowTracker4, 7);
    ws4['!merges'] = merges4;
    setRowHeights(ws4, rowTracker4);
    ws4['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 50 }, { wch: 18 }, { wch: 14 }, { wch: 11 }, { wch: 24 }];

    // ==========================================
    // SHEET 5: BIÊN BẢN CAPA MỞ
    // ==========================================
    const aoaData5: any[][] = [];
    const rowTracker5: any[] = [];
    const merges5: any[] = [];
    function addMerge5(sr: number, sc: number, er: number, ec: number) {
      merges5.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }
    aoaData5.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", "", ""]);
    rowTracker5.push({ type: 'header-company' });
    addMerge5(0, 0, 0, 3); addMerge5(0, 4, 0, 7);

    aoaData5.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Độc lập - Tự do - Hạnh phúc", "", "", ""]);
    rowTracker5.push({ type: 'header-slogan' });
    addMerge5(1, 0, 1, 3); addMerge5(1, 4, 1, 7);

    aoaData5.push([`Hệ thống tracking: BM-DKB-CAPA-OPEN-${selectedMonth}`, "", "", "", dateStrLoc, "", "", ""]);
    rowTracker5.push({ type: 'header-meta' });
    addMerge5(2, 0, 2, 3); addMerge5(2, 4, 2, 7);

    aoaData5.push(["", "", "", "", "", "", "", ""]);
    rowTracker5.push({ type: 'spacer' });

    aoaData5.push([`DANH SÁCH CÁC BIÊN BẢN KHẮC PHỤC CAPA ĐANG MỞ (OPEN CAPAS)`, "", "", "", "", "", "", ""]);
    rowTracker5.push({ type: 'main-title' });
    addMerge5(4, 0, 4, 7);

    aoaData5.push([`Phòng ngừa rủi ro dứt điểm | Đáp ứng tiêu chuẩn đánh giá ISO 9001:2015`, "", "", "", "", "", "", ""]);
    rowTracker5.push({ type: 'main-subtitle' });
    addMerge5(5, 0, 5, 7);

    aoaData5.push(["", "", "", "", "", "", "", ""]);
    rowTracker5.push({ type: 'spacer' });

    aoaData5.push(["HỒ SƠ SỰ CỐ ĐANG IN-PROCESS BIỆN PHÁP KHẮC PHỤC CAPA CHƯA ĐÓNG HỒ SƠ", "", "", "", "", "", "", ""]);
    rowTracker5.push({ type: 'section-heading' });
    addMerge5(8, 0, 8, 7);

    aoaData5.push(["STT", "Mã biên bản", "Mô tả sự cố / Vấn đề phát hiện", "Cán bộ chịu trách nhiệm", "Thời hạn hoàn thành", "Phân tích nguyên nhân cốt lõi", "Biện pháp khắc phục chi tiết", "Trạng thái thực thi"]);
    rowTracker5.push({ type: 'table-header' });

    let activeCapas = [];
    try {
      const savedCapasStr = localStorage.getItem('dk_capas');
      if (savedCapasStr) {
        const parsed = JSON.parse(savedCapasStr);
        if (Array.isArray(parsed)) {
          activeCapas = parsed.filter((c: any) => {
            const statusStr = (c.Status || c.status || '').toLowerCase();
            const isOpen = !statusStr.includes('đóng') && !statusStr.includes('closed') && !statusStr.includes('đã đạt');
            if (!isOpen) return false;

            let mValue = selectedMonth;
            let yValue = selectedYear;
            const due = c.DueDate || c.targetDate;
            if (due && typeof due === 'string') {
              const matchesYMD = due.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
              const matchesDMY = due.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (matchesYMD) {
                mValue = Number(matchesYMD[2]);
                yValue = Number(matchesYMD[1]);
              } else if (matchesDMY) {
                mValue = Number(matchesDMY[2]);
                yValue = Number(matchesDMY[3]);
              }
            }
            return mValue === selectedMonth && yValue === selectedYear;
          });
        }
      }
    } catch (_) {}

    if (activeCapas.length === 0) {
      aoaData5.push(["-", "Tuyệt vời! Không có hồ sơ CAPA lỗi sụt sạt nào chưa xử lý dứt điểm trong kỳ này.", "", "", "", "", "", ""]);
      rowTracker5.push({ type: 'table-data-empty' });
      addMerge5(aoaData5.length - 1, 1, aoaData5.length - 1, 7);
    } else {
      activeCapas.forEach((item, idx) => {
        aoaData5.push([
          idx + 1,
          item.CAPAID || item.id,
          item.Issue || item.title || "Sụt sạt lắp ráp",
          item.Owner || item.assignee || "Phòng QLCL",
          item.DueDate || item.targetDate || "Trong chu kỳ",
          item.RootCause || item.rootCause || "Chờ phân tích 5-Why",
          item.Correction || item.actions || item.CorrectiveAction || "Đang rà soát biện pháp",
          item.Status || "Đang mở"
        ]);
        rowTracker5.push({ type: 'table-data-supplier-plan' });
      });
    }

    const ws5 = XLSXStyle.utils.aoa_to_sheet(aoaData5);
    styleSheet(ws5, rowTracker5, 8);
    ws5['!merges'] = merges5;
    setRowHeights(ws5, rowTracker5);
    ws5['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 18 }, { wch: 14 }, { wch: 25 }, { wch: 35 }, { wch: 12 }];

    // ==========================================
    // SHEET 6: PHÁT TRIỂN XE MỚI (PTSP)
    // ==========================================
    const aoaData6: any[][] = [];
    const rowTracker6: any[] = [];
    const merges6: any[] = [];
    function addMerge6(sr: number, sc: number, er: number, ec: number) {
      merges6.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }
    aoaData6.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", ""]);
    rowTracker6.push({ type: 'header-company' });
    addMerge6(0, 0, 0, 3); addMerge6(0, 4, 0, 6);

    aoaData6.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Độc lập - Tự do - Hạnh phúc", "", ""]);
    rowTracker6.push({ type: 'header-slogan' });
    addMerge6(1, 0, 1, 3); addMerge6(1, 4, 1, 6);

    aoaData6.push([`Hệ thống tracking: BM-DKB-PTSP-NEW-${selectedMonth}`, "", "", "", dateStrLoc, "", ""]);
    rowTracker6.push({ type: 'header-meta' });
    addMerge6(2, 0, 2, 3); addMerge6(2, 4, 2, 6);

    aoaData6.push(["", "", "", "", "", "", ""]);
    rowTracker6.push({ type: 'spacer' });

    aoaData6.push([`HỒ SƠ KHẢO SÁT & BÁO CÁO PHÁT TRIỂN MẪU XE MỚI (PTSP NEW VEHICLES)`, "", "", "", "", "", ""]);
    rowTracker6.push({ type: 'main-title' });
    addMerge6(4, 0, 4, 6);

    aoaData6.push([`Kế hoạch thử nghiệm chạy thực nghiệm & kiểm định chất lượng | QMS Innovation`, "", "", "", "", "", ""]);
    rowTracker6.push({ type: 'main-subtitle' });
    addMerge6(5, 0, 5, 6);

    aoaData6.push(["", "", "", "", "", "", ""]);
    rowTracker6.push({ type: 'spacer' });

    aoaData6.push(["DANH SÁCH DỰ ÁN PHÁT TRIỂN XE MỚI (PTSP) VÀ TIẾN ĐỘ CHẠY MẪU HÀNG LOẠT", "", "", "", "", "", ""]);
    rowTracker6.push({ type: 'section-heading' });
    addMerge6(8, 0, 8, 6);

    aoaData6.push(["STT", "Mã nhiệm vụ", "Nội dung công việc phát triển / Chạy mẫu thử nghiệm xe mới", "Kỹ sư phụ trách", "Thời hạn hoàn thành", "Mức độ ưu tiên", "Trạng thái thực thi"]);
    rowTracker6.push({ type: 'table-header' });

    const ptspTasks = currentMonthTasks.filter(t => t.section === 'ptsp');

    if (ptspTasks.length === 0) {
      aoaData6.push(["-", "Chưa phát sinh công việc quản trị phát triển xe mới (PTSP) nào cần thực hiện trong kỳ kế hoạch này.", "", "", "", "", ""]);
      rowTracker6.push({ type: 'table-data-empty' });
      addMerge6(aoaData6.length - 1, 1, aoaData6.length - 1, 6);
    } else {
      // Gom nhóm theo model giống hệt như trong app (zoomedColumn === 'ptsp')
      const groups: Record<string, QualityTask[]> = {};
      ptspTasks.forEach(task => {
        let model = (task.modelOrSupplier || '').trim();
        if (model.includes('|')) {
          model = model.split('|')[0].trim();
        }
        const groupName = model ? `Dòng xe mới ${model}` : 'Chung / Mẫu xe thử nghiệm khác';
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(task);
      });

      // Sắp xếp các nhóm
      const orderedKeys = Object.keys(groups).sort((a, b) => {
        if (a.startsWith('Chung')) return 1;
        if (b.startsWith('Chung')) return -1;
        return a.localeCompare(b, 'vi');
      });

      // Sắp xếp các tác vụ trong nhóm theo deadline từ cũ đến mới
      const sortTasksByDeadline = (taskList: QualityTask[]) => {
        return [...taskList].sort((a, b) => {
          const dA = a.deadline || '';
          const dB = b.deadline || '';
          if (!dA && !dB) return 0;
          if (!dA) return 1;
          if (!dB) return -1;
          const dateA = new Date(dA).getTime();
          const dateB = new Date(dB).getTime();
          const isAValid = !isNaN(dateA);
          const isBValid = !isNaN(dateB);
          if (isAValid && isBValid) {
            return dateA - dateB;
          }
          return dA.localeCompare(dB);
        });
      };

      let stt = 1;
      orderedKeys.forEach(groupKey => {
        const sortedGroupTasks = sortTasksByDeadline(groups[groupKey]);
        if (sortedGroupTasks.length > 0) {
          // Thêm hàng Group Header
          aoaData6.push([groupKey.toUpperCase(), "", "", "", "", "", ""]);
          rowTracker6.push({ type: 'table-header-group' });
          addMerge6(aoaData6.length - 1, 0, aoaData6.length - 1, 6);

          sortedGroupTasks.forEach(item => {
            aoaData6.push([
              stt++,
              item.id,
              item.title,
              item.assignee,
              item.deadline || "Chu kỳ",
              item.priority,
              item.status === 'Completed' ? "Đã đạt" : "Đang thực hiện"
            ]);
            rowTracker6.push({ type: 'table-data-plan-target' });
          });
        }
      });
    }

    const ws6 = XLSXStyle.utils.aoa_to_sheet(aoaData6);
    styleSheet(ws6, rowTracker6, 7);
    ws6['!merges'] = merges6;
    setRowHeights(ws6, rowTracker6);
    ws6['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 48 }, { wch: 18 }, { wch: 14 }, { wch: 11 }, { wch: 18 }];

    // ==========================================
    // SHEET 7: PHỐI HỢP LIÊN BAN
    // ==========================================
    const aoaData7: any[][] = [];
    const rowTracker7: any[] = [];
    const merges7: any[] = [];
    function addMerge7(sr: number, sc: number, er: number, ec: number) {
      merges7.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }
    aoaData7.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", ""]);
    rowTracker7.push({ type: 'header-company' });
    addMerge7(0, 0, 0, 3); addMerge7(0, 4, 0, 6);

    aoaData7.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Độc lập - Tự do - Hạnh phúc", "", ""]);
    rowTracker7.push({ type: 'header-slogan' });
    addMerge7(1, 0, 1, 3); addMerge7(1, 4, 1, 6);

    aoaData7.push([`Hệ thống tracking: BM-DKB-COORDS-${selectedMonth}`, "", "", "", dateStrLoc, "", ""]);
    rowTracker7.push({ type: 'header-meta' });
    addMerge7(2, 0, 2, 3); addMerge7(2, 4, 2, 6);

    aoaData7.push(["", "", "", "", "", "", ""]);
    rowTracker7.push({ type: 'spacer' });

    aoaData7.push([`KẾ HOẠCH PHỐI HỢP LIÊN PHÒNG BAN & GIÁM SÁT SẢN XUẤT (COORDINATIONS)`, "", "", "", "", "", ""]);
    rowTracker7.push({ type: 'main-title' });
    addMerge7(4, 0, 4, 6);

    aoaData7.push([`Chỉ đạo đồng hành liên thông giữa Công nghệ, Kho vận và phòng kiểm định QLCL | DKBike`, "", "", "", "", "", ""]);
    rowTracker7.push({ type: 'main-subtitle' });
    addMerge7(5, 0, 5, 6);

    aoaData7.push(["", "", "", "", "", "", ""]);
    rowTracker7.push({ type: 'spacer' });

    aoaData7.push(["DANH SÁCH HOẠT ĐỘNG PHỐI HỢP LIÊN BAN VÀ BIỆN PHÁP CHẤT LƯỢNG SONG HÀNH", "", "", "", "", "", ""]);
    rowTracker7.push({ type: 'section-heading' });
    addMerge7(8, 0, 8, 6);

    aoaData7.push(["STT", "Mã nhiệm vụ", "Nội dung chỉ định phối hợp liên phòng ban", "Cán bộ chịu trách nhiệm chính", "Thời hạn thực thi", "Mức độ ưu tiên", "Trạng thái phối hợp"]);
    rowTracker7.push({ type: 'table-header' });

    const coordinationTasks = currentMonthTasks.filter(t => t.section === 'coordination');

    if (coordinationTasks.length === 0) {
      aoaData7.push(["-", "Không phát sinh nhiệm vụ phối hợp liên ban nào đặc biệt trong chu kỳ này.", "", "", "", "", ""]);
      rowTracker7.push({ type: 'table-data-empty' });
      addMerge7(aoaData7.length - 1, 1, aoaData7.length - 1, 6);
    } else {
      coordinationTasks.forEach((item, idx) => {
        aoaData7.push([
          idx + 1,
          item.id,
          item.title,
          item.assignee,
          item.deadline || "Chu kỳ",
          item.priority,
          item.status === 'Completed' ? "Đã đạt" : "Đang thực hiện"
        ]);
        rowTracker7.push({ type: 'table-data-log', pctVal: item.status === 'Completed' ? 100 : 50 });
      });
    }

    const ws7 = XLSXStyle.utils.aoa_to_sheet(aoaData7);
    styleSheet(ws7, rowTracker7, 7);
    ws7['!merges'] = merges7;
    setRowHeights(ws7, rowTracker7);
    ws7['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 48 }, { wch: 18 }, { wch: 14 }, { wch: 11 }, { wch: 18 }];

    // ==========================================
    // SHEET 8: CẢI TIẾN KỸ THUẬT (ECO)
    // ==========================================
    const aoaData8: any[][] = [];
    const rowTracker8: any[] = [];
    const merges8: any[] = [];
    function addMerge8(sr: number, sc: number, er: number, ec: number) {
      merges8.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
    }
    aoaData8.push(["CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "", "", ""]);
    rowTracker8.push({ type: 'header-company' });
    addMerge8(0, 0, 0, 3); addMerge8(0, 4, 0, 7);

    aoaData8.push(["Phòng: Quản lý Chất lượng (QLCL) - DK QMS", "", "", "", "Độc lập - Tự do - Hạnh phúc", "", "", ""]);
    rowTracker8.push({ type: 'header-slogan' });
    addMerge8(1, 0, 1, 3); addMerge8(1, 4, 1, 7);

    aoaData8.push([`Hệ thống tracking: BM-DKB-ECO-NEW-${selectedMonth}`, "", "", "", dateStrLoc, "", "", ""]);
    rowTracker8.push({ type: 'header-meta' });
    addMerge8(2, 0, 2, 3); addMerge8(2, 4, 2, 7);

    aoaData8.push(["", "", "", "", "", "", "", ""]);
    rowTracker8.push({ type: 'spacer' });

    aoaData8.push([`TỔNG HỢP CÁC PHÁT KIẾN CẢI TIẾN KỸ THUẬT (ENGINEERING CHANGE ORDERS - ECO)`, "", "", "", "", "", "", ""]);
    rowTracker8.push({ type: 'main-title' });
    addMerge8(4, 0, 4, 7);

    aoaData8.push([`Theo dõi thực thi cải tiến, cải tiến công nghệ, khuôn mẫu ráp dây chuyền DKBike`, "", "", "", "", "", "", ""]);
    rowTracker8.push({ type: 'main-subtitle' });
    addMerge8(5, 0, 5, 7);

    aoaData8.push(["", "", "", "", "", "", "", ""]);
    rowTracker8.push({ type: 'spacer' });

    aoaData8.push(["DANH SÁCH CHI TIẾT CÁC CẢI TIẾN KỸ THUẬT ECO / ĐÁNH GIÁ SẢN LƢỢNG THỰC ĐỊA", "", "", "", "", "", "", ""]);
    rowTracker8.push({ type: 'section-heading' });
    addMerge8(8, 0, 8, 7);

    aoaData8.push(["STT", "Mã ECO / ECR", "Nội dung cải tiến kỹ thuật / Thay đổi vật liệu", "Mảng cải tiến", "Dòng xe áp dụng", "Kỹ sư đề đạt", "Ngày thử nghiệm áp dụng", "Trạng thái"]);
    rowTracker8.push({ type: 'table-header' });

    let activeEcos = [];
    try {
      const savedEcosStr = localStorage.getItem('dk_ecos');
      if (savedEcosStr) {
        const parsed = JSON.parse(savedEcosStr);
        if (Array.isArray(parsed)) {
          activeEcos = parsed;
        }
      }
    } catch (_) {}

    if (ecoTasks.length === 0) {
      aoaData8.push(["-", "Không có hoạt động hay hồ sơ thay đổi kỹ thuật ECO nào phát sinh trong kỳ kế hoạch này.", "", "", "", "", "", ""]);
      rowTracker8.push({ type: 'table-data-empty' });
      addMerge8(aoaData8.length - 1, 1, aoaData8.length - 1, 7);
    } else {
      // Resolve all tasks first
      const resolvedList = ecoTasks.map(task => {
        let ecrId = task.id;
        let content = task.title;
        let category = "Cải tiến kỹ thuật";
        let rawModel = task.modelOrSupplier || "Toàn bộ";
        let model = rawModel.includes("|") ? rawModel.split("|")[0].trim() : rawModel;
        let proposer = task.assignee || "Phòng Công nghệ";
        let applyDate = task.deadline || "Đang rà soát";
        let statusStr = task.status === 'Completed' ? "Đã áp dụng" : (task.status === 'In_Progress' ? "Đang thử nghiệm" : "Chờ áp dụng");

        if (task.id.startsWith('LINK-ECO-')) {
          const realId = task.id.replace('LINK-ECO-', '');
          const originalEco = activeEcos.find(e => String(e.id) === realId);
          if (originalEco) {
            ecrId = originalEco.ecrId || originalEco.id || ecrId;
            content = originalEco.content || content;
            category = originalEco.category || category;
            model = originalEco.model || model;
            proposer = originalEco.proposer || proposer;
            applyDate = originalEco.applyDate || originalEco.ImplementationDate || applyDate;
            statusStr = originalEco.status || statusStr;
          }
        }

        return {
          ecrId,
          content,
          category,
          model: (model || '').trim(),
          proposer,
          applyDate,
          statusStr
        };
      });

      // Group by model
      const groups: Record<string, typeof resolvedList> = {};
      resolvedList.forEach(item => {
        const m = item.model;
        const groupName = (m && m !== "Toàn bộ") ? `Dòng xe ${m}` : 'Chung / Áp dụng toàn bộ';
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(item);
      });

      // Sort group keys
      const orderedKeys = Object.keys(groups).sort((a, b) => {
        if (a.startsWith('Chung')) return 1;
        if (b.startsWith('Chung')) return -1;
        return a.localeCompare(b, 'vi');
      });

      // Date parser helper for ascending chronological sorting
      const parseDateToTime = (str: string) => {
        if (!str) return Infinity;
        const clean = str.trim();
        const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (dmy) {
          return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])).getTime();
        }
        const ymd = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (ymd) {
          return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])).getTime();
        }
        const t = Date.parse(clean);
        return isNaN(t) ? Infinity : t;
      };

      // Sort tasks within each group from oldest to newest
      const sortTasksByApplyDate = (list: typeof resolvedList) => {
        return [...list].sort((a, b) => {
          const tA = parseDateToTime(a.applyDate);
          const tB = parseDateToTime(b.applyDate);
          if (tA !== tB) {
            return tA - tB;
          }
          return a.applyDate.localeCompare(b.applyDate);
        });
      };

      let stt = 1;
      orderedKeys.forEach(groupKey => {
        const sortedGroupTasks = sortTasksByApplyDate(groups[groupKey]);
        if (sortedGroupTasks.length > 0) {
          // Add group header row
          aoaData8.push([groupKey.toUpperCase(), "", "", "", "", "", "", ""]);
          rowTracker8.push({ type: 'table-header-group' });
          addMerge8(aoaData8.length - 1, 0, aoaData8.length - 1, 7);

          // Add each item in group
          sortedGroupTasks.forEach(item => {
            aoaData8.push([
              stt++,
              item.ecrId,
              item.content,
              item.category,
              item.model || "Toàn bộ",
              item.proposer,
              item.applyDate,
              item.statusStr
            ]);
            rowTracker8.push({ type: 'table-data-supplier-plan' });
          });
        }
      });
    }

    const ws8 = XLSXStyle.utils.aoa_to_sheet(aoaData8);
    styleSheet(ws8, rowTracker8, 8);
    ws8['!merges'] = merges8;
    setRowHeights(ws8, rowTracker8);
    ws8['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 38 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }];

    // ==========================================
    // SAVE WORKBOOK (Đầy đủ 8 tabs đúng như anh Thao thiết kế)
    // ==========================================
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws1, "Lắp ráp & Cung ứng");
    XLSXStyle.utils.book_append_sheet(wb, ws2, "Kế hoạch QMS Auto");
    XLSXStyle.utils.book_append_sheet(wb, ws3, "Bảng Tác vụ QMS");
    XLSXStyle.utils.book_append_sheet(wb, ws4, "Công việc tồn đọng QMS");
    XLSXStyle.utils.book_append_sheet(wb, ws5, "Biên bản CAPA mở");
    XLSXStyle.utils.book_append_sheet(wb, ws6, "Phát triển xe mới PTSP");
    XLSXStyle.utils.book_append_sheet(wb, ws7, "Phối hợp liên ban");
    XLSXStyle.utils.book_append_sheet(wb, ws8, "Cải tiến kỹ thuật (ECO)");
    XLSXStyle.writeFile(wb, `DKBike_KE_HOACH_QMS_${planningMode === 'weekly' ? `TUAN_${selectedWeek}` : `THANG_${selectedMonth}`}_${selectedYear}.xlsx`);
  };

  // --- THỰC THI THÊM/SỬA/XOÁ CÁC TÁC VỤ CHO THÀNH PHẦN 3 ---

  const handleOpenEditModal = (task: QualityTask) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskSection(task.section);
    setNewTaskAssignee(task.assignee);
    setNewTaskPriority(task.priority);
    setNewTaskDeadline(task.deadline || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`);
    
    const rawRef = task.modelOrSupplier || '';
    setNewTaskRef(rawRef);

    let matchedModel = '';
    let matchedSupplier = '';

    if (rawRef.includes(' | ')) {
      const parts = rawRef.split(' | ');
      matchedModel = parts[0] || '';
      matchedSupplier = parts[1] || '';
    } else {
      const lowerRef = rawRef.toLowerCase().trim();
      const foundModel = masterModelNames.find(m => {
        const lm = m.toLowerCase().trim();
        return lowerRef === lm || lowerRef.includes(lm);
      });
      const foundSupplier = masterSupplierNames.find(s => {
        const ls = s.toLowerCase().trim();
        return lowerRef === ls || lowerRef.includes(ls);
      });

      if (foundModel) matchedModel = foundModel;
      if (foundSupplier) matchedSupplier = foundSupplier;

      if (!foundModel && !foundSupplier && rawRef) {
        matchedModel = rawRef;
      }
    }

    setNewTaskModel(matchedModel);
    setNewTaskSupplier(matchedSupplier);
    setNewTaskStatus(task.status || 'Pending');
    setShowAddTaskModal(true);
  };

  const handleCreateTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    let refStr = '';
    if (newTaskModel && newTaskSupplier) {
      refStr = `${newTaskModel} | ${newTaskSupplier}`;
    } else if (newTaskModel) {
      refStr = newTaskModel;
    } else if (newTaskSupplier) {
      refStr = newTaskSupplier;
    }

    const finalDeadline = newTaskDeadline || (planningMode === 'weekly' ? getDateInWeek(selectedYear, selectedMonth, selectedWeek) : `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`);
    const calculatedWeek = getWeekFromDateString(finalDeadline);

    let taskM = selectedMonth;
    let taskY = selectedYear;
    if (finalDeadline) {
      const parts = finalDeadline.split('-');
      if (parts.length === 3) {
        taskY = Number(parts[0]) || selectedYear;
        taskM = Number(parts[1]) || selectedMonth;
      }
    }

    const newTask: QualityTask = {
      id: `T-USER-${Math.floor(100+Math.random()*900)}`,
      section: newTaskSection,
      title: newTaskTitle,
      assignee: newTaskAssignee,
      deadline: finalDeadline,
      status: newTaskStatus || 'Pending',
      priority: newTaskPriority,
      modelOrSupplier: refStr || undefined,
      month: taskM,
      year: taskY,
      week: planningMode === 'weekly' ? selectedWeek : calculatedWeek
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskRef('');
    setNewTaskModel('');
    setNewTaskSupplier('');
    setShowAddTaskModal(false);
  };

  const handleSaveEditTask = (e: FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!newTaskTitle.trim()) return;

    const id = editingTask.id;

    let refStr = '';
    if (newTaskModel && newTaskSupplier) {
      refStr = `${newTaskModel} | ${newTaskSupplier}`;
    } else if (newTaskModel) {
      refStr = newTaskModel;
    } else if (newTaskSupplier) {
      refStr = newTaskSupplier;
    }

    if (id.startsWith('LINK-CAPA-')) {
      const realId = id.replace('LINK-CAPA-', '');
      try {
        const saved = localStorage.getItem('dk_capas');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((c: any) => {
              const capID = c.CAPAID || c.id;
              if (String(capID) === realId) {
                return {
                  ...c,
                  Issue: newTaskTitle,
                  title: newTaskTitle,
                  Owner: newTaskAssignee,
                  assignee: newTaskAssignee,
                  DueDate: newTaskDeadline,
                  targetDate: newTaskDeadline,
                  modelName: refStr,
                  supplierName: refStr
                };
              }
              return c;
            });
            localStorage.setItem('dk_capas', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else if (id.startsWith('LINK-PTSP-')) {
      const realId = id.replace('LINK-PTSP-', '');
      try {
        const saved = localStorage.getItem('dk_projects');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((p: any) => {
              if (p.id === realId) {
                return {
                  ...p,
                  name: newTaskTitle,
                  manager: newTaskAssignee,
                  massProductionDate: newTaskDeadline
                };
              }
              return p;
            });
            localStorage.setItem('dk_projects', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else if (id.startsWith('LINK-TASK-')) {
      const realId = id.replace('LINK-TASK-', '');
      try {
        const saved = localStorage.getItem('dk_tasks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((t: any) => {
              const workId = t.WorkID || t.id;
              if (String(workId) === realId) {
                return {
                  ...t,
                  TaskDescription: newTaskTitle,
                  content: newTaskTitle,
                  Owner: newTaskAssignee,
                  assignee: newTaskAssignee,
                  DueDate: newTaskDeadline,
                  date: newTaskDeadline,
                  SupplierReference: refStr,
                  modelOrSupplier: refStr,
                  priority: newTaskPriority
                };
              }
              return t;
            });
            localStorage.setItem('dk_tasks', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else if (id.startsWith('LINK-DAILYLOG-')) {
      const parts = id.split('-');
      const indexStr = parts[2];
      try {
        const saved = localStorage.getItem('dk_daily_logs');
        const logsArray = saved ? JSON.parse(saved) : DAILY_LOG_DATA;
        if (Array.isArray(logsArray)) {
          const updated = logsArray.map((item: any, idx: number) => {
            if (String(idx) === indexStr || String(item.stt || idx) === indexStr) {
              return {
                ...item,
                content: newTaskTitle,
                assignee: newTaskAssignee,
                deadline: newTaskDeadline,
                date: newTaskDeadline.includes('-') && newTaskDeadline.split('-').length === 3 
                  ? newTaskDeadline.split('-').reverse().join('/') 
                  : newTaskDeadline,
                category: refStr
              };
            }
            return item;
          });
          localStorage.setItem('dk_daily_logs', JSON.stringify(updated));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error(err);
      }
    } else if (id.startsWith('LINK-ECO-')) {
      const realId = id.replace('LINK-ECO-', '');
      try {
        const saved = localStorage.getItem('dk_ecos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((e: any) => {
              if (String(e.id) === realId) {
                return {
                  ...e,
                  content: newTaskTitle,
                  proposer: newTaskAssignee,
                  applyDate: newTaskDeadline,
                  ImplementationDate: newTaskDeadline,
                  model: refStr
                };
              }
              return e;
            });
            localStorage.setItem('dk_ecos', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Custom task
      setTasks(prev => prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            title: newTaskTitle,
            section: newTaskSection,
            assignee: newTaskAssignee,
            priority: newTaskPriority,
            deadline: newTaskDeadline,
            modelOrSupplier: refStr || undefined,
            status: newTaskStatus
          };
        }
        return t;
      }));
    }

    setForceRefresh(prev => prev + 1);
    setNewTaskTitle('');
    setNewTaskRef('');
    setNewTaskModel('');
    setNewTaskSupplier('');
    setEditingTask(null);
    setShowAddTaskModal(false);
  };

  const handleSubmitTask = (e: FormEvent) => {
    if (editingTask) {
      handleSaveEditTask(e);
    } else {
      handleCreateTask(e);
    }
  };

  const handleToggleTaskStatus = (id: string) => {
    // Check if it is a linked task
    if (id.startsWith('LINK-CAPA-')) {
      const realId = id.replace('LINK-CAPA-', '');
      try {
        const saved = localStorage.getItem('dk_capas');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((c: any) => {
              const capID = c.CAPAID || c.id;
              if (String(capID) === realId) {
                // Toggle Status of CAPA through states: Mở (Pending) -> Đang xử lý (In_Progress) -> Đã đóng (Completed)
                const currentStatus = (c.Status || c.status || 'Mở').toLowerCase();
                let nextStatus = 'Đang xử lý';
                if (currentStatus.includes('đóng') || currentStatus.includes('closed') || currentStatus.includes('xong')) {
                  nextStatus = 'Mở';
                } else if (currentStatus.includes('tiến hành') || currentStatus.includes('process') || currentStatus.includes('đang') || currentStatus.includes('xử lý')) {
                  nextStatus = 'Đã đóng';
                } else {
                  nextStatus = 'Đang xử lý';
                }
                return { ...c, Status: nextStatus, status: nextStatus };
              }
              return c;
            });
            saveAndSync('dk_capas', updated);
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
      setForceRefresh(prev => prev + 1);
      return;
    }

    if (id.startsWith('LINK-PTSP-')) {
      const realId = id.replace('LINK-PTSP-', '');
      try {
        const saved = localStorage.getItem('dk_projects');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((p: any) => {
              if (p.id === realId) {
                // Cycle: 0 -> 50 -> 100 -> 0
                const currentProg = p.progress || 0;
                let nextProg = 0;
                if (currentProg === 0) nextProg = 50;
                else if (currentProg === 50) nextProg = 100;
                else nextProg = 0;
                return { ...p, progress: nextProg };
              }
              return p;
            });
            saveAndSync('dk_projects', updated);
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
      setForceRefresh(prev => prev + 1);
      return;
    }

    if (id.startsWith('LINK-TASK-')) {
      const realId = id.replace('LINK-TASK-', '');
      try {
        const saved = localStorage.getItem('dk_tasks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((t: any) => {
              const tId = t.WorkID || t.id;
              if (String(tId) === String(realId)) {
                // Cycle: Pending -> In_Progress -> Completed -> Pending
                const currentStatus = t.status || t.Status || 'Pending';
                let nextStatus = 'Pending';
                if (currentStatus === 'Pending') {
                  nextStatus = 'In_Progress';
                } else if (currentStatus === 'In_Progress') {
                  nextStatus = 'Completed';
                } else {
                  nextStatus = 'Pending';
                }
                return { ...t, status: nextStatus, Status: nextStatus };
              }
              return t;
            });
            saveAndSync('dk_tasks', updated);
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
      setForceRefresh(prev => prev + 1);
      return;
    }

    if (id.startsWith('LINK-DAILYLOG-')) {
      const parts = id.split('-');
      const indexStr = parts[2];
      try {
        const saved = localStorage.getItem('dk_daily_logs');
        const logsArray = saved ? JSON.parse(saved) : DAILY_LOG_DATA;
        if (Array.isArray(logsArray)) {
          const updated = logsArray.map((item: any, idx: number) => {
            if (String(idx) === indexStr || String(item.stt || idx) === indexStr) {
              // Cycle: 0% -> 50% -> 100% -> 0%
              const currentPercent = item.statusPercent || '0%';
              let nextPercent = '0%';
              if (currentPercent === '0%') {
                nextPercent = '50%';
              } else if (currentPercent === '50%') {
                nextPercent = '100%';
              } else {
                nextPercent = '0%';
              }
              return { ...item, statusPercent: nextPercent };
            }
            return item;
          });
          saveAndSync('dk_daily_logs', updated);
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error(err);
      }
      setForceRefresh(prev => prev + 1);
      return;
    }

    if (id.startsWith('LINK-ECO-')) {
      const realId = id.replace('LINK-ECO-', '');
      try {
        const saved = localStorage.getItem('dk_ecos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((e: any) => {
              if (String(e.id) === realId) {
                // Cycle: Chờ áp dụng (Pending) -> Đang thử nghiệm (In_Progress) -> Đã áp dụng (Completed) -> Chờ áp dụng
                const currentStatus = e.status || 'Chờ áp dụng';
                let nextStatus = 'Chờ áp dụng';
                if (currentStatus === 'Chờ áp dụng' || currentStatus === 'Pending') {
                  nextStatus = 'Đang thử nghiệm';
                } else if (currentStatus === 'Đang thử nghiệm' || currentStatus === 'In_Progress') {
                  nextStatus = 'Đã áp dụng';
                } else {
                  nextStatus = 'Chờ áp dụng';
                }
                return { ...e, status: nextStatus };
              }
              return e;
            });
            saveAndSync('dk_ecos', updated);
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.error(err);
      }
      setForceRefresh(prev => prev + 1);
      return;
    }

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Pending' ? 'In_Progress' : (t.status === 'In_Progress' ? 'Completed' : 'Pending');
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm("Bạn có muốn xoá bỏ tác vụ này khỏi kế hoạch hành động không?")) {
      if (id.startsWith('LINK-CAPA-')) {
        const realId = id.replace('LINK-CAPA-', '');
        try {
          const saved = localStorage.getItem('dk_capas');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((c: any) => (c.CAPAID || c.id) !== realId);
              saveAndSync('dk_capas', updated);
              window.dispatchEvent(new Event('storage'));
            }
          }
        } catch (_) {}
        setForceRefresh(prev => prev + 1);
        return;
      }

      if (id.startsWith('LINK-PTSP-')) {
        const realId = id.replace('LINK-PTSP-', '');
        try {
          const saved = localStorage.getItem('dk_projects');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((p: any) => p.id !== realId);
              saveAndSync('dk_projects', updated);
              window.dispatchEvent(new Event('storage'));
            }
          }
        } catch (_) {}
        setForceRefresh(prev => prev + 1);
        return;
      }

      if (id.startsWith('LINK-TASK-')) {
        const realId = id.replace('LINK-TASK-', '');
        try {
          const saved = localStorage.getItem('dk_tasks');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((t: any) => (t.WorkID || t.id) !== realId);
              saveAndSync('dk_tasks', updated);
              window.dispatchEvent(new Event('storage'));
            }
          }
        } catch (_) {}
        setForceRefresh(prev => prev + 1);
        return;
      }

      if (id.startsWith('LINK-DAILYLOG-')) {
        const parts = id.split('-');
        const indexStr = parts[2];
        try {
          const saved = localStorage.getItem('dk_daily_logs');
          const logsArray = saved ? JSON.parse(saved) : DAILY_LOG_DATA;
          if (Array.isArray(logsArray)) {
            const updated = logsArray.filter((item: any, idx: number) => String(idx) !== indexStr && String(item.stt || idx) !== indexStr);
            saveAndSync('dk_daily_logs', updated);
            window.dispatchEvent(new Event('storage'));
          }
        } catch (_) {}
        setForceRefresh(prev => prev + 1);
        return;
      }

      if (id.startsWith('LINK-ECO-')) {
        const realId = id.replace('LINK-ECO-', '');
        try {
          const saved = localStorage.getItem('dk_ecos');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((e: any) => String(e.id) !== realId);
              saveAndSync('dk_ecos', updated);
              window.dispatchEvent(new Event('storage'));
            }
          }
        } catch (_) {}
        setForceRefresh(prev => prev + 1);
        return;
      }

      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  // --- LIÊN THÔNG BÁO CÁO KỲ TRƯỚC & ĐỀ XUẤT CƠ SỞ LẬP KẾ HOẠCH ---
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

  const prevUncompletedTasks = useMemo(() => {
    return tasks.filter(t => {
      const m = t.month !== undefined ? t.month : (t.deadline ? Number(t.deadline.split('-')[1]) : undefined);
      const y = t.year !== undefined ? t.year : (t.deadline ? Number(t.deadline.split('-')[0]) : undefined);
      return m === prevMonth && y === prevYear && t.status !== 'Completed';
    });
  }, [tasks, prevMonth, prevYear]);

  const prevCompletedTasks = useMemo(() => {
    return tasks.filter(t => {
      const m = t.month !== undefined ? t.month : (t.deadline ? Number(t.deadline.split('-')[1]) : undefined);
      const y = t.year !== undefined ? t.year : (t.deadline ? Number(t.deadline.split('-')[0]) : undefined);
      return m === prevMonth && y === prevYear && t.status === 'Completed';
    });
  }, [tasks, prevMonth, prevYear]);

  const handleAutoCarryOver = () => {
    if (prevUncompletedTasks.length === 0) {
      alert("Không tìm thấy tác vụ dở dang nào ở Tháng trước cần chuyển tiếp!");
      return;
    }

    const clonedTasks = prevUncompletedTasks.map(t => {
      return {
        ...t,
        id: `T-CARRY-${Math.floor(100 + Math.random() * 900)}`,
        title: `[Tồn đọng chuyển tiếp từ T${prevMonth}] ${t.title}`,
        status: 'Pending' as const,
        month: selectedMonth,
        year: selectedYear,
        deadline: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`
      };
    });

    setTasks(prev => {
      // Ngăn trùng tác vụ chuyển tiếp
      const filtered = prev.filter(p => !p.title.startsWith(`[Tồn đọng chuyển tiếp từ T${prevMonth}]`));
      return [...clonedTasks, ...filtered];
    });

    alert(`Đã tự động chuyển tiếp thành công ${prevUncompletedTasks.length} tác vụ dở dang từ Báo cáo chất lượng Tháng ${prevMonth} sang Kế hoạch Tháng ${selectedMonth}!`);
  };

  // Dynamic Recommendations based on actual OQC defects
  const dynamicRecommendations = useMemo(() => {
    // Filter OQC records from the previous month that are marked as "Lỗi" or have failedCount > 0
    const failedOqc = oqcRecords.filter(rec => {
      return rec.month === prevMonth && rec.year === prevYear && (rec.status === 'Lỗi' || (rec.failedCount && rec.failedCount > 0));
    });

    if (failedOqc.length === 0) {
      return [];
    }

    // Group / deduplicate by unique combination of model and defect detail
    const seen = new Set<string>();
    const list: OQCRecord[] = [];
    failedOqc.forEach(rec => {
      const key = `${rec.model}-${rec.defectDetail}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(rec);
      }
    });

    return list.slice(0, 3); // top 3 actual recorded defects
  }, [oqcRecords, prevMonth, prevYear]);

  const applyDynamicRecommendation = (record: OQCRecord) => {
    const title = `[Phòng ngừa CAPA T${prevMonth}] Khắc phục triệt để lỗi "${record.defectDetail}" trên dòng xe ${record.model}`;
    const section = 'capa';
    const assignee = 'Hoàng Văn Phấn'; // default section lead
    const modelOrSupplier = record.model;
    const priority = (record.failedCount && record.failedCount > 5) ? 'High' : 'Medium';

    const exists = tasks.some(t => t.title.includes(title) && t.month === selectedMonth && t.year === selectedYear);
    if (exists) {
      alert("Khuyến nghị này đã được phân định gán lập vào Kế hoạch chất lượng tháng này!");
      return;
    }

    const newTask: QualityTask = {
      id: `T-REC-${Math.floor(100 + Math.random() * 900)}`,
      section,
      title,
      assignee,
      deadline: `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`,
      status: 'Pending',
      priority,
      modelOrSupplier,
      month: selectedMonth,
      year: selectedYear
    };

    setTasks(prev => [newTask, ...prev]);
    alert(`Đã phân bổ kế hoạch phòng ngừa dứt điểm lỗi "${record.defectDetail}" cho dòng xe ${record.model} thành công!`);
  };

  // Chia mảng tác vụ theo các Section riêng biệt yêu cầu (Lọc liên thông theo kỳ được chọn + liên thông live với CSDL toàn cục)
  const linkedTasks = useMemo(() => {
    const list: QualityTask[] = [];

    // 1. Đồng bộ lặp từ dk_capas
    try {
      const savedCapas = localStorage.getItem('dk_capas');
      if (savedCapas) {
        const parsed = JSON.parse(savedCapas);
        if (Array.isArray(parsed)) {
          parsed.forEach((c: any, index: number) => {
            const capId = c.CAPAID || c.id || `CAPA-LK-${index}`;
            let mValue = selectedMonth;
            let yValue = selectedYear;
            const due = c.DueDate || c.targetDate;
            if (due && typeof due === 'string') {
              const matchesYMD = due.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
              const matchesDMY = due.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (matchesYMD) {
                mValue = Number(matchesYMD[2]);
                yValue = Number(matchesYMD[1]);
              } else if (matchesDMY) {
                mValue = Number(matchesDMY[2]);
                yValue = Number(matchesDMY[3]);
              }
            }

            if (mValue === selectedMonth && yValue === selectedYear) {
              const statusStr = (c.Status || c.status || '').toLowerCase();
              const isCompleted = statusStr.includes('closed') || statusStr.includes('đóng') || statusStr.includes('xong');
              const isProgress = statusStr.includes('tiến_hành') || statusStr.includes('mở') || statusStr.includes('process');
              list.push({
                id: `LINK-CAPA-${capId}`,
                section: 'capa',
                title: `${c.Issue || c.title || 'Biên bản cải tiến'} (${capId})`,
                assignee: c.Owner || c.assignee || 'Hoàng Văn Phấn',
                deadline: due || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`,
                status: isCompleted ? 'Completed' : (isProgress ? 'In_Progress' : 'Pending'),
                priority: c.isRepeated ? 'High' : 'Medium',
                modelOrSupplier: c.modelName || c.supplierName || '',
                month: selectedMonth,
                year: selectedYear
              });
            }
          });
        }
      }
    } catch (_) {}

    // 2. Đồng bộ từ dk_projects / dk_ptsp_tasks - ĐÃ HỦY ĐỒNG BỘ theo yêu cầu của anh Thao để nhập thủ công
    /*
    try {
      const savedProjects = localStorage.getItem('dk_projects');
      if (savedProjects) {
        const parsedProj = JSON.parse(savedProjects);
        if (Array.isArray(parsedProj)) {
          parsedProj.forEach((p: any, index: number) => {
            const projId = p.id || `PROJ-LK-${index}`;
            list.push({
              id: `LINK-PTSP-${projId}`,
              section: 'ptsp',
              title: `[Dự án PTSP] Thử nghiệm mẫu xe mới: ${p.name} - Tiến độ: ${p.progress || 0}%`,
              assignee: p.manager || 'Nguyễn Xuân Thao',
              deadline: p.massProductionDate || p.regCertDate || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-20`,
              status: (p.progress >= 100) ? 'Completed' : (p.progress > 0 ? 'In_Progress' : 'Pending'),
              priority: p.status === 'Chậm tiến độ' ? 'High' : 'Medium',
              modelOrSupplier: p.name,
              month: selectedMonth,
              year: selectedYear
            });
          });
        }
      }
    } catch (_) {}
    */

    // 3. Đồng bộ từ tác vụ phòng ban phòng QLCL chung 'dk_tasks'
    try {
      const savedTasks = localStorage.getItem('dk_tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          parsedTasks.forEach((t: any, index: number) => {
            const taskMonth = t.month || (t.date ? Number(t.date.split('-')[1]) : selectedMonth);
            const taskYear = t.year || (t.date ? Number(t.date.split('-')[0]) : selectedYear);
            const catStr = (t.category || t.Category || '').toLowerCase();
            let section: 'backlog' | 'capa' | 'ptsp' | 'coordination' = 'backlog';
            if (catStr.includes('coordination') || catStr.includes('phối hợp') || catStr.includes('liên ban') || catStr.includes('audit')) {
              section = 'coordination';
            } else if (catStr.includes('capa') || catStr.includes('biện pháp')) {
              section = 'capa';
            } else if (catStr.includes('ptsp') || catStr.includes('phát triển')) {
              section = 'backlog'; // Chuyển sang backlog thay vì ptsp để giữ ptsp hoàn toàn thủ công
            }

            let isMatch = false;
            if (section === 'backlog') {
              if (planningMode === 'monthly') {
                isMatch = (taskMonth === prevMonth && taskYear === prevYear);
              } else {
                // planningMode === 'weekly'
                const taskWeek = t.week || (t.date ? getWeekFromDateString(t.date) : (t.DueDate ? getWeekFromDateString(t.DueDate) : 'W1'));
                let prevWeek = 'W1';
                let prevWeekMonth = selectedMonth;
                let prevWeekYear = selectedYear;
                if (selectedWeek === 'W2') prevWeek = 'W1';
                else if (selectedWeek === 'W3') prevWeek = 'W2';
                else if (selectedWeek === 'W4') prevWeek = 'W3';
                else if (selectedWeek === 'W5') prevWeek = 'W4';
                else if (selectedWeek === 'W1') {
                  prevWeek = 'W5';
                  prevWeekMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
                  prevWeekYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
                }

                if (selectedWeek === 'W1') {
                  isMatch = (taskMonth === prevWeekMonth && taskYear === prevWeekYear && (taskWeek === 'W5' || taskWeek === 'W4'));
                } else {
                  isMatch = (taskMonth === prevWeekMonth && taskYear === prevWeekYear && taskWeek === prevWeek);
                }
              }
            } else {
              if (planningMode === 'monthly') {
                isMatch = (taskMonth === selectedMonth && taskYear === selectedYear);
              } else {
                const taskWeek = t.week || (t.date ? getWeekFromDateString(t.date) : (t.DueDate ? getWeekFromDateString(t.DueDate) : 'W1'));
                isMatch = (taskMonth === selectedMonth && taskYear === selectedYear && taskWeek === selectedWeek);
              }
            }

            if (isMatch) {
              const statusStr = (t.status || t.Status || '').toLowerCase();
              const isCompleted = statusStr.includes('completed') || statusStr.includes('đạt') || statusStr.includes('xong');
              const isProgress = statusStr.includes('progress') || statusStr.includes('doing') || statusStr.includes('hành');

              list.push({
                id: `LINK-TASK-${t.WorkID || t.id || index}`,
                section,
                title: `${t.TaskDescription || t.content || 'Nhiệm vụ kiểm soát chất lượng'}`,
                assignee: t.Owner || t.assignee || 'Đoàn Anh Hùng',
                deadline: t.DueDate || t.date || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`,
                status: isCompleted ? 'Completed' : (isProgress ? 'In_Progress' : 'Pending'),
                priority: (t.priority || '').toUpperCase() === 'HIGH' ? 'High' : ((t.priority || '').toUpperCase() === 'MEDIUM' ? 'Medium' : 'Low'),
                modelOrSupplier: t.SupplierReference || t.modelOrSupplier || '',
                month: selectedMonth,
                year: selectedYear
              });
            }
          });
        }
      }
    } catch (_) {}

    // 4. Đồng bộ các bản ghi công việc chưa thực hiện (statusPercent !== '100%') trong Báo cáo ngày QLCL 'dk_daily_logs'
    try {
      const savedDailyLogs = localStorage.getItem('dk_daily_logs');
      const dailyLogsArray = savedDailyLogs ? JSON.parse(savedDailyLogs) : DAILY_LOG_DATA;
      if (Array.isArray(dailyLogsArray)) {
        dailyLogsArray.forEach((item: any, index: number) => {
          if (item.statusPercent !== "100%") {
            let logMonth = selectedMonth;
            let logYear = selectedYear;
            if (item.date && typeof item.date === 'string') {
              if (item.date.includes('/')) {
                const parts = item.date.split('/');
                if (parts.length === 3) {
                  logMonth = Number(parts[1]);
                  logYear = Number(parts[2]);
                }
              } else if (item.date.includes('-')) {
                const parts = item.date.split('-');
                if (parts.length === 3) {
                  logMonth = Number(parts[1]);
                  logYear = Number(parts[0]);
                }
              }
            }

            let isMatch = false;
            if (planningMode === 'monthly') {
              isMatch = (logMonth === prevMonth && logYear === prevYear);
            } else {
              // planningMode === 'weekly'
              const logWeek = item.week || (item.date ? getWeekFromDateString(item.date) : 'W1');
              let prevWeek = 'W1';
              let prevWeekMonth = selectedMonth;
              let prevWeekYear = selectedYear;
              if (selectedWeek === 'W2') prevWeek = 'W1';
              else if (selectedWeek === 'W3') prevWeek = 'W2';
              else if (selectedWeek === 'W4') prevWeek = 'W3';
              else if (selectedWeek === 'W5') prevWeek = 'W4';
              else if (selectedWeek === 'W1') {
                prevWeek = 'W5';
                prevWeekMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
                prevWeekYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
              }

              if (selectedWeek === 'W1') {
                isMatch = (logMonth === prevWeekMonth && logYear === prevWeekYear && (logWeek === 'W5' || logWeek === 'W4'));
              } else {
                isMatch = (logMonth === prevWeekMonth && logYear === prevWeekYear && logWeek === prevWeek);
              }
            }

            if (isMatch) {
              const contentLower = (item.content || '').toLowerCase().trim();
              const categoryLower = (item.category || '').toLowerCase().trim();
              
              const isPtsp = categoryLower.includes('ptsp') || 
                             categoryLower.includes('phát triển') || 
                             contentLower.includes('ptsp') || 
                             contentLower.includes('phát triển') || 
                             contentLower.includes('mẫu xe') || 
                             contentLower.includes('xe mẫu');

              list.push({
                id: `LINK-DAILYLOG-${index}-${(item.date || '').replace(/\//g, '-')}`,
                section: 'backlog', // Chuyển sang backlog thay vì ptsp để giữ ptsp hoàn toàn thủ công
                title: item.content || '',
                assignee: item.assignee || 'Đoàn Anh Hùng',
                deadline: item.deadline || item.date || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`,
                status: item.statusPercent === '100%' ? 'Completed' : (item.statusPercent === '0%' ? 'Pending' : 'In_Progress'),
                priority: item.statusPercent === '0%' ? 'High' : 'Medium',
                modelOrSupplier: item.category || 'Hành động QLCL',
                month: selectedMonth,
                year: selectedYear
              });
            }
          }
        });
      }
    } catch (_) {}

    // 5. Đồng bộ tất cả các công việc thay đổi kỹ thuật ECO nằm trong kỳ kế hoạch
    try {
      const savedEcos = localStorage.getItem('dk_ecos');
      if (savedEcos) {
        const parsedEcos = JSON.parse(savedEcos);
        if (Array.isArray(parsedEcos)) {
          parsedEcos.forEach((eco: any) => {
            const applyD = eco.applyDate || eco.ImplementationDate;
            const { month: ecoMonth, year: ecoYear } = parseDateYearMonth(applyD, selectedMonth, selectedYear);

            if (ecoMonth === selectedMonth && ecoYear === selectedYear) {
              const mappedStatus = eco.status === 'Đã áp dụng' ? 'Completed' : (eco.status === 'Đang thử nghiệm' ? 'In_Progress' : 'Pending');
              list.push({
                id: `LINK-ECO-${eco.id}`,
                section: 'eco',
                title: `[Thay đổi ECO - ${eco.category || 'KT'}] ${eco.ecrId || eco.id}: ${eco.content} (Model: ${eco.model || 'Chung'}) - Trạng thái: ${eco.status || 'Chờ áp dụng'}`,
                assignee: eco.proposer || 'Nguyễn Xuân Thao',
                deadline: applyD || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`,
                status: mappedStatus,
                priority: eco.category === 'Thiết kế' || eco.category === 'Vật liệu' ? 'High' : 'Medium',
                modelOrSupplier: eco.model || '',
                month: selectedMonth,
                year: selectedYear
              });
            }
          });
        }
      }
    } catch (_) {}

    return list;
  }, [selectedMonth, selectedYear, forceRefresh, tasks, planningMode, selectedWeek]);

  // Chia mảng tác vụ theo các Section riêng biệt yêu cầu (Lọc liên thông theo tháng năm chọn lập kế hoạch và tuần nếu ở chế độ lập kế hoạch tuần)
  const currentMonthTasks = useMemo(() => {
    const filteredTasks = tasks.filter(t => {
      let taskMonth = t.month;
      let taskYear = t.year;
      let taskWeek = t.week;

      if (t.deadline && typeof t.deadline === 'string') {
        const parts = t.deadline.split('-');
        if (parts.length === 3) {
          taskYear = Number(parts[0]) || taskYear;
          taskMonth = Number(parts[1]) || taskMonth;
        }
        if (!taskWeek) {
          taskWeek = getWeekFromDateString(t.deadline);
        }
      }

      const isMonthMatch = (taskMonth === undefined || taskMonth === selectedMonth) && (taskYear === undefined || taskYear === selectedYear);
      if (!isMonthMatch) return false;

      // Filter by week strictly when planningMode === 'weekly'
      if (planningMode === 'weekly') {
        if (taskWeek && taskWeek !== selectedWeek) {
          return false;
        }
      }

      return true;
    });

    const existingIds = new Set(filteredTasks.map(t => t.id));
    const uniqueLinked = linkedTasks.filter(t => !existingIds.has(t.id));

    return [...filteredTasks, ...uniqueLinked];
  }, [tasks, linkedTasks, selectedMonth, selectedYear, planningMode, selectedWeek]);

  const backlogTasks = currentMonthTasks.filter(t => t.section === 'backlog' && !t.title.includes('[Tự động OQC]'));
  const allCapaTasks = currentMonthTasks.filter(t => t.section === 'capa' && !t.title.includes('[Tự động PQC]'));
  const openCapaTasks = currentMonthTasks.filter(t => t.section === 'capa' && t.status !== 'Completed' && !t.title.includes('[Tự động PQC]'));
  const ptspTasks = currentMonthTasks.filter(t => t.section === 'ptsp');
  const coordinationTasks = currentMonthTasks.filter(t => t.section === 'coordination');
  const ecoTasks = currentMonthTasks.filter(t => t.section === 'eco');

  const getZoomedDetails = () => {
    switch (zoomedColumn) {
      case 'backlog':
        return {
          title: "1. Công việc tồn đọng (Backlogs)",
          tasks: backlogTasks,
          icon: <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
        };
      case 'capa':
        return {
          title: "2. Biên bản CAPA đang mở",
          tasks: openCapaTasks,
          icon: <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
        };
      case 'ptsp':
        return {
          title: "3. Phát triển sản phẩm (PTSP)",
          tasks: ptspTasks,
          icon: <Cpu className="w-5 h-5 text-indigo-400" />
        };
      case 'coordination':
        return {
          title: "4. Tác vụ phối hợp liên ban",
          tasks: coordinationTasks,
          icon: <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
        };
      case 'eco':
        return {
          title: "5. Công việc Cải tiến (ECO)",
          tasks: ecoTasks,
          icon: <Wrench className="w-5 h-5 text-cyan-400" />
        };
      default:
        return null;
    }
  };


  return (
    <div className="space-y-8 pb-12" id="qms_quality_planning_workbench">
      
      {/* 1. TIÊU ĐỀ LỚN & VÙNG QUẢN LÝ TRẠNG THÁI CHUNG */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-extrabold tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
              DKBike QMS Module
            </span>
            <span className="text-xs text-slate-400 font-medium font-mono">Chuyên gia QMS Tư vấn độc quyền</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <CalendarRange className="w-7 h-7 text-indigo-600" />
            Lập Kế Hoạch Chất Lượng Tổng Thể (Quality Planning)
          </h1>
          <p className="text-sm text-slate-500 max-w-3xl">
            Tự động hóa luồng dữ liệu từ <strong className="text-indigo-600 font-semibold">Kế hoạch Sản xuất & Nhập hàng</strong> sang các tác vụ kiểm tra chất lượng thực nghiệm <span className="font-semibold font-mono bg-slate-50 border px-1.5 py-0.5 rounded text-indigo-700">IQC - SQC - PQC - OQC</span>.
          </p>
        </div>

        {/* Bảng trạng thái & Trình duyệt */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
          <div className="text-xs font-bold text-slate-500 pl-1">Trình trạng:</div>
          <div className="flex items-center gap-1.5">
            <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase ${
              planStatus === 'Draft' 
                ? 'bg-slate-200 text-slate-700 border border-slate-300' 
                : planStatus === 'Chờ phê duyệt' 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {planStatus === 'Draft' ? 'Bản Nháp (Draft)' : planStatus === 'Chờ phê duyệt' ? 'Chờ Phê Duyệt' : 'Đã Ký Duyệt ✓'}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-300"></div>

          {planStatus === 'Draft' ? (
            <button
              onClick={() => {
                setPlanStatus('Chờ phê duyệt');
                alert("Hồ sơ kế hoạch chất lượng tổng thể đang được đẩy lên Trưởng phòng Nguyễn Xuân Thao và Giám đốc Nhà máy phê duyệt.");
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Trình duyệt
            </button>
          ) : planStatus === 'Chờ phê duyệt' ? (
            <button
              onClick={() => {
                setPlanStatus('Đã phê duyệt');
                handleSyncPlansToReportsSystem(true);
                alert("Kế hoạch chất lượng đã được Trưởng phòng duyệt thành công. Phân ban IQC/SQC/PQC/OQC bắt đầu thực thi bổn phận chỉ tiêu, đồng thời tự động đồng bộ sang phân hệ báo cáo tương ứng.");
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" /> Phê Duyệt Kế Hoạch
            </button>
          ) : (
            <button
              onClick={() => setPlanStatus('Draft')}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Mở lại mấu cũ
            </button>
          )}
        </div>
      </div>

      {/* THANH ĐIỀU CHỈNH CHẾ ĐỘ HOẠT ĐỘNG */}
      <div className="bg-slate-100/80 border border-slate-200 p-2.5 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Toggle Weekly vs Monthly */}
        <div className="flex bg-slate-200 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setPlanningMode('weekly')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-black tracking-tight transition-all uppercase cursor-pointer ${
              planningMode === 'weekly' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-300/60'
            }`}
          >
            <Calendar className="w-4 h-4" /> Kế hoạch Tuần (Weekly)
          </button>
          <button
            onClick={() => setPlanningMode('monthly')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-black tracking-tight transition-all uppercase cursor-pointer ${
              planningMode === 'monthly' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-300/60'
            }`}
          >
            <CalendarRange className="w-4 h-4" /> Kế hoạch Tháng (Monthly)
          </button>
        </div>

        {/* Tham số cài đặt phụ */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Mục tiêu FPY đột phá (OQC):</span>
            <input 
              type="number" 
              step="0.1"
              min="90"
              max="100"
              value={fpyTarget}
              onChange={(e) => setFpyTarget(parseFloat(e.target.value) || 98.5)}
              className="w-16 px-1.5 py-1 text-center font-bold bg-white border rounded border-slate-300 font-mono text-indigo-600"
            />
            <span className="font-bold text-slate-400">%</span>
          </div>

          <div className="h-5 w-px bg-slate-300 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>Tháng {m}{m === 6 ? ' (Kỳ này)' : ''}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>Năm {y}{y === 2026 ? ' (Mặc định)' : ''}</option>
                ))}
              </select>
            </div>

            {planningMode === 'weekly' && (
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700 font-mono"
              >
                {[1, 2, 3, 4, 5].map((w) => {
                  const range = getWeekDates(selectedYear, selectedMonth, `W${w}`);
                  return (
                    <option key={w} value={`W${w}`}>
                      Tuần {w} (T{w}) [{range}]
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <button
            onClick={handleExportPlanningExcel}
            title={`Xuất excel kế hoạch chất lượng ${planningMode === 'weekly' ? 'Tuần' : 'Tháng'} tổng thể`}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" /> Xuất KH {planningMode === 'weekly' ? 'Tuần' : 'Tháng'}
          </button>

          <button
            onClick={handleResetData}
            title="Nhập lại mẫu DKBike mặc định"
            className="p-2 border border-slate-300 text-slate-500 bg-white hover:bg-slate-50 rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1 text-xs font-bold uppercase shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Reset Mẫu
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* THÀNH PHẦN 1: FORM NHẬP LIỆU (EDITABLE SPEADSHEET INPUT GRIDS) */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="thanh_phan_1_input_grids">
        
        {/* GRIDS A: KẾ HOẠCH SẢN XUẤT - LẮP RÁP (ASSEMBLE PRODUCTION PLAN) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0 border border-indigo-400/20">
                <Cpu className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">Kế Hoạch Lắp Ráp Xe Thành Phẩm</h2>
                <p className="text-[10.5px] text-slate-400">Timeline: {planningMode === 'weekly' ? 'Từng ngày trong tuần (T2 - CN)' : 'Từng tuần trong tháng (T1 - T5)'}</p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold bg-indigo-950 px-2.5 py-1 text-indigo-400 border border-indigo-900 rounded-md">
              Mã Biểu: MP-PROD-01
            </div>
          </div>

          {/* QUẢN TRỊ INLINE THÊM MODEL HOẶC THÊM CỘT TRỰC TUYẾN */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 items-center text-xs justify-between">
            <div className="flex items-center gap-2">
              <SearchableSelect
                value={newModelInput}
                onChange={setNewModelInput}
                options={masterModelNames}
                placeholder="-- Chọn Dòng Xe (Master) --"
                focusColor="indigo"
              />
              <button 
                onClick={handleAddModel}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm xe
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Mốc TG mới..." 
                value={newTimelineInput}
                onChange={(e) => setNewTimelineInput(e.target.value)}
                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-bold max-w-[120px]"
              />
              <button 
                onClick={handleAddColumn}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm cột
              </button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            {Object.keys(planningMode === 'weekly' ? weeklyAssembly : monthlyAssembly).length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-medium space-y-2">
                <p>Kế hoạch lắp ráp hiện chưa có dữ liệu dòng xe nào.</p>
                <p className="text-[11px] text-slate-400"><em>Sử dụng bảng phía trên hoặc nhấn "Reset Mẫu" để nạp dữ liệu chuẩn DKBike.</em></p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider min-w-[130px]">Model Xe</th>
                    {timelineKeys.map((time, idx) => {
                      const exactDate = planningMode === 'weekly' ? getExactDateForWeekDay(selectedYear, selectedMonth, selectedWeek, idx, time) : '';
                      return (
                        <th key={time} className="py-2 px-1 text-xs font-black text-slate-600 uppercase tracking-wider text-center bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-0.5 p-1 bg-slate-100/60 rounded">
                            <span className="text-[11px] font-black text-slate-800">{time}</span>
                            {exactDate && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded-md tracking-tight">
                                {exactDate}
                              </span>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <button 
                                onClick={() => handleRenameColumn(time)}
                                className="text-indigo-600 hover:text-indigo-800 p-0.5 hover:bg-indigo-50 rounded transition"
                                title="Sửa cột mốc thời gian"
                              >
                                <Settings className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteColumn(time)}
                                className="text-rose-600 hover:text-rose-800 p-0.5 hover:bg-rose-50 rounded transition"
                                title="Xoá cột mốc thời gian"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                    <th className="py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Tổng cộng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {Object.keys(planningMode === 'weekly' ? weeklyAssembly : monthlyAssembly).map(model => {
                    const dataRow = planningMode === 'weekly' ? weeklyAssembly[model] : monthlyAssembly[model];
                    return (
                      <tr key={model} className="hover:bg-indigo-50/10 transition-all">
                        <td className="py-2 text-[11px] font-black text-slate-800 pr-1">
                          <div className="flex items-center justify-between gap-1 group">
                            <span className="truncate max-w-[110px]" title={model}>{model}</span>
                            <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition duration-150">
                              <button 
                                onClick={() => handleRenameModel(model)}
                                className="text-slate-500 hover:text-indigo-600 p-0.5 rounded"
                                title="Sửa tên mẫu xe"
                              >
                                <Settings className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteModel(model)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                                title="Xoá dòng xe"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                        {timelineKeys.map(time => {
                          const val = dataRow?.[time] || 0;
                          const hasData = val > 0;
                          return (
                            <td key={time} className="py-0.5 px-0.5 bg-slate-50/20">
                              <input 
                                type="number" 
                                min="0"
                                value={val}
                                onChange={(e) => handleAssemblyChange(model, time, e.target.value)}
                                className={`w-full py-1 text-center rounded focus:outline-hidden transition font-black font-mono border text-[11px] ${
                                  hasData 
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs focus:bg-emerald-600' 
                                    : 'bg-white border-slate-200 text-slate-500 focus:border-indigo-500 hover:bg-slate-50'
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="py-2 text-right font-black font-mono text-indigo-650 text-[11px] bg-indigo-50/10 uppercase">
                          {modelProductionTotals[model] || 0} xe
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/85 border-t border-slate-200 font-extrabold text-slate-800 text-[11px]">
                    <td className="py-2.5 uppercase font-black text-slate-600 text-[11px]">TỔNG XE LẮP</td>
                    {timelineKeys.map(time => {
                      let dayTotal = 0;
                      const dataset = planningMode === 'weekly' ? weeklyAssembly : monthlyAssembly;
                      Object.keys(dataset).forEach(model => {
                        dayTotal += (dataset[model]?.[time] || 0);
                      });
                      return (
                        <td key={time} className="py-2.5 text-center font-black font-mono text-slate-800">
                          {dayTotal}
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-right font-black font-mono text-indigo-700 pl-1 uppercase">
                      {grandTotalProduction} xe
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* GRIDS B: KẾ HOẠCH CUNG ỨNG - NHẬP HÀNG (IMPORT SUPPLIES PLAN) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg shrink-0 border border-emerald-400/20">
                <Truck className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">Kế Hoạch Nhập Hàng - Vật Tư NCC</h2>
                <p className="text-[10.5px] text-slate-400">Định dạng ô: [Tên vật tư] / [Số lượng] (e.g. Khung sườn / 100)</p>
              </div>
            </div>
            <div className="text-xs font-mono font-bold bg-emerald-950 px-2.5 py-1 text-emerald-400 border border-emerald-900 rounded-md">
              Mã Biểu: MP-SUPP-02
            </div>
          </div>

          {/* QUẢN TRỊ INLINE THÊM NHÀ CUNG CẤP TRỰC TUYẾN */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 items-center text-xs justify-between">
            <div className="flex items-center gap-2">
              <SearchableSelect
                value={newSupplierInput}
                onChange={setNewSupplierInput}
                options={masterSupplierNames}
                placeholder="-- Chọn Nhà Cung Cấp (Master) --"
                focusColor="emerald"
                className="w-[260px]"
              />
              <button 
                onClick={handleAddSupplier}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm NCC
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-medium">Sử dụng nút sửa ở cột tiêu đề để chỉnh ngày nhập</span>
          </div>

          <div className="p-4 overflow-x-auto">
            {Object.keys(planningMode === 'weekly' ? weeklySupply : monthlySupply).length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-medium space-y-2">
                <p>Kế hoạch nhập hàng hiện chưa có nhà cung cấp nào.</p>
                <p className="text-[11px] text-slate-400"><em>Hãy nhập NCC mới hoặc nhấn "Reset Mẫu" để lập tức nạp cấu hình tiêu chuẩn.</em></p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2.5 text-xs font-black text-slate-500 uppercase tracking-wider min-w-[130px]">Nhà Cung Cấp</th>
                    {timelineKeys.map((time, idx) => {
                      const exactDate = planningMode === 'weekly' ? getExactDateForWeekDay(selectedYear, selectedMonth, selectedWeek, idx, time) : '';
                      return (
                        <th key={time} className="py-2 px-1 text-xs font-black text-slate-600 uppercase tracking-wider text-center bg-slate-50/50">
                          <div className="flex flex-col items-center justify-center gap-0.5 p-1 bg-slate-100/60 rounded">
                            <span className="text-[11px] font-black text-slate-800">{time}</span>
                            {exactDate && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-md tracking-tight">
                                {exactDate}
                              </span>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <button 
                                onClick={() => handleRenameColumn(time)}
                                className="text-emerald-700 hover:text-emerald-900 p-0.5 hover:bg-emerald-50 rounded transition"
                                title="Sửa cột mốc thời gian"
                              >
                                <Settings className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteColumn(time)}
                                className="text-rose-600 hover:text-rose-800 p-0.5 hover:bg-rose-50 rounded transition"
                                title="Xoá cột mốc thời gian"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {Object.keys(planningMode === 'weekly' ? weeklySupply : monthlySupply).map(supplier => {
                    const dataRow = planningMode === 'weekly' ? weeklySupply[supplier] : monthlySupply[supplier];
                    return (
                      <tr key={supplier} className="hover:bg-emerald-50/10 transition-all">
                        <td className="py-2 text-[11px] font-black text-slate-800 pr-1 max-w-[140px] leading-tight">
                          <div className="flex items-center justify-between group gap-1">
                            <div className="truncate">
                              <span className="block truncate" title={supplier}>{supplier}</span>
                              <span className="text-[10px] text-slate-450 font-normal block truncate">
                                {DEFAULT_SUPPLIERS.find(s => s.name === supplier)?.material || 'Linh phụ kiện'}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition duration-150 shrink-0">
                              <button 
                                onClick={() => handleRenameSupplier(supplier)}
                                className="text-slate-500 hover:text-emerald-600 p-0.5 rounded"
                                title="Sửa tên nhà cung cấp"
                              >
                                <Settings className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSupplier(supplier)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                                title="Xoá nhà cung cấp"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                        {timelineKeys.map(time => {
                          const cellText = dataRow?.[time] || '';
                          const hasData = cellText.trim() !== '';
                          return (
                            <td key={time} className="py-0.5 px-0.5 bg-slate-50/20">
                              <input 
                                type="text" 
                                placeholder="Trống"
                                value={cellText}
                                onChange={(e) => handleSupplyChange(supplier, time, e.target.value)}
                                className={`w-full py-1 px-1.5 text-center rounded focus:outline-hidden transition font-black border text-[10.5px] font-sans ${
                                  hasData 
                                    ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs focus:bg-amber-300' 
                                    : 'bg-white border-slate-200 text-slate-500 focus:border-emerald-500 hover:bg-slate-50'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>


      {/* ========================================================== */}
      {/* THÀNH PHẦN 2: LOGIC TỰ ĐỘNG SINH KẾ HOẠCH (AUTO GENERATION) */}
      {/* ========================================================== */}
      <div className="bg-slate-50/60 p-6 rounded-2xl border border-slate-200 space-y-6" id="thanh_phan_2_auto_generation">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-4 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-xl text-white shadow-sm shadow-indigo-100">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Kế Hoạch Chất Lượng Tự Động Sinh (Auto-Generated QMS)</h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-black text-[10px] animate-pulse">
                  SL CHÉO DỮ LIỆU LIVE ⚡
                </span>
              </div>
              <p className="text-xs text-slate-500">Cơ chế QSM tự động liên kết: Trích xuất lỗi KCS thực tế tại phân hệ <strong className="text-rose-600 font-semibold">OQC</strong> để tự động lập chốt chặn phòng ngừa <strong className="text-rose-600 font-semibold">PQC trong chuyền</strong>, đồng thời lên lực <strong className="text-indigo-600 font-semibold">IQC / SQC</strong> theo mốc nhập linh kiện.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                try {
                  const saved = localStorage.getItem('dk_oqc_records');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                      setOqcRecords(parsed);
                    }
                  }
                } catch (e) {
                  console.error('Error refreshing OQC records manually', e);
                }
                setForceRefresh(prev => prev + 1);
                alert("🔄 Đã phản hồi & tải mới nhất dữ liệu lỗi OQC thực tế từ hệ thống! Toàn bộ kế hoạch PQC đã được tự động tính toán lại theo lỗi hiện hữu.");
              }}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              title="Lực cập nhật tính toán lại bảng số liệu nếu có độ trễ"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Cập nhật số liệu biểu mẫu
            </button>
            <button
              onClick={handleSyncAutoPlansToWorkboard}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow-md transition-all cursor-pointer border border-indigo-500/20 flex items-center gap-1.5 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
              title="Nút đồng bộ: Click để cập nhật và đẩy toàn bộ kế hoạch PQC/OQC/IQC/SQC tự động sinh này thành công việc chi tiết xuống Bảng Quản Lý Tác Vụ bên dưới"
              id="btn_sync_auto_qms_workboard"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              ĐỒNG BỘ XUỐNG BẢNG TÁC VỤ
            </button>
            <button
              onClick={() => handleSyncPlansToReportsSystem(false)}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase rounded-lg shadow-md transition-all cursor-pointer border border-sky-500/20 flex items-center gap-1.5 focus:ring-2 focus:ring-offset-2 focus:ring-sky-600"
              title="Đồng bộ kế hoạch này sang Báo cáo tuần/tháng và các phân hệ IQC, PQC, SQC"
              id="btn_sync_to_reports_system"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              ĐỒNG BỘ SANG BÁO CÁO & PHÂN HỆ KHÁC
            </button>
          </div>
        </div>

        {/* 2.1 PQC PLAN TABLE CARD */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 flex justify-between items-center px-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                1. Kế hoạch kiểm soát trong dây chuyền (PQC Quality Audit Plan)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-800 text-indigo-300 font-sans">
              Kiểm soát kho & bục lắp ráp chuyên biệt
            </span>
          </div>

          <div className="p-4">
            {/* Thanh thông báo chính sách đồng bộ tự động cao cấp */}
            <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 text-indigo-950 rounded-xl text-xs font-bold flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 tracking-tight">
                <span className="p-1 px-2.5 bg-indigo-650 text-white font-extrabold uppercase text-[9px] rounded-md tracking-wider">Đồng bộ tự động</span>
                <span>Các hạng mục PQC bạn thêm mới hoặc sửa đổi được lưu trữ thông suốt theo model sản phẩm, tự động áp dụng & gợi ý khi lập lịch tuần tới hoặc tháng tới.</span>
              </div>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-extrabold">Tổng dòng xe: {generatedPqcPlan.length} model</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/20 text-xs">
                  <th className="py-2 px-3 font-bold text-slate-500 w-[180px]">Model Sản Phẩm</th>
                  <th className="py-2 px-3 font-bold text-center text-slate-500 w-[110px]">Mẻ ráp</th>
                  <th className="py-2 px-3 font-bold text-slate-500">Hạng mục & tiêu chí PQC thiết lập riêng</th>
                  <th className="py-2 px-3 font-bold text-slate-500 w-[150px]">Người phụ trách</th>
                  <th className="py-2 px-3 font-bold text-slate-500 w-[180px]">Phòng ngừa lỗi lịch sử</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 font-semibold text-slate-700">
                {generatedPqcPlan.map((plan) => (
                  <tr key={plan.model} className="hover:bg-slate-50 transition border-l-4 border-l-indigo-500">
                    <td className="py-4 px-3 font-extrabold text-slate-800 align-top">
                      <div className="font-extrabold text-indigo-950 text-sm">{plan.model}</div>
                      <div className="text-[10px] text-indigo-500 uppercase font-bold mt-1 tracking-wider">Line PQC Active</div>
                      <button
                        onClick={() => handleOpenAddPqcItem(plan.model)}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-950 border border-indigo-250 hover:border-indigo-350 rounded font-bold text-[10px] shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 shrink-0" /> Thêm hạng mục
                      </button>
                    </td>
                    <td className="py-4 px-3 text-center font-mono font-bold text-slate-600 align-top">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">
                        {plan.prodQty} xe
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="space-y-2.5">
                        {plan.controlItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-lg flex flex-col md:flex-row md:items-start justify-between gap-2.5 hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group">
                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.type === 'incoming' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-750 border border-emerald-200 rounded text-[9.5px] font-black uppercase font-sans">
                                    <Cpu className="w-3 h-3 shrink-0" /> KT LK vào chuyền
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-750 border border-indigo-200 rounded text-[9.5px] font-black uppercase font-sans">
                                    <Wrench className="w-3 h-3 shrink-0" /> KT công đoạn
                                  </span>
                                )}
                                <span className="font-black text-slate-800 text-xs">{item.name}</span>
                              </div>
                              <p className="text-[11.5px] text-slate-500 font-normal leading-relaxed">{item.explanation}</p>
                            </div>
                            <div className="shrink-0 flex items-center md:flex-col md:items-end justify-between md:justify-start gap-1.5">
                              <span className="inline-flex items-center justify-center text-[10px] font-black uppercase px-2 py-1 rounded bg-amber-50 border border-amber-250 text-amber-900 whitespace-nowrap font-sans shrink-0">
                                ⏱️ {item.frequencyDesc}
                              </span>
                              <div className="flex gap-1 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenEditPqcItem(plan.model, idx, item)}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-200 transition cursor-pointer"
                                  title="Sửa nội dung"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePqcItem(plan.model, idx)}
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition cursor-pointer"
                                  title="Xóa hạng mục"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-700 uppercase">
                          HV
                        </div>
                        <span className="text-slate-700 font-extrabold">{plan.assignee}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3 align-top">
                      {plan.defectAlert ? (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-700 uppercase">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 animate-pulse text-rose-600" />
                            Đã gán tần suất cao:
                          </div>
                          <p className="text-[11px] text-slate-700 font-semibold leading-snug">{plan.defectAlert}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal block mt-1 leading-snug">Đạt chuẩn SOP, không có lỗi cũ.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* 2.2 OQC PLAN TABLE CARD */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 flex justify-between items-center px-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                2. Kế hoạch nghiệm thu sát hạch xe xuất xưởng (OQC Finished Vehicle Inspection Plan)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-800 text-emerald-300">
              Kiểm định cam kết 100% dòng xe sút hạch
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-emerald-100 bg-emerald-50/20 text-xs">
                  <th className="py-2 px-3 font-bold text-slate-500">Model Sản Phẩm </th>
                  <th className="py-2 px-3 font-bold text-center text-slate-500">Sản lượng mẻ ráp</th>
                  <th className="py-2 px-3 font-bold text-center text-emerald-700">SL nghiệm thu 100% xưởng</th>
                  <th className="py-2 px-3 font-bold text-center text-slate-500">Mục tiêu FPY đột phá</th>
                  <th className="py-2 px-3 font-bold text-slate-500">Sát hạch viên phụ trách chính</th>
                  <th className="py-2 px-3 font-bold text-slate-500">Hạng mục kiểm nghiệm trọng tâm</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 font-semibold text-slate-700">
                {generatedOqcPlan.map((plan) => (
                  <tr key={plan.model} className="hover:bg-slate-50 transition border-l-4 border-l-emerald-500">
                    <td className="py-3 px-3 font-extrabold text-slate-800">{plan.model}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">{plan.prodQty} xe</td>
                    <td className="py-3 px-3 text-center bg-emerald-50/10">
                      <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-800 rounded-md font-mono font-black border border-emerald-200/50">
                        {plan.oqcTestQty} xe
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-700 font-extrabold">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          step="0.1" 
                          min="90" 
                          max="100"
                          value={plan.rawFpyTarget}
                          onChange={(e) => updateModelFpyTarget(plan.model, parseFloat(e.target.value) || fpyTarget)}
                          className="w-16 px-1.5 py-1 text-center font-bold bg-white border border-slate-300 rounded font-mono text-indigo-650 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-slate-400 text-[10px]">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 animate-pulse">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-800 uppercase">
                          OQ
                        </div>
                        <span className="text-slate-700 font-bold">{plan.assignee}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-normal leading-tight">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-150 border rounded text-[10px] text-slate-600 font-bold mb-1">Tiêu chuẩn ISO</span>
                      <p className="text-[11px]">{plan.auditCriteria}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2.3 IQC & SQC PLAN TABLE CARD */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* IQC: KIỂM LINH KIỆN ĐẦU VÀO */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden xl:col-span-2">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center px-4">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                3A. Kế hoạch kiểm tra LK đầu vào (IQC Inspecting Plan)
              </h4>
              <span className="text-[9px] font-bold bg-amber-100/20 text-amber-200 border border-amber-500/20 px-2 py-0.5 rounded gap-1 flex items-center">
                <Info className="w-3 h-3 text-amber-300" /> Tự lọc từ vật tư ráp NCC
              </span>
            </div>

            <div className="p-3 overflow-x-auto">
              {generatedIqcSupplyPlan.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Không phát hiện lịch trình bàn giao linh kiện nào trong Biểu mẫu kế hoạch nhập hàng. Vui lòng gõ vật tư đại diện vào ô trống.
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px]">
                      <th className="py-2 text-slate-500 font-bold w-[12%]">Thời điểm</th>
                      <th className="py-2 text-slate-500 font-bold w-[18%]">Nhà cung ứng</th>
                      <th className="py-2 text-slate-500 font-bold w-[28%]">Tên vật tư / Số lượng lô</th>
                      <th className="py-2 text-slate-500 font-bold w-[32%]">Ghi chú đo kiểm mẫu</th>
                      <th className="py-2 text-slate-500 font-bold text-right w-[10%]">Lệnh IQC</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 font-semibold text-slate-700">
                    {generatedIqcSupplyPlan.map((iqc) => {
                      const compositeKey = `${iqc.supplier}||${iqc.material}`;
                      const noteVal = customIqcNotes[compositeKey] || '';
                      const isEditing = editingIqcRowId === iqc.id;

                      return (
                        <tr key={iqc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 font-bold text-slate-500 font-mono align-top">{iqc.timeline}</td>
                          <td className="py-2.5 font-extrabold text-slate-800 align-top">{iqc.supplier}</td>
                          <td className="py-2.5 font-normal text-slate-600 align-top">
                            <span className="font-extrabold text-indigo-700 font-sans">{iqc.material}</span> (Số lượng: <strong className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{iqc.qty}</strong>)
                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-bold">
                              <span>Phụ trách:</span>
                              <span className="text-slate-600">{iqc.assignee}</span>
                            </div>
                          </td>
                          <td className="py-2.5 align-top">
                            {isEditing ? (
                              <div className="space-y-1.5 pt-0.5 relative">
                                <div className="flex gap-1 items-start">
                                  <textarea
                                    className="w-full text-xs p-1.5 border border-indigo-300 rounded font-normal bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 min-h-[50px] shadow-xs leading-normal text-slate-800"
                                    value={iqcRowNoteText}
                                    onChange={(e) => setIqcRowNoteText(e.target.value)}
                                    placeholder="Gõ ghi chú đo kiểm mẫu cho linh kiện..."
                                    autoFocus
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between gap-2">
                                  {/* Dropdown gợi ý mẫu cũ đã lưu */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setShowNoteTemplateDropdown(!showNoteTemplateDropdown)}
                                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                    >
                                      📋 Chọn nhanh từ mẫu ({savedIqcNoteTemplates.length}) ▾
                                    </button>
                                    
                                    {showNoteTemplateDropdown && (
                                      <div className="absolute left-0 mt-1 w-72 max-h-[220px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-30 divide-y divide-slate-100 text-[11px] font-normal font-sans">
                                        <div className="p-2 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 flex items-center justify-between">
                                          <span>Lịch sử ghi chú kiểm định</span>
                                          <span className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wide">Lựa chọn nhanh</span>
                                        </div>
                                        {savedIqcNoteTemplates.length === 0 ? (
                                          <div className="p-3 text-slate-400 italic text-[10px]">Chưa lưu mẫu nào. Gõ ghi chú ở trên & nhấn Lưu đề ghi nhận tự động vào lịch sử.</div>
                                        ) : (
                                          savedIqcNoteTemplates.map((tmpl, tIdx) => (
                                            <div
                                              key={tIdx}
                                              className="w-full hover:bg-slate-50 text-slate-700 flex items-center justify-between gap-2 p-2 group transition"
                                            >
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setIqcRowNoteText(tmpl);
                                                  setShowNoteTemplateDropdown(false);
                                                }}
                                                className="text-left flex-1 cursor-pointer leading-tight break-words font-medium hover:text-indigo-900"
                                              >
                                                {tmpl}
                                              </button>
                                              
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const next = savedIqcNoteTemplates.filter((_, idx) => idx !== tIdx);
                                                  setSavedIqcNoteTemplates(next);
                                                  saveAndSync('dk_iqc_saved_notes', next);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-white hover:bg-rose-600 rounded transition duration-200 shrink-0 cursor-pointer"
                                                title="Xóa mẫu này"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingIqcRowId(null);
                                        setShowNoteTemplateDropdown(false);
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateIqcNote(iqc.supplier, iqc.material, iqcRowNoteText);
                                        setShowNoteTemplateDropdown(false);
                                      }}
                                      className="px-2.5 py-0.5 text-[10px] font-black bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center gap-0.5 cursor-pointer"
                                    >
                                      ✓ Lưu
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => {
                                  setEditingIqcRowId(iqc.id);
                                  setIqcRowNoteText(noteVal);
                                  setShowNoteTemplateDropdown(false);
                                }}
                                className="group/note flex items-start gap-1 cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-lg transition min-h-[40px] border border-transparent hover:border-amber-200/50 w-full"
                                title="Nhấp vào để thêm hoặc sửa ghi chú kiểm tra"
                              >
                                {noteVal ? (
                                  <p className="text-slate-600 text-[11px] font-normal leading-relaxed flex-1 italic">{noteVal}</p>
                                ) : (
                                  <span className="text-slate-400 text-[10px] font-normal italic flex-1 flex items-center gap-1">
                                    ✍ Thêm ghi chú đo kiểm mẫu (Lưu để lần sau dùng)...
                                  </span>
                                )}
                                <span className="opacity-0 group-hover/note:opacity-100 text-[9px] font-bold text-amber-600 shrink-0 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded transition">
                                  SỬA
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono text-[10px] align-top">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-black border border-amber-300/40 uppercase">
                              Chờ kiểm mẫu
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SQC: ĐẦU VIỆC KIỂM TRA NHÀ CUNG CẤP LÂM SÀNG */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center px-4">
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                3B. Giám sát kỹ thuật đối tác (SQC Audit Work)
              </h4>
            </div>

            <div className="p-3 divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
              {generatedSqcPlan.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Chưa phát sinh hoạt động chất lượng nhà cung cấp do danh sách vật tư nhận trống.
                </div>
              ) : (
                generatedSqcPlan.map((sqc) => {
                  const isEditing = editingSqcSupplier === sqc.supplier;
                  return (
                    <div key={sqc.id} className="py-3 space-y-2 bg-slate-50/40 p-2.5 rounded-lg mb-2 border border-slate-150 relative group">
                      {isEditing ? (
                        <div className="space-y-2 pt-1 font-semibold">
                          <div className="text-[10px] font-black text-slate-500 uppercase">Thiết lập SQC cho {sqc.supplier}</div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Nhiệm vụ giám sát kỹ thuật:</label>
                            <textarea
                              rows={2}
                              value={sqcFormTask}
                              onChange={(e) => setSqcFormTask(e.target.value)}
                              className="w-full text-xs p-1.5 border border-slate-300 rounded font-normal bg-white"
                              placeholder="Ví dụ: Đo gắp mô-men siết ren sườn, bọt khí đúc mâm nhôm..."
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Yêu cầu tiêu chuẩn kỹ thuật:</label>
                            <textarea
                              rows={2}
                              value={sqcFormSpecs}
                              onChange={(e) => setSqcFormSpecs(e.target.value)}
                              className="w-full text-xs p-1.5 border border-slate-300 rounded font-normal bg-white"
                              placeholder="Ví dụ: Dung sai kích thước mối hàn dưới 0.5mm, không rỗng nứt..."
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingSqcSupplier(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-all"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateCustomSqcItem(sqc.supplier, sqcFormTask, sqcFormSpecs);
                                setEditingSqcSupplier(null);
                              }}
                              className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10px] font-black cursor-pointer transition-all animate-pulse"
                            >
                              Lưu lại
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              Mã SQC: {sqc.id}
                            </span>
                            <span className="text-[10.5px] font-extrabold text-slate-800 truncate max-w-[150px]">
                              {sqc.supplier}
                            </span>
                          </div>
                          <div className="text-xs font-extrabold text-slate-800 pt-1">
                            {sqc.taskDescription}
                          </div>
                          <div className="text-[10.5px] text-slate-500 font-normal">
                            <strong className="text-slate-600 font-bold">Yêu cầu tiêu chuẩn:</strong> {sqc.targetSpecs}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                              <User className="w-3.5 h-3.5 text-slate-400" /> Phụ trách: <strong>{sqc.assignee}</strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSqcSupplier(sqc.supplier);
                                setSqcFormTask(sqc.taskDescription === 'Chưa thiết lập nội dung giám sát SQC. Vui lòng bấm sửa để ghi nhận.' ? '' : sqc.taskDescription);
                                setSqcFormSpecs(sqc.targetSpecs === 'Chưa thiết lập tiêu chuẩn kiểm soát dứt điểm.' ? '' : sqc.targetSpecs);
                              }}
                              className="text-[9.5px] text-indigo-650 hover:underline font-bold flex items-center gap-0.5 cursor-pointer opacity-85 hover:opacity-100 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200"
                            >
                              <span>✏️ Thiết lập</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================== */}
      {/* THÀNH PHẦN 3: PHÂN BAN QUẢN LÝ TÁC VỤ CHẤT LƯỢNG (TASK WORKBOARD) */}
      {/* ========================================================== */}
      <div className="space-y-6" id="thanh_phan_3_task_management">



        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-900 to-slate-900 rounded-xl text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Khu Vực Phân Ban & Quản Lý Tác Vụ Hành Động (Quality Actions Tracker)</h2>
              <p className="text-xs text-slate-500">Giám sát, phân nhiệm, cập nhật tiến độ công việc hàng ngày của tập ban QLCL (QA/QC Dept).</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setBoardLayout(prev => prev === 'grid' ? 'scroll' : 'grid')}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-300 font-extrabold text-[11px] px-3.5 py-2.5 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 uppercase cursor-pointer"
              title="Thay đổi cách sắp xếp các cột công việc"
            >
              {boardLayout === 'grid' ? '↔️ Chế độ bảng ngang (Cuộn)' : '📋 Chế độ Lưới (Mặc định)'}
            </button>



            <button
              onClick={() => {
                setEditingTask(null);
                setNewTaskTitle('');
                setNewTaskRef('');
                setNewTaskPriority('Medium');
                const defaultDate = planningMode === 'weekly' 
                  ? getDateInWeek(selectedYear, selectedMonth, selectedWeek) 
                  : `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-28`;
                setNewTaskDeadline(defaultDate);
                setShowAddTaskModal(true);
              }}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-xs transition flex items-center justify-center gap-2 uppercase shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm Tác Vụ
            </button>
          </div>
        </div>



        {/* 5 COLUMNS SECTION LAYOUT */}
        <div className={boardLayout === 'scroll' 
          ? "flex overflow-x-auto pb-4 gap-5 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-slate-100 w-full"
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
        }>
          
          {/* SECTION 1: CÔNG VIỆC TỒN ĐỌNG (BACKLOGS) */}
          <div className={`${boardLayout === 'scroll' ? 'w-80 shrink-0' : ''} bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-4`}>
            <div className="flex justify-between items-center bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 tracking-tight shadow-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                <h3 className="text-xs font-extrabold uppercase">1. Công việc tồn đọng</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setZoomedColumn('backlog')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                  title="Phóng to bảng công việc tồn đọng"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <span className="bg-slate-800 border border-slate-700 text-slate-300 font-mono font-black text-[10px] px-2 py-0.5 rounded">
                  {backlogTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {backlogTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-normal border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  Không còn công việc tồn đọng.
                </div>
              ) : (
                backlogTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTaskStatus} 
                    onDelete={handleDeleteTask} 
                    onEdit={handleOpenEditModal}
                  />
                ))
              )}
            </div>
          </div>

          {/* SECTION 2: CAPA ĐANG MỞ (OPEN CAPA) */}
          <div className={`${boardLayout === 'scroll' ? 'w-80 shrink-0' : ''} bg-slate-100/80 rounded-2xl border border-slate-200 p-4 space-y-4`}>
            <div className="flex justify-between items-center bg-rose-950 text-rose-100 border border-rose-900 p-2.5 rounded-xl tracking-tight shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase">2. Biên bản CAPA mở</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setZoomedColumn('capa')}
                  className="p-1 hover:bg-rose-900 rounded text-rose-400 hover:text-white transition cursor-pointer"
                  title="Phóng to bảng CAPA"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <span className="bg-rose-900/60 border border-rose-800 text-rose-200 font-mono font-black text-[10px] px-2 py-0.5 rounded">
                  {openCapaTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {openCapaTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-normal border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  Tuyệt vời! Toàn bộ CAPA đã được xử lý khắc phục dứt điểm.
                </div>
              ) : (
                openCapaTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTaskStatus} 
                    onDelete={handleDeleteTask} 
                    onEdit={handleOpenEditModal}
                  />
                ))
              )}
            </div>
          </div>

          {/* SECTION 3: CÔNG VIỆC PTSP (R&D PRODUCTS) */}
          <div className={`${boardLayout === 'scroll' ? 'w-80 shrink-0' : ''} bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-4`}>
            <div className="flex justify-between items-center bg-indigo-950 text-white p-2.5 rounded-xl tracking-tight shadow-xs border border-indigo-900">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-extrabold uppercase">3. Phát triển xe mới</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setZoomedColumn('ptsp')}
                  className="p-1 hover:bg-indigo-900 rounded text-indigo-300 hover:text-white transition cursor-pointer"
                  title="Phóng to bảng PTSP"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <span className="bg-indigo-900 border border-indigo-800 text-indigo-200 font-mono font-black text-[10px] px-2 py-0.5 rounded">
                  {ptspTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {ptspTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-normal border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  Chưa ghi nhận tác vụ chất lượng R&D nào.
                </div>
              ) : (
                ptspTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTaskStatus} 
                    onDelete={handleDeleteTask} 
                    onEdit={handleOpenEditModal}
                  />
                ))
              )}
            </div>
          </div>

          {/* SECTION 4: PHỐI HỢP PHÒNG BAN (COORDINATION) */}
          <div className={`${boardLayout === 'scroll' ? 'w-80 shrink-0' : ''} bg-slate-100/80 rounded-2xl border border-slate-200 p-4 space-y-4`}>
            <div className="flex justify-between items-center bg-emerald-950 text-emerald-150 border border-emerald-900 p-2.5 rounded-xl tracking-tight shadow-xs">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-extrabold uppercase" style={{ color: '#ffffff' }}>4. Phối hợp liên ban</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setZoomedColumn('coordination')}
                  className="p-1 hover:bg-emerald-900 rounded text-emerald-400 hover:text-white transition cursor-pointer"
                  title="Phóng to bảng liên ban"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <span className="bg-emerald-900/60 border border-emerald-800 text-emerald-200 font-mono font-black text-[10px] px-2 py-0.5 rounded">
                  {coordinationTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {coordinationTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-normal border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  Không ghi nhận công việc liên xưởng/liên phòng.
                </div>
              ) : (
                coordinationTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTaskStatus} 
                    onDelete={handleDeleteTask} 
                    onEdit={handleOpenEditModal}
                  />
                ))
              )}
            </div>
          </div>

          {/* SECTION 5: CÔNG VIỆC CẢI TIẾN (ECO) */}
          <div className={`${boardLayout === 'scroll' ? 'w-80 shrink-0' : ''} bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-4`}>
            <div className="flex justify-between items-center bg-cyan-950 text-cyan-100 border border-cyan-900 p-2.5 rounded-xl tracking-tight shadow-xs">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-extrabold uppercase">5. Cải tiến kỹ thuật (ECO)</h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setZoomedColumn('eco')}
                  className="p-1 hover:bg-cyan-900 rounded text-cyan-400 hover:text-white transition cursor-pointer"
                  title="Phóng to bảng ECO"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <span className="bg-cyan-900 border border-cyan-800 text-cyan-200 font-mono font-black text-[10px] px-2 py-0.5 rounded">
                  {ecoTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto">
              {ecoTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-normal border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  Chưa ghi nhận tác vụ thay đổi kỹ thuật ECO nào.
                </div>
              ) : (
                ecoTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onToggle={handleToggleTaskStatus} 
                    onDelete={handleDeleteTask} 
                    onEdit={handleOpenEditModal}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* OVERLAY MODAL: THÊM TÁC VỤ CHẤT LƯỢNG MỚI */}
      <AnimatePresence>
        {showAddTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-xl shadow-2xl relative overflow-hidden space-y-4"
            >
              <div className="bg-indigo-900 text-white p-4 -mx-6 -mt-6 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  {editingTask ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingTask ? 'Cập nhật tác vụ chất lượng' : 'Khai báo tác vụ chất lượng mới'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nội dung công việc - Đầu việc chất lượng cần lập</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Nhập chi tiết đầu việc (Ví dụ: Thử kín nước mẻ rơle điện mới...)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-hidden focus:border-indigo-500 text-xs font-semibold placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Phân ban tác vụ</label>
                    <select
                      value={newTaskSection}
                      onChange={(e) => setNewTaskSection(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-700 bg-white"
                    >
                      <option value="backlog">1. Công việc tồn đọng (Backlog)</option>
                      <option value="capa">2. Đặc nhiệm CAPA đang mở</option>
                      <option value="ptsp">3. Phát triển sản phẩm (PTSP)</option>
                      <option value="coordination">4. Tác vụ phối hợp liên xưởng</option>
                      <option value="eco">5. Công việc Cải tiến (ECO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Cán bộ phụ trách (Assignee)</label>
                    <SearchableSelect
                      value={newTaskAssignee}
                      onChange={setNewTaskAssignee}
                      options={masterStaff.map(s => s.name)}
                      placeholder="-- Chọn cán bộ phụ trách --"
                      focusColor="indigo"
                      containerClassName="w-full"
                    />
                    {qmsRecommendationText && (
                      <p className="mt-1.5 text-[10.5px] font-bold text-amber-800 bg-amber-50 rounded-md p-2 border border-amber-250 leading-normal">
                        💡 {qmsRecommendationText}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Độ khẩn / Ưu tiên</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-700 bg-white"
                    >
                      <option value="High">Cao (HIGH)</option>
                      <option value="Medium">Trung bình (MEDIUM)</option>
                      <option value="Low">Thấp (LOW)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Hạn hoàn thành (Deadline)</label>
                    <input
                      type="date"
                      required
                      value={newTaskDeadline}
                      onChange={(e) => setNewTaskDeadline(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 text-xs font-bold font-mono text-slate-700"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Dòng xe liên quan (Model)</label>
                    <SearchableSelect
                      value={newTaskModel}
                      onChange={setNewTaskModel}
                      options={masterModelNames}
                      placeholder="-- Chọn Dòng Xe --"
                      focusColor="indigo"
                      containerClassName="w-full"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nhà cung cấp liên quan (Supplier)</label>
                    <SearchableSelect
                      value={newTaskSupplier}
                      onChange={setNewTaskSupplier}
                      options={masterSupplierNames}
                      placeholder="-- Chọn Nhà Cung Cấp --"
                      focusColor="emerald"
                      containerClassName="w-full"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Trạng thái thực thi (Execution Status)</label>
                    <select
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg border-slate-300 text-xs font-bold text-slate-750 bg-amber-50/20 font-sans"
                    >
                      <option value="Pending">⏳ Chưa làm (Pending)</option>
                      <option value="In_Progress">⚡ Đang thực hiện (In Progress)</option>
                      <option value="Completed">✓ Hoàn thiện (Completed)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddTaskModal(false);
                      setEditingTask(null);
                    }}
                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg shrink-0 cursor-pointer"
                  >
                    Huỷ bốc
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition shrink-0 cursor-pointer"
                  >
                    {editingTask ? 'Cập nhật thay đổi' : 'Ghim gá tác vụ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL: THÊM HOẶC SỬA HẠNG MỤC PQC */}
      <AnimatePresence>
        {showPqcModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-xl shadow-2xl relative overflow-hidden space-y-4"
            >
              <div className="bg-indigo-900 text-white p-4 -mx-6 -mt-6 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Workflow className="w-4 h-4" /> 
                  {pqcModalMode === 'add' ? 'Thêm mới hạng mục kiểm soát PQC' : 'Cập nhật hạng mục kiểm soát PQC'}
                </h3>
                <button 
                  type="button"
                  onClick={() => setShowPqcModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <div className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] text-indigo-900 font-bold flex items-center justify-between">
                <span>Dòng xe đang áp dụng:</span>
                <span className="bg-indigo-650 text-white px-2 py-0.5 rounded text-xs font-black">{pqcActiveModel}</span>
              </div>

              <form onSubmit={handleSavePqcItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Loại kiểm soát linh kiện hoặc công đoạn</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPqcFormType('incoming')}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                        pqcFormType === 'incoming'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-black'
                          : 'bg-white border-slate-250 text-slate-605 hover:bg-slate-50'
                      }`}
                    >
                      <Cpu className="w-4 h-4 text-emerald-600" /> KT LK vào chuyền (Incoming)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPqcFormType('process')}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${
                        pqcFormType === 'process'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-400 font-black'
                          : 'bg-white border-slate-250 text-slate-605 hover:bg-slate-50'
                      }`}
                    >
                      <Wrench className="w-4 h-4 text-indigo-600" /> KT công đoạn (Process)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tên hạng mục & tiêu chí KCS</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên bục siết hoặc linh kiện (Ví dụ: Siết mẻ ốc bệ máy 40N, Đo dung sai chén bi...)"
                    value={pqcFormName}
                    onChange={(e) => setPqcFormName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-hidden focus:border-indigo-500 text-xs font-semibold placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tần suất đo kiểm thiết lập</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 3 lượt / ca, 100% lô cắm rút lạnh..."
                    value={pqcFormFrequency}
                    onChange={(e) => setPqcFormFrequency(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-hidden focus:border-indigo-500 text-xs font-semibold placeholder-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Chi tiết mô tả khuyến cáo kỹ thuật, SOP áp dụng hoặc đối sách lỗi</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Mô tả kỹ phương pháp đo đạc, dùng thước cặp kẹp hay thử mô-men xoắn, mẻ keo bọc bảo dán, cách khắc phục lỗi..."
                    value={pqcFormExplanation}
                    onChange={(e) => setPqcFormExplanation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg border-slate-300 focus:outline-hidden focus:border-indigo-500 text-xs font-semibold placeholder-slate-400"
                  />
                </div>

                {/* Phần gợi ý nhanh tinh xảo dựa trên lịch sử đã thêm hoặc Thư viện DKBike */}
                {/* Phần gợi ý nhanh tinh xảo dựa trên lịch sử đã thêm hoặc Thư viện DKBike */}
                {pqcHistorySuggestions.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-650">⚡ Gợi ý nhanh từ lịch sử kiểm soát</span>
                      <span className="text-[8.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Click để chọn</span>
                    </div>
                    <div className="max-h-[145px] overflow-y-auto space-y-1.5 pr-1 font-semibold">
                      {pqcHistorySuggestions.slice(0, 10).map((tpl, tIdx) => {
                        const isSavedHistory = Array.isArray(pqcSavedHistoryTemplates) && pqcSavedHistoryTemplates.some(hist => 
                          (hist.name || '').trim().toLowerCase() === (tpl.name || '').trim().toLowerCase() && 
                          hist.type === tpl.type
                        );

                        return (
                          <div
                            key={tIdx}
                            className="w-full rounded-lg bg-white hover:bg-slate-100 border border-slate-200/70 hover:border-indigo-400 transition text-[11px] flex items-center justify-between gap-2 p-2 group"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setPqcFormType(tpl.type);
                                setPqcFormName(tpl.name);
                                setPqcFormFrequency(tpl.frequencyDesc);
                                setPqcFormExplanation(tpl.explanation);
                              }}
                              className="text-left flex-1 flex flex-col gap-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 animate-fade-in">
                                {tpl.type === 'incoming' ? (
                                  <span className="text-[8.5px] font-black uppercase tracking-wider px-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Kho</span>
                                ) : (
                                  <span className="text-[8.5px] font-black uppercase tracking-wider px-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">C.Đoạn</span>
                                )}
                                {isSavedHistory && (
                                  <span className="text-[8.5px] font-black uppercase tracking-wider px-1 bg-amber-100 text-amber-805 border border-amber-350 rounded shrink-0">Lịch sử</span>
                                )}
                                <span className="text-slate-800 line-clamp-1 flex-1 group-hover:text-indigo-950 font-bold">{tpl.name}</span>
                                <span className="text-[9.5px] text-slate-500 font-mono font-bold shrink-0">⏱️ {tpl.frequencyDesc}</span>
                              </div>
                              <p className="text-[10.5px] text-slate-400 font-normal line-clamp-1 italic text-left">{tpl.explanation}</p>
                            </button>

                            {isSavedHistory && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPqcSavedHistoryTemplates(prev => 
                                    prev.filter(hist => !(
                                      (hist.name || '').trim().toLowerCase() === (tpl.name || '').trim().toLowerCase() && 
                                      hist.type === tpl.type
                                    ))
                                  );
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-white hover:bg-rose-600 rounded-md transition duration-200 shrink-0 cursor-pointer"
                                title="Xóa mẫu khỏi lịch sử"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowPqcModal(false)}
                    className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg shrink-0 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition shrink-0 cursor-pointer"
                  >
                    Lưu hạng mục
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAY MODAL: PHÓNG TO CHI TIẾT PHÂN BAN (ZOOMED COLUMN VIEW) */}
      <AnimatePresence>
        {zoomedColumn && (() => {
          const details = getZoomedDetails();
          if (!details) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-xl">
                      {details.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                        {details.title}
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-mono font-black px-2.5 py-0.5 rounded-full">
                          {details.tasks.length} tác vụ
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold">Xem bốc lớp tác vụ kích thước rộng rãi, bố cục lưới chi tiết chuẩn chỉ.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setZoomedColumn(null)}
                    className="p-2 hover:bg-slate-100 rounded-xl font-bold text-slate-650 hover:text-slate-950 transition duration-150 cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-slate-200 text-xs uppercase"
                  >
                    <Minimize2 className="w-4 h-4 text-slate-500" /> Đóng thu nhỏ
                  </button>
                </div>

                <ZoomedColumnContent 
                  details={details} 
                  zoomedColumn={zoomedColumn}
                  onToggle={handleToggleTaskStatus}
                  onDelete={handleDeleteTask}
                  onEdit={(task) => {
                    setZoomedColumn(null);
                    handleOpenEditModal(task);
                  }}
                />
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}

// Sub Component: Card Tác vụ Chất lượng cực đẹp
function TaskCard({ task, onToggle, onDelete, onEdit }: { task: QualityTask; onToggle: (id: string) => void; onDelete: (id: string) => void; onEdit: (task: QualityTask) => void; key?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all duration-200 relative group space-y-2.5">
      <div className="flex justify-between items-center gap-2">
        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md font-mono border ${
          task.priority === 'High' 
            ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' 
            : task.priority === 'Medium' 
              ? 'bg-amber-50 border-amber-300 text-amber-700' 
              : 'bg-slate-100 border-slate-300 text-slate-600'
        }`}>
          {task.priority === 'High' ? 'Khẩn cấp' : task.priority === 'Medium' ? 'Trung' : 'Thường'}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition duration-150 cursor-pointer flex items-center justify-center"
            title="Sửa đổi tác vụ chất lượng"
          >
            <Edit className="w-3.5 h-3.5 text-indigo-600" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition duration-150 cursor-pointer flex items-center justify-center"
            title="Xoá bỏ tác vụ"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </button>
        </div>
      </div>

      <div className="text-[11.5px] font-extrabold text-slate-800 leading-snug">
        {task.title}
      </div>

      {task.modelOrSupplier && (
        <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 leading-none">
          🏷️ {task.modelOrSupplier}
        </span>
      )}

      <div className="h-px bg-slate-100"></div>

      <div className="flex justify-between items-center gap-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 block font-normal">Hạn chót:</span>
          <span className="text-[10px] font-mono text-slate-500 font-extrabold block">
            {task.deadline}
          </span>
        </div>

        <button
          onClick={() => onToggle(task.id)}
          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all border flex items-center gap-1 cursor-pointer ${
            task.status === 'Completed'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : task.status === 'In_Progress'
                ? 'bg-amber-50 text-amber-850 border-amber-300 animate-pulse'
                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100/80'
          }`}
        >
          {task.status === 'Completed' ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã xong
            </>
          ) : task.status === 'In_Progress' ? (
            <>
              <Clock className="w-3 h-3 text-amber-500" /> Đang làm
            </>
          ) : (
            <>
              Chưa làm
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Sub Component: Zoomed Column content with live search
function ZoomedColumnContent({ 
  details, 
  zoomedColumn,
  onToggle, 
  onDelete, 
  onEdit 
}: { 
  details: { title: string; tasks: QualityTask[]; icon: any }; 
  zoomedColumn: 'backlog' | 'capa' | 'ptsp' | 'coordination' | 'eco';
  onToggle: (id: string) => void; 
  onDelete: (id: string) => void; 
  onEdit: (task: QualityTask) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const filteredTasks = useMemo(() => {
    return details.tasks.filter(t => 
      (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.assignee || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.modelOrSupplier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [details.tasks, searchTerm]);

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: QualityTask[] } = {};

    filteredTasks.forEach(task => {
      let groupName = '';
      if (zoomedColumn === 'backlog') {
        const assignee = (task.assignee || '').trim();
        if (assignee === 'Nguyễn Xuân Thao') {
          groupName = 'Ban Chỉ Đạo & Giám Sát QLCL (QA/QC Head)';
        } else if (assignee === 'Đoàn Anh Hùng') {
          groupName = 'Phân Ban Kiểm Tra Linh Kiện Đầu Vào (IQC)';
        } else if (assignee === 'Hoàng Văn Phấn') {
          groupName = 'Phân Ban Kiểm Soát Lắp Ráp (PQC)';
        } else if (assignee === 'Hà Khắc Việt' || assignee === 'Liễu Tùng Lâm' || assignee === 'Lành Xuân Hải') {
          groupName = 'Phân Ban Kiểm Tra Đầu Ra (OQC)';
        } else if (assignee === 'Nguyễn Văn Diệm') {
          groupName = 'Phân Ban Giám Sát Quy Trình (SQC/IQC)';
        } else {
          groupName = 'Phân ban tác vụ khác / Chưa phân loại';
        }
      } else if (zoomedColumn === 'capa') {
        let model = (task.modelOrSupplier || '').trim();
        if (model.includes('|')) {
          model = model.split('|')[0].trim();
        }
        groupName = model ? `Dòng xe ${model}` : 'Chung / Các dòng xe khác';
      } else if (zoomedColumn === 'ptsp') {
        let model = (task.modelOrSupplier || '').trim();
        if (model.includes('|')) {
          model = model.split('|')[0].trim();
        }
        groupName = model ? `Dòng xe mới ${model}` : 'Chung / Mẫu xe thử nghiệm khác';
      } else if (zoomedColumn === 'coordination') {
        const titleLower = (task.title || '').toLowerCase();
        const refLower = (task.modelOrSupplier || '').toLowerCase();
        
        if (titleLower.includes('mua hàng') || refLower.includes('mua hàng') || titleLower.includes('ncc') || refLower.includes('nhà cung cấp')) {
          groupName = 'Phòng Mua Hàng (Purchasing) & Nhà Cung Cấp';
        } else if (titleLower.includes('kỹ thuật') || titleLower.includes('ptsp') || titleLower.includes('r&d') || titleLower.includes('thiết kế') || titleLower.includes('phát triển')) {
          groupName = 'Phòng Kỹ Thuật Công Nghệ & R&D';
        } else if (titleLower.includes('sản xuất') || titleLower.includes('lắp ráp') || titleLower.includes('xưởng') || titleLower.includes('hàn') || titleLower.includes('sơn')) {
          groupName = 'Xưởng Sản Xuất (Lắp ráp / Hàn / Sơn)';
        } else if (titleLower.includes('bảo hành') || titleLower.includes('khách hàng') || titleLower.includes('đại lý') || titleLower.includes('dịch vụ')) {
          groupName = 'Phòng Dịch Vụ Khách Hàng & Bảo Hành';
        } else if (titleLower.includes('kho') || titleLower.includes('vận chuyển') || titleLower.includes('vật tư')) {
          groupName = 'Phòng Logistics & Quản Lý Kho';
        } else {
          groupName = 'Phối Hợp Liên Ban QLCL (DK QMS)';
        }
      } else if (zoomedColumn === 'eco') {
        let model = (task.modelOrSupplier || '').trim();
        if (model.includes('|')) {
          model = model.split('|')[0].trim();
        }
        groupName = model ? `Dòng xe cải tiến ${model}` : 'Chung / Các hạng mục cải tiến khác';
      } else {
        groupName = 'Khác';
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(task);
    });

    let orderedKeys: string[] = [];
    if (zoomedColumn === 'backlog') {
      orderedKeys = [
        'Ban Chỉ Đạo & Giám Sát QLCL (QA/QC Head)',
        'Phân Ban Kiểm Tra Linh Kiện Đầu Vào (IQC)',
        'Phân Ban Kiểm Soát Lắp Ráp (PQC)',
        'Phân Ban Kiểm Tra Đầu Ra (OQC)',
        'Phân Ban Giám Sát Quy Trình (SQC/IQC)',
        'Phân ban tác vụ khác / Chưa phân loại'
      ];
    } else if (zoomedColumn === 'coordination') {
      orderedKeys = [
        'Xưởng Sản Xuất (Lắp ráp / Hàn / Sơn)',
        'Phòng Kỹ Thuật Công Nghệ & R&D',
        'Phòng Mua Hàng (Purchasing) & Nhà Cung Cấp',
        'Phòng Logistics & Quản Lý Kho',
        'Phòng Dịch Vụ Khách Hàng & Bảo Hành',
        'Phối Hợp Liên Ban QLCL (DK QMS)'
      ];
    } else {
      orderedKeys = Object.keys(groups).sort((a, b) => {
        if (a.startsWith('Chung')) return 1;
        if (b.startsWith('Chung')) return -1;
        return a.localeCompare(b, 'vi');
      });
    }

    const list: Array<{ groupName: string; tasks: QualityTask[] }> = [];

    const sortTasksByDeadline = (taskList: QualityTask[]) => {
      return [...taskList].sort((a, b) => {
        const dA = a.deadline || '';
        const dB = b.deadline || '';
        if (!dA && !dB) return 0;
        if (!dA) return 1;
        if (!dB) return -1;
        const dateA = new Date(dA).getTime();
        const dateB = new Date(dB).getTime();
        const isAValid = !isNaN(dateA);
        const isBValid = !isNaN(dateB);
        if (isAValid && isBValid) {
          return dateA - dateB;
        }
        return dA.localeCompare(dB);
      });
    };

    orderedKeys.forEach(key => {
      if (groups[key] && groups[key].length > 0) {
        list.push({
          groupName: key,
          tasks: sortTasksByDeadline(groups[key])
        });
      }
    });

    Object.keys(groups).forEach(key => {
      if (!orderedKeys.includes(key) && groups[key] && groups[key].length > 0) {
        list.push({
          groupName: key,
          tasks: sortTasksByDeadline(groups[key])
        });
      }
    });

    return list;
  }, [filteredTasks, zoomedColumn]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden space-y-4">
      {/* Search Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input 
          type="text" 
          placeholder="Lọc nhanh tác vụ chất lượng (Tìm theo tiêu đề, người phụ trách, model...)" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 bg-slate-50/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg bg-white transition hover:bg-slate-50 cursor-pointer"
            >
              Xoá lọc
            </button>
          )}

          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-md text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dạng lưới</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng danh sách"
            >
              <List className="w-3.5 h-3.5" />
              <span>Dạng danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid or List View of Grouped Tasks */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-6">
        {groupedTasks.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs border border-dashed border-slate-200 bg-slate-50 rounded-2xl font-bold">
            Không tìm thấy tác vụ chất lượng nào khớp với từ khoá tìm kiếm.
          </div>
        ) : (
          groupedTasks.map((group) => (
            <div key={group.groupName} className="border border-slate-150 rounded-xl bg-slate-50/40 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-650"></span>
                  {group.groupName}
                </h4>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full">
                  {group.tasks.length} tác vụ
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.tasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onToggle={onToggle} 
                      onDelete={onDelete} 
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-xs">
                  <table className="min-w-full divide-y divide-slate-150">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="w-[80px] px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">Ưu tiên</th>
                        <th scope="col" className="min-w-[450px] px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-500 tracking-wider">Nội dung công việc</th>
                        <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">Người phụ trách</th>
                        <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">Hạn chót</th>
                        <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">Trạng thái</th>
                        <th scope="col" className="w-[80px] px-4 py-2.5 text-right text-[10px] font-black uppercase text-slate-500 tracking-wider whitespace-nowrap">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {group.tasks.map(task => (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition duration-150">
                          {/* Priority */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`inline-flex px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded-md font-mono border ${
                              task.priority === 'High' 
                                ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                : task.priority === 'Medium' 
                                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {task.priority === 'High' ? 'Khẩn cấp' : task.priority === 'Medium' ? 'Trung' : 'Thường'}
                            </span>
                          </td>
                          {/* Title */}
                          <td className="px-4 py-3 text-[11px] font-extrabold text-slate-800 leading-snug min-w-[450px]">
                            {task.title}
                          </td>
                          {/* Assignee */}
                          <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-600 font-bold">
                            {task.assignee || 'Phòng QLCL'}
                          </td>
                          {/* Deadline */}
                          <td className="whitespace-nowrap px-4 py-3 text-[10.5px] font-mono text-slate-500 font-extrabold">
                            {task.deadline}
                          </td>
                          {/* Status */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <button
                              onClick={() => onToggle(task.id)}
                              className={`px-2.5 py-1 text-[9.5px] font-black rounded-md transition-all border flex items-center gap-1 cursor-pointer ${
                                task.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-350'
                                  : task.status === 'In_Progress'
                                    ? 'bg-amber-50 text-amber-850 border-amber-350'
                                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100/80'
                              }`}
                            >
                              {task.status === 'Completed' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã xong
                                </>
                              ) : task.status === 'In_Progress' ? (
                                <>
                                  <Clock className="w-3 h-3 text-amber-500 animate-pulse" /> Đang làm
                                </>
                              ) : (
                                <>
                                  Chưa làm
                                </>
                              )}
                            </button>
                          </td>
                          {/* Actions */}
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <button
                                onClick={() => onEdit(task)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition duration-150 cursor-pointer"
                                title="Sửa đổi tác vụ chất lượng"
                              >
                                <Edit className="w-3.5 h-3.5 text-indigo-600" />
                              </button>
                              <button
                                onClick={() => onDelete(task.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition duration-150 cursor-pointer"
                                title="Xoá bỏ tác vụ"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

