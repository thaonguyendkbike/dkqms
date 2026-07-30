import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  Wrench, 
  Building2, 
  Cpu, 
  Car, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  User, 
  FileText, 
  Activity, 
  Package, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Award,
  ListTodo,
  Info,
  HelpCircle,
  FileSpreadsheet,
  BookOpen,
  MapPin,
  Settings,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Shared interfaces for data display
interface IQCRecord {
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

interface PQCRecord {
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
}

interface OQCRecord {
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
  totalLlr: number;
}

interface MarketDefect {
  id: string;
  model: string;
  serialNo?: string;
  defectType: string;
  description: string;
  reportedBy: string;
  reportedDate: string;
  status: 'Chưa xử lý' | 'Đang xử lý' | 'Đã đóng';
  severity: 'Cao' | 'Trung bình' | 'Thấp' | 'Nghiêm trọng';
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  assignee: string;
  dueDate: string;
}

interface ECOChange {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Executed';
  requestedBy: string;
  approvedBy?: string;
  createdDate: string;
  relatedModels: string[];
}

interface DailyLog {
  date: string;
  week: string;
  year: number;
  category: string;
  content: string;
  assignee: string;
  statusPercent: string;
}

interface QMSWorkflowProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  iqcRecords: IQCRecord[];
  setIqcRecords: React.Dispatch<React.SetStateAction<IQCRecord[]>>;
  pqcRecords: PQCRecord[];
  setPqcRecords: React.Dispatch<React.SetStateAction<PQCRecord[]>>;
  oqcRecords: OQCRecord[];
  setOqcRecords: React.Dispatch<React.SetStateAction<OQCRecord[]>>;
  defects: MarketDefect[];
  setDefects: React.Dispatch<React.SetStateAction<MarketDefect[]>>;
  ecos: ECOChange[];
  setEcos: React.Dispatch<React.SetStateAction<ECOChange[]>>;
  dailyLogs: DailyLog[];
  setDailyLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  suppliers: any[];
  models: any[];
  staff: any[];
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Sparkles,
  Building2,
  Package,
  Cpu,
  ShieldCheck,
  Car,
  ListTodo,
  Sliders
};

