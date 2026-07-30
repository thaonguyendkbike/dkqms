import React, { useState, FormEvent, useMemo, useEffect } from 'react';
import { DEFAULT_DETAILED_KPIS } from '../initialKpis';
export { DEFAULT_DETAILED_KPIS } from '../initialKpis';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Search, 
  Building2, 
  Calendar, 
  Clock, 
  Wrench, 
  ShieldCheck, 
  Sliders, 
  PiggyBank, 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  UserCheck, 
  FileText,
  AlertTriangle,
  Scale,
  ListFilter,
  RefreshCw,
  Zap,
  Check,
  Target,
  Pencil,
  Trash2,
  Eye
} from 'lucide-react';

export interface DetailedKPI {
  id: string;
  category: 'Sản lượng' | 'Nhân sự' | 'Chi phí bộ phận' | '6S, Cải tiến' | 'Báo cáo kế hoạch' | 'Chất lượng NCC' | 'IQC - Chất lượng đầu vào' | 'PQC - Chất lượng quá trình' | 'OQC - Chất lượng đầu ra' | 'Hệ thống & Hồ sơ';
  type: 'Mục tiêu hoạt động chung' | 'Mục tiêu hoạt động chuyên môn';
  groupWeight: number; // Trọng số nhóm: e.g. 10%, 5%, 20%
  indicator: string;   // Tên chỉ tiêu
  definition: string;  // Định nghĩa
  unit: string;        // Đơn vị tính
  target: string;      // Mục tiêu đề ra
  actual: string;      // Thực tế đạt được
  status: 'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi';
  details?: string;    // Chi tiết bổ sung
  month?: number;      // Tháng áp dụng chỉ tiêu (e.g. 5 cho tháng 5)
  year?: number;       // Năm áp dụng chỉ tiêu (e.g. 2026 cho năm 2026)
}

interface KPIDashboardProps {
  onUpdateOverallKPI?: (score: number) => void;
  onViewDetail?: (data: any) => void;
  iqcRecords?: any[];
  pqcRecords?: any[];
  oqcRecords?: any[];
  suppliers?: any[];
  kpis?: DetailedKPI[];
  setKpis?: React.Dispatch<React.SetStateAction<DetailedKPI[]>> | any;
}

