import { Task, KPI, Supplier, CAPA, PTSPProject, MarketDefect, ECOChange, COPQMetric, CustomForm, QualityStaff, DKBikeModel, EquipmentItem, MaintenanceLog, EquipmentIncident, Dealer } from './types';

export const INITIAL_STAFF: QualityStaff[] = [
  { id: 'STF-01', name: 'Nguyễn Xuân Thao', role: 'Trưởng phòng Quản lý chất lượng, phó bộ phận PTSP (QA/QC Head)', email: 'thaonguyendkbike@gmail.com', permission: 'edit' },
  { id: 'STF-02', name: 'Hà Khắc Việt', role: 'Phụ trách kiểm tra đầu ra (OQC Section Lead)', email: 'khacviet.ha@dkbike.vn', permission: 'edit' },
  { id: 'STF-03', name: 'Hoàng Văn Phấn', role: 'Tổ trưởng Tổ kiểm soát chất lượng lắp ráp trong dây chuyền (PQC Line Supervisor)', email: 'vanphan.hoang@dkbike.vn', permission: 'edit' },
  { id: 'STF-04', name: 'Đoàn Anh Hùng', role: 'Chuyên viên kiểm tra, xử lý linh kiện đầu vào DK, đầu vào dây chuyền', email: 'anhhung.doan@dkbike.vn', permission: 'edit' },
  { id: 'STF-05', name: 'Liễu Tùng Lâm', role: 'Sát hạch viên, nhân viên kiểm thử OQC (OQC Quality Assurance)', email: 'tunglam.lieu@dkbike.vn', permission: 'view' },
  { id: 'STF-06', name: 'Lành Xuân Hải', role: 'Sát hạch viên, nhân viên kiểm thử OQC', email: 'xuanhai.lanh@dkbike.vn', permission: 'view' },
  { id: 'STF-07', name: 'Nguyễn Văn Diệm', role: 'Kỹ sư giám sát quy trình, kiểm soát lỗi công nghệ (SQC/IQC Specialist)', email: 'vandiem.nguyen@dkbike.vn', permission: 'view' }
];