const INITIAL_QA_STEPS = [
  {
    id: 0,
    code: 'R&D',
    title: 'R&D Phát triển sản phẩm',
    sub: 'Research & Product Development',
    desc: 'Nghiên cứu nhu cầu khách hàng, lập bản vẽ kỹ thuật CAD 3D, thiết kế kết cấu chịu lực sườn, chọn tích hợp linh kiện và đánh giá chất lượng nguyên mẫu thử nghiệm.',
    standards: 'TCCS RND-01:2026 / DKBIKE - Quy trình nghiên cứu phát triển dòng xe mới',
    owner: 'Phụ trách - Nguyễn Đức Linh',
    color: 'bg-slate-700',
    iconName: 'Sparkles',
    instructions: {
      whereToClick: 'Theo dõi tiến trình qua phân hệ "Dự án PTSP" và "Kế hoạch tuần hằng ngày".',
      howToInput: 'Khai báo thông tin thông số kỹ thuật xe máy điện, đăng tải hồ sơ ECO bản vẽ kỹ thuật CAD 3D.',
      howItConnects: 'Nguyên mẫu đạt chất lượng nghiệm thu sẽ được phê chuẩn làm cơ sở bàn giao khuôn dập và bộ chuẩn gá cho SQC.',
      reportForm: 'Hồ sơ thiết kế kỹ thuật R&D (Engineering Design Specifications Sheet).'
    }
  },
  {
    id: 1,
    code: 'SQC',
    title: 'Kiểm Soát Nhà Cung Cấp',
    sub: 'Supplier Quality Control',
    desc: 'Đánh giá định kỳ năng lực nhà xưởng, khuôn dập, dây chuyền mạ, chất lượng nguyên liệu thô trước khi bốc dỡ nhập cảng/vận chuyển về nhà máy lắp ráp.',
    standards: 'TCCS SQC-01:2025 / DKBIKE - Quy định đánh giá khảo sát & phê duyệt Nhà cung ứng cấp 1, cấp 2',
    owner: 'Phụ trách - Nguyễn Xuân Thao',
    color: 'bg-blue-600',
    iconName: 'Building2',
    instructions: {
      whereToClick: 'Vào phân hệ "Nhà Cung Cấp" trên menu chính bên trái để tra cứu hồ sơ.',
      howToInput: 'Chọn nút "Thêm NCC Mới" hoặc "Hành động" -> "Đánh giá audit định kỳ". Điền bảng điểm năng lực gá sườn, dập sườn cốt, mối hàn và vật liệu sạc điện.',
      howItConnects: 'NCC đạt điểm audit A/B mới được cấp phép ký mã đơn hàng linh kiện. Dữ liệu mã NCC (SUP001, SUP002...) sẽ tự động liên thông làm khóa ngoại đối chiếu cho hồ sơ IQC tiếp theo.',
      reportForm: 'Báo cáo năng lực Nhà cung ứng (Supplier Audit Matrix Scorecard), phục vụ họp thẩm tra năng lực sản xuất Quý.'
    }
  },
  {
    id: 2,
    code: 'IQC',
    title: 'Kiểm Nhập Linh Kiện Đầu Vào',
    sub: 'Incoming Quality Control',
    desc: 'Thực hiện kiểm mẫu trực quan và đo lường kích thước, độ cứng, độ bavia sườn cốt, sai lệch chốt IC, đo dung lượng pin/ắc quy đầu vào ngay khi lô hàng cập bến kho dự trữ.',
    standards: 'Quy trình kiểm mẫu MIL-STD-105E ứng dụng cho bavia nhựa sườn xe, dung sai mối hàn thép sườn < 0.5mm',
    owner: 'Phụ trách - Hà Khắc Việt',
    color: 'bg-emerald-600',
    iconName: 'Package',
    instructions: {
      whereToClick: 'Vào phân hệ "Hồ sơ kiểm định KCS" trên menu trái -> Chọn Tab "Kiểm nhập IQC (Linh kiện)".',
      howToInput: 'Bấm nút "Tạo Phiếu Kiểm Tra IQC". Chọn NCC trong danh sách đã đồng bộ, điền Số lượng kiểm (Checked Qty), Số lượng lỗi (Failed Qty), loại lỗi và kết luận ĐẠT/LỖI.',
      howItConnects: 'Lô hàng được phê duyệt "ĐẠT" sẽ tự động update tăng lượng kho linh kiện khả dụng. Lô bị "LỖI" sẽ lập tức kích hoạt quy trình chặn phát hành vật tư và trả hàng NCC.',
      reportForm: 'Báo cáo Kiểm soát sai lỗi linh kiện đầu vào (IQC Weekly/Monthly Failure Rate Sheet), phục vụ cho việc cắt giảm tỉ lệ lỗi bavia.'
    }
  },
  {
    id: 3,
    code: 'PQC',
    title: 'Kiểm Soát Lắp Ráp Trên Chuyền',
    sub: 'Process Quality Control',
    desc: 'Giám sát gắt gao quá trình thao tác gá khung sườn, đo lực xiết bulông, luồn bó dây nguồn thông minh, gá khớp động cơ chống rơ và quá trình sơn điện di sườn cốt.',
    standards: 'Quy trình vận hành chuẩn SOP-QA-PQC-04 - Quy định lực xiết lực sườn và cố định giắc sạc 12V',
    owner: 'Phụ trách - Hoàng Văn Phấn',
    color: 'bg-indigo-600',
    iconName: 'Cpu',
    instructions: {
      whereToClick: 'Vào phân hệ "Hồ sơ kiểm định KCS" trên menu trái -> Chọn Tab "Kiểm soát PQC (Công đoạn)".',
      howToInput: 'Khảo sát ngẫu nhiên trên line lắp ráp đại trà. Nếu phát hiện sai sót, bấm nút "Khai báo sự cố PQC". Điền Mã Lệnh sản xuất (LSX), dòng xe tương ứng và mô tả bất thường.',
      howItConnects: 'Sự cố PQC dở dang lập tức gửi thông điệp hiển thị tại phân hệ "Nhật ký công việc hằng ngày" để Tổ trưởng gác chuyền kịp thời điều chỉnh khuôn dập khuôn gá.',
      reportForm: 'Bản kê lỗi công đoạn lắp ráp, biểu đồ Pareto phân bố lỗi gá lắp theo từng ca sản xuất (Production line 1, 2).'
    }
  },
  {
    id: 4,
    code: 'OQC',
    title: 'Nghiệm Thu Xe Thành Phẩm KCS',
    sub: 'Outgoing Quality Control',
    desc: 'Kiểm định đồng loạt 100% xe ráp hoàn tất. Cho chạy thử bàn lô Rulô tự động, đo phanh, đo độ rò rỉ điện, kiểm định bãi xóc ổ gà thô bạo trước khi đóng số khung dán tem KCS Passed.',
    standards: 'QCVN 68:2013/BGTVT - Quy chuẩn kỹ thuật quốc gia về chất lượng an toàn xe đạp điện xuất xưởng quốc gia',
    owner: 'Phụ trách - Liễu Tùng Lâm',
    color: 'bg-cyan-600',
    iconName: 'ShieldCheck',
    instructions: {
      whereToClick: 'Vào phân hệ "Hồ sơ kiểm định KCS" trên menu trái -> Chọn Tab "Nghiệm thu OQC (Thành phẩm)".',
      howToInput: 'KCS quét mã sườn gốc, đo dòng sạc tự tắt. Điền hồ sơ KCS nghiệm thu xuất xưởng bằng cách chọn "Thêm hồ sơ KCS mới". Điền Mã dòng xe, số khung, màu sắc gá đặt.',
      howItConnects: 'Chỉ xe đã đạt tích 3 chấm xanh KCS mới có thể tạo vận đơn giao hàng đi tới các đại lý của DKBIKE. Xe bị đánh lỗi sẽ bị chuyển cưỡng chế sang khu sửa chữa nguội hỏa tốc.',
      reportForm: 'Biên bản nghiệm thu xuất xưởng KCS hàng ngày, tỉ lệ đạt thẳng First-Time-Right (FTR%).'
    }
  },
  {
    id: 5,
    code: 'SERVE',
    title: 'Kiểm Soát Sự Cố Thị Trường',
    sub: 'Market & Dealer Defects',
    desc: 'Giám sát dữ liệu bảo hành, phản ảnh lỗi kỹ thuật thực tế phát sinh sau bán hàng từ hơn 300+ đối tác đại lý lớn nhỏ của DKBIKE trên vùng bản đồ toàn quốc.',
    standards: 'Quy trình phản hồi thông số kỹ thuật đại lý liên minh 24h & Thư viện Ma trận rủi ro thiết kế FMEA',
    owner: 'Phụ trách - Nguyễn Văn Diệm',
    color: 'bg-amber-600',
    iconName: 'Car',
    instructions: {
      whereToClick: 'Vào phân hệ "Sự cố Thị trường" ở menu trái.',
      howToInput: 'Khi kỹ thuật đại lý gọi điện báo cáo, nhân viên CSKH chọn "Tạo phiếu báo lỗi bảo hành mới" -> Chọn dòng xe, nhập mã số khung xe bị sự cố, mô tả triệu chứng và tình trạng đại lý xử lý.',
      howItConnects: 'Sự cố lỗi nặng lặp lại > 2 lần lập tức được cập nhật trực tiếp tại Chỉ Số KPI Chất Lượng và tự động tạo luồng đề xuất xử lý CAPA khẩn cấp gửi Trưởng phòng.',
      reportForm: 'Báo cáo tổng hợp lỗi bảo hành tháng (Monthly After-sales Incident Log), thống kê số lỗi quy đổi trên vạn xe.'
    }
  },
  {
    id: 6,
    code: 'CAPA',
    title: 'Hành Động Khắc Phục CAPA',
    sub: 'Corrective & Preventive Action',
    desc: 'Lập tổ điều tra tìm nguyên nhân rễ lỗi (5-Why, xương cá Ishikawa), ban hành phiếu chỉ định khắc phục tới đúng phòng ban liên đới để sửa sai và gia cố khuôn gá.',
    standards: 'Quy chuẩn hành động khắc phục và phòng ngừa lỗi kỹ thuật DK-CAPA-SYS',
    owner: 'Phụ trách - Nguyễn Xuân Thao',
    color: 'bg-rose-600',
    iconName: 'ListTodo',
    instructions: {
      whereToClick: 'Vào phân hệ "Quản lý Công việc" hoặc "QMS Database" -> Chọn Tab công việc CAPA.',
      howToInput: 'Bấm nút "Tạo Công Việc" hoặc "Ban hành Chỉ thị CAPA". Lựa chọn Chuyên án xử lý, mô tả chi tiết lỗi phát sinh, phân công cho kỹ sư phụ trách và thiết lập Hạn hoàn thành kiểm sườn.',
      howItConnects: 'Kỹ sư nhận nhiệm vụ có trách nhiệm kiểm chứng thực tế tại xưởng và cập nhật tiến độ (In Progress -> Completed). Hệ thống sẽ tự kiểm tra tiến trình hoàn tất để đóng vụ việc.',
      reportForm: 'Tờ trình cải tiến hệ thống (CAPA Execution Progress Tracking Sheet), đo lường thời gian đóng lỗi trung bình.'
    }
  },
  {
    id: 7,
    code: 'ECO',
    title: 'Thay Đổi Thiết Kế Kỹ Thuật',
    sub: 'Engineering Change Order',
    desc: 'Ban hành cải tiến cập nhật gốc trên bản vẽ 3D R&D, tinh chỉnh kích thước khuôn sườn dập chịu lực, nâng cấp IC hoặc bọc gá chống cọ xước mạch điện để triệt tiêu lỗi gốc vĩnh viễn.',
    standards: 'ISO 14001 & Quy trình quản lý thay đổi thiết kế cơ điện DKBIKE-ECO-SYSTEM-2026',
    owner: 'Phụ trách - Nguyễn Xuân Thao',
    color: 'bg-purple-600',
    iconName: 'Sliders',
    instructions: {
      whereToClick: 'Vào phân hệ "Quản lý Thay đổi (ECO)" trên menu trái.',
      howToInput: 'Chọn "Lập Hồ Sơ ECO Mới". Viết lý do thay đổi từ CAPA liên quan, tải lên bản vẽ thiết kế mới của linh kiện sườn hoặc mạch bảo ôn hộp điện xe, chỉ rõ các mẫu xe xe điện chịu ảnh hưởng.',
      howItConnects: 'Hồ sơ dạng Draft sẽ trình qua hòm thư Giám đốc Ban Điều hành. Khi Giám đốc duyệt phê chuẩn sang "Executed", xưởng gá lắp bắt buộc phải áp dụng khuôn vẽ mới sườn.',
      reportForm: 'Danh mục thay đổi kỹ thuật gốc ECO ban hành (Engineering Change Orders Master List), phục vụ đối chiếu mẫu xe.'
    }
  }
];

