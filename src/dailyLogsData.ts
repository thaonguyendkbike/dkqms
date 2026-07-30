export interface DailyLogRecord {
  id?: string;
  stt: number;
  date: string;
  week: string;
  category: string;
  content: string;
  target: string;
  unit: string;
  assignee: string;
  timeWork: string[];
  result: string;
  deadline: string;
  statusPercent: string;
  note: string;
  year?: number;
}

export const DAILY_LOG_DATA: DailyLogRecord[] = [
  // HÔM NAY: 06/06/2026
  {
    stt: 1,
    date: "06/06/2026",
    week: "T1",
    category: "IQC",
    content: "Đo lường kiểm định lô hàng 500 chiếc rắc sạc nhanh thun cao su của hãng Shin-Etsu bàn giao ca sáng.",
    target: "500",
    unit: "Chiếc",
    assignee: "Đoàn Anh Hùng",
    timeWork: ["Ok", "Ok", "", "Ok", "", "Ok", "Ok", ""],
    result: "500",
    deadline: "2026-06-06",
    statusPercent: "100%",
    note: "Đạt chuẩn cách điện Megohm sấy lò 65 độ C. Đã chuyển kho nguyên vật liệu.",
    year: 2026
  },
  {
    stt: 2,
    date: "06/06/2026",
    week: "T1",
    category: "PQC",
    content: "Kiểm soát dọc dây chuyền lắp ráp khung sườn mộc model DK Roma SX V2, đo bavia dập và lực ép chén bi.",
    target: "120",
    unit: "Khung",
    assignee: "Hoàng Văn Phấn",
    timeWork: ["Ok", "Ok", "Ok", "Ok", "Ok", "Ok", "Ok", "Ok"],
    result: "120",
    deadline: "2026-06-06",
    statusPercent: "100%",
    note: "Chỉ số rơ cổ phuốc nằm trong tầm an toàn <0.03mm. Dây chuyền hoạt động trơn tru.",
    year: 2026
  },
  {
    stt: 3,
    date: "06/06/2026",
    week: "T1",
    category: "OQC",
    content: "Chạy thử thực tế, sát hạch xe thành phẩm DK Roman SX v2 trước khi xuất xưởng ra đại lý.",
    target: "80",
    unit: "Xe",
    assignee: "Liễu Tùng Lâm",
    timeWork: ["Ok", "Ok", "Ok", "", "Ok", "Ok", "", "Ok"],
    result: "80",
    deadline: "2026-06-06",
    statusPercent: "100%",
    note: "Phát hiện 2 xe bị rít phanh nhẹ bánh trước đã cho tổ sửa chữa căn chỉnh hoàn thiện 100%.",
    year: 2026
  },
  {
    stt: 4,
    date: "06/06/2026",
    week: "T1",
    category: "SQC/QA",
    content: "Lập biên bản xử lý kỹ thuật yêu cầu đối tác Việt Nhật gia công tinh chỉnh lại dăm móng khuôn dập.",
    target: "1",
    unit: "Biên bản",
    assignee: "Nguyễn Xuân Thao",
    timeWork: ["Ok", "", "", "Ok", "Ok", "", "", "Ok"],
    result: "1",
    deadline: "2026-06-06",
    statusPercent: "100%",
    note: "Đã gửi công văn chính thức lúc 11h ca sáng, đối tác phản hồi đồng ý khắc phục trong 3 ngày.",
    year: 2026
  },
  {
    stt: 5,
    date: "06/06/2026",
    week: "T1",
    category: "Phát triển sản phẩm",
    content: "Thử nghiệm tải trọng đường gồ ghề dốc hãm phanh mẫu thử ghi đông dập mới của Model DK Roma SX V2.",
    target: "5",
    unit: "Lượt",
    assignee: "Nguyễn Xuân Thao",
    timeWork: ["Ok", "Ok", "", "", "Ok", "Ok", "", ""],
    result: "4",
    deadline: "2026-06-06",
    statusPercent: "80%",
    note: "Còn 1 lượt chạy thử chưa hoàn tất do phát sinh cơn mưa lớn chiều tối, hoãn sang sáng mai.",
    year: 2026
  },

  // NGÀY MAI (Kế hoạch): 07/06/2026
  {
    stt: 6,
    date: "07/06/2026",
    week: "T1",
    category: "IQC",
    content: "Nghiệm thu kiểm nhập lô 1000 dây cáp nguồn sạc lõi đồng thun Teflon của đối tác mới Shin-Etsu.",
    target: "1000",
    unit: "Bộ",
    assignee: "Đoàn Anh Hùng",
    timeWork: ["", "", "", "", "", "", "", ""],
    result: "0",
    deadline: "2026-06-07",
    statusPercent: "0%",
    note: "Kế hoạch ngày mai - Kiểm tra kỹ điện trở sườn cáp.",
    year: 2026
  },
  {
    stt: 7,
    date: "07/06/2026",
    week: "T1",
    category: "PQC",
    content: "Kiểm soát độ khít ngàm nhựa giắc cắm pin dòng xe Gogo Smart trên dây chuyền bọc nhiệt màng epoxy.",
    target: "200",
    unit: "Bộ",
    assignee: "Hoàng Văn Phấn",
    timeWork: ["", "", "", "", "", "", "", ""],
    result: "0",
    deadline: "2026-06-07",
    statusPercent: "0%",
    note: "Kế hoạch ngày mai - Chặn đứng lỗi chạm rò ẩm dòng rác sấy nhựa.",
    year: 2026
  },
  {
    stt: 8,
    date: "07/06/2026",
    week: "T1",
    category: "OQC",
    content: "Thực hiện sát hạch xuất xưởng đợt 2 cho Model xe điện thông minh DK Nova.",
    target: "50",
    unit: "Xe",
    assignee: "Lành Xuân Hải",
    timeWork: ["", "", "", "", "", "", "", ""],
    result: "0",
    deadline: "2026-06-07",
    statusPercent: "0%",
    note: "Kế hoạch ngày mai - Đảm bảo bàn giao xe sạch lỗi cho hệ thống đại lý miền Bắc.",
    year: 2026
  },

  // NGÀY TRƯỚC ĐÓ: 05/06/2026
  {
    stt: 9,
    date: "05/06/2026",
    week: "T1",
    category: "IQC",
    content: "Đo và thẩm định dung sai cốt dập lò xo bát cốc bôi trơn cổ xe mẫu của đối tác Shin-Etsu.",
    target: "15",
    unit: "Mẫu",
    assignee: "Đoàn Anh Hùng",
    timeWork: ["Ok", "Ok", "Ok", "", "Ok", "Ok", "Ok", ""],
    result: "15",
    deadline: "2026-06-05",
    statusPercent: "100%",
    note: "Dung sai đạt kích thước bản vẽ CAD ±0.02mm.",
    year: 2026
  },
  {
    stt: 10,
    date: "05/06/2026",
    week: "T1",
    category: "PQC",
    content: "Giám sát hiệu chuẩn nhiệt độ đầu gán thủy lực dập định kỳ mốc 2 tiếng/lần tại ban xưởng lắp.",
    target: "5",
    unit: "Lượt",
    assignee: "Hoàng Văn Phấn",
    timeWork: ["Ok", "", "Ok", "", "Ok", "", "Ok", "Ok"],
    result: "5",
    deadline: "2026-06-05",
    statusPercent: "100%",
    note: "Toàn bộ thông số đạt chuẩn sơn sấy 65 độ C.",
    year: 2026
  },
  {
    stt: 11,
    date: "05/06/2026",
    week: "T1",
    category: "OQC",
    content: "Kiểm tra chất lượng kiểm định an toàn tổng thể hệ thống đèn còi, vận tốc đo phanh của Model DK EZ3.",
    target: "100",
    unit: "Xe",
    assignee: "Liễu Tùng Lâm",
    timeWork: ["Ok", "Ok", "Ok", "Ok", "Ok", "Ok", "", ""],
    result: "100",
    deadline: "2026-06-05",
    statusPercent: "100%",
    note: "Không phát hiện lỗi rơ lỏng hay sụt điện áp.",
    year: 2026
  },
  {
    stt: 12,
    date: "05/06/2026",
    week: "T1",
    category: "Cải tiến hiện trường",
    content: "Sắp xếp, tổ chức đánh giá hiện trường 5S/6S tại tổ kiểm soát và xưởng gá mộc sườn.",
    target: "2",
    unit: "Tổ xưởng",
    assignee: "Hoàng Văn Phấn",
    timeWork: ["", "Ok", "Ok", "", "", "Ok", "Ok", ""],
    result: "2",
    deadline: "2026-06-05",
    statusPercent: "100%",
    note: "Khu vực kho được dọn quang, dán nhãn ranh giới khu vực tách biệt khung đạt vs lỗi rõ ràng.",
    year: 2026
  },
  {
    stt: 13,
    date: "05/06/2026",
    week: "T1",
    category: "Huấn luyện / Đào tạo",
    content: "Nhóm họp kỹ thuật, hướng dẫn nhân viên mới về cách vận hành tủ sấy ổn nhiệt sấy giắc cắm sạc.",
    target: "1",
    unit: "Buổi",
    assignee: "Nguyễn Xuân Thao",
    timeWork: ["", "", "", "", "Ok", "Ok", "Ok", ""],
    result: "1",
    deadline: "2026-06-05",
    statusPercent: "100%",
    note: "Đã huấn luyện cho cả 5 học viên đạt KPI lý thuyết và thao tác gá sấy.",
    year: 2026
  }
];