export const INITIAL_MODELS: DKBikeModel[] = [
  { id: 'MDL-01', name: 'DK D2', status: 'Đang sản xuất', releaseYear: 2025 },
  { id: 'MDL-02', name: 'DK EZ3', status: 'Đang sản xuất', releaseYear: 2025 },
  { id: 'MDL-03', name: 'DK Gogo Smart', status: 'Đang sản xuất', releaseYear: 2026 },
  { id: 'MDL-04', name: 'DK Nova', status: 'Đang sản xuất', releaseYear: 2026 },
  { id: 'MDL-05', name: 'DK Roma SX V2', status: 'Đang sản xuất', releaseYear: 2026 },
  { id: 'MDL-06', name: 'DK S3', status: 'Đang sản xuất', releaseYear: 2025 },
  { id: 'MDL-07', name: 'DK V1', status: 'Đang sản xuất', releaseYear: 2024 },
  { id: 'MDL-08', name: 'DK V2', status: 'Đang sản xuất', releaseYear: 2025 }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: "TASK-2026-001",
    date: "2026-06-01",
    week: 22,
    month: 6,
    assignee: "Hoàng Văn Phấn",
    category: "OQC - Nghiệm Thu Xe Thành Phẩm KCS",
    content: "Kiểm tra phát hiện rơ lỏng nhẹ trục cổ phuốc xe mẫu điện DK Roma SX V2 khi chạy thử trên dốc hãm phanh gấp.",
    target: 10,
    result: 8,
    status: "Pending",
    priority: "HIGH",
    issueCondition: "Rơ cổ phuốc, khoảng rơ cốc bi vượt 0.1mm",
    locationOfOrigin: "Kho LK/Xưởng lắp ráp",
    rootCausePending: "Lực ép chén bi đầu gá thủy lực bị rơ nhẹ 0.15mm, cốt bát gá cổ phuốc lỏng lẻo.",
    proposedSolution: "Gia công lại chốt gá lực ép thủy lực cổ phuốc, siết chặt dung sai ép xuống dưới ±0.03mm, thay thế chén bi mới từ nhà cung cấp Việt Nhật.",
    nextPlan: "Ban hành hướng dẫn căn chỉnh lực ép thủy lực tự động định kỳ mỗi ca 1 lần.",
    weeksUnresolved: 2,
    images: ["https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=500&q=80"]
  },
  {
    id: "TASK-2026-002",
    date: "2026-06-02",
    week: 22,
    month: 6,
    assignee: "Hà Khắc Việt",
    category: "IQC - Kiểm Nhập Linh Kiện Đầu Vào",
    content: "Rắc sạc đúc sườn nhựa bị sụt áp, chảy cao su bọc lúc cắm sạc nhanh nguồn dòng hỏa tốc.",
    target: 15,
    result: 15,
    status: "Completed",
    priority: "MEDIUM",
    issueCondition: "Sút dòng, vỏ socket thun cao su chảy keo",
    locationOfOrigin: "Phòng QLCL",
    rootCausePending: "Keo Epoxy gắn vòi rắc sạc chưa đạt độ sấy 65°C chuẩn khiến hơi ẩm tích tụ gây rò rỉ điện trở.",
    proposedSolution: "Bổ sung tủ sấy ổn nhiệt chuyên dụng sấy khô rắc sạc đúng nhiệt độ 65°C trong 45 phút trước khi đúc bọc màng co nhựa.",
    nextPlan: "Đặt dưỡng đo Megohm tự động kiểm tra nhanh 100% dòng cách điện qua cổng sạc.",
    weeksUnresolved: 0,
    images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&q=80"]
  },
  {
    id: "TASK-2026-003",
    date: "2026-06-03",
    week: 22,
    month: 6,
    assignee: "Đoàn Anh Hùng",
    category: "SQC - Kiểm Soát Nhà Cung Cấp",
    content: "Phát hiện bavia bám gỉ sét cục bộ trên 8 chiếc khung sườn xe sườn mộc sau 15 ngày nằm bãi chờ lắp ráp.",
    target: 20,
    result: 14,
    status: "Pending",
    priority: "HIGH",
    issueCondition: "Dăm sườn bavia rỉ sét cục bộ",
    locationOfOrigin: "Kho LK/Xưởng lắp ráp",
    rootCausePending: "Khuôn dập mộc của đối tác dập bavia vượt quy định 0.15mm, không phun bọc dầu bướm bảo quản chống oxi hóa khí trời.",
    proposedSolution: "Sơn dặm lót Epoxy chống gỉ tạm thời cho 8 khung tại xưởng ráp, lập công văn phạt nhà cung cấp dập lỗi, mài lại móng khuôn dập bavia đạt tiêu chuẩn.",
    nextPlan: "Đóng gói quấn phủ bọc bọt khí màng co khi vận chuyển và phủ dầu chống rỉ trước khi nhập bãi.",
    weeksUnresolved: 1,
    images: ["https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=500&q=80"]
  }
];
export const INITIAL_KPIS: KPI[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_CAPAS: CAPA[] = [
  {
    id: "CAPA-2026-001",
    CAPAID: "CAPA-2026-001",
    title: "Sự cố sụt điện áp rắc cắm sạc dòng xe DK EZ3",
    Issue: "Rắc sạc đúc sườn nhựa bị sụt áp, chảy cao su bọc lúc cắm sạc nhanh nguồn 15A",
    source: "OQC / Test vận hành",
    rootCause: "Độ xít của giắc cắm lỏng lẻo dính lỗi cơ khí sản xuất, lò sấy đầu vòi sấy keo Epoxy chưa đạt độ sấy 65°C chuẩn khiến hơi ẩm tích tụ gây chạm rò",
    RootCause: "Độ xít của giắc cắm lỏng lẻo dính lỗi cơ khí sản xuất, lò sấy đầu vòi sấy keo Epoxy chưa đạt độ sấy 65°C chuẩn khiến hơi ẩm tích tụ gây chạm rò",
    actions: "Thiết lập cảnh báo tự động đo nhiệt đầu sấy vòi rắc sạc đúng 65°C; thay thế lô vỏ socket nhựa thun chịu nhiệt cao của nhà cung cấp Shin-Etsu.",
    Correction: "Lọc tách lô socket hỏng, thay keo epoxy chịu nhiệt và tăng nhiệt sấy đúng 65°C",
    CorrectiveAction: "Thiết lập dưỡng gá cố định nhiệt sấy lò tự động chặn sụt áp sạc trước khi đúc màng",
    PreventiveAction: "Bổ sung hạng mục đo điện trở cách điện (Megohm test) vào quy trình KCS rắc sạc thành phẩm",
    assignee: "Hoàng Văn Phấn",
    Owner: "Hoàng Văn Phấn",
    targetDate: "2026-06-12",
    DueDate: "2026-06-12",
    status: "Mở",
    Status: "Mở",
    Effectiveness: "Chưa đánh giá",
    isRepeated: false,
    imageUrl: "https://images.unsplash.com/photo-1513828742140-ccaa2a7cb998?w=500&q=80"
  },
  {
    id: "CAPA-2026-002",
    CAPAID: "CAPA-2026-002",
    title: "Chấn chỉnh tỉ lệ lỗi bavia rỉ sét khung sườn xe DK Roma SX",
    Issue: "Phôi sườn dập cắt dăm sườn có nhiều bavia sắc góc rỉ sét cục bộ sau 15 ngày nhập bãi",
    source: "IQC / Khảo sát Kho",
    rootCause: "Khuôn dập của nhà cung cấp Việt Nhật bị mòn rã móng phẳng, không quấn phủ bọc nilon khí màng bọt chống ẩm chấn động lúc vận chuyển",
    RootCause: "Khuôn dập của nhà cung cấp Việt Nhật bị mòn rã móng phẳng, không quấn phủ bọc nilon khí màng bọt chống ẩm chấn động lúc vận chuyển",
    actions: "Yêu cầu nhà cung cấp mài phẳng móng khuôn và che bọc màng khí bọt khí khít chống nứt bám rỉ sét; xử lý chà rỉ sơn lót cho lô sườn hiện hữu.",
    Correction: "Chà nhám đánh gỉ bavia và phun sơn dặm epoxy lót cho lô sườn 123 chiếc tại xưởng ráp",
    CorrectiveAction: "Yêu cầu đối tác dập hạ bavia dưới 0.1mm, bắt buộc nhúng bể phốt phát kẽm mộc chống tác nhân ô nhiễm kho",
    PreventiveAction: "Ban hành tiêu chuẩn gá rào chống va đập và quy chế xếp dỡ mộc nguyên đai nguyên kiện đạt chuẩn",
    assignee: "Đoàn Anh Hùng",
    Owner: "Đoàn Anh Hùng",
    targetDate: "2026-06-18",
    DueDate: "2026-06-18",
    status: "Mở",
    Status: "Mở",
    Effectiveness: "Chưa đánh giá",
    isRepeated: true,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&q=80"
  },
  {
    id: "CAPA-2026-003",
    CAPAID: "CAPA-2026-003",
    title: "Khắc phục hiện tượng lọt rơ trục cổ phuốc xe mẫu DK Gogo",
    Issue: "Khoảng rơ ổ bi vòng phuốc cổ trước quá dung sai bắp dập sau khi thử tải đường gồ ghề",
    source: "Thử nghiệm PTSP / KCS",
    rootCause: "Kích thước bát côn định vị của ghi đông dập hụt 0.15mm so với bản vẽ kỹ thuật CAD chốt thiết kế",
    RootCause: "Kích thước bát côn định vị của ghi đông dập hụt 0.15mm so với bản vẽ kỹ thuật CAD chốt thiết kế",
    actions: "Gia công bồi bổ khuôn jig dập ghi đông, siết chặt thông số dung sai tiện phay bát côn từ ±0.1mm về dưới ±0.03mm.",
    Correction: "Tiện đóng đóng đai tăng đùm căn bi cho các xe mẫu chế tạo phục vụ thử nghiệm nội bộ",
    CorrectiveAction: "Chỉnh khuôn chấn định hình lực bát phuốc đầu ép thủy lực tự động giữ vững trục",
    PreventiveAction: "Đồng bộ hóa dưỡng Go-NoGo gauge kiểm nhanh 100% cổ phuốc trước khi chuyển sang tổ lắp",
    assignee: "Nguyễn Xuân Thao",
    Owner: "Nguyễn Xuân Thao",
    targetDate: "2026-06-08",
    DueDate: "2026-06-08",
    status: "Mở",
    Status: "Mở",
    Effectiveness: "Chưa đánh giá",
    isRepeated: false
  }
];
export const INITIAL_PROJECTS: PTSPProject[] = [];
export const INITIAL_DEFECTS: MarketDefect[] = [
  {
    id: 'DEF-4001',
    feedbackType: 'Lỗi xe từ khách hàng',
    model: 'DK Gogo Smart',
    chassisNo: 'DKB80G0202607A11',
    engineNo: 'MOTO60V1200W-26A',
    dealer: 'Đại lý DKBike Hà Nội',
    saleDate: '2026-04-15',
    defectDate: '2026-05-10',
    type: 'Hệ thống điện & Động cơ',
    description: 'Chập cầu chì động cơ chính khiến xe đột ngột tắt máy khi đang vận hành trên đường xóc.',
    severity: 'A',
    rootCause: 'Rung lắc khi vận hành trên đường xấu làm lỏng giắc cắm cầu chì đúc dẫn tới quá nhiệt cục bộ và nóng chảy chân cực.',
    status: 'Đã xử lý',
    correction: 'Thay mới bệ cầu chì dập nguội giắc lò xo chịu tải cao cho khách hàng ngoài đại lý.',
    correctiveAction: 'Yêu cầu nhà cung ứng sườn/linh kiện gia cố ngàm nhựa khóa giắc chống sụt sịt và bọc keo chống nước silicone.',
    preventiveAction: 'Tiến hành audit kiểm toán lại quy trình kiểm tra gá giắc lắp ráp của công nhân dây chuyền trước khi đóng ốp nhựa sườn xe.',
    assignee: 'Nguyễn Xuân Thao',
    targetDate: '2026-05-20',
    locationOfOrigin: 'Khách hàng sử dụng thực tế',
    capaId: 'CAPA-2026-001',
    images: []
  },
  {
    id: 'DEF-4002',
    feedbackType: 'Lỗi xe từ khách hàng',
    model: 'DK X-Lite',
    chassisNo: 'DKB90XL202608B22',
    engineNo: 'MOTO48V1000W-26B',
    dealer: 'Đại lý DKBike Đà Nẵng',
    saleDate: '2026-05-01',
    defectDate: '2026-05-15',
    type: 'Hệ thống phanh',
    description: 'Mất lực phanh dải phanh sau, bóp phanh kịch tay ga nhưng không giảm tốc dứt điểm.',
    severity: 'B',
    rootCause: 'Ốp đĩa phanh bị lệch tâm 0.3mm do bavia chưa được mài nhẵn bavia đúc từ xưởng dập cơ khí của nhà cung cấp.',
    status: 'Đang xử lý',
    correction: 'Mài phẳng bavia cơ khí mặt gá hoặc thay đĩa phanh dập chuẩn tâm.',
    correctiveAction: 'Yêu cầu xưởng dập phụ tùng lắp cữ hiệu chỉnh tâm thủy lực tự động (Auto-Alignment) trước khi đóng hộp bàn giao bốc xếp.',
    preventiveAction: 'Bổ sung bước dưỡng dưỡng kiểm tâm đĩa phanh vào quy chuẩn IQC kiểm tra nhận hàng.',
    assignee: 'Nguyễn Xuân Thao',
    targetDate: '2026-05-30',
    locationOfOrigin: 'Kiểm thử đường trường đại lý',
    capaId: 'CAPA-2026-002',
    images: []
  },
  {
    id: 'DEF-4003',
    feedbackType: 'Đề xuất cải tiến',
    model: 'DK Roma SX V2',
    chassisNo: '',
    engineNo: '',
    dealer: 'Phòng QLCL DKBike',
    saleDate: '',
    defectDate: '2026-06-05',
    type: 'Cải tiến thiết kế cơ khí',
    description: 'Đề xuất cải tiến độ bám và gia cố tăng cứng gá yên sau nhằm triệt tiêu độ rung sụt sịt bavia.',
    severity: 'C',
    rootCause: 'Thiết kế gá yên chịu lực đơn dễ bị mỏi kim loại tại các mối hàn liên kết dập khi xe chở tải nặng liên tục.',
    status: 'Đã xử lý',
    correction: 'Lắp đệm gá yên gia tải bằng cao su lưu hóa giảm chấn.',
    correctiveAction: 'Thiết kế gá yên sau gia cố thanh chịu lực kép, thay đổi mã linh kiện sang GY-RSX-2026-V2.',
    preventiveAction: 'Ban hành tiêu chuẩn gá rào chống va đập và quy chế xếp dỡ mộc nguyên đai nguyên kiện đạt chuẩn.',
    assignee: 'Lê Hoàng Anh',
    targetDate: '2026-06-12',
    locationOfOrigin: 'Đánh giá nội bộ phòng QLCL',
    capaId: 'CAPA-2026-003',
    images: []
  }
];

export const INITIAL_ECOS: ECOChange[] = [
  {
    id: 'ECO-2601',
    ecrId: 'ECR-441',
    model: 'DK X-Lite',
    component: 'Cụm phanh sau / Đĩa phanh phanh dầu',
    content: 'Cải biên tăng cứng độ bám và dập phẳng đĩa phanh mài phẳng bavia cơ khí mâm gá phanh dầu, thay đổi dung sai gá ráp đúc từ ±0.15mm về dưới ±0.03mm.',
    rootCause: 'Khắc phục hiện tượng méo lệch tâm đĩa phanh bóp phanh không dứt điểm sạt má phanh phát tiếng kêu rít rơ.',
    proposer: 'Nguyễn Xuân Thao',
    approver: 'Hồ Sỹ Liêm',
    applyDate: '2026-05-25',
    status: 'Đã áp dụng',
    category: 'Thiết kế',
    auditChecklist: {
      riskAssessed: true,
      toolingDone: true,
      sopCreated: true,
      iqcTestDone: true
    },
    auditNotes: 'Đã ban hành quy trình mài phẳng bavia 100% tại bể mộc và kiểm soát chặt chẽ dung sai dập.'
  },
  {
    id: 'ECO-2602',
    ecrId: 'ECR-442',
    model: 'DK Roma SX V2',
    component: 'Giá yên sau chịu lực sườn',
    content: 'Thay đổi kết cấu giá đỡ từ thanh chịu lực đơn sang kết cấu dầm hộp kép chịu tải gia cường lực chữ V ngược.',
    rootCause: 'Đề xuất cải tiến gia cố gá đỡ yên sau triệt tiêu rủi ro nứt mỏi kim loại khi chở tải nặng dốc đứng.',
    proposer: 'Lê Hoàng Anh',
    approver: 'Nguyễn Xuân Thao',
    applyDate: '2026-06-12',
    status: 'Đã áp dụng',
    category: 'Thiết kế',
    auditChecklist: {
      riskAssessed: true,
      toolingDone: true,
      sopCreated: true,
      iqcTestDone: true
    },
    auditNotes: 'Thử tải cơ khí đạt 150kg hành trình 500km không phát sinh biến dạng mối hàn.'
  },
  {
    id: 'ECO-2603',
    ecrId: 'ECR-443',
    model: 'DK Gogo Smart',
    component: 'Cáp sạc kết nối & cầu chì động cơ chính',
    content: 'Thay thế dây dẫn đồng tiết diện 2.5mm² sang 4.0mm², bọc ống chịu nhiệt sợi thủy tinh bện và tăng ngàm khóa giắc cắm cầu chì chính.',
    rootCause: 'Khắc phục nguy cơ quá nhiệt chảy keo rắc sạc cắm dòng cao hỏa tốc ngoài đại lý báo cáo thị trường.',
    proposer: 'Hoàng Văn Phấn',
    approver: 'Hồ Sỹ Liêm',
    applyDate: '2026-06-20',
    status: 'Đang thử nghiệm',
    category: 'Vật liệu'
  }
];
export const INITIAL_COPQS: COPQMetric[] = [
  {
    id: "COPQ-001",
    category: "Sửa chữa",
    amount: 0.65,
    trend: "Ổn định",
    details: "Sơn TOA đen",
    month: 7,
    year: 2026,
    costOrigin: "Nội bộ",
    description: "Sửa xe, linh kiện",
    unit: "Hộp",
    quantity: 5,
    unitPrice: 130000,
    totalAmount: 650000,
    notes: ""
  },
  {
    id: "COPQ-002",
    category: "Sửa chữa",
    amount: 0.6,
    trend: "Ổn định",
    details: "Xăng thơm Putin",
    month: 7,
    year: 2026,
    costOrigin: "Nội bộ",
    description: "Sửa xe, linh kiện",
    unit: "Lít",
    quantity: 10,
    unitPrice: 60000,
    totalAmount: 600000,
    notes: ""
  }
];

export interface FMEARecord {
  id: string;
  processStep: string;
  potentialFailureMode: string;
  potentialEffect: string;
  severity: number;
  potentialCause: string;
  occurrence: number;
  currentControl: string;
  detection: number;
  rpn: number;
  riskLevel: 'Cao' | 'Trung bình' | 'Thấp';
  proposedAction: string;
  imageUrl?: string;
}

export const INITIAL_FMEA: FMEARecord[] = [];
export const INITIAL_FORMS: CustomForm[] = [];
export const INITIAL_EQUIPMENT: EquipmentItem[] = [];
export const INITIAL_MAINTENANCE_LOGS: MaintenanceLog[] = [];
export const INITIAL_EQUIPMENT_INCIDENTS: EquipmentIncident[] = [];

export const INITIAL_DEALERS: Dealer[] = [
  { id: 'DLR-01', name: 'Đại lý Hà Nội', phone: '0981234567', address: '12 Cầu Giấy, Hà Nội' },
  { id: 'DLR-02', name: 'Đại lý Hải Phòng 2', phone: '0977654321', address: '34 Lạch Tray, Hải Phòng' },
  { id: 'DLR-03', name: 'Đại lý Lạng Sơn', phone: '0912345678', address: '56 Trần Hưng Đạo, Lạng Sơn' },
  { id: 'DLR-04', name: 'Đại lý Bắc Giang', phone: '0966554433', address: '78 Nguyễn Văn Cừ, Bắc Giang' },
  { id: 'DLR-05', name: 'Đại lý Đà Nẵng', phone: '0905123456', address: '90 Lê Duẩn, Đà Nẵng' },
  { id: 'DLR-06', name: 'Đại lý TP.HCM', phone: '0938112233', address: '101 Nguyễn Thị Minh Khai, Quận 1, TP.HCM' }
];