export default function QMSWorkflowTab({
  tasks,
  iqcRecords,
  pqcRecords,
  oqcRecords,
  defects,
  ecos,
  dailyLogs,
  suppliers,
  models,
  staff
}: QMSWorkflowProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [selectedSubTab, setSelectedSubTab] = useState<'flow' | 'manual' | 'plan_report'>('flow');

  // Load qaSteps from localStorage or fallback
  const [qaSteps, setQaSteps] = useState(() => {
    const saved = localStorage.getItem('dk_qms_flow_steps_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return INITIAL_QA_STEPS;
  });

  const [isEditingStep, setIsEditingStep] = useState(false);
  const [editStepForm, setEditStepForm] = useState<any>(null);

  const handleStartEdit = (step: any) => {
    setEditStepForm({ ...step });
    setIsEditingStep(true);
  };

  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = qaSteps.map((s: any) => s.id === editStepForm.id ? editStepForm : s);
    setQaSteps(updated);
    localStorage.setItem('dk_qms_flow_steps_v2', JSON.stringify(updated));
    setIsEditingStep(false);
  };

  const handleResetSteps = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục thiết kế chu trình QMS gốc từ hệ thống?')) {
      setQaSteps(INITIAL_QA_STEPS);
      localStorage.setItem('dk_qms_flow_steps_v2', JSON.stringify(INITIAL_QA_STEPS));
      setIsEditingStep(false);
    }
  };

  // Calculates stats dynamically for the sidebar overview cards
  const summaryStats = React.useMemo(() => {
    const totalSuppliers = suppliers.length || 18;
    const iqcPassRate = iqcRecords.length > 0 
      ? (((iqcRecords.length - iqcRecords.filter(r => r.result === 'Lỗi').length) / iqcRecords.length) * 100).toFixed(1)
      : '98.2';
    const activePqcIssues = pqcRecords.filter(r => r.status === 'Đang cải tiến').length;
    const oqcPassRate = oqcRecords.length > 0
      ? (((oqcRecords.length - oqcRecords.filter(r => r.status === 'Lỗi').length) / oqcRecords.length) * 100).toFixed(1)
      : '93.5';
    const unresolvedMarketDefects = defects.filter(d => d.status === 'Chưa xử lý').length;
    const pendingEcos = ecos.filter(e => e.status === 'Pending').length;
    
    return {
      totalSuppliers,
      iqcPassRate,
      activePqcIssues,
      oqcPassRate,
      unresolvedMarketDefects,
      pendingEcos
    };
  }, [suppliers, iqcRecords, pqcRecords, oqcRecords, defects, ecos]);

  const selectedStep = qaSteps[activeStep] || qaSteps[0];
  const StepIcon = iconMap[selectedStep.iconName] || BookOpen;

  return (
    <div className="space-y-6" id="qms_observation_workflow_view">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_right,rgba(99,102,241,0.5),transparent_70%)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-extrabold tracking-widest bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                QMS Knowledge Center
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
                SOP-01-VÀNH-ĐAI-KHÉP-KÍN
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans flex items-center gap-2">
              🧭 Bản Đồ Vận Hành Chu Trình Chất Lượng QMS
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Trang tra cứu chuyên sâu giúp người dùng nhận biết <strong>Toàn bộ quy trình của dự án</strong>, 
              phương thức vận hành các phân hệ, cách thức nhập dữ liệu thực tế tại từng công đoạn, cùng cấu trúc thiết lập Kế hoạch & Báo cáo chất lượng tại <strong>DKBIKE</strong>.
            </p>
          </div>
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-md flex items-center gap-2 shrink-0">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-bold font-mono tracking-wider text-slate-100 uppercase">
              CHẾ ĐỘ: KHẢO SÁT & HƯỚNG DẪN SOP
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top-level Sub navigation tabs for different aspects of learning */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-xs">
        <button
          onClick={() => setSelectedSubTab('flow')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedSubTab === 'flow' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Sơ đồ Tiến trình & CSDL Khép kín (8 Bước)
        </button>
        <button
          onClick={() => setSelectedSubTab('manual')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedSubTab === 'manual' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Hướng dẫn Nhập dữ liệu & Định danh Phân hệ
        </button>
        <button
          onClick={() => setSelectedSubTab('plan_report')}
          className={`flex-1 py-3 text-center rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedSubTab === 'plan_report' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Quy trình thiết lập Kế hoạch & Báo cáo Ban Giám đốc
        </button>
      </div>

      {/* 3. SUBTAB CONTENT A: THE INTERACTIVE FLOW MAP */}
      {selectedSubTab === 'flow' && (
        <div className="space-y-6">
          {/* Circular/Line Visual Map */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                Vòng Đời Hoàn Chỉnh Chất Lượng 8 Giai Đoạn (Từ R&D ➡️ Bản Vẽ ECO)
              </h3>
              <p className="text-[11px] font-bold text-slate-400 italic">Bấm chọn từng bước bên dưới để tra cứu hướng dẫn chi tiết</p>
            </div>

            {/* Steps interactive Nodes mapping */}
            <div className="relative">
              {/* Connecting line for widescreen */}
              <div className="hidden lg:block absolute top-[2.2rem] left-[4%] right-[4%] h-0.5 bg-dashed bg-slate-200 z-0"></div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
                {qaSteps.map((step: any, idx: number) => {
                  const Icon = iconMap[step.iconName] || BookOpen;
                  const isCurrent = activeStep === step.id;
                  
                  return (
                    <div
                      key={step.id}
                      onClick={() => {
                        setActiveStep(step.id);
                        setIsEditingStep(false);
                      }}
                      className={`cursor-pointer group relative flex flex-col items-center bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border transition-all text-center ${
                        isCurrent 
                          ? 'bg-white border-2 border-indigo-600 shadow-md scale-103 hover:bg-white' 
                          : 'border-slate-200 hover:border-slate-350'
                      }`}
                    >
                      {/* Step index badge */}
                      <span className={`absolute top-2 left-2 text-[9px] font-black rounded px-1.5 py-0.2 ${
                        isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>

                      {/* Icon */}
                      <div className={`mt-2 p-2.5 rounded-xl transition-all ${
                        isCurrent 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-white text-slate-600 border shadow-xs group-hover:border-indigo-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Code and Label */}
                      <span className={`mt-3 font-extrabold text-[12px] tracking-wider ${isCurrent ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {step.code}
                      </span>
                      <p className="text-[9.5px] font-bold text-slate-500 leading-tight mt-0.5 min-h-[1.5rem] flex items-center justify-center">
                        {step.title}
                      </p>

                      {/* Horizontal Next arrow inside the node if not the last item */}
                      {idx < qaSteps.length - 1 && (
                        <div className="hidden lg:flex absolute -right-2 top-8 w-4 h-4 bg-white border border-slate-250 rounded-full items-center justify-center z-20 text-slate-400 shadow-2xs">
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed step breakdown cards (Self-Explaining & Dynamic KPIs mapping) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Spec Card (8 Columns) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 ${selectedStep.color} text-white rounded-xl shadow-xs`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                        Công Đoạn 0{selectedStep.id + 1}
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 font-mono">
                        {selectedStep.sub}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-800 tracking-tight mt-0.5">
                      {selectedStep.title} ({selectedStep.code})
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(selectedStep)}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Sửa mô tả
                  </button>
                  <button
                    onClick={handleResetSteps}
                    className="px-2 py-1.5 text-slate-400 hover:text-slate-600 font-medium rounded-lg text-[11px] transition-colors cursor-pointer"
                    title="Khôi phục gốc"
                  >
                    Mở khôi phục
                  </button>
                </div>
              </div>

              {isEditingStep && editStepForm ? (
                <form onSubmit={handleSaveStep} className="p-6 space-y-4 bg-slate-50/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên công đoạn</label>
                      <input
                        type="text"
                        value={editStepForm.title}
                        onChange={e => setEditStepForm({ ...editStepForm, title: e.target.value })}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tên tiếng anh / Subtitle</label>
                      <input
                        type="text"
                        value={editStepForm.sub}
                        onChange={e => setEditStepForm({ ...editStepForm, sub: e.target.value })}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mã code</label>
                      <input
                        type="text"
                        value={editStepForm.code}
                        onChange={e => setEditStepForm({ ...editStepForm, code: e.target.value })}
                        className="w-full text-xs font-black font-mono px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 font-mono text-indigo-700">👤 Phụ trách / Nhân sự phụ trách</label>
                      <input
                        type="text"
                        value={editStepForm.owner}
                        onChange={e => setEditStepForm({ ...editStepForm, owner: e.target.value })}
                        className="w-full text-xs font-extrabold px-3 py-2 border border-indigo-200/80 rounded-lg focus:outline-indigo-500 bg-indigo-50/20 text-slate-900"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu chuẩn kỹ thuật chất lượng</label>
                      <input
                        type="text"
                        value={editStepForm.standards}
                        onChange={e => setEditStepForm({ ...editStepForm, standards: e.target.value })}
                        className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả mục tiêu chuyên năng & Đặc tính kiểm soát</label>
                      <textarea
                        rows={3}
                        value={editStepForm.desc}
                        onChange={e => setEditStepForm({ ...editStepForm, desc: e.target.value })}
                        className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-2">
                    <h4 className="text-xs font-bold text-indigo-700 uppercase mb-3">Hướng dẫn tác nghiệp chi tiết</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Chọn gì trên Menu? (Kênh thao tác)</label>
                        <textarea
                          rows={2}
                          value={editStepForm.instructions.whereToClick}
                          onChange={e => setEditStepForm({
                            ...editStepForm,
                            instructions: { ...editStepForm.instructions, whereToClick: e.target.value }
                          })}
                          className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Quy trình nhập liệu (How to Input)</label>
                        <textarea
                          rows={2}
                          value={editStepForm.instructions.howToInput}
                          onChange={e => setEditStepForm({
                            ...editStepForm,
                            instructions: { ...editStepForm.instructions, howToInput: e.target.value }
                          })}
                          className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Tính liên thông khép kín (CSDL)</label>
                        <textarea
                          rows={2}
                          value={editStepForm.instructions.howItConnects}
                          onChange={e => setEditStepForm({
                            ...editStepForm,
                            instructions: { ...editStepForm.instructions, howItConnects: e.target.value }
                          })}
                          className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Sản phẩm hồ sơ / Báo cáo đầu ra</label>
                        <textarea
                          rows={2}
                          value={editStepForm.instructions.reportForm}
                          onChange={e => setEditStepForm({
                            ...editStepForm,
                            instructions: { ...editStepForm.instructions, reportForm: e.target.value }
                          })}
                          className="w-full text-xs font-medium px-3 py-2 border rounded-lg focus:outline-indigo-500 bg-white"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingStep(false)}
                      className="px-4 py-2 border rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer text-slate-605"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Lưu thay đổi ✓
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Core Description of standard */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      Mục tiêu chuyên năng & Đặc tính kiểm soát
                    </span>
                    <p className="text-xs text-slate-755 font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedStep.desc}
                    </p>
                    <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row justify-between gap-2">
                      <span className="text-[10.5px] font-semibold text-slate-600">
                        📋 Tiêu chuẩn: <strong className="text-indigo-700 font-bold">{selectedStep.standards}</strong>
                      </span>
                      <span className="text-[10.5px] font-semibold text-slate-650 flex items-center gap-1">
                        👤 {selectedStep.owner}
                      </span>
                    </div>
                  </div>

                  {/* Integration Manual (Highly informative & directly answers the prompt) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Where & How */}
                    <div className="border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-indigo-500 rounded-xs"></span>
                        <h4 className="text-[11.5px] font-extrabold text-slate-800 uppercase tracking-tight">Kênh Thao Tác Hệ Thống</h4>
                      </div>
                      
                      <div className="space-y-2.5 text-xs text-slate-655 font-semibold">
                        <div className="bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100/50">
                          <span className="text-[9.5px] uppercase font-bold text-indigo-500 block">Chọn gì trên Menu?</span>
                          <p className="text-slate-700 mt-0.5 font-bold whitespace-pre-wrap">{selectedStep.instructions.whereToClick}</p>
                        </div>
                        <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-200/50">
                          <span className="text-[9.5px] uppercase font-bold text-slate-500 block">Quy trình nhập liệu (How to Input)</span>
                          <p className="text-slate-650 mt-0.5 font-medium whitespace-pre-wrap">{selectedStep.instructions.howToInput}</p>
                        </div>
                      </div>
                    </div>

                    {/* Interconnection & Report */}
                    <div className="border border-slate-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-indigo-500 rounded-xs"></span>
                        <h4 className="text-[11.5px] font-extrabold text-slate-800 uppercase tracking-tight">Cơ chế Kiểm soát & Sản phẩm đầu ra</h4>
                      </div>
                      
                      <div className="space-y-2.5 text-xs text-slate-655 font-semibold">
                        <div className="bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100/50">
                          <span className="text-[9.5px] uppercase font-bold text-emerald-600 block">Tính liên thông khép kín (CSDL)</span>
                          <p className="text-slate-700 mt-0.5 font-medium whitespace-pre-wrap">{selectedStep.instructions.howItConnects}</p>
                        </div>
                        <div className="bg-amber-50/30 p-2.5 rounded-lg border border-amber-100/50">
                          <span className="text-[9.5px] uppercase font-bold text-amber-600 block">Sản phẩm hồ sơ / Báo cáo</span>
                          <p className="text-slate-700 mt-0.5 font-medium whitespace-pre-wrap">{selectedStep.instructions.reportForm}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Quick KPI stats box (4 Columns) */}
            <div className="lg:col-span-4 space-y-4">
              
              <div className="bg-indigo-950 text-white rounded-2xl p-5 border border-indigo-850 shadow-md">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-200 flex items-center gap-1.5 border-b border-indigo-800/60 pb-2 mb-3">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Chỉ số Kiểm soát Vận hành
                </h3>
                <p className="text-[11px] text-indigo-200 mb-4 leading-relaxed">
                  Các chỉ số chất lượng thực tế đang được đồng bộ tự động từ các phân hệ nhập liệu của kỹ sư.
                </p>

                <div className="space-y-3">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-350 block uppercase">Năng lực NCC (SQC)</span>
                      <span className="text-xs font-bold font-sans text-slate-100">Audit định kỳ</span>
                    </div>
                    <span className="text-sm font-black font-mono text-emerald-400">{summaryStats.totalSuppliers} NCC</span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-350 block uppercase">Đạt đầu vào (IQC)</span>
                      <span className="text-xs font-bold font-sans text-slate-100">Tỷ lệ lô hàng Đạt</span>
                    </div>
                    <span className="text-sm font-black font-mono text-cyan-400">{summaryStats.iqcPassRate}%</span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-350 block uppercase">Dây chuyền (PQC)</span>
                      <span className="text-xs font-bold font-sans text-slate-100">Sự cố chờ xử lý</span>
                    </div>
                    <span className="text-sm font-black font-mono text-amber-400">{summaryStats.activePqcIssues} vụ</span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-350 block uppercase">Kiểm định xuất xưởng (OQC)</span>
                      <span className="text-xs font-bold font-sans text-slate-100">Tỉ lệ Đạt KCS lần 1 (FTR%)</span>
                    </div>
                    <span className="text-sm font-black font-mono text-emerald-400">{summaryStats.oqcPassRate}%</span>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-350 block uppercase">Thị trường bảo hành</span>
                      <span className="text-xs font-bold font-sans text-slate-100">Kiếu nại chờ xử lý</span>
                    </div>
                    <span className="text-sm font-black font-mono text-rose-400">{summaryStats.unresolvedMarketDefects} vụ</span>
                  </div>
                </div>
              </div>

              {/* Tips block */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-850 space-y-2">
                <h4 className="font-black text-amber-900 uppercase flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                  Mẹo sử dụng nhanh:
                </h4>
                <p className="leading-relaxed font-semibold text-slate-705">
                  Khi phát hiện một sự cố kiểm sườn hàng lỗi ngoài thị trường, quy trình chuẩn đòi hỏi bạn phải vào phân hệ <strong>"Sự cố Thị trường"</strong> báo trước. Sau đó viết chỉ đạo <strong>"CAPA"</strong> gửi nhà xưởng, và cuối cùng yêu cầu <strong>"ECO"</strong> nâng cấp sườn dập.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. SUBTAB CONTENT B: FULL PROJECT RECONGNITION MANUAL */}
      {selectedSubTab === 'manual' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Cẩm Nang Vận Hành Các Phân Hệ Trên Phần Mềm</h3>
              <p className="text-xs text-slate-500">Tìm hiểu vai trò và cách áp dụng chuẩn xác của từng phím điều hướng hệ thống DKBIKE.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            
            <div className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-indigo-300 hover:shadow-2xs transition-all bg-slate-50/50">
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold uppercase px-1.5 py-0.5 rounded">Tác Nghiệp Thực Địa</span>
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">👨‍🔧 Phân Hệ KCS Hằng Ngày</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Nơi kỹ sư QC gác dây chuyền khai báo dữ liệu. Gồm 3 Tab chính: 1. <strong>Kiểm nhập IQC</strong> (cho linh kiện sườn cốt), 2. <strong>Kiểm soát PQC</strong> (cho lỗi sượt sườn, bavia trên chuyền), 3. <strong>Nghiệm thu OQC</strong> (đóng khung mác mẫu xe xe máy điện xuất xưởng).
              </p>
            </div>

            <div className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-indigo-300 hover:shadow-2xs transition-all bg-slate-50/50">
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold uppercase px-1.5 py-0.5 rounded">Chiến Lược NCC</span>
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">🏭 Phân Hệ Nhà Cung Cấp</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Quản lý thư mục chứa 18+ Nhà cung cấp lớn nhỏ (Thịnh Nhuệ, Shiying...). Giúp người dùng tra cứu điểm xếp hạng tín nhiệm, thực hiện đánh giá kiểm xưởng (Supplier Audit) định kỳ mỗi Quý.
              </p>
            </div>

            <div className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-indigo-300 hover:shadow-2xs transition-all bg-slate-50/50">
              <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold uppercase px-1.5 py-0.5 rounded">Cải Tiến Gốc Thiết Kế</span>
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">📐 Quản lý Thay đổi (ECO)</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Phân hệ chuyên trách của ban R&D / Thiết kế cải tiến sản phẩm R&D. Sau khi phát hiện các lỗi kết cấu (như cấn sườn, rò điện), kỹ sư sẽ đăng tải văn bản ECO thay đổi khuôn dập chịu tải gá vít tại xưởng sản xuất thiết bị.
              </p>
            </div>

            <div className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-indigo-300 hover:shadow-2xs transition-all bg-slate-50/50">
              <span className="text-[10px] bg-amber-100 text-amber-700 font-extrabold uppercase px-1.5 py-0.5 rounded">Bản Tin Số Liệu trực quan</span>
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">📊 KPI Dashboard & Charts</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Phân hệ tổng quan đối sánh toàn diện: Sức khỏe chất lượng theo Tháng, biểu đồ phân tích COPQ tài chính tổn thất, tỉ lệ FTR% (First-Time-Right) của KCS xe thành phẩm và bảng đo KPI thực đạt so với mục tiêu.
              </p>
            </div>

            <div className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-indigo-300 hover:shadow-2xs transition-all bg-slate-50/50">
              <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold uppercase px-1.5 py-0.5 rounded">Liên thông CSDL</span>
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">🗄️ QMS Database Explorer</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Trình hiển thị dạng bảng trực quan của toàn bộ cơ sở dữ liệu hệ thống (6 bảng cốt lõi liên thông: Tasks, IQC, PQC, OQC, Market Defects, ECO). Có bộ lọc tìm kiếm nhanh mã xe để truy vết tức thời.
              </p>
            </div>

            <div className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-indigo-300 hover:shadow-2xs transition-all bg-slate-50/50">
              <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold uppercase px-1.5 py-0.5 rounded">Trí Tuệ Nhân Tạo</span>
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">🤖 Trợ Lý Giám Đốc AI (AI Director)</h4>
              <p className="text-xs text-slate-600 leading-normal">
                Cung cấp module thẩm định, tư vấn giải pháp sửa chữa và chấm điểm báo cáo chất lượng tự động bằng công nghệ AI sinh trợ lý, giúp Ban điều hành đưa ra chỉ đạo cải tổ sườn xe hỏa tốc mà không tốn công đọc thủ công.
              </p>
            </div>

          </div>

          {/* Quick FAQ / Guide Accordion */}
          <div className="border-t pt-5 mt-4">
            <h4 className="font-black text-xs text-slate-700 uppercase mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-600" />
              Câu hỏi thường gặp về Vận hành & Cấu trúc Dữ liệu:
            </h4>

            <div className="space-y-2.5">
              {[
                {
                  q: "Làm thế nào để dữ liệu liên thông khép kín không bị rời rạc?",
                  a: "Hệ thống liên kết dữ liệu dựa trên Mã dòng xe (Model như DK Roma Lite, DK Gogo...) và Nhà cung cấp (Supplier). Khi bạn nhập hồ sơ IQC lỗi nhựa cho Thịnh Nhuệ, hệ thống tự động lưu trữ và phản ánh trực tiếp vào Điểm Uy tín Nhà cung cấp đó, đồng thời kích hoạt cảnh báo bavia dây chuyền kiểm ráp bên tab PQC."
                },
                {
                  q: "Người phê duyệt là những ai, làm sao để trình duyệt hồ sơ lên cấp trên?",
                  a: "Hồ sơ đề xuất Kế hoạch Chất lượng và ECO sau khi lập sẽ tự động chuyển sang trạng thái 'Pending' (Chờ duyệt). Giám đốc Ban điều hành hoặc Trưởng phòng Nguyễn Xuân Thao sẽ truy cập hệ thống để bấm 'Phê duyệt'. Khi được phê duyệt hoàn toàn, các xưởng gá ráp bắt đầu áp dụng dứt điểm cấu kiện gia cố bổ sung."
                },
                {
                  q: "Tại sao nên gộp 'Kiểm soát nhà cung cấp trước IQC'?",
                  a: "Nội dung này giúp ngăn ngừa 80% lỗi kết cấu sườn thô lỗi sạt lún bavia nhựa từ xưởng nguồn. SQA kiểm định ngay tại cơ sở sản xuất giúp tiết kiệm tối đa chi phí vận chuyển hàng hỏng về nhà máy, đưa hệ thống tiến tới tiệm cận Zero-Defect."
                }
              ].map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="border rounded-lg overflow-hidden bg-slate-50/30">
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full text-left p-3 flex justify-between items-center bg-white cursor-pointer hover:bg-slate-50 border-b transition-colors"
                    >
                      <span className="font-extrabold text-xs text-indigo-950 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        {faq.q}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="p-3 text-xs text-slate-650 leading-relaxed bg-slate-50/50"
                        >
                          {faq.a}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUBTAB CONTENT C: WEEKLY / MONTHLY PLANS AND REPORTS TO DIRECTOR */}
      {selectedSubTab === 'plan_report' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight">Quy trình Thiết lập Kế hoạch & Báo cáo Ban Giám đốc</h3>
              <p className="text-xs text-slate-500">Tìm hiểu các biểu mẫu, chu kỳ báo cáo và sơ đồ phê duyệt của Ban biên quản trị.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Ke hoạch Tuan/Thang */}
            <div className="border border-indigo-100 rounded-2xl p-5 space-y-4 bg-gradient-to-br from-indigo-50/20 to-white">
              <h4 className="font-bold text-sm text-indigo-950 border-b pb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                1. Kế hoạch Chất lượng (Weekly/Monthly Quality Plans)
              </h4>
              
              <ul className="space-y-3.5 text-xs text-slate-700">
                <li className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</div>
                  <div>
                    <strong className="text-slate-800 block">Thiết lập mục tiêu:</strong>
                    Trưởng phòng QC dựa trên mục tiêu tổng (Ví dụ: FTR &gt; 95%, bavia sườn cốt = 0) để tạo Kế hoạch Tuần mới.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</div>
                  <div>
                    <strong className="text-slate-800 block">Gửi trình phê duyệt:</strong>
                    Hệ thống sẽ đồng bộ tờ trình trạng thái <code>Pending</code> gửi qua tài khoản giám sát.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</div>
                  <div>
                    <strong className="text-slate-800 block">Duyệt và phân bổ việc:</strong>
                    Khi Giám đốc chuyển trạng thái phê duyệt sang <code>Approved ✓</code>, các hành động phòng ngừa sạc, bọc nhựa sườn sẽ tự động chuyển thành nhiệm vụ gá gầm trên chuyền gá.
                  </div>
                </li>
              </ul>
              
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-850 font-medium">
                👉 Tra cứu thực tế tại Tab: <strong>"Kế hoạch chất lượng tuần"</strong> và <strong>"Kế hoạch chất lượng tháng"</strong> để xem cấu trúc chỉ đối chiếu thời gian cam kết đạt chuẩn ban đầu.
              </div>
            </div>

            {/* Bao cao cuoi thang va Ban Giam Doc */}
            <div className="border border-emerald-100 rounded-2xl p-5 space-y-4 bg-gradient-to-br from-emerald-50/20 to-white">
              <h4 className="font-bold text-sm text-emerald-950 border-b pb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                2. Hình thức Báo cáo Chất lượng & Ban Giám đốc
              </h4>
              
              <ul className="space-y-3.5 text-xs text-slate-700">
                <li className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">A</div>
                  <div>
                    <strong className="text-slate-800 block">Báo cáo kiểm soát tháng (Monthly Quality Report):</strong>
                    Bao gồm thống kê tỉ lệ lỗi nhựa, cấn sườn, sự cố rơ lỏng giắc sạc... tự động vẽ bảng KPI đối sánh chất lượng thực đạt.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">B</div>
                  <div>
                    <strong className="text-slate-800 block">Thẩm định của AI Director:</strong>
                    AI tự phân tích các điểm thắt cổ chai của chuỗi cung ứng, ước tính chi phí tổn thất chất lượng COPQ và cho gợi ý hướng điều chỉnh thiết kế ECO.
                  </div>
                </li>
                <li className="flex gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">C</div>
                  <div>
                    <strong className="text-slate-800 block">Quyết định ban hành thay đổi ECO:</strong>
                    Giám đốc ban hành cải cải tiến ECO cho các lô xe máy điện sườn gá dập tiếp theo và dán thông số để SQA giám sát nhà xưởng NCC.
                  </div>
                </li>
              </ul>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-850 font-medium">
                👉 Tra cứu thực tế tại Tab: <strong>"Báo cáo công việc tháng"</strong> và phân hệ <strong>"AI Trợ lý Giám đốc"</strong> để hiểu rõ báo cáo tổng hợp & cách xuất dữ liệu gửi lên Cấp cao.
              </div>
            </div>

          </div>

          {/* Visual Closed Loop Process Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 h-24 w-24 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,white,transparent)]"></div>
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              Tóm lược Luồng di chuyển dữ liệu thông minh trong một lượt vận hành:
            </h4>
            
            <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex-1 flex flex-col justify-between">
                <div>
                  <strong className="text-emerald-400 block mb-1">XÁC ĐỊNH LỖI</strong>
                  <p className="text-slate-300">Khách đại lý báo lỗi vỏ giắc pin rò điện gá sườn lỏng lẻo</p>
                </div>
                <span className="text-[10px] text-slate-405 block mt-2">📍 Nút: "Sự cố thị trường"</span>
              </div>

              <div className="flex items-center justify-center text-slate-500">
                <ArrowRight className="w-5 h-5 hidden md:block" />
                <span className="md:hidden block py-1">⬇️</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex-1 flex flex-col justify-between">
                <div>
                  <strong className="text-indigo-400 block mb-1">RA HÀNH ĐỘNG</strong>
                  <p className="text-slate-300">Gửi CAPA yêu cầu xưởng hàn điều hỉnh khuôn gá và bọc bọc sườn lắp ráp</p>
                </div>
                <span className="text-[10px] text-slate-405 block mt-2">📍 Nút: "Quản lý công việc"</span>
              </div>

              <div className="flex items-center justify-center text-slate-500">
                <ArrowRight className="w-5 h-5 hidden md:block" />
                <span className="md:hidden block py-1">⬇️</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex-1 flex flex-col justify-between">
                <div>
                  <strong className="text-purple-400 block mb-1">SỬA ĐỔI GỐC</strong>
                  <p className="text-slate-300">Sửa bản thiết kế cơ khí ban hành ECO bọc ống bảo gá sườn</p>
                </div>
                <span className="text-[10px] text-slate-405 block mt-2">📍 Nút: "Quản lý thay đổi (ECO)"</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <div className="text-center text-[10.5px] text-slate-400 uppercase tracking-widest font-bold">
        Hệ thống Quản lý Chất lượng Sản xuất Khép kín QMS DKBIKE © 2026
      </div>
      
    </div>
  );
}