export default function KPIDashboard({ 
  onUpdateOverallKPI, 
  onViewDetail,
  iqcRecords,
  pqcRecords,
  oqcRecords,
  suppliers,
  kpis: propsKpis,
  setKpis: propsSetKpis
}: KPIDashboardProps) {
  // Detailed KPIs as state so user can modify/add/record achievements in-applet
  const [localKpis, setLocalKpis] = useState<DetailedKPI[]>([
    // === MỤC TIÊU HOẠT ĐỘNG CHUNG (35%) ===
    // 1. Sản lượng (10%)
    {
      id: 'KPI-GEN-01',
      category: 'Sản lượng',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Số lượng kinh doanh',
      definition: 'Là sản lượng xe bán ra thị trường',
      unit: 'Xe',
      target: '50.000',
      actual: '48.500',
      status: 'Theo dõi',
      details: 'Sản lượng bán hàng lũy kế đang bám sát mục tiêu năm 2026.'
    },
    {
      id: 'KPI-GEN-02',
      category: 'Sản lượng',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Số lượng xe lắp ráp',
      definition: 'Là số lượng xe hoàn thiện đủ điều kiện xuất xưởng',
      unit: 'Xe',
      target: '50.174',
      actual: '50.174',
      status: 'Đạt',
      details: 'Đã xuất xưởng đủ sản lượng được giao của kế hoạch xe máy điện.'
    },
    // 2. Hoạt động nhân sự (5%)
    {
      id: 'KPI-GEN-03',
      category: 'Nhân sự',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Tổng định biên nhân sự',
      definition: 'Định biên nhân sự tối ưu của bộ phận QLCL',
      unit: 'Nhân sự',
      target: '3',
      actual: '3',
      status: 'Đạt',
      details: 'Nhân sự gồm 1 Trưởng phòng, 1 IQC/Supplier QC, 1 OQC/Hệ thống.'
    },
    {
      id: 'KPI-GEN-04',
      category: 'Nhân sự',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Chất lượng năng lực P2',
      definition: 'Tỉ lệ đạt năng lực chuyên môn kĩ thuật P2 trung bình của bộ phận',
      unit: 'Tỉ lệ %',
      target: '>90%',
      actual: '92%',
      status: 'Đạt',
      details: 'Đánh giá kỹ năng đo lường, rà soát FMEA và bóc hồ sơ kỹ thuật đạt chuẩn.'
    },
    {
      id: 'KPI-GEN-05',
      category: 'Nhân sự',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Chất lượng hiệu suất P3 Hằng tháng',
      definition: 'Hiệu suất kết quả công việc trung bình hằng tháng',
      unit: 'Tỉ lệ %',
      target: '>90%',
      actual: '91.8%',
      status: 'Đạt',
      details: 'Điểm KPI công việc của từng thành viên đạt bình quân trên 90 điểm.'
    },
    {
      id: 'KPI-GEN-06',
      category: 'Nhân sự',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Nội quy quy chế',
      definition: 'Số lần vi phạm Nội quy quy chế của Công ty',
      unit: 'Vi phạm',
      target: '0',
      actual: '0',
      status: 'Đạt',
      details: 'Tuân thủ nội quy tác phong công nghiệp, chấm công nghiêm túc.'
    },
    // 3. Chi phí bộ phận (10%)
    {
      id: 'KPI-GEN-07',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Xây dựng kế hoạch chi phí bộ phận',
      definition: 'Định kỳ xây dựng kế hoạch chi phí, ngân sách bộ phận trình phê duyệt',
      unit: 'Tháng',
      target: '12',
      actual: '5',
      status: 'Theo dõi',
      details: 'Đã hoàn tất ngân sách và kế hoạch kiểm kê chi bộ phận định kỳ 5 tháng đầu năm.'
    },
    {
      id: 'KPI-GEN-08',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Tỉ lệ chênh lệch chi phí',
      definition: 'Tỉ lệ chênh lệch chi phí bộ phận so với mục tiêu kế hoạch ngân sách',
      unit: '%',
      target: '<5%',
      actual: '2.8%',
      status: 'Đạt',
      details: 'Kiểm soát chi tiêu tiết kiệm, các danh mục đầu tư thiết bị mẫu đều đúng dự toán.'
    },
    {
      id: 'KPI-GEN-09',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Theo dõi phân tích biến động chi phí',
      definition: 'Thực hiện ghi chép, tổng hợp chi phí bộ phận để phân tích lãng phí',
      unit: 'Lượt',
      target: '18',
      actual: '8',
      status: 'Theo dõi',
      details: 'Thực hiện phân tích chi tiết hiệu suất dùng xe công vụ, đi kiểm nhà thanh tra.'
    },
    {
      id: 'KPI-GEN-10',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Tổng hợp theo dõi theo tháng',
      definition: 'Ghi nhận báo cáo chi phí phát sinh hàng tháng',
      unit: 'Tháng',
      target: '12',
      actual: '5',
      status: 'Theo dõi',
      details: 'Hồ sơ tài chính nội bộ lưu trữ khoa học đầy đủ.'
    },
    {
      id: 'KPI-GEN-11',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Phân tích chi phí định kỳ',
      definition: 'Phân tích chi phí phát sinh định kỳ',
      unit: 'Quý',
      target: '4',
      actual: '1',
      status: 'Theo dõi',
      details: 'Báo cáo tài chính quý I đã nộp lãnh đạo kiểm duyệt.'
    },
    {
      id: 'KPI-GEN-12',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Đánh giá sử dụng chi phí theo định mức',
      definition: 'Kiểm tra sử dụng chi phí so với hạn mức thực tế đầu người',
      unit: '6 tháng/Lần',
      target: '2',
      actual: '1',
      status: 'Theo dõi',
      details: 'Đã hoàn thành đánh giá kỳ I đúng tiến độ vào tháng 5/2026.'
    },
    {
      id: 'KPI-GEN-13',
      category: 'Chi phí bộ phận',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 10,
      indicator: 'Tiết kiệm chi phí hành chính',
      definition: 'Tỉ lệ tiết kiệm được ngân sách hành chính nhờ cải tiến, sáng kiến số hóa',
      unit: 'Tỉ lệ %',
      target: '>3%',
      actual: '4.5%',
      status: 'Đạt',
      details: 'Đưa vào áp dụng hệ thống Báo cáo tuần chất lượng số hóa giúp giảm in ấn giấy tờ.'
    },
    // 4. Hoạt động 6S, Cải tiến (5%)
    {
      id: 'KPI-GEN-14',
      category: '6S, Cải tiến',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Thực hiện duy trì 6S hằng ngày',
      definition: 'Tỉ lệ tuân thủ thực hiện 6S tại văn phòng, phòng thiết bị đo đạc hằng ngày',
      unit: 'Tỉ lệ %',
      target: '100%',
      actual: '100%',
      status: 'Đạt',
      details: 'Vệ sinh và bảo quản dụng cụ dưỡng kiểm, panme, thước cặp đúng vị trí phân bố.'
    },
    {
      id: 'KPI-GEN-15',
      category: '6S, Cải tiến',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Chấm điểm, đánh giá 6S định kì',
      definition: 'Thực hiện chấm chéo đánh giá 6S định kỳ hằng tháng',
      unit: 'Tháng',
      target: '12',
      actual: '5',
      status: 'Theo dõi',
      details: 'Duy trì tham gia chấm chéo cùng ban 6S nhà máy hàng tuần/tháng đầy đủ.'
    },
    {
      id: 'KPI-GEN-16',
      category: '6S, Cải tiến',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Điểm kiểm tra 6S bộ phận',
      definition: 'Số điểm đạt được khảo sát trên Thang 5. Điểm mục tiêu từ 4 trở lên',
      unit: 'Điểm',
      target: '4',
      actual: '4.2',
      status: 'Đạt',
      details: 'Ghi nhận xếp hạng Xuất sắc trong khối gián tiếp phụ trợ sản xuất.'
    },
    {
      id: 'KPI-GEN-17',
      category: '6S, Cải tiến',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Xử lý triệt để phát sinh 6S',
      definition: 'Số lượng phát hiện không phù hợp 6S được dọn dẹp vệ sinh xử lý ngay',
      unit: 'Tỉ lệ',
      target: '1.0',
      actual: '1.0',
      status: 'Đạt',
      details: 'Cam kết 100% điểm lỗi nhắc nhở được chụp hình khắc phục trước khi ra về.'
    },
    {
      id: 'KPI-GEN-18',
      category: '6S, Cải tiến',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Thời lượng xử lý vấn đề 6S',
      definition: 'Thời lượng xử lý các vấn đề 6S phát sinh không quá 8 tiếng từ lúc phát hiện',
      unit: 'Giờ',
      target: '<8 giờ',
      actual: '3.5 giờ',
      status: 'Đạt',
      details: 'Chấn chỉnh gán nhãn, dán cảnh báo khu vực máy đo 3D nhanh gọn.'
    },
    // 5. Báo cáo kế hoạch (5%)
    {
      id: 'KPI-GEN-19',
      category: 'Báo cáo kế hoạch',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Báo báo kế hoạch Tuần',
      definition: 'Thực hiện xây dựng và gửi báo cáo tuần trực tuyến đúng tiến độ công ty',
      unit: 'Báo cáo',
      target: '108',
      actual: '44',
      status: 'Theo dõi',
      details: 'Nộp báo cáo đầy đủ của tất cả các tuần từ đầu năm.'
    },
    {
      id: 'KPI-GEN-20',
      category: 'Báo cáo kế hoạch',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Báo cáo kế hoạch Tháng',
      definition: 'Hoàn thành và trình duyệt báo cáo tổng kết tháng đúng hạn',
      unit: 'Báo cáo',
      target: '24',
      actual: '10',
      status: 'Theo dõi',
      details: 'Đã hoàn thành bàn giao hồ sơ chất lượng gối đầu từng tháng.'
    },
    {
      id: 'KPI-GEN-21',
      category: 'Báo cáo kế hoạch',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Báo cáo kế hoạch Quý',
      definition: 'Xây dựng thông số tổng kiểm chất lượng theo quý gửi BGĐ',
      unit: 'Báo cáo',
      target: '8',
      actual: '3',
      status: 'Theo dõi',
      details: 'Đã nộp báo cáo rà soát CAPA quý I/2026.'
    },
    {
      id: 'KPI-GEN-22',
      category: 'Báo cáo kế hoạch',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Báo cáo kế hoạch Năm',
      definition: 'Xây dựng chiến lược chất lượng, định hướng chuyển đổi phòng ban',
      unit: 'Báo cáo',
      target: '5',
      actual: '1',
      status: 'Theo dõi',
      details: 'Kế hoạch định hướng năm đã thông qua Đại hội chỉ tiêu 2026.'
    },
    {
      id: 'KPI-GEN-23',
      category: 'Báo cáo kế hoạch',
      type: 'Mục tiêu hoạt động chung',
      groupWeight: 5,
      indicator: 'Chất lượng thông tin báo cáo',
      definition: 'Đầy đủ thông tin đầu việc, hướng dẫn, tiến độ, thời hạn rõ ràng',
      unit: 'Tỉ lệ %',
      target: '>90%',
      actual: '95%',
      status: 'Đạt',
      details: 'Báo cáo số luôn có biểu đồ và dữ liệu dẫn chứng rõ ràng.'
    },

    // === MỤC TIÊU HOẠT ĐỘNG CHUYÊN MÔN (65%) ===
    // 1. Chất lượng NCC (5%)
    {
      id: 'KPI-PRO-01',
      category: 'Chất lượng NCC',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 5,
      indicator: 'Đánh giá NCC Định kỳ',
      definition: 'Phối hợp với phòng Cung ứng đánh giá năng lực nhà cung cấp định kỳ (6 tháng/lần)',
      unit: 'Nhà cc',
      target: '9',
      actual: '5',
      status: 'Theo dõi',
      details: 'Đã khảo sát đánh giá thực tế năng lực gia công nhựa và lốp của 5 nhà cung cấp đợt I.'
    },
    {
      id: 'KPI-PRO-02',
      category: 'Chất lượng NCC',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 5,
      indicator: 'Tần suất thanh tra, kiểm định',
      definition: 'Rà soát và thanh tra đột xuất điều kiện sản xuất tại đối tác định kỳ',
      unit: 'Tháng',
      target: '2 tháng/Lần',
      actual: '2 tháng/Lần',
      status: 'Đạt',
      details: 'Đã cử kỹ sư hiện trường hỗ trợ xử lý móng nhiệt tại NCC xi mạ nhựa bửng.'
    },
    {
      id: 'KPI-PRO-03',
      category: 'Chất lượng NCC',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 5,
      indicator: 'Họp trao đổi kỹ thuật chất lượng',
      definition: 'Tổ chức họp mặt trao đổi cải tiến chất lượng sản phẩm định kỳ hàng tháng',
      unit: 'Nhà cc',
      target: '9',
      actual: '8',
      status: 'Đạt',
      details: 'Trực tiếp chất vấn KPI PPM lỗi cao su với Công ty KENDA và nhựa đúc Việt Nhật Precision.'
    },
    // 2. IQC - Chất lượng đầu vào (20%)
    {
      id: 'KPI-PRO-04',
      category: 'IQC - Chất lượng đầu vào',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 20,
      indicator: 'Số lệnh kiểm định tại xưởng NCC',
      definition: 'Thực hiện kiểm soát sau đặt hàng, trong chế tạo và trước khi đối tác giao về DK',
      unit: 'Tỉ lệ %',
      target: '100%',
      actual: '100%',
      status: 'Đạt',
      details: 'Triển khai chặt chẽ quy chế COA/QA kiểm tra trước khi chuyển xưởng.'
    },
    {
      id: 'KPI-PRO-05',
      category: 'IQC - Chất lượng đầu vào',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 20,
      indicator: 'Tần suất kiểm đầu vào kho DK',
      definition: 'Tỉ lệ các lô linh kiện đầu vào được kiểm nhập kích thước dán nhãn trước khi nhập kho',
      unit: 'Tỉ lệ %',
      target: '100%',
      actual: '100%',
      status: 'Đạt',
      details: '100% hàng hóa linh kiện về bến bãi nhà máy đều bắt buộc qua phòng dưỡng kiểm duyệt.'
    },
    {
      id: 'KPI-PRO-06',
      category: 'IQC - Chất lượng đầu vào',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 20,
      indicator: 'Tỷ lệ linh kiện đạt lần 1',
      definition: 'Tỉ lệ linh kiện đạt chất lượng ngay lần kiểm ráp đầu tiên không cần hoàn trả sửa đổi',
      unit: 'Tỉ lệ %',
      target: '>97%',
      actual: '96.2%',
      status: 'Không đạt',
      details: 'Còn vướng nhiều lô linh kiện lốp xe KENDA bị phồng bọc mủ lót ngoài và ốc gá bửng loang màu xi.'
    },
    {
      id: 'KPI-PRO-07',
      category: 'IQC - Chất lượng đầu vào',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 20,
      indicator: 'Tỉ lệ trích mẫu kiểm tra chi tiết lỗi',
      definition: 'Số lượng mẫu trích xuất kiểm định / Tổng quy cách linh kiện nhập lẻ của lô hàng',
      unit: 'Tỉ lệ %',
      target: '>10%',
      actual: '12%',
      status: 'Đạt',
      details: 'Thực hiện trích ly mẫu đo kiểm theo phương thức quy đổi AQL tiêu chuẩn MIL-STD-105D.'
    },
    {
      id: 'KPI-PRO-08',
      category: 'IQC - Chất lượng đầu vào',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 20,
      indicator: 'Tỷ lệ lỗi chất lượng nghiêm trọng đầu vào',
      definition: 'Khuyết tật ảnh hưởng trực tiếp đến an toàn lái xe, kết cấu chính (Mục tiêu bắt buộc bằng 0)',
      unit: 'Tỉ lệ %',
      target: '0%',
      actual: '0%',
      status: 'Đạt',
      details: 'Chưa phát hiện lỗi nghiêm trọng liên quan đến khung gầm sườn và IC điện chính.'
    },
    // 3. PQC - Chất lượng quá trình (10%)
    {
      id: 'KPI-PRO-09',
      category: 'PQC - Chất lượng quá trình',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 10,
      indicator: 'Kiểm tra linh kiện trước khi cấp lên chuyền',
      definition: 'Tuyển lọc và kiểm soát trạng thái linh kiện chuẩn bị tại gá trung chuyển lắp ráp',
      unit: 'Tỉ lệ',
      target: '>90%',
      actual: '93.5%',
      status: 'Đạt',
      details: 'Xử lý gác rổ chứa phụ tùng rơ-le định vị dây điện để tổ trưởng lắp ráp nhận diện nhanh.'
    },
    {
      id: 'KPI-PRO-10',
      category: 'PQC - Chất lượng quá trình',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 10,
      indicator: 'Tỷ lệ lỗi lọt trên băng chuyền',
      definition: 'Linh kiện lỗi chưa qua IQC phát hiện lọt vào chuyền gây nghẽn công đoạn sản xuất',
      unit: 'Tỉ lệ',
      target: '< 2%',
      actual: '1.4%',
      status: 'Đạt',
      details: 'Kiểm soát chặt chẽ giúp hạn chế dừng chuyền lắp ráp không đáng có.'
    },
    {
      id: 'KPI-PRO-11',
      category: 'PQC - Chất lượng quá trình',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 10,
      indicator: 'Kiểm tra túc trực lắp ráp',
      definition: 'Túc trực kiểm tra 4 công đoạn chính trên mỗi Lệnh sản xuất (Mỗi công đoạn đo 5 lượt)',
      unit: 'Lượt/LSX',
      target: '20',
      actual: '20',
      status: 'Đạt',
      details: 'Rà soát bám sát xiết lực cổ phốt, lực siết bánh trước sau và giác đi dây điện sườn xe.'
    },
    {
      id: 'KPI-PRO-12',
      category: 'PQC - Chất lượng quá trình',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 10,
      indicator: 'Thời gian dừng chuyền do sự cố chất lượng',
      definition: 'Thời lượng dây chuyền phải ngừng máy chờ khắc phục phế phẩm hỏng trên ca',
      unit: 'Phút',
      target: '<15p/ca',
      actual: '7 phút',
      status: 'Đạt',
      details: 'Phản ứng nhanh khắc phục bavia ổ gá sạc của model DK V1 giúp tiếp tục thông dây xưởng.'
    },
    {
      id: 'KPI-PRO-13',
      category: 'PQC - Chất lượng quá trình',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 10,
      indicator: 'Xử lý hành động CAPA đúng hạn',
      definition: 'Hoàn thành báo cáo phòng ngừa lỗi lặp lại đúng kỳ hạn thỏa thuận',
      unit: 'Tỉ lệ %',
      target: '>=95%',
      actual: '96.8%',
      status: 'Đạt',
      details: 'Tất cả các phòng Kỹ thuật và Sản xuất đã phối hợp rà soát đóng hồ sơ CAPA nhanh chóng.'
    },
    // 4. OQC - Chất lượng đầu ra (15%)
    {
      id: 'KPI-PRO-14',
      category: 'OQC - Chất lượng đầu ra',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Lỗi lọt kho thành phẩm',
      definition: 'Phát hiện xe lỗi bám trên bệ khi đã chuyển giao nhập kho thành phẩm KCS',
      unit: 'Tỉ lệ %',
      target: '<0.05%',
      actual: '0.02%',
      status: 'Đạt',
      details: 'Chỉ ghi nhận một vài trường hợp hở nhẹ khớp nhựa hãm bửng đã sửa tại chỗ.'
    },
    {
      id: 'KPI-PRO-15',
      category: 'OQC - Chất lượng đầu ra',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Sự cố lỗi trong vận hành sử dụng',
      definition: 'Số xe phát sinh điểm bất thường / Tổng quy mô sản lượng xe chạy thị trường',
      unit: 'Tỉ lệ %',
      target: '<0.5%',
      actual: '0.42%',
      status: 'Đạt',
      details: 'Khách hàng đánh giá hài lòng với khả năng vận hành êm ái của hệ thống DK Roma-X.'
    },
    {
      id: 'KPI-PRO-16',
      category: 'OQC - Chất lượng đầu ra',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Khiếu nại bất thường từ nhà phân phối',
      definition: 'Số vụ khiếu nại chất lượng xưởng gửi về trung tâm điều phối đại lý mỗi tháng',
      unit: 'Vụ việc',
      target: '<3 vụ/tháng',
      actual: '1 vụ/tháng',
      status: 'Đạt',
      details: 'Tháng này chỉ ghi nhận 1 trường hợp lỏng giắc còi sương mù ở lô xe gửi Nghệ An.'
    },
    {
      id: 'KPI-PRO-17',
      category: 'OQC - Chất lượng đầu ra',
      type: 'Mũi tiêu chất lượng giải quyết thắc mắc hàng loạt',
      definition: 'Nhận thông tin khiếu nại kỹ thuật đại lý và phản hồi phương án kỹ thuật',
      unit: 'Tỉ lệ',
      target: '100%',
      actual: '100%',
      status: 'Đạt',
      details: 'Phương án xử lý kỹ thuật luôn được phản hồi bằng văn bản hướng dẫn chi tiết trong 24 giờ.'
    },
    {
      id: 'KPI-PRO-18',
      category: 'OQC - Chất lượng đầu ra',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Sự cố khuyết tật nghiêm trọng trên thị trường',
      definition: 'Lôi gãy gập khung gầm, cháy nổ IC nguồn hệ thống (Trọng số bắt buộc 0)',
      unit: 'Tỉ lệ %',
      target: '0%',
      actual: '0%',
      status: 'Đạt',
      details: 'Kiểm tra xung dòng cao KCS đầu ra kỹ lưỡng loại bỏ triệt để nguy cơ phóng điện dập tủ điện.'
    },
    // 5. Hệ thống & Hồ sơ (15%)
    {
      id: 'KPI-PRO-19',
      category: 'Hệ thống & Hồ sơ',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Tài liệu tiêu chuẩn chất lượng',
      definition: 'Các dòng xe xuất xưởng bắt buộc có sổ tay tiêu chuẩn chất lượng và Checklist KCS',
      unit: 'Tỉ lệ %',
      target: '100%',
      actual: '100%',
      status: 'Đạt',
      details: 'Đã hoàn tất sổ tay HDSD và lắp ráp chuẩn hóa của dòng xe mới DK V1.'
    },
    {
      id: 'KPI-PRO-20',
      category: 'Hệ thống & Hồ sơ',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Sáng kiến cải tiến chất lượng',
      definition: 'Mỗi model xe cải tiến ít nhất 1 lần/tháng. Đạt mục tiêu 12 lần cải tiến/năm cho sản phẩm chính',
      unit: 'Lần',
      target: '12',
      actual: '5',
      status: 'Theo dõi',
      details: 'Vừa hoàn chỉnh phương pháp bọc lót nén bầu sạc để triệt lổ rung chấn khi tải dốc.'
    },
    {
      id: 'KPI-PRO-21',
      category: 'Hệ thống & Hồ sơ',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Tiết kiệm chi phí chất lượng kém COPQ',
      definition: 'Tỷ lệ chi phí thiệt hại chất lượng hư hao do lỗi dây chuyền giảm thiểu so với kỳ trước',
      unit: 'Tỉ lệ %',
      target: '>=10%',
      actual: '12.4%',
      status: 'Đạt',
      details: 'Ghi nhận tiết giảm chi phí sửa chữa sườn bệ của chuỗi băng chuyền Model DK Gogo.'
    },
    {
      id: 'KPI-PRO-22',
      category: 'Hệ thống & Hồ sơ',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Huấn luyện đào tạo KCS đạt chuẩn',
      definition: 'Số lượng nhân sự được đào tạo kiểm nhận và bắt lỗi linh kiện chính xác',
      unit: 'Nhân sự',
      target: '4',
      actual: '4',
      status: 'Đạt',
      details: 'Nhân sự rà lỗi đã được trao chứng chỉ chất lượng nội bộ quý I.'
    },
    {
      id: 'KPI-PRO-23',
      category: 'Hệ thống & Hồ sơ',
      type: 'Mục tiêu hoạt động chuyên môn',
      groupWeight: 15,
      indicator: 'Lưu trữ hồ sơ nghiệm kiểm ISO',
      definition: 'Tỉ lệ lưu trữ biên bản kỹ thuật số hóa so với số lượt kiểm rà thực tế',
      unit: 'Tỉ lệ %',
      target: '100%',
      actual: '100%',
      status: 'Đạt',
      details: 'Cơ sở dữ liệu đám mây sao lưu an toàn hàng ngày tại DK Việt Nhật.'
    }
  ]);

  const kpis = propsKpis || localKpis;
  const setKpis = propsSetKpis || setLocalKpis;

  // Dynamic linkage of quality inspection records (IQC, PQC, OQC) and Master suppliers list with Reporting/KPIDashboard
  useEffect(() => {
    if (!iqcRecords && !pqcRecords && !oqcRecords && !suppliers) return;

    setKpis(prevKpis => {
      return prevKpis.map(k => {
        if (k.id === 'KPI-PRO-01' && suppliers) {
          const count = suppliers.length;
          return {
            ...k,
            actual: `${count} nhà cc`,
            status: count >= 5 ? 'Đạt' : 'Theo dõi',
            details: `Báo cáo đồng bộ trực tiếp từ Master list: Đang quản lý danh mục ${count} nhà cung cấp linh kiện lắp ráp.`
          };
        }
        if (k.id === 'KPI-PRO-03' && suppliers) {
          const count = suppliers.length;
          return {
            ...k,
            actual: `${count} nhà cc`,
            status: count >= 8 ? 'Đạt' : 'Theo dõi',
            details: `Các đầu mối kỹ thuật nhà cung cấp liên kết chặt chẽ với hệ thống báo cáo QLCL (${count} nhà cc đã kết nối).`
          };
        }
        if (k.id === 'KPI-PRO-06' && iqcRecords) {
          const iqcTotal = iqcRecords.length;
          const iqcFailed = iqcRecords.filter(r => r.result === 'Lỗi' || r.status === 'Fail').length;
          // Smooth rating: starts at 96.2%, decreases with errors relative to total
          const finalIqcRate = iqcTotal > 0 ? Number(Math.max(0, Math.min(100, 100 - (iqcFailed / iqcTotal) * 20)).toFixed(1)) : 96.2;
          return {
            ...k,
            actual: `${finalIqcRate}%`,
            status: finalIqcRate >= 97 ? 'Đạt' : 'Không đạt',
            details: `Tính toán tự động thời gian thực từ kho dữ liệu IQC (${iqcFailed} lô lỗi từ tổng số ${iqcTotal} lô nhập kiểm đầu vào bến bãi).`
          };
        }
        if (k.id === 'KPI-PRO-10' && pqcRecords) {
          const pqcTotal = pqcRecords.length;
          const pqcFailed = pqcRecords.filter(r => r.result === 'Lỗi' || r.status === 'Lỗi').length;
          const pqcRate = pqcTotal > 0 ? Number(Math.max(0, Math.min(100, (pqcFailed / pqcTotal) * 10)).toFixed(1)) : 1.4;
          return {
            ...k,
            actual: `${pqcRate}%`,
            status: pqcRate <= 2.0 ? 'Đạt' : 'Không đạt',
            details: `Đồng bộ trực tiếp từ ${pqcTotal} phiếu theo dõi lắp ráp công đoạn PQC (${pqcFailed} lỗi phát hiện lọt vào chuyền).`
          };
        }
        if (k.id === 'KPI-PRO-14' && oqcRecords) {
          const oqcTotal = oqcRecords.length;
          const oqcFailed = oqcRecords.filter(r => r.result === 'Lỗi' || r.status === 'Lỗi').length;
          const oqcRate = oqcTotal > 0 ? Number(Math.max(0, Math.min(100, (oqcFailed / oqcTotal) * 0.1)).toFixed(3)) : 0.02;
          return {
            ...k,
            actual: `${oqcRate}%`,
            status: oqcRate < 0.05 ? 'Đạt' : 'Không đạt',
            details: `Thiết lập liên kết đồng bộ KCS thành phẩm OQC với ${oqcTotal} lượt kiểm xưởng (${oqcFailed} lỗi lọt kho).`
          };
        }
        return k;
      });
    });
  }, [iqcRecords, pqcRecords, oqcRecords, suppliers]);

  // States
  const [filterType, setFilterType] = useState<'All' | 'Mục tiêu hoạt động chung' | 'Mục tiêu hoạt động chuyên môn'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<number | 'All'>('All');
  const [filterYear, setFilterYear] = useState<number | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab within the KPI Dashboard
  const [activeKpiTab, setActiveKpiTab] = useState<'indicators' | 'monthly_plan' | 'staff_kpis'>('indicators');
  const [kpiViewMode, setKpiViewMode] = useState<'card' | 'table'>('card');

  // Interactive Monthly KPI plans (Phần nhập kế hoạch KPI hàng tháng phòng QLCL + Nhập kết quả)
  const [monthlyPlans, setMonthlyPlans] = useState<any[]>([
    {
      id: 'MPLAN-01',
      month: 4,
      year: 2026,
      indicator: 'Kiểm soát tỷ lệ linh kiện đạt lần 1 (MIL-STD-105D)',
      target: '>=97%',
      weight: 20,
      pic: 'Đoàn Anh Hùng',
      result: '96.2%',
      status: 'Không đạt',
      notes: 'Gặp trở ngại với một số vành xe và sườn bavia bám rỉ từ đối tác gia công dập.'
    },
    {
      id: 'MPLAN-02',
      month: 5,
      year: 2026,
      indicator: 'Số lượng xe máy điện và xe đạp điện xuất xưởng',
      target: '50,174 xe máy điện đầy đủ chuẩn KCS',
      weight: 15,
      pic: 'Nguyễn Xuân Thao',
      result: '50,174 xe hoàn thiện',
      status: 'Đạt',
      notes: 'Đã hoàn thành xuất xưởng đạt chuẩn ISO bàn giao kho thành phẩm.'
    },
    {
      id: 'MPLAN-03',
      month: 5,
      year: 2026,
      indicator: 'Thời gian dừng chuyền do sự cố lắp ráp trên dây chuyền',
      target: '<15 phút/ca',
      weight: 15,
      pic: 'Hoàng Văn Phấn',
      result: '7 phút/ca',
      status: 'Đạt',
      notes: 'Đã khắc phục lỗi kích thước ổ dập giắc cắm sạc cho dòng DK EZ3 siêu nhanh.'
    },
    {
      id: 'MPLAN-04',
      month: 6,
      year: 2026,
      indicator: 'Số hóa tài liệu quy trình nghiệm kiểm OQC tích hợp',
      target: 'Danh sách số hóa đầy đủ 100% dòng xe',
      weight: 10,
      pic: 'Hà Khắc Việt',
      result: 'Đang lập dự thảo',
      status: 'Đang thực hiện',
      notes: 'Dự kiến số hóa trên cloud lưu kho đúng hạn trước 15/06.'
    }
  ]);

  // Form states for Monthly Plans (Add / Edit)
  const [showAddEditPlanModal, setShowAddEditPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planId, setPlanId] = useState('');
  const [planMonth, setPlanMonth] = useState(5);
  const [planYear, setPlanYear] = useState(2026);
  const [planIndicator, setPlanIndicator] = useState('');
  const [planTarget, setPlanTarget] = useState('');
  const [planWeight, setPlanWeight] = useState(15);
  const [planPic, setPlanPic] = useState('Nguyễn Xuân Thao');
  const [planResult, setPlanResult] = useState(''); // Outcome/result input
  const [planStatus, setPlanStatus] = useState<'Chưa thực hiện' | 'Đang thực hiện' | 'Đạt' | 'Không đạt'>('Đang thực hiện');
  const [planNotes, setPlanNotes] = useState('');

  // Staff Personal KPI Targets (Thẻ KPI cho các nhân viên thuộc phòng QLCL)
  const [staffKpis, setStaffKpis] = useState<any[]>([
    {
      id: 'STFKPI-01',
      staffId: 'STF-01',
      staffName: 'Nguyễn Xuân Thao',
      role: 'Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (QA/QC Head)',
      month: 5,
      year: 2026,
      indicator: 'Tỷ lệ xử lý hành động khắc phục CAPA đúng hạn phòng tránh lỗi lặp',
      unit: '%',
      target: '>=95%',
      actual: '96.8%',
      progress: 97,
      status: 'Xuất sắc',
      notes: 'Thực thi CAPA số #928 đạt hiệu quả tối ưu cho sườn sắt.'
    },
    {
      id: 'STFKPI-02',
      staffId: 'STF-02',
      staffName: 'Hà Khắc Việt',
      role: 'Phụ trách kiểm tra đầu ra (OQC Section Lead)',
      month: 5,
      year: 2026,
      indicator: 'Thời gian phản hồi thông tin hướng dẫn kỹ thuật cho đại lý',
      unit: 'Giờ',
      target: '<24 giờ',
      actual: '18 giờ',
      progress: 100,
      status: 'Xuất sắc',
      notes: 'Lưu trữ tự động phản hồi trên dữ liệu dùng chung.'
    },
    {
      id: 'STFKPI-03',
      staffId: 'STF-03',
      staffName: 'Hoàng Văn Phấn',
      role: 'Tổ trưởng Tổ kiểm soát chất lượng lắp ráp trong dây chuyền (PQC Line Supervisor)',
      month: 5,
      year: 2026,
      indicator: 'Kiểm tra túc trực lắp ráp trên mỗi LSX phát hiện lỗi luồn dây còi',
      unit: 'Lượt/LSX',
      target: '20',
      actual: '20',
      progress: 100,
      status: 'Đạt',
      notes: 'Kịp thời chấn chỉnh tay nghề công nhân dán mút cố định.'
    },
    {
      id: 'STFKPI-04',
      staffId: 'STF-04',
      staffName: 'Đoàn Anh Hùng',
      role: 'Chuyên viên kiểm tra, xử lý linh kiện đầu vào DK, đầu vào dây chuyền',
      month: 5,
      year: 2026,
      indicator: 'Tỷ lệ linh kiện đạt lần 1 tránh hoàn trả chậm trễ chuyền',
      unit: '%',
      target: '>97%',
      actual: '96.2%',
      progress: 96,
      status: 'Cần rà soát',
      notes: 'Khả năng nổ hốc bửng do độ mỏng lớp xi mạ lô mới.'
    },
    {
      id: 'STFKPI-05',
      staffId: 'STF-05',
      staffName: 'Liễu Tùng Lâm',
      role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)',
      month: 5,
      year: 2026,
      indicator: 'Số lượng xe bệ chạy thử sát hạch phanh và dốc của xưởng dạt chỉ tiêu',
      unit: 'Xe/ngày',
      target: '>=15',
      actual: '16',
      progress: 100,
      status: 'Xuất sắc',
      notes: 'Ghi hình báo cáo đầy đủ cho ca chiều.'
    },
    {
      id: 'STFKPI-06',
      staffId: 'STF-06',
      staffName: 'Lành Xuân Hải',
      role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)',
      month: 5,
      year: 2026,
      indicator: 'Số hóa biên bản lỗi KCS phát hiện dưa lên drive',
      unit: '%',
      target: '100%',
      actual: '100%',
      progress: 100,
      status: 'Đạt',
      notes: 'Dữ liệu được cập nhật hằng ngày tiện phục vụ rà duyệt.'
    }
  ]);

  // Form states for Staff KPIs (Add / Edit)
  const [showAddEditStaffKpiModal, setShowAddEditStaffKpiModal] = useState(false);
  const [editingStaffKpi, setEditingStaffKpi] = useState<any | null>(null);
  const [skpiId, setSkpiId] = useState('');
  const [skpiStaffId, setSkpiStaffId] = useState('STF-01');
  const [skpiStaffName, setSkpiStaffName] = useState('Nguyễn Xuân Thao');
  const [skpiRole, setSkpiRole] = useState('Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (QA/QC Head)');
  const [skpiMonth, setSkpiMonth] = useState(5);
  const [skpiYear, setSkpiYear] = useState(2026);
  const [skpiIndicator, setSkpiIndicator] = useState('');
  const [skpiUnit, setSkpiUnit] = useState('%');
  const [skpiTarget, setSkpiTarget] = useState('');
  const [skpiActual, setSkpiActual] = useState('');
  const [skpiProgress, setSkpiProgress] = useState(100);
  const [skpiStatus, setSkpiStatus] = useState<'Xuất sắc' | 'Đạt' | 'Cần rà soát' | 'Chưa đạt'>('Đạt');
  const [skpiNotes, setSkpiNotes] = useState('');

  // Handlers for monthly plans
  const handleAddNewPlan = () => {
    setEditingPlan(null);
    setPlanId(`MPLAN-${100 + monthlyPlans.length}`);
    setPlanMonth(filterMonth === 'All' ? 5 : filterMonth);
    setPlanYear(filterYear === 'All' ? 2026 : filterYear);
    setPlanIndicator('');
    setPlanTarget('');
    setPlanWeight(15);
    setPlanPic('Nguyễn Xuân Thao');
    setPlanResult('');
    setPlanStatus('Đang thực hiện');
    setPlanNotes('');
    setShowAddEditPlanModal(true);
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanId(plan.id);
    setPlanMonth(plan.month);
    setPlanYear(plan.year);
    setPlanIndicator(plan.indicator);
    setPlanTarget(plan.target);
    setPlanWeight(plan.weight);
    setPlanPic(plan.pic);
    setPlanResult(plan.result || '');
    setPlanStatus(plan.status);
    setPlanNotes(plan.notes || '');
    setShowAddEditPlanModal(true);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm(`Bạn có chắc muốn xóa kế hoạch ${id} không?`)) {
      setMonthlyPlans(prev => prev.filter(p => p.id !== id));
      alert(`Đã xóa kế hoạch ${id}`);
    }
  };

  const handleSavePlanSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!planIndicator.trim()) {
      alert('Vui lòng nhập tên chỉ tiêu kế hoạch!');
      return;
    }
    const savedPlan = {
      id: planId,
      month: planMonth,
      year: planYear,
      indicator: planIndicator,
      target: planTarget,
      weight: Number(planWeight) || 0,
      pic: planPic,
      result: planResult,
      status: planStatus,
      notes: planNotes
    };

    if (editingPlan) {
      setMonthlyPlans(prev => prev.map(p => p.id === planId ? savedPlan : p));
      alert('Cập nhật kế hoạch KPI tháng thành công!');
    } else {
      setMonthlyPlans(prev => [...prev, savedPlan]);
      alert('Thêm mới kế hoạch KPI tháng thành công!');
    }
    setShowAddEditPlanModal(false);
  };

  // Handlers for staff KPIs
  const handleAddNewStaffKpi = () => {
    setEditingStaffKpi(null);
    setSkpiId(`STFKPI-${100 + staffKpis.length}`);
    setSkpiStaffId('STF-01');
    setSkpiStaffName('Nguyễn Xuân Thao');
    setSkpiRole('Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (QA/QC Head)');
    setSkpiMonth(filterMonth === 'All' ? 5 : filterMonth);
    setSkpiYear(filterYear === 'All' ? 2026 : filterYear);
    setSkpiIndicator('');
    setSkpiUnit('%');
    setSkpiTarget('');
    setSkpiActual('');
    setSkpiProgress(100);
    setSkpiStatus('Đạt');
    setSkpiNotes('');
    setShowAddEditStaffKpiModal(true);
  };

  const handleEditStaffKpi = (sKpi: any) => {
    setEditingStaffKpi(sKpi);
    setSkpiId(sKpi.id);
    setSkpiStaffId(sKpi.staffId);
    setSkpiStaffName(sKpi.staffName);
    setSkpiRole(sKpi.role);
    setSkpiMonth(sKpi.month);
    setSkpiYear(sKpi.year);
    setSkpiIndicator(sKpi.indicator);
    setSkpiUnit(sKpi.unit);
    setSkpiTarget(sKpi.target);
    setSkpiActual(sKpi.actual);
    setSkpiProgress(sKpi.progress || 100);
    setSkpiStatus(sKpi.status);
    setSkpiNotes(sKpi.notes || '');
    setShowAddEditStaffKpiModal(true);
  };

  const handleDeleteStaffKpi = (id: string) => {
    if (confirm(`Bạn có chắc muốn xóa chỉ tiêu cá nhân ${id} không?`)) {
      setStaffKpis(prev => prev.filter(sk => sk.id !== id));
      alert(`Đã xóa chỉ tiêu cá nhân ${id}`);
    }
  };

  const handleSaveStaffKpiSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!skpiIndicator.trim()) {
      alert('Vui lòng nhập chỉ tiêu cá nhân!');
      return;
    }
    const staffList = [
      { id: 'STF-01', name: 'Nguyễn Xuân Thao', role: 'Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (QA/QC Head)' },
      { id: 'STF-02', name: 'Hà Khắc Việt', role: 'Phụ trách kiểm tra đầu ra (OQC Section Lead)' },
      { id: 'STF-03', name: 'Hoàng Văn Phấn', role: 'Tổ trưởng Tổ kiểm soát chất lượng lắp ráp trong dây chuyền (PQC Line Supervisor)' },
      { id: 'STF-04', name: 'Đoàn Anh Hùng', role: 'Chuyên viên kiểm tra, xử lý linh kiện đầu vào DK, đầu vào dây chuyền' },
      { id: 'STF-05', name: 'Liễu Tùng Lâm', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)' },
      { id: 'STF-06', name: 'Lành Xuân Hải', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)' }
    ];
    const targetStaff = staffList.find(s => s.id === skpiStaffId) || staffList[0];

    const savedSkpi = {
      id: skpiId,
      staffId: skpiStaffId,
      staffName: targetStaff.name,
      role: targetStaff.role,
      month: skpiMonth,
      year: skpiYear,
      indicator: skpiIndicator,
      unit: skpiUnit,
      target: skpiTarget,
      actual: skpiActual,
      progress: Number(skpiProgress) || 100,
      status: skpiStatus,
      notes: skpiNotes
    };

    if (editingStaffKpi) {
      setStaffKpis(prev => prev.map(sk => sk.id === skpiId ? savedSkpi : sk));
      alert('Cập nhật chỉ tiêu cá nhân cho nhân sự thành công!');
    } else {
      setStaffKpis(prev => [...prev, savedSkpi]);
      alert('Giao chỉ tiêu cá nhân cho nhân sự thành công!');
    }
    setShowAddEditStaffKpiModal(false);
  };

  // Filtered monthly plans based on month/year filters
  const filteredMonthlyPlans = useMemo(() => {
    return monthlyPlans.filter(p => {
      const matchMonth = filterMonth === 'All' || p.month === filterMonth;
      const matchYear = filterYear === 'All' || p.year === filterYear;
      const matchQuery = !searchQuery.trim() || 
        p.pic.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.indicator.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchYear && matchQuery;
    });
  }, [monthlyPlans, filterMonth, filterYear, searchQuery]);

  // Filtered staff KPIs
  const filteredStaffKpis = useMemo(() => {
    return staffKpis.filter(sk => {
      const matchMonth = filterMonth === 'All' || sk.month === filterMonth;
      const matchYear = filterYear === 'All' || sk.year === filterYear;
      const matchQuery = !searchQuery.trim() || 
        sk.staffName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        sk.indicator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sk.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchYear && matchQuery;
    });
  }, [staffKpis, filterMonth, filterYear, searchQuery]);

  // Logging Modal & states
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedKpiId, setSelectedKpiId] = useState('');
  const [logActual, setLogActual] = useState('');
  const [logStatus, setLogStatus] = useState<'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi'>('Đạt');
  const [logNotes, setLogNotes] = useState('');

  // Add/Edit KPI Modal & Form States
  const [showAddEditKpiModal, setShowAddEditKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<DetailedKPI | null>(null);
  const [kpiId, setKpiId] = useState('');
  const [kpiCategory, setKpiCategory] = useState('Sản lượng');
  const [kpiType, setKpiType] = useState<'Mục tiêu hoạt động chung' | 'Mục tiêu hoạt động chuyên môn'>('Mục tiêu hoạt động chuyên môn');
  const [kpiWeight, setKpiWeight] = useState(10);
  const [kpiIndicator, setKpiIndicator] = useState('');
  const [kpiDefinition, setKpiDefinition] = useState('');
  const [kpiUnit, setKpiUnit] = useState('%');
  const [kpiTarget, setKpiTarget] = useState('');
  const [kpiActual, setKpiActual] = useState('');
  const [kpiStatus, setKpiStatus] = useState<'Đạt' | 'Không đạt' | 'Đang cải tiến' | 'Theo dõi'>('Đạt');
  const [kpiDetails, setKpiDetails] = useState('');
  const [kpiMonth, setKpiMonth] = useState(5);
  const [kpiYear, setKpiYear] = useState(2026);

  const handleAddNewKpi = () => {
    setEditingKpi(null);
    setKpiId(`KPI-CL-${100 + kpis.length}`);
    setKpiCategory('Sản lượng');
    setKpiType('Mục tiêu hoạt động chuyên môn');
    setKpiWeight(10);
    setKpiIndicator('');
    setKpiDefinition('');
    setKpiUnit('%');
    setKpiTarget('');
    setKpiActual('');
    setKpiStatus('Đạt');
    setKpiDetails('');
    setKpiMonth(5);
    setKpiYear(2026);
    setShowAddEditKpiModal(true);
  };

  const handleEditKpi = (kpi: DetailedKPI) => {
    setEditingKpi(kpi);
    setKpiId(kpi.id);
    setKpiCategory(kpi.category);
    setKpiType(kpi.type);
    setKpiWeight(kpi.groupWeight);
    setKpiIndicator(kpi.indicator);
    setKpiDefinition(kpi.definition);
    setKpiUnit(kpi.unit);
    setKpiTarget(kpi.target);
    setKpiActual(kpi.actual);
    setKpiStatus(kpi.status);
    setKpiDetails(kpi.details || '');
    setKpiMonth(kpi.month || 5);
    setKpiYear(kpi.year || 2026);
    setShowAddEditKpiModal(true);
  };

  const handleDeleteKpi = (id: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa chỉ tiêu KPI ${id} không?`)) {
      setKpis(prev => prev.filter(k => k.id !== id));
      alert(`Đã xóa thành công chỉ số KPI ${id}!`);
    }
  };

  const handleSaveKpiSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!kpiIndicator.trim()) {
      alert('Vui lòng nhập tên chỉ tiêu KPI!');
      return;
    }

    const savedKpi: DetailedKPI = {
      id: kpiId,
      category: kpiCategory as any,
      type: kpiType,
      groupWeight: Number(kpiWeight) || 0,
      indicator: kpiIndicator,
      definition: kpiDefinition,
      unit: kpiUnit,
      target: kpiTarget,
      actual: kpiActual,
      status: kpiStatus,
      details: kpiDetails,
      month: kpiMonth,
      year: kpiYear
    };

    if (editingKpi) {
      setKpis(prev => prev.map(k => k.id === kpiId ? savedKpi : k));
      alert('Cập nhật chỉ tiêu KPI thành công!');
    } else {
      if (kpis.some(k => k.id === kpiId)) {
        alert('Mã KPI đã tồn tại, vui lòng đổi mã hoặc sửa KPI đó!');
        return;
      }
      setKpis(prev => [...prev, savedKpi]);
      alert('Thêm mới chỉ số KPI thành công!');
    }
    setShowAddEditKpiModal(false);
  };

  // Dropdown list categories
  const categories = useMemo(() => {
    const list = new Set(kpis.map(k => k.category));
    return ['All', ...Array.from(list)];
  }, [kpis]);

  // Calculate high-level scoring (Weight average based on achieved status)
  const currentOverallScore = useMemo(() => {
    const totalWeight = kpis.reduce((acc, k) => acc + (k.groupWeight || 0), 0) || 1;
    // Calculate achievement. If status === 'Đạt', it scores 100% of weight. 
    // If 'Theo dõi' or 'Đang cải tiến', say it scores 60% of weight. If 'Không đạt', 0%.
    const scoredWeight = kpis.reduce((acc, k) => {
      const weight = k.groupWeight || 0;
      if (k.status === 'Đạt') {
        return acc + weight;
      } else if (k.status === 'Theo dõi') {
        return acc + weight * 0.7; // 70% achievement
      } else if (k.status === 'Đang cải tiến') {
        return acc + weight * 0.4; // 40% achievement
      }
      return acc; // 0% for Không đạt
    }, 0);

    const percent = Math.round((scoredWeight / totalWeight) * 100);
    
    // Proactively communicate overall KPI update if functional callbacks exist
    if (onUpdateOverallKPI) {
      onUpdateOverallKPI(percent);
    }
    return percent;
  }, [kpis, onUpdateOverallKPI]);

  // Count items
  const summaryCounts = useMemo(() => {
    return {
      total: kpis.length,
      achieved: kpis.filter(k => k.status === 'Đạt').length,
      failed: kpis.filter(k => k.status === 'Không đạt').length,
      improving: kpis.filter(k => k.status === 'Đang cải tiến').length,
      watching: kpis.filter(k => k.status === 'Theo dõi').length,
    };
  }, [kpis]);

  // Filters logic
  const filteredKpis = useMemo(() => {
    return kpis.filter(k => {
      const matchType = filterType === 'All' || k.type === filterType;
      const matchCategory = filterCategory === 'All' || k.category === filterCategory;
      const matchStatus = filterStatus === 'All' || k.status === filterStatus;
      const matchMonth = filterMonth === 'All' || (k.month === undefined ? 5 : k.month) === filterMonth;
      const matchYear = filterYear === 'All' || (k.year === undefined ? 2026 : k.year) === filterYear;
      
      const matchSearch = searchQuery === '' || 
          k.indicator.toLowerCase().includes(searchQuery.toLowerCase()) ||
          k.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
          k.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          k.category.toLowerCase().includes(searchQuery.toLowerCase());
          
      return matchType && matchCategory && matchStatus && matchSearch && matchMonth && matchYear;
    });
  }, [kpis, filterType, filterCategory, filterStatus, filterMonth, filterYear, searchQuery]);

  // Handle Log submit
  const handleKPIUpdateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!logActual.trim()) {
      alert('Vui lòng nhập số liệu đo đạc thực tế!');
      return;
    }
    
    setKpis(prev => prev.map(k => {
      if (k.id === selectedKpiId) {
        return {
          ...k,
          actual: logActual,
          status: logStatus,
          details: logNotes ? logNotes : k.details
        };
      }
      return k;
    }));

    setShowLogModal(false);
    setLogActual('');
    setLogNotes('');
    alert('Cập nhật chỉ số hiệu suất KPI thành công!');
  };

  // Export full catalog to CSV in vietnamese locale
  const handleExportKPICSV = () => {
    const csvHeaders = ["Mã KPI", "Nhóm hoạt động", "Mục tiêu chung/Chuyên môn", "Tên chỉ tiêu KPI", "Định nghĩa chuyên môn", "ĐVT", "Mục tiêu đề ra", "Thực tế đạt", "Trạng thái", "Nhật ký ghi chú điều hành"];
    const csvContent = kpis.map(r => [
      r.id,
      r.category,
      r.type,
      r.indicator,
      r.definition,
      r.unit,
      r.target,
      r.actual,
      r.status,
      r.details || ''
    ]);
    
    let csvString = "\uFEFF" + [csvHeaders.join(","), ...csvContent.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `So_tay_KPI_Phong_Quan_Ly_Chat_Luong_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getKpiAttainment = (k: DetailedKPI): number => {
    if (k.status === 'Đạt') return 100;
    
    const actStr = String(k.actual || (k as any).result || '');
    const tgtStr = String(k.target || '');

    if (k.status === 'Theo dõi') {
      const actNum = parseFloat(actStr.replace(/[^0-9.]/g, ''));
      const tgtNum = parseFloat(tgtStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(actNum) && !isNaN(tgtNum) && tgtNum > 0) {
        return Math.min(100, Math.round((actNum / tgtNum) * 100));
      }
      return 85; 
    }
    if (k.status === 'Đang cải tiến') return 75;
    if (k.status === 'Không đạt') {
      const actNum = parseFloat(actStr.replace(/[^0-9.]/g, ''));
      const tgtNum = parseFloat(tgtStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(actNum) && !isNaN(tgtNum) && tgtNum > 0) {
        return Math.min(99, Math.round((actNum / tgtNum) * 100));
      }
      return 60; 
    }
    return 100;
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-10rem)] pr-2 animate-in fade-in duration-300" id="view_kpi_dashboard_panel">
      
      {/* Visual Banner Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Scale className="w-5 h-5 text-indigo-600 animate-pulse" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">
              Chỉ số Mục tiêu & KPI Phòng Quản lý Chất lượng DKBike
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bản đồ chỉ đạo chuẩn hóa theo mô hình PDCA Việt Nhật, phân bổ 35% mục tiêu vận hành chung và 65% nghiệp vụ kiểm soát chuyên môn sâu.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button 
            onClick={handleAddNewKpi}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
            id="btn_add_kpi"
          >
            <Plus className="w-4 h-4" /> Thêm Mới KPI
          </button>
          <button 
            onClick={handleExportKPICSV}
            className="bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
            id="btn_export_kpi_csv"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Xuất Sổ tay KPI (Excel CSV)
          </button>
        </div>
      </div>

      {/* Bento Stats Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:scale-[1.01]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Đánh giá chung phòng</span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-black text-indigo-700 font-mono tracking-tight">{currentOverallScore}%</span>
            <span className="text-sm text-indigo-500 font-extrabold pb-0.5">Hiệu quả</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-full" style={{ width: `${currentOverallScore}%` }}></div>
          </div>
          <span className="text-[10px] text-emerald-600 font-black mt-2 uppercase block tracking-wide">Xếp Loại: KHÁ / HOẠT ĐỘNG ỔN ĐỊNH</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Chỉ tiêu Đạt chuẩn (✓)</span>
          <div className="mt-3 flex items-baseline gap-1 text-emerald-600">
            <span className="text-4xl font-black font-mono tracking-tight">{summaryCounts.achieved}</span>
            <span className="text-sm font-extrabold">/ {summaryCounts.total} chỉ tiêu</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-2.5 leading-relaxed">
            Đúng tiêu chuẩn và tiến độ kiểm định đề ra
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Chỉ tiêu Cận ngưỡng/Theo dõi</span>
          <div className="mt-3 flex items-baseline gap-1 text-slate-700">
            <span className="text-4xl font-black font-mono tracking-tight text-amber-550">{summaryCounts.watching}</span>
            <span className="text-sm font-bold text-slate-500">chỉ số</span>
          </div>
          <span className="text-[10px] text-amber-600 font-black block mt-2.5 uppercase tracking-wide">
            Đang đo lường định kỳ trong kỳ
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Đang bám sát CAPA cải tiến</span>
          <div className="mt-3 flex items-baseline gap-1 text-indigo-600">
            <span className="text-4xl font-black font-mono tracking-tight">{summaryCounts.improving}</span>
            <span className="text-sm font-extrabold text-slate-500">mặt hàng</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-2.5 font-medium leading-relaxed">
            Pháp đồ cải tạo tỷ lệ PPM đối tác
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:scale-[1.01]">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Sự cố trượt KPI (&times;)</span>
          <div className="mt-3 flex items-baseline gap-1 text-red-500 animate-pulse">
            <span className="text-4xl font-black font-mono tracking-tight">{summaryCounts.failed}</span>
            <span className="text-xs font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-1">chỉ tiêu</span>
          </div>
          <span className="text-[10px] text-red-600 font-black block mt-2.5 uppercase tracking-wide">
            Cần hành động phòng ngừa khẩn cấp
          </span>
        </div>
      </div>

      {/* Dynamic Tab Selector for KPI Views */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 mt-2 bg-slate-50/50 p-1.5 rounded-lg border" id="kpi_views_tabs">
        <button
          onClick={() => setActiveKpiTab('indicators')}
          className={`px-4 py-2.5 rounded-md text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeKpiTab === 'indicators' 
              ? 'bg-white text-indigo-700 shadow border-b-2 border-indigo-600 font-black' 
              : 'border-transparent text-slate-550 hover:bg-slate-100 hover:text-indigo-600'
          }`}
          id="btn_tab_indicators"
        >
          <Scale className="w-4 h-4 text-indigo-650" /> Bản đồ Chỉ số Phòng QLCL
        </button>
        <button
          onClick={() => setActiveKpiTab('monthly_plan')}
          className={`px-4 py-2.5 rounded-md text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeKpiTab === 'monthly_plan' 
              ? 'bg-white text-indigo-700 shadow border-b-2 border-indigo-600 font-black' 
              : 'border-transparent text-slate-550 hover:bg-slate-100 hover:text-indigo-600'
          }`}
          id="btn_tab_monthly_plan"
        >
          <FileText className="w-4 h-4 text-indigo-650" /> Kế hoạch & Kết quả KPI Tháng (QLCL)
        </button>
        <button
          onClick={() => setActiveKpiTab('staff_kpis')}
          className={`px-4 py-2.5 rounded-md text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeKpiTab === 'staff_kpis' 
              ? 'bg-white text-indigo-700 shadow border-b-2 border-indigo-600 font-black' 
              : 'border-transparent text-slate-550 hover:bg-slate-100 hover:text-indigo-600'
          }`}
          id="btn_tab_staff_kpis"
        >
          <UserCheck className="w-4 h-4 text-indigo-650" /> KPI Cá Nhân Nhân Viên QLCL
        </button>
      </div>

      {/* Unified Month/Year Filter (fully dynamic and persistent!) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-705 font-extrabold">
          <Calendar className="w-4.5 h-4.5 text-indigo-600" />
          <span className="text-slate-800 text-[13px]">Bộ lọc thời gian toàn bộ KPI phòng và Cá nhân:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Tháng:</span>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="p-2 min-w-32 bg-slate-50 border border-slate-250 rounded font-bold focus:ring-1 focus:ring-indigo-550 focus:outline-none text-slate-755 text-xs focus:bg-white"
            >
              <option key="all-months" value="All">Tất cả tháng</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={`month-filter-${m}`} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold">Năm:</span>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              className="p-2 min-w-32 bg-slate-50 border border-slate-250 rounded font-bold focus:ring-1 focus:ring-indigo-550 focus:outline-none text-slate-755 text-xs focus:bg-white"
            >
              <option key="all-years" value="All">Tất cả năm</option>
              {[2025, 2026, 2027].map(y => (
                <option key={`year-filter-${y}`} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          {(filterMonth !== 'All' || filterYear !== 'All' || searchQuery !== '') && (
            <button
              onClick={() => { setFilterMonth('All'); setFilterYear('All'); setSearchQuery(''); }}
              className="text-xs text-red-500 hover:text-red-700 font-extrabold transition-all flex items-center gap-1 cursor-pointer"
            >
              ✕ Thiết lập lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {activeKpiTab === 'indicators' && (
        /* Structural layout: Interactive structure on left, ledger on right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Quick weights, values & rules matrix */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              Cơ Cấu Trọng Số KPI (100%)
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Mục tiêu hoạt động chung</span>
                  <span className="text-indigo-600 font-mono">35%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full" style={{ width: '35%' }}></div>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1.5 text-[9px] font-bold text-slate-500">
                  <div>• Sản lượng: <strong className="text-slate-755 font-mono">10%</strong></div>
                  <div>• Nhân sự: <strong className="text-slate-755 font-mono">5%</strong></div>
                  <div>• Chi phí: <strong className="text-slate-755 font-mono">10%</strong></div>
                  <div>• 6S & Cải tiến: <strong className="text-slate-755 font-mono">5%</strong></div>
                  <div className="col-span-2">• Báo cáo kế hoạch: <strong className="text-slate-755 font-mono">5%</strong></div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Mục tiêu chuyên môn QLCL</span>
                  <span className="text-emerald-700 font-mono">65%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full" style={{ width: '65%' }}></div>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1.5 text-[9px] font-bold text-slate-500">
                  <div>• Chất lượng NCC: <strong className="text-slate-755 font-mono">5%</strong></div>
                  <div>• I.QC kiểm nhập: <strong className="text-slate-755 font-mono">20%</strong></div>
                  <div>• P.QC quá trình: <strong className="text-slate-755 font-mono">10%</strong></div>
                  <div>• O.QC xuất xưởng: <strong className="text-slate-755 font-mono">15%</strong></div>
                  <div className="col-span-2">• Hệ thống &amp; Hồ sơ ISO: <strong className="text-slate-755 font-mono">15%</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-4 rounded-xl text-white shadow space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-800/60 pb-2">
              <Zap className="w-4 h-4 text-amber-300" />
              Nguyên tắc Áp Dụng KPI
            </h3>
            <ul className="text-xs space-y-2.5 text-slate-300 leading-normal">
              <li className="flex items-start gap-1.5">
                <span className="bg-indigo-700/60 text-amber-400 font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-mono">01</span>
                <span>KPI được bộ phận đo đạc theo tháng, tổng hợp báo cáo quý và năm nộp ban giám đốc.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-indigo-700/60 text-amber-400 font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-mono">02</span>
                <span>KPI từ mục tiêu chung của phòng liên kết phân rã chi tiết thành chỉ tiêu cá nhân chịu trách nhiệm.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-indigo-700/60 text-amber-400 font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-mono">03</span>
                <span>Gắn chỉ tiêu với đánh giá <strong>Lương P3</strong>, cơ quan thưởng cải tiến Kaizen sáng kiến đột phá định kỳ.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="bg-indigo-700/60 text-amber-400 font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-mono">04</span>
                <span>Yêu cầu dữ liệu kiểm soát KCS phải đồng bộ 100% với hệ thống hóa đơn nghiệm thu thực tế kho.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right column: Main ledger ledger with full filters */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 text-xs">
            
            {/* Search and Primary toggle */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tra cứu tên chỉ tiêu, định nghĩa..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                <button
                  onClick={() => setFilterType('All')}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition ${filterType === 'All' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-650 hover:bg-slate-55 shadow-sm'}`}
                >
                  Tất cả ({kpis.length})
                </button>
                <button
                  onClick={() => setFilterType('Mục tiêu hoạt động chung')}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition ${filterType === 'Mục tiêu hoạt động chung' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-650 hover:bg-slate-55 shadow-sm'}`}
                >
                  Hành chính / Chung (35%)
                </button>
                <button
                  onClick={() => setFilterType('Mục tiêu hoạt động chuyên môn')}
                  className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition ${filterType === 'Mục tiêu hoạt động chuyên môn' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-650 hover:bg-slate-55 shadow-sm'}`}
                >
                  Mục tiêu chuyên môn QLCL (65%)
                </button>
              </div>
            </div>

            {/* Advanced Filters: Category + Status */}
            <div className="border-t pt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                <ListFilter className="w-3.5 h-3.5" />
                <span>Rà soát tinh gọn:</span>
              </div>

              {/* Category selector */}
              <div>
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-250 rounded text-slate-705 font-bold focus:outline-none focus:bg-white text-[11px]"
                >
                  <option key="cat-all" value="All">-- Nhóm chỉ tiêu KPI (Tất cả) --</option>
                  {categories.filter(c => c !== 'All').map((c, idx) => (
                    <option key={`cat-${c || idx}`} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Status selector */}
              <div>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-250 rounded text-slate-705 font-bold focus:outline-none focus:bg-white text-[11px]"
                >
                  <option key="status-all" value="All">-- Trạng thái đạt (Tất cả) --</option>
                  <option key="status-ok" value="Đạt">Đạt chuẩn (✓)</option>
                  <option key="status-monitoring" value="Theo dõi">Đang theo dõi lộc</option>
                  <option key="status-improving" value="Đang cải tiến">Đang cải tiến bám sát CAPA</option>
                  <option key="status-failed" value="Không đạt">Chưa đạt chuẩn (&times;)</option>
                </select>
              </div>

              {/* Month selector */}
              <div>
                <select 
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                  className="p-1.5 bg-slate-50 border border-slate-250 rounded text-slate-705 font-bold focus:outline-none focus:bg-white text-[11px]"
                >
                  <option key="month-all" value="All">-- Tháng áp dụng KPI (Tất cả) --</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <option key={`month-filter2-${m}`} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>

              {/* Year selector */}
              <div>
                <select 
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                  className="p-1.5 bg-slate-50 border border-slate-250 rounded text-slate-705 font-bold focus:outline-none focus:bg-white text-[11px]"
                >
                  <option key="year-all" value="All">-- Năm áp dụng KPI (Tất cả) --</option>
                  {[2025, 2026, 2027].map(y => (
                    <option key={`year-filter2-${y}`} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>

              {searchQuery || filterCategory !== 'All' || filterStatus !== 'All' || filterMonth !== 'All' || filterYear !== 'All' ? (
                <button 
                  onClick={() => { setSearchQuery(''); setFilterCategory('All'); setFilterStatus('All'); setFilterMonth('All'); setFilterYear('All'); }}
                  className="text-xs text-red-500 font-bold hover:underline"
                >
                  ✕ Khôi phục mặc định
                </button>
              ) : null}
            </div>
          </div>

          {/* View Mode Switcher and Layout Wrapper */}
          <div className="flex justify-between items-center bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Chế độ hiển thị:</span>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setKpiViewMode('card')}
                className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition duration-150 cursor-pointer ${
                  kpiViewMode === 'card' 
                    ? 'bg-indigo-600 text-white border-transparent shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                id="btn_kpi_view_card"
              >
                <Award className="w-3.5 h-3.5 text-indigo-500 group-hover:text-white" /> Đồ họa chuyên sâu (Trực quan)
              </button>
              <button
                onClick={() => setKpiViewMode('table')}
                className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition duration-150 cursor-pointer ${
                  kpiViewMode === 'table' 
                    ? 'bg-indigo-600 text-white border-transparent shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                id="btn_kpi_view_table"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-500 group-hover:text-white" /> Bảng chi tiết
              </button>
            </div>
          </div>

          {/* Render KPI indicators based on view mode choice */}
          {kpiViewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="kpi_grid_cards_container">
              {filteredKpis.length === 0 ? (
                <div className="col-span-full bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 italic">
                  Không tìm thấy chỉ tiêu KPI nào phù hợp với bộ lọc rà soát!
                </div>
              ) : (
                filteredKpis.map((k) => {
                  const attainment = getKpiAttainment(k);
                  const barColor = attainment >= 100 ? 'bg-emerald-500' : attainment >= 85 ? 'bg-indigo-500' : attainment >= 70 ? 'bg-amber-500' : 'bg-red-500';
                  const textColor = attainment >= 100 ? 'text-emerald-700' : attainment >= 85 ? 'text-indigo-600' : attainment >= 70 ? 'text-amber-600' : 'text-red-605';
                  const ringWebkitColor = attainment >= 100 ? '#10b981' : attainment >= 85 ? '#6366f1' : attainment >= 70 ? '#f59e0b' : '#ef4444';

                  return (
                    <div 
                      key={k.id} 
                      className="bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-5 shadow-sm hover:shadow transition-all duration-200 flex flex-col justify-between space-y-4 group relative overflow-hidden"
                    >
                      {/* Top ribbon: Category and ID */}
                      <div className="flex justify-between items-center text-[10px] font-bold border-b pb-2">
                        <span className="bg-indigo-50 text-indigo-700 font-mono py-1 px-2.5 rounded-lg tracking-wider uppercase text-[9px] border border-indigo-120">
                          {k.category}
                        </span>
                        <span className="text-slate-400 font-mono tracking-tight text-[11px] group-hover:text-indigo-600 transition-colors">
                          {k.id}
                        </span>
                      </div>

                      {/* Title and Definition */}
                      <div className="space-y-1.5 flex-1">
                        <h4 className="font-extrabold text-slate-800 text-[13px] leading-snug group-hover:text-indigo-950 transition-colors">
                          {k.indicator}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2" title={k.definition}>
                          {k.definition}
                        </p>
                      </div>

                      {/* Visual gauge representation of achievement */}
                      <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-3">
                        {/* Circular achievement gauge (D3 custom look) */}
                        <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white rounded-full shadow-xs border border-slate-100">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="24"
                              cy="24"
                              r="19"
                              className="stroke-slate-100"
                              strokeWidth="3"
                              fill="transparent"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="19"
                              stroke={ringWebkitColor}
                              strokeWidth="3.5"
                              fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 19}`}
                              strokeDashoffset={`${2 * Math.PI * 19 * (1 - attainment / 100)}`}
                              className="transition-all duration-500"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10.5px] font-black font-mono text-slate-800">
                            {attainment}%
                          </span>
                        </div>

                        {/* Text description */}
                        <div className="flex-1 text-xs">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tỉ lệ đạt chỉ tiêu</span>
                            <span className={`font-black text-[11px] px-1.5 py-0.5 rounded ${textColor} bg-slate-100/30`}>
                              {k.status}
                            </span>
                          </div>
                          <div className="font-bold text-slate-700">
                            Hoàn thành <span className="text-indigo-650 font-mono font-black">{attainment}%</span> kế hoạch
                          </div>
                        </div>
                      </div>

                      {/* Indicators Target vs Actual and Unit Grid */}
                      <div className="grid grid-cols-3 gap-2 py-2 text-center text-[11px] border-t border-b border-dashed border-slate-150 bg-slate-50/30 -mx-5 px-5">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">MỤC TIÊU</span>
                          <span className="font-black text-slate-705 font-mono text-xs">{k.target}</span>
                        </div>
                        <div className="space-y-0.5 border-x border-slate-150">
                          <span className="text-[9px] font-bold text-indigo-505 block uppercase tracking-wider">THỰC ĐẠT</span>
                          <span className="font-black text-indigo-700 font-mono text-xs bg-indigo-50/20 px-1 rounded">{k.actual}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">ĐƠN VỊ</span>
                          <span className="font-bold text-slate-650 text-xs">{k.unit}</span>
                        </div>
                      </div>

                      {/* Latest execution notes if present */}
                      {k.details && (
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border-l-2 border-slate-350 italic line-clamp-2" title={k.details}>
                          <b>Nhật ký:</b> {k.details}
                        </div>
                      )}

                      {/* Quick Actions Panel */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-150">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-flex items-center gap-1 ${
                          k.status === 'Đạt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse' :
                          k.status === 'Theo dõi' ? 'bg-slate-50 text-slate-550 border border-slate-200' :
                          k.status === 'Đang cải tiến' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          'bg-red-50 text-red-650 border border-red-200 animate-pulse'
                        }`}>
                          {k.status === 'Đạt' ? '✓ Đạt chuẩn' : k.status}
                        </span>

                        <div className="flex items-center gap-1">
                          {onViewDetail && (
                            <button
                              onClick={() => onViewDetail({
                                id: k.id,
                                name: k.indicator,
                                unit: k.unit,
                                target: k.target,
                                result: k.actual,
                                status: k.status,
                                group: k.category,
                                rootCause: k.details || 'Không có ghi nhận đặc thù.'
                              })}
                              className="p-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded border border-slate-250 text-slate-500 transition cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="desktop_kpi_table_wrapper">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-650 font-black text-xs md:text-sm uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-28 bg-slate-50/50">Phân loại</th>
                      <th className="py-3.5 px-4">Hạng mục & Chỉ số KPI rà soát</th>
                      <th className="py-3.5 px-4">Định nghĩa chỉ tiêu & Phương thức tính</th>
                      <th className="py-3.5 px-4 w-20 text-center">Đơn vị</th>
                      <th className="py-3.5 px-4 w-28 text-center bg-emerald-50/20 text-emerald-850">Mục tiêu y/c</th>
                      <th className="py-3.5 px-4 w-32 text-center bg-indigo-50/20 text-indigo-950 font-black">Thực đạt</th>
                      <th className="py-3.5 px-4 w-28 text-center">Đánh giá chung</th>
                      <th className="py-3.5 px-4 w-36 text-center">Thao tác quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKpis.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-450 italic">
                          Không tìm thấy chỉ số KPI nào phù hợp!
                        </td>
                      </tr>
                    ) : (
                      filteredKpis.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-50/40 transition">
                          <td className="py-4 px-4 font-bold text-[11px] uppercase text-indigo-700 tracking-wider">
                            <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              {k.category}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-extrabold text-slate-900 text-sm md:text-[15px]">{k.indicator}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-500 leading-relaxed font-semibold text-xs md:text-[13px]" title={k.definition}>
                            {k.definition}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-slate-600 text-sm">{k.unit}</td>
                          <td className="py-4 px-4 text-center bg-emerald-50/10 font-bold text-slate-705 font-mono text-sm">
                            {k.target}
                          </td>
                          <td className="py-4 px-4 text-center bg-indigo-50/10 font-bold font-mono text-indigo-900 text-sm">
                            {k.actual ? k.actual : <span className="text-slate-400 italic">Chưa đo kiểm</span>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded text-[11px] md:text-xs font-black uppercase tracking-wider inline-block ${
                              k.status === 'Đạt' 
                                ? 'bg-emerald-50 text-emerald-755 border border-emerald-250 shadow-3xs'
                                : k.status === 'Theo dõi'
                                ? 'bg-slate-50 text-slate-500 border border-slate-200'
                                : k.status === 'Đang cải tiến'
                                ? 'bg-amber-50 text-amber-755 border border-amber-250 shadow-3xs animate-pulse font-black'
                                : 'bg-rose-50 text-rose-755 border border-rose-250 shadow-3xs'
                            }`}>
                              {k.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {onViewDetail && (
                                <button
                                  onClick={() => onViewDetail({
                                    id: k.id,
                                    name: k.indicator,
                                    unit: k.unit,
                                    target: k.target,
                                    result: k.actual,
                                    status: k.status,
                                    group: k.category,
                                    rootCause: k.details || 'Không có ghi nhận đặc thù.'
                                  })}
                                  className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-slate-250 text-slate-500 transition cursor-pointer"
                                  title="Xem chi tiết chỉ số KPI"
                                  id={`kpi_btn_view_${k.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedKpiId(k.id);
                                  setLogActual(k.actual);
                                  setLogStatus(k.status);
                                  setLogNotes(k.details || '');
                                  setShowLogModal(true);
                                }}
                                className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-650 rounded-md border border-slate-205 text-slate-500 transition cursor-pointer"
                                title="Cập nhật mẫu ghi nhanh"
                                id={`kpi_btn_quick_${k.id}`}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditKpi(k)}
                                className="p-2 bg-slate-50 hover:bg-amber-50 hover:text-amber-650 rounded-md border border-slate-205 text-slate-500 transition cursor-pointer"
                                title="Chỉnh sửa chi tiết chỉ số KPI"
                                id={`kpi_btn_edit_${k.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteKpi(k.id)}
                                className="p-2 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-md border border-slate-205 text-slate-500 transition cursor-pointer"
                                title="Xóa chỉ số KPI này"
                                id={`kpi_btn_del_${k.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* VIEW: Monthly KPI Planning section for QLCL */}
      {activeKpiTab === 'monthly_plan' && (
        <div className="space-y-4" id="view_monthly_plan_tab">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-[15px] font-black text-slate-850 flex items-center gap-1.5 font-sans">
                <FileText className="w-4.5 h-4.5 text-indigo-650" />
                Kế Hoạch & Kết Quả Đạt Được KPI Hàng Tháng (Phòng QLCL)
              </h3>
              <p className="text-xs text-slate-505 mt-1 leading-relaxed">
                Quản lý xây dựng kế hoạch, phân bổ nhân sự gánh vác chỉ tiêu, liên tục theo dõi tiến độ và nhập kết quả đo kiểm thực tế.
              </p>
            </div>
            <button
              onClick={handleAddNewPlan}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100 shrink-0 transition-all font-sans"
              id="btn_add_kpi_plan"
            >
              <Plus className="w-4 h-4" /> Thêm Kế Hoạch Tháng
            </button>
          </div>

          {/* Monthly Plan Stats matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-xl border border-slate-205 shadow-sm">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Số lượng kế hoạch</span>
              <span className="text-3xl font-black font-mono text-indigo-755 block mt-1.55">
                {filteredMonthlyPlans.length} chỉ tiêu
              </span>
            </div>
            <div className="bg-white p-4.5 rounded-xl border border-slate-205 shadow-sm">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Đạt / Hoàn thành</span>
              <span className="text-3xl font-black font-mono text-emerald-600 block mt-1.55">
                {filteredMonthlyPlans.filter(p => p.status === 'Đạt').length} chỉ tiêu
              </span>
            </div>
            <div className="bg-white p-4.5 rounded-xl border border-slate-205 shadow-sm animate-pulse">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Đang triển khai</span>
              <span className="text-3xl font-black font-mono text-amber-550 block mt-1.55">
                {filteredMonthlyPlans.filter(p => p.status === 'Đang thực hiện').length} chỉ tiêu
              </span>
            </div>
            <div className="bg-white p-4.5 rounded-xl border border-slate-205 shadow-sm">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Trượt / Chưa đạt</span>
              <span className="text-3xl font-black font-mono text-red-500 block mt-1.55">
                {filteredMonthlyPlans.filter(p => p.status === 'Không đạt').length} chỉ tiêu
              </span>
            </div>
          </div>

          {/* Table List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b text-slate-600 font-black text-xs uppercase tracking-wider">
                    <th className="p-4 w-28 text-center bg-slate-50/50">Chu kỳ</th>
                    <th className="p-4">Hạng mục & Nội dung chỉ tiêu</th>
                    <th className="p-4 w-44">Nhân sự thực hiện (PIC)</th>
                    <th className="p-4 w-44">Mục tiêu yêu cầu</th>
                    <th className="p-4 w-24 text-center">Trọng số</th>
                    <th className="p-4 w-52 bg-indigo-50/20 text-indigo-950 font-black border-x border-slate-200">Kết quả đạt được</th>
                    <th className="p-4 w-36 text-center">Trạng thái</th>
                    <th className="p-4 w-24 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonthlyPlans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-500 font-medium">
                        Không tìm thấy bản ghi kế hoạch KPI nào cho tháng {filterMonth !== 'All' ? `tháng ${filterMonth}` : 'này'}. Bấm nút "Thêm Kế Hoạch Tháng" để tạo lập kế hoạch ngay!
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyPlans.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-center text-slate-650 font-mono font-bold whitespace-nowrap bg-slate-50/30">
                          Tháng {p.month}/{p.year}
                        </td>
                        <td className="p-4 space-y-1">
                          <p className="font-extrabold text-slate-900 text-[14px] md:text-[15px]">{p.indicator}</p>
                          {p.notes && <p className="text-xs text-slate-500 mt-1 w-fit bg-slate-50 p-1.5 rounded font-medium italic border border-slate-100">Ghi chú: {p.notes}</p>}
                        </td>
                        <td className="p-4 text-slate-800 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 bg-indigo-100 text-indigo-850 text-xs rounded-full flex items-center justify-center font-black shadow-3xs">
                              {p.pic ? p.pic.split(' ').pop()?.substring(0, 1) : 'P'}
                            </span>
                            <span className="text-sm">{p.pic}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-705 text-sm">{p.target}</td>
                        <td className="p-4 text-center font-mono font-bold text-indigo-650 text-sm">{p.weight}%</td>
                        <td className="p-4 bg-indigo-50/15 border-x border-slate-200">
                          {p.result ? (
                            <div className="flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-black text-indigo-850 text-sm font-mono">{p.result}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold italic text-xs block">Chưa nhập kết quả</span>
                          )}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            p.status === 'Đạt' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 shadow-3xs'
                              : p.status === 'Không đạt'
                              ? 'bg-rose-50 text-rose-705 border border-rose-250 shadow-3xs'
                              : p.status === 'Đang thực hiện'
                              ? 'bg-amber-50 text-amber-755 border border-amber-250 animate-pulse font-black shadow-3xs'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => handleEditPlan(p)}
                              className="p-2 hover:bg-slate-105 text-indigo-600 rounded-md transition cursor-pointer border border-slate-205 bg-white"
                              title="Cập nhật kết quả / Sửa đổi"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlan(p.id)}
                              className="p-2 hover:bg-slate-105 text-rose-600 rounded-md transition cursor-pointer border border-slate-205 bg-white"
                              title="Xóa kế hoạch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Staff Personal KPIs block */}
      {activeKpiTab === 'staff_kpis' && (
        <div className="space-y-4" id="view_staff_kpi_tab">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-[15px] font-black text-slate-850 flex items-center gap-1.5 font-sans">
                <UserCheck className="w-4.5 h-4.5 text-indigo-650" />
                Phiếu Đánh Giá Chỉ Tiêu & KPI Cá Nhân Nhân Viên (Phòng QLCL)
              </h3>
              <p className="text-xs text-slate-550 mt-1 leading-relaxed">
                Các thẻ KPI của từng kỹ sư và KCS sát hạch viên, hiển thị rõ ràng chỉ tiêu, kết quả đo lường thực tế, tiến độ phần trăm và ghi chú nội bộ.
              </p>
            </div>
            <button
              onClick={handleAddNewStaffKpi}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-100 shrink-0 transition-all font-sans"
              id="btn_add_staff_kpi"
            >
              <Plus className="w-4 h-4" /> Giao KPI Nhân Sự
            </button>
          </div>

          {/* Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaffKpis.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-xl border border-slate-205 text-center text-slate-550 font-bold shadow-xs">
                Không tìm thấy chỉ số cá nhân nào cho danh sách nhân viên trong tháng được lựa chọn. Nhấp "Giao KPI Nhân Sự" để kiến thiết thẻ chỉ tiêu mới!
              </div>
            ) : (
              filteredStaffKpis.map(sk => (
                <div 
                  key={sk.id} 
                  className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
                  id={`staff_kpi_card_${sk.id}`}
                >
                  {/* Avatar badge */}
                  <div className="p-4 bg-slate-55 border-b border-slate-105 flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-800 font-extrabold rounded-full flex items-center justify-center text-xs shrink-0 shadow-inner">
                      {sk.staffName ? sk.staffName.split(' ').pop()?.substring(0, 2).toUpperCase() : 'NV'}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-extrabold text-slate-800 text-[13px] truncate">{sk.staffName}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold truncate" title={sk.role}>{sk.role}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50/60 border border-indigo-100 px-1.5 py-0.2 rounded font-mono">
                          T{sk.month}/{sk.year}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                          sk.status === 'Xuất sắc'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : sk.status === 'Đạt'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : sk.status === 'Cần rà soát'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {sk.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="p-4 space-y-3.5 flex-1 select-none">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Chỉ tiêu cá nhân gánh vác</span>
                      <p className="text-xs text-slate-700 font-extrabold leading-relaxed">{sk.indicator}</p>
                    </div>

                    <div className="space-y-3.5 border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-baseline text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Chỉ tiêu đề ra</span>
                          <span className="text-slate-800 font-mono font-black text-xs">{sk.target} {sk.unit !== '%' ? sk.unit : ''}</span>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[9px] text-indigo-500 font-bold block uppercase">Thực tế đạt</span>
                          <span className="text-indigo-750 font-mono font-extrabold text-xs">{sk.actual ? sk.actual : 'Chưa cập nhật'} {sk.unit !== '%' ? sk.unit : ''}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Tiêu chuẩn tỉ lệ hoàn thành</span>
                          <span className="font-mono text-indigo-600 font-black">{sk.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              sk.progress >= 100 
                                ? 'bg-emerald-500' 
                                : sk.progress >= 90
                                ? 'bg-indigo-500'
                                : sk.progress >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, sk.progress)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Instructor advice notes */}
                    {sk.notes && (
                      <div className="bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-500 border border-slate-100 font-medium italic mt-2 leading-relaxed">
                        <strong className="text-slate-600 font-bold">Hiện trường & Chỉ đạo:</strong> {sk.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                    <button
                      onClick={() => handleEditStaffKpi(sk)}
                      className="px-2.5 py-1 text-[10px] font-extrabold text-indigo-650 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/80 rounded transition cursor-pointer border border-indigo-100/50 flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Cập nhật KPI
                    </button>
                    <button
                      onClick={() => handleDeleteStaffKpi(sk.id)}
                      className="px-2.5 py-1 text-[10px] font-extrabold text-rose-600 hover:text-rose-805 bg-rose-50 hover:bg-rose-100 rounded transition cursor-pointer border border-rose-100/50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa chỉ tiêu
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: Update KPI Actual Achieved */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200" id="kpi_update_modal">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2 mb-4">
              <Sliders className="w-4 h-4 text-indigo-600" /> Cập Nhật Số Liệu Đo Đạc KPI
            </h3>

            {(() => {
              const selectedKpi = kpis.find(k => k.id === selectedKpiId);
              if (!selectedKpi) return null;
              return (
                <form onSubmit={handleKPIUpdateSubmit} className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Chỉ tiêu rà soát</span>
                    <strong className="text-slate-800 text-[12px] font-black">{selectedKpi.indicator}</strong>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">{selectedKpi.definition}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Yêu cầu ĐVT:</span>
                      <strong className="font-extrabold text-slate-700">{selectedKpi.unit}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Mục tiêu đề ra:</span>
                      <strong className="text-emerald-700 font-mono font-black">{selectedKpi.target}</strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Số liệu đo thực tế đạt:</label>
                    <input 
                      type="text" 
                      value={logActual}
                      onChange={(e) => setLogActual(e.target.value)}
                      required
                      placeholder="Ví dụ: 98.2%, 14 ngày, v.v."
                      className="w-full bg-slate-50 border p-2 focus:bg-white rounded font-bold text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Đánh giá tiêu chuẩn:</label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-md">
                      {(['Đạt', 'Không đạt', 'Đang cải tiến', 'Theo dõi'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setLogStatus(st)}
                          className={`py-1 text-[10px] rounded font-black transition uppercase ${logStatus === st ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'}`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Nhật ký theo dõi / Ghi chú cải tiến:</label>
                    <textarea
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Ghi nhận bối cảnh thực hiện, phân rã vướng mắc..."
                      rows={2}
                      className="w-full bg-slate-50 border p-2 focus:bg-white rounded font-medium text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end border-t pt-3.5">
                    <button 
                      type="button"
                      onClick={() => setShowLogModal(false)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                    >
                      Đóng
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow shadow-indigo-200"
                    >
                      Lưu chỉ số KCS
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit KPI Detail Form */}
      {showAddEditKpiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 flex flex-col max-h-[95vh]" id="kpi_crud_modal">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase flex items-center gap-1.5 border-b pb-2.5 mb-4">
              <Target className="w-4 h-4 text-indigo-600" /> {editingKpi ? 'Chỉnh Sửa Toàn Diện Chỉ Số KPI' : 'Thêm Mới Chỉ Số KPI Chuẩn Hoá'}
            </h3>

            <form onSubmit={handleSaveKpiSubmit} className="space-y-3 flex-1 overflow-y-auto pr-1 text-slate-800 text-xs">
              <div className="grid grid-cols-3 gap-3 font-sans">
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5 text-[11px]">Mã KPI (Duy nhất):</label>
                  <input 
                    type="text" 
                    value={kpiId}
                    onChange={(e) => setKpiId(e.target.value)}
                    required
                    disabled={!!editingKpi}
                    placeholder="Ví dụ: KPI-CL-01"
                    className="w-full bg-slate-50 border p-2 focus:bg-white rounded font-mono font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5 text-[11px]">Tháng Áp Dụng:</label>
                  <select 
                    value={kpiMonth}
                    onChange={(e) => setKpiMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5 text-[11px]">Năm Áp Dụng:</label>
                  <select 
                    value={kpiYear}
                    onChange={(e) => setKpiYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-755 block mb-0.5">Nhóm Hoạt Động KPI:</label>
                  <select 
                    value={kpiCategory}
                    onChange={(e) => setKpiCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold text-xs"
                  >
                    <option value="Sản lượng">Sản lượng</option>
                    <option value="Nhân sự">Nhân sự</option>
                    <option value="Chi phí bộ phận">Chi phí bộ phận</option>
                    <option value="6S, Cải tiến">6S, Cải tiến</option>
                    <option value="Báo cáo kế hoạch">Báo cáo kế hoạch</option>
                    <option value="Chất lượng NCC">Chất lượng NCC</option>
                    <option value="IQC - Chất lượng đầu vào">IQC - Chất lượng đầu vào</option>
                    <option value="PQC - Chất lượng quá trình">PQC - Chất lượng quá trình</option>
                    <option value="OQC - Chất lượng đầu ra">OQC - Chất lượng đầu ra</option>
                    <option value="Hệ thống & Hồ sơ">Hệ thống & Hồ sơ</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-755 block mb-0.5">Phân Loại Chỉ Tiêu:</label>
                  <select 
                    value={kpiType}
                    onChange={(e) => setKpiType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold text-xs"
                  >
                    <option value="Mục tiêu hoạt động chung">Hành chính / Chung (35%)</option>
                    <option value="Mục tiêu hoạt động chuyên môn">Nghiệp vụ Chuyên môn (65%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5">Đơn vị đo lường (ĐVT):</label>
                  <input 
                    type="text" 
                    value={kpiUnit}
                    onChange={(e) => setKpiUnit(e.target.value)}
                    required
                    placeholder="Ví dụ: %, Ngày, PPM, chiếc"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5">Trọng số phần trăm (%):</label>
                  <input 
                    type="number" 
                    value={kpiWeight}
                    onChange={(e) => setKpiWeight(Number(e.target.value))}
                    required
                    min={0}
                    max={100}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-750 block mb-0.5">Tên Chỉ Tiêu KPI:</label>
                <input 
                  type="text" 
                  value={kpiIndicator}
                  onChange={(e) => setKpiIndicator(e.target.value)}
                  required
                  placeholder="Ví dụ: Tỷ lệ xe đạt chuẩn KCS xuất xưởng vòng 1"
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-750 block mb-0.5">Định Nghĩa Chi Tiết & Giải Trình Cách Tính:</label>
                <textarea 
                  value={kpiDefinition}
                  onChange={(e) => setKpiDefinition(e.target.value)}
                  required
                  rows={2}
                  placeholder="Xác định mẫu xe kiểm thử đạt chuẩn qua tổng đài KCS vòng đầu tiên chia cho tổng số linh kiện sản xuất..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5">Chỉ Tiêu Đề Ra:</label>
                  <input 
                    type="text" 
                    value={kpiTarget}
                    onChange={(e) => setKpiTarget(e.target.value)}
                    required
                    placeholder="99.5%"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5">Thực Tế Đạt Được:</label>
                  <input 
                    type="text" 
                    value={kpiActual}
                    onChange={(e) => setKpiActual(e.target.value)}
                    placeholder="99.2%"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-750 block mb-0.5">Tiêu Chuẩn Đạt:</label>
                  <select 
                    value={kpiStatus}
                    onChange={(e) => setKpiStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  >
                    <option value="Đạt">Đạt chuẩn (✓)</option>
                    <option value="Không đạt">Chưa đạt (&times;)</option>
                    <option value="Đang cải tiến">Đang cải tiến</option>
                    <option value="Theo dõi">Đang theo dõi</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-750 block mb-0.5">Nhật Ký Ghi Chú / Phân Tích Cải Tiến:</label>
                <textarea 
                  value={kpiDetails}
                  onChange={(e) => setKpiDetails(e.target.value)}
                  rows={2}
                  placeholder="Ghi nhận bối cảnh thực hiện hoặc bổ sung sơ đồ xương cá cải tiến..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-medium text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3 flex-shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowAddEditKpiModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow shadow-indigo-200"
                >
                  Lưu Chỉ Tiêu KPI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Monthly KPI Plan */}
      {showAddEditPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto" id="kpi_plan_crud_modal">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2.5 mb-4">
              <FileText className="w-4 h-4 text-indigo-650" />
              {editingPlan ? 'Cập Nhật Kế Hoạch & Kết Quả' : 'Tạo Mới Kế Hoạch KPI Tháng'}
            </h3>

            <form onSubmit={handleSavePlanSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tháng đề xuất:</label>
                  <select
                    value={planMonth}
                    onChange={(e) => setPlanMonth(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>Tháng {m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Năm đề xuất:</label>
                  <select
                    value={planYear}
                    onChange={(e) => setPlanYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>Năm {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung chỉ tiêu kế hoạch:</label>
                <input
                  type="text"
                  value={planIndicator}
                  onChange={(e) => setPlanIndicator(e.target.value)}
                  placeholder="Ví dụ: Kiểm soát tỉ lệ lỗi sườn hàn dập dưới 0.5%..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-extrabold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chỉ tiêu đề ra:</label>
                  <input
                    type="text"
                    value={planTarget}
                    onChange={(e) => setPlanTarget(e.target.value)}
                    placeholder=">=97%"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trọng số (%):</label>
                  <input
                    type="number"
                    value={planWeight}
                    onChange={(e) => setPlanWeight(Number(e.target.value))}
                    placeholder="15"
                    min={5}
                    max={100}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold font-mono text-indigo-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhân sự chịu trách nhiệm (PIC):</label>
                <select
                  value={planPic}
                  onChange={(e) => setPlanPic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                >
                  <option value="Nguyễn Xuân Thao">Nguyễn Xuân Thao - Trưởng phòng QLCL</option>
                  <option value="Hà Khắc Việt">Hà Khắc Việt - Phụ trách OQC</option>
                  <option value="Hoàng Văn Phấn">Hoàng Văn Phấn - Tổ trưởng PQC</option>
                  <option value="Đoàn Anh Hùng">Đoàn Anh Hùng - Chuyên viên IQC</option>
                  <option value="Liễu Tùng Lâm">Liễu Tùng Lâm - Sát hạch OQC</option>
                  <option value="Lành Xuân Hải">Lành Xuân Hải - Sát hạch OQC</option>
                </select>
              </div>

              <div className="border-t pt-3 bg-indigo-50/20 p-2.5 rounded-lg border border-indigo-100">
                <span className="text-[10px] uppercase font-black text-indigo-805 tracking-wider block mb-2">Đo lường & Ghi nhận kết quả:</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-indigo-950 block mb-1">Kết quả thực tế đạt:</label>
                    <input
                      type="text"
                      value={planResult}
                      onChange={(e) => setPlanResult(e.target.value)}
                      placeholder="96.2% (Để sẵn nếu chưa đo)"
                      className="w-full bg-white border border-indigo-200 p-2 focus:bg-white rounded font-black text-indigo-750"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-indigo-950 block mb-1">Trạng thái kế hoạch:</label>
                    <select
                      value={planStatus}
                      onChange={(e) => setPlanStatus(e.target.value as any)}
                      className="w-full bg-white border border-indigo-200 p-2 focus:bg-white rounded font-bold text-slate-800"
                    >
                      <option value="Chưa thực hiện">Chưa thực hiện</option>
                      <option value="Đang thực hiện">Đang thực hiện</option>
                      <option value="Đạt">Đạt tiêu chuẩn (✓)</option>
                      <option value="Không đạt">Không đạt tiêu chuẩn (&times;)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nhật ký ghi chú hành động:</label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi nhận lỗi linh kiện bất ngờ hoặc đề phòng rủi ro..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-medium text-xs text-slate-600"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEditPlanModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow shadow-indigo-100"
                >
                  Lưu kế hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Staff KPI */}
      {showAddEditStaffKpiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto" id="kpi_staff_crud_modal">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-1.5 border-b pb-2.5 mb-4">
              <UserCheck className="w-4 h-4 text-indigo-650" />
              {editingStaffKpi ? 'Chỉnh Sửa KPI Cá Nhân Nhân Sự' : 'Giao Chỉ Tiêu KPI Cho Nhân Sự'}
            </h3>

            <form onSubmit={handleSaveStaffKpiSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Giao cho nhân viên:</label>
                  <select
                    value={skpiStaffId}
                    onChange={(e) => setSkpiStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-black text-indigo-750"
                  >
                    <option value="STF-01">Nguyễn Xuân Thao - Trưởng phòng QLCL</option>
                    <option value="STF-02">Hà Khắc Việt - Phụ trách OQC</option>
                    <option value="STF-03">Hoàng Văn Phấn - Tổ trưởng PQC</option>
                    <option value="STF-04">Đoàn Anh Hùng - Chuyên viên IQC</option>
                    <option value="STF-05">Liễu Tùng Lâm - Nhân viên OQC</option>
                    <option value="STF-06">Lành Xuân Hải - Nhân viên OQC</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tháng:</label>
                    <select
                      value={skpiMonth}
                      onChange={(e) => setSkpiMonth(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Năm:</label>
                    <select
                      value={skpiYear}
                      onChange={(e) => setSkpiYear(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                    >
                      {[2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chỉ tiêu cá nhân phải hoàn thành:</label>
                <input
                  type="text"
                  value={skpiIndicator}
                  onChange={(e) => setSkpiIndicator(e.target.value)}
                  placeholder="Ví dụ: Kiểm tra 100% bệ thử phanh các dòng xe DK Roma Lite, DK Sparta..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-extrabold text-slate-805"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đơn vị đo lường:</label>
                  <input
                    type="text"
                    value={skpiUnit}
                    onChange={(e) => setSkpiUnit(e.target.value)}
                    placeholder="%, Giờ, Lượt, Xe/ngày"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-semibold text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chỉ tiêu đề ra:</label>
                  <input
                    type="text"
                    value={skpiTarget}
                    onChange={(e) => setSkpiTarget(e.target.value)}
                    placeholder=">=95%"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kết quả đo thực tế:</label>
                  <input
                    type="text"
                    value={skpiActual}
                    onChange={(e) => setSkpiActual(e.target.value)}
                    placeholder="96.8%"
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-black text-indigo-755 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tiến độ hoàn thành (%):</label>
                  <input
                    type="number"
                    value={skpiProgress}
                    onChange={(e) => setSkpiProgress(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold font-mono text-indigo-700 text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Đánh giá xếp loại:</label>
                  <select
                    value={skpiStatus}
                    onChange={(e) => setSkpiStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-bold"
                  >
                    <option value="Xuất sắc">Xuất sắc</option>
                    <option value="Đạt">Đạt chuẩn (✓)</option>
                    <option value="Cần rà soát">Cần rà soát (!)</option>
                    <option value="Chưa đạt">Chưa đạt (&times;)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ý kiến chỉ đạo / Chú dẫn hiện trường:</label>
                <textarea
                  value={skpiNotes}
                  onChange={(e) => setSkpiNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi nhận hiện trường lắp ráp hay các bài học đúc rút..."
                  className="w-full bg-slate-50 border border-slate-200 p-2 focus:bg-white rounded font-semibold text-[11px]"
                />
              </div>

              <div className="flex gap-2 justify-end border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEditStaffKpiModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow shadow-indigo-100"
                >
                  Cứu chỉ tiêu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
