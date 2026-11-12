// =========================================================================
// DANH MỤC TÀI LIỆU & HỒ SƠ VẬN HÀNH PHÒNG QUẢN LÝ CHẤT LƯỢNG (P-QLCL)
// CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - DKBike
// =========================================================================

export interface QmsDocumentItem {
  id: string;
  code?: string;                // Mã quy trình / mã tài liệu (ví dụ: QT-QLCL-01, MTCV-TP)
  title: string;               // Tiêu đề tài liệu
  category: 'ho-so-to-chuc' | 'quy-trinh' | 'mtcv-ban-giao' | 'bieu-mau-goc';
  categoryName: string;        // Tên nhóm danh mục tiếng Việt
  department: string;          // Bộ phận áp dụng
  fileName: string;            // Tên file gốc trên đĩa
  relPath: string;             // Đường dẫn tương đối từ /public/docs/P_QLCL/
  fileSizeKB: number;          // Dung lượng file tính bằng KB
  fileExt: string;             // docx / zip
  updatedDate: string;         // Ngày ban hành / cập nhật
  summary: string;             // Tóm tắt nội dung chính
  scope?: string;              // Phạm vi áp dụng
  keyContents: string[];       // Các đề mục nội dung quan trọng
}

export const QMS_DOCUMENT_LIST: QmsDocumentItem[] = [
  // ==================== NHÓM 1: HỒ SƠ TỔ CHỨC & KHUNG NĂNG LỰC ====================
  {
    id: 'doc-org-01',
    code: 'KSX-QLCL-01',
    title: 'Hồ Sơ Tổ Chức Vận Hành Phòng Quản Lý Chất Lượng',
    category: 'ho-so-to-chuc',
    categoryName: 'Hồ sơ Tổ chức & Khung năng lực',
    department: 'Toàn Phòng QLCL',
    fileName: 'KSX-QLCL- Hồ sơ tổ chức vận hành phòng Quản lý chất lượng.docx',
    relPath: 'KSX-QLCL- Hồ sơ tổ chức vận hành phòng Quản lý chất lượng.docx',
    fileSizeKB: 65.8,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy định cơ cấu tổ chức, chức năng, quyền hạn, nguyên tắc chỉ huy và cơ chế phối hợp hoạt động liên phòng ban của P-QLCL DKBike.',
    scope: 'Áp dụng cho toàn thể cán bộ công nhân viên trực thuộc Phòng Quản lý chất lượng.',
    keyContents: [
      'Cơ cấu tổ chức 4 khối nghiệp vụ: Lãnh đạo P-QLCL, BP QC Hiện trường, BP QA/QE, BP Kỹ thuật Thẩm định',
      'Quyền hạn cao nhất của Trưởng phòng QLCL: Quyền Stop-Line đình chỉ chuyền sản xuất khẩn cấp',
      'Nguyên tắc phối hợp liên phòng ban: Sản xuất, Mua hàng, Kỹ thuật R&D, Kho vận, Dịch vụ sau bán hàng',
      'Hệ thống chế độ báo cáo: Nhật ký ca, Báo cáo ngày, Báo cáo tuần, Báo cáo tháng và Báo cáo bất thường'
    ]
  },
  {
    id: 'doc-org-02',
    code: 'KSX-QLCL-02',
    title: 'Danh Sách Nghiệp Vụ Phòng Quản Lý Chất Lượng',
    category: 'ho-so-to-chuc',
    categoryName: 'Hồ sơ Tổ chức & Khung năng lực',
    department: 'Toàn Phòng QLCL',
    fileName: 'KSX- QLCL- Danh sách nghiệp vụ phòng Quản lý chất lượng.docx',
    relPath: 'KSX- QLCL- Danh sách nghiệp vụ phòng Quản lý chất lượng.docx',
    fileSizeKB: 31.5,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Bảng tổng hợp chi tiết toàn bộ các đầu mối nghiệp vụ chuyên môn từ khâu kiểm tra đầu vào, giám sát dây chuyền đến bảo hành và hiệu chuẩn.',
    scope: 'Định danh nghiệp vụ cho toàn bộ các chức danh công việc trong phòng.',
    keyContents: [
      'Nghiệp vụ Kiểm soát Chất lượng Vật tư đầu vào (IQC) theo AQL ISO 2859-1',
      'Nghiệp vụ Giám sát Tuần tra Công đoạn Lắp ráp (IPQC) và Kiểm định xe đầu ca (First-Piece)',
      'Nghiệp vụ Nghiệm thu 100% Xe Thành phẩm (OQC) và Kiểm soát số Khung/Máy',
      'Nghiệp vụ Đảm bảo Chất lượng (QA), Đánh giá Nhà cung ứng (SQE) và Xử lý CAR/PAR',
      'Nghiệp vụ Thẩm định Bảo hành (KTTĐ), Phân tích lỗi mổ xẻ IC/Động cơ và Quản lý thiết bị đo'
    ]
  },
  {
    id: 'doc-org-03',
    code: 'KSX-QLCL-03',
    title: 'Ma Trận Phân Nhiệm Theo Bộ Phận Trong Phòng QLCL',
    category: 'ho-so-to-chuc',
    categoryName: 'Hồ sơ Tổ chức & Khung năng lực',
    department: 'Lãnh đạo Phòng QLCL',
    fileName: 'KSX- QLCL- Ma trận phân nhiệm - Bộ phận trong phòng Quản lý chất lượng.docx',
    relPath: 'KSX- QLCL- Ma trận phân nhiệm - Bộ phận trong phòng Quản lý chất lượng.docx',
    fileSizeKB: 31.1,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Ma trận phân định ranh giới trách nhiệm, đầu việc chính và đầu việc phối hợp giữa 4 bộ phận chuyên môn nội bộ phòng QLCL.',
    scope: 'Phân định trách nhiệm giữa Lãnh đạo phòng, Bộ phận QC, Bộ phận QA/QE và Bộ phận KTTĐ.',
    keyContents: [
      'Phân quyền RACI: R (Thực thi), A (Chịu trách nhiệm chính), C (Tham vấn), I (Nhận thông tin)',
      'Ranh giới trách nhiệm giữa QC hiện trường và QA phân tích hệ thống',
      'Điểm giao giữa thẩm định bảo hành KTTĐ và cải tiến chất lượng nhà cung cấp SQE',
      'Quy chế chuyển giao thông tin sự cố giữa các tổ nghiệp vụ'
    ]
  },
  {
    id: 'doc-org-04',
    code: 'KSX-QLCL-04',
    title: 'Ma Trận Phân Nhiệm Theo Từng Vị Trí Chức Danh P-QLCL',
    category: 'ho-so-to-chuc',
    categoryName: 'Hồ sơ Tổ chức & Khung năng lực',
    department: 'Toàn Phòng QLCL',
    fileName: 'KSX- QLCL- Ma trận phân nhiệm vị trí- Phòng Quản lý chất lượng.docx',
    relPath: 'KSX- QLCL- Ma trận phân nhiệm vị trí- Phòng Quản lý chất lượng.docx',
    fileSizeKB: 34.3,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Bảng ma trận gắn kết từng chức danh (Trưởng phòng, Kỹ sư QA, Kỹ sư Thẩm định, Nhân viên IQC/IPQC, KCS OQC) với các quy trình cụ thể.',
    scope: 'Từng cá nhân công tác tại Phòng Quản lý chất lượng.',
    keyContents: [
      'Gắn mã nhân sự và chức danh vào từng bước công việc trong quy trình SOP',
      'Định mức trách nhiệm cá nhân đối với từng chỉ số KPI chất lượng',
      'Quy định người ủy quyền thay thế khi vắng mặt'
    ]
  },
  {
    id: 'doc-org-05',
    code: 'KSX-QLCL-05',
    title: 'Ma Trận Đào Tạo Chức Năng, Nhiệm Vụ & Nghiệp Vụ QLCL',
    category: 'ho-so-to-chuc',
    categoryName: 'Hồ sơ Tổ chức & Khung năng lực',
    department: 'Bộ phận QA/QE',
    fileName: 'KSX- QLCL- Ma trận đào tạo chức năng, nhiệm vụ, nghiệp vụ phong Quản lý chất lượng.docx',
    relPath: 'KSX- QLCL- Ma trận đào tạo chức năng, nhiệm vụ, nghiệp vụ phong Quản lý chất lượng.docx',
    fileSizeKB: 40.1,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Khung năng lực tiêu chuẩn và lộ trình đào tạo huấn luyện nghiệp vụ chuyên sâu cho nhân viên mới và đào tạo định kỳ hàng năm.',
    scope: 'Toàn thể nhân sự phòng QLCL và nhân viên đào tạo hội nhập.',
    keyContents: [
      'Khung năng lực 4 cấp độ: Nhận biết, Hiểu và làm theo, Làm độc lập, Chuyên gia huấn luyện',
      'Chương trình đào tạo đọc bản vẽ kỹ thuật, đo kiểm bằng panme, thước kẹp, đồng hồ so',
      'Khóa huấn luyện phương pháp 7 công cụ QC, 5-Whys và chu trình giải quyết sự cố 8D',
      'Đánh giá sát hạch định kỳ và cấp chứng chỉ thao tác nội bộ'
    ]
  },
  {
    id: 'doc-org-06',
    code: 'MTCV-ALL',
    title: 'Bộ Bản Mô Tả Công Việc Chuẩn Hóa Các Vị Trí P-QLCL',
    category: 'ho-so-to-chuc',
    categoryName: 'Hồ sơ Tổ chức & Khung năng lực',
    department: 'Lãnh đạo Phòng QLCL',
    fileName: 'BỘ BẢN MÔ TẢ CÔNG VIỆC CHUẨN HÓA CÁC VỊ TRÍ PHÒNG QUẢN LÝ CHẤT LƯỢNG (P-QLCL) DKBIKE.docx',
    relPath: 'BỘ BẢN MÔ TẢ CÔNG VIỆC CHUẨN HÓA CÁC VỊ TRÍ PHÒNG QUẢN LÝ CHẤT LƯỢNG (P-QLCL) DKBIKE.docx',
    fileSizeKB: 21.8,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Bản mô tả tổng thể hệ thống chức danh, tiêu chuẩn tuyển dụng, quyền lợi và yêu cầu công việc chi tiết của toàn bộ các vị trí trong phòng.',
    scope: 'Toàn thể các vị trí nhân sự trực thuộc P-QLCL.',
    keyContents: [
      'Mô tả vị trí Trưởng phòng Quản lý chất lượng',
      'Mô tả vị trí Kỹ sư Đảm bảo chất lượng (QA/QE/SQE)',
      'Mô tả vị trí Kỹ sư Thẩm định Kỹ thuật & Đo lường (KTTĐ)',
      'Mô tả vị trí Nhân viên Kiểm soát vật tư đầu vào (IQC)',
      'Mô tả vị trí Nhân viên Tuần tra công đoạn (IPQC)',
      'Mô tả vị trí Nhân viên Nghiệm thu thành phẩm (OQC/KCS)'
    ]
  },

  // ==================== NHÓM 2: HỆ THỐNG QUY TRÌNH CHUẨN (SOP) ====================
  {
    id: 'doc-sop-01',
    code: 'QT-QLCL-01',
    title: 'Quy Trình Kiểm Soát Chất Lượng Vật Tư Đầu Vào, Công Đoạn SX & Thành Phẩm',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Toàn Phòng QLCL',
    fileName: 'QT-QLCL-01- Quy trình kiểm soát chất lượng vật tư đầu vào, công đoạn SX và thành phẩm.docx',
    relPath: 'QUy trình/QT-QLCL-01- Quy trình kiểm soát chất lượng vật tư đầu vào, công đoạn SX và thành phẩm.docx',
    fileSizeKB: 64.9,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy trình xương sống kết nối 3 trạm kiểm soát IQC, IPQC và OQC, quy định lưu đồ kiểm tra, dán tem phân loại và lệnh Stop-Line.',
    scope: 'Nhà máy sản xuất, kho vật tư, xưởng lắp ráp và kho thành phẩm DKBike.',
    keyContents: [
      'Lưu đồ quy trình khép kín từ nhận hàng, kiểm nghiệm, cấp phát, lắp ráp đến xuất xưởng',
      'Nguyên tắc phân loại 3 màu tem: Xanh (Đạt), Vàng (Chờ xử lý / Đặc nhượng), Đỏ (Không đạt)',
      'Điều kiện và thẩm quyền ban hành Lệnh Stop-Line đình chỉ chuyền',
      'Hồ sơ lưu trữ và đối soát số liệu trên phần mềm DK QMS'
    ]
  },
  {
    id: 'doc-sop-02',
    code: 'QT-QLCL-02',
    title: 'Quy Trình Thiết Lập Tiêu Chuẩn QA & Đánh Giá Năng Lực Nhà Cung Cấp (SQE)',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận QA/QE',
    fileName: 'QT-QLCL-02_TieuChuanQA_DanhGiaSQE.docx',
    relPath: 'QUy trình/QT-QLCL-02_TieuChuanQA_DanhGiaSQE.docx',
    fileSizeKB: 80.0,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy chuẩn xây dựng bảng tiêu chuẩn kiểm tra cho từng mã linh kiện và phương pháp chấm điểm năng lực định kỳ Nhà cung cấp theo 4 trụ cột Q-C-D-S.',
    scope: 'Áp dụng cho Bộ phận QA/QE và phòng Mua hàng & Cung ứng DKBike.',
    keyContents: [
      'Phương pháp biên soạn bảng tiêu chuẩn kiểm nghiệm QA cho linh kiện mới (PTSP)',
      'Thang điểm đánh giá 4 trụ cột Q-C-D-S (Chất lượng 40%, Chi phí 20%, Giao hàng 20%, Dịch vụ 20%)',
      'Quy chế phân hạng Nhà cung cấp A, B, C, D và chế tài xử lý khi không đạt',
      'Quy trình đánh giá hiện trường nhà xưởng (Audit NCC)'
    ]
  },
  {
    id: 'doc-sop-03',
    code: 'QT-QLCL-03',
    title: 'Quy Trình Phân Tích Nguyên Nhân Gốc Rễ Lỗi & Cải Tiến Liên Tục (8D / 5-Whys)',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận QA/QE',
    fileName: 'QT-QLCL-03_PhanTichLoi_CaiTien.docx',
    relPath: 'QUy trình/QT-QLCL-03_PhanTichLoi_CaiTien.docx',
    fileSizeKB: 77.1,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy chuẩn phương pháp luận điều tra lỗi hệ thống bằng mô hình 4M1E, phương pháp 5-Whys và quy trình 8 bước giải quyết sự cố triệt để (8D).',
    scope: 'Các sự cố chất lượng lặp lại, lỗi hàng loạt tại sản xuất hoặc phản ánh nguy cơ từ thị trường.',
    keyContents: [
      'Các bước kích hoạt điều tra nguyên nhân gốc rễ (Root Cause Analysis)',
      'Áp dụng biểu đồ xương cá Ishikawa và kỹ thuật đặt câu hỏi 5-Whys',
      'Chu trình 8 bước D0 đến D8 trong xử lý sự cố chất lượng',
      'Theo dõi và đánh giá hiệu lực của hành động khắc phục sau 30-60 ngày'
    ]
  },
  {
    id: 'doc-sop-04',
    code: 'QT-QA-01',
    title: 'Quy Trình Tiêu Chuẩn & Đánh Giá Năng Lực Nhà Cung Cấp (SQE)',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận QA/QE',
    fileName: 'QT-QA-01_TieuChuan_DanhGiaNCC.docx',
    relPath: 'QUy trình/Bộ phận QE&QA/QT-QA-01_TieuChuan_DanhGiaNCC.docx',
    fileSizeKB: 82.6,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy trình chi tiết của kỹ sư SQE khi kiểm định thực tế năng lực nhà máy sản xuất của nhà cung cấp linh kiện xe điện.',
    scope: 'Tất cả các nhà cung cấp linh kiện khung, điện, nhựa, ắc quy cho DKBike.',
    keyContents: [
      'Thủ tục thẩm tra hồ sơ năng lực và chứng chỉ ISO 9001 của nhà cung cấp',
      'Checklist đánh giá thực địa năng lực dây chuyền và thiết bị kiểm tra của NCC',
      'Quy chế ký quỹ chất lượng và cam kết tỷ lệ phế phẩm PPM'
    ]
  },
  {
    id: 'doc-sop-05',
    code: 'QT-QA-02',
    title: 'Quy Trình Phân Tích Lỗi & Phát Hành Phiếu Yêu Cầu Khắc Phục (CAR/PAR)',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận QA/QE',
    fileName: 'QT-QA-02_PhanTichLoi_CAR_PAR.docx',
    relPath: 'QUy trình/Bộ phận QE&QA/QT-QA-02_PhanTichLoi_CAR_PAR.docx',
    fileSizeKB: 69.4,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Trình tự phát hành, theo dõi tiến độ phản hồi và nghiệm thu đóng phiếu CAR/PAR khi phát sinh sai lệch kỹ thuật.',
    scope: 'Áp dụng cho các nhà cung cấp linh kiện và các phân xưởng nội bộ.',
    keyContents: [
      'Quy định thời hạn phản hồi khẩn cấp: Tạm giữ trong 24h, Báo cáo 8D trong 48h-72h',
      'Biểu mẫu CAR/PAR chuẩn và ma trận phê duyệt',
      'Biện pháp chế tài khi nhà cung cấp chậm phản hồi hoặc giải trình không thỏa đáng'
    ]
  },
  {
    id: 'doc-sop-06',
    code: 'QT-QC-01',
    title: 'Quy Trình Thực Thi Kiểm Soát IQC & Giám Sát Tuần Tra IPQC',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'QT-QC-01_ThucThi_IQC_IPQC.docx',
    relPath: 'QUy trình/Bộ phận QC/QT-QC-01_ThucThi_IQC_IPQC.docx',
    fileSizeKB: 69.6,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Hướng dẫn tác nghiệp thực tế từng bước cho nhân viên IQC khi lấy mẫu kiểm tra vật tư và nhân viên IPQC tuần tra từng trạm thao tác.',
    scope: 'Kho linh kiện và chuyền sản xuất lắp ráp xe điện.',
    keyContents: [
      'Hướng dẫn lấy mẫu ngẫu nhiên theo bảng AQL Level II ISO 2859-1',
      'Quy chuẩn kiểm định xe mẫu đầu ca (First-Piece Inspection)',
      'Nhật ký tuần tra trạm thao tác (Patrol Check) tần suất 30-60 phút/lượt',
      'Biên bản thổi còi cảnh báo vi phạm thao tác công đoạn'
    ]
  },
  {
    id: 'doc-sop-07',
    code: 'QT-QC-02',
    title: 'Quy Trình Thực Thi Nghiệm Thu OQC & Phê Duyệt Xuất Xưởng',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'QT-QC-02_ThucThi_OQC_XuatXuong.docx',
    relPath: 'QUy trình/Bộ phận QC/QT-QC-02_ThucThi_OQC_XuatXuong.docx',
    fileSizeKB: 71.8,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy trình kiểm tra 100% xe thành phẩm cuối chuyền, kiểm tra chạy thử đường trường, dán tem KCS và đối khớp hồ sơ số Khung/Máy (VIN).',
    scope: 'Trạm nghiệm thu KCS thành phẩm xuất xưởng DKBike.',
    keyContents: [
      'Danh mục kiểm tra 100% ngoại quan, sơn, tem, khe hở nhựa và độ khít gá lắp',
      'Kiểm tra tính năng vận hành: Phanh, ga, đèn, còi, đồng hồ tốc độ, giảm xóc',
      'Thử đường trường mô phỏng tải trọng và leo dốc',
      'Đối soát số Khung và số Động cơ phục vụ kích hoạt bảo hành điện tử'
    ]
  },
  {
    id: 'doc-sop-08',
    code: 'QT-KTTD-01',
    title: 'Quy Trình Thẩm Định Kỹ Thuật Bảo Hành & Xác Định Nguyên Nhân Sự Cố',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    fileName: 'QT-KTTD-01_ThamDinhKyThuat_BaoHanh.docx',
    relPath: 'QUy trình/Bộ phận Kỹ thuật thẩm định/QT-KTTD-01_ThamDinhKyThuat_BaoHanh.docx',
    fileSizeKB: 65.2,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Phương pháp tiếp nhận mẫu linh kiện hỏng gửi về từ đại lý, tháo dỡ mổ xẻ phân tích nguyên nhân hư hỏng và phân định trách nhiệm chi phí bảo hành.',
    scope: 'Kho bảo hành và trạm giám định kỹ thuật phòng QLCL.',
    keyContents: [
      'Quy trình tiếp nhận và gắn mã định danh linh kiện bảo hành đại lý',
      'Quy chuẩn mổ xẻ bo mạch điều tốc IC, mô tơ động cơ, bộ sạc và ắc quy',
      'Phân định 3 nhóm trách nhiệm: Lỗi NCC, Lỗi Lắp ráp DKBike, Lỗi Khách hàng sử dụng',
      'Biên bản giám định kỹ thuật làm căn cứ thanh quyết toán chi phí với đại lý/NCC'
    ]
  },
  {
    id: 'doc-sop-09',
    code: 'QT-KTTD-02',
    title: 'Quy Trình Thực Thi Sửa Chữa Chuyên Sâu & Quản Lý Hiệu Chuẩn Đo Lường',
    category: 'quy-trinh',
    categoryName: 'Hệ thống Quy trình Chuẩn SOP',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    fileName: 'QT-KTTD-02_ThucThi_SuaChua_DoLuong.docx',
    relPath: 'QUy trình/Bộ phận Kỹ thuật thẩm định/QT-KTTD-02_ThucThi_SuaChua_DoLuong.docx',
    fileSizeKB: 142.4,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy chuẩn kỹ thuật phục hồi sửa chữa mạch chuyên sâu, gia công linh kiện mẫu thử nghiệm và kiểm soát chu kỳ hiệu chuẩn thiết bị đo.',
    scope: 'Phòng thí nghiệm, trạm sửa chữa điện tử và toàn bộ thiết bị đo kiểm nhà máy.',
    keyContents: [
      'Kỹ thuật hàn vi mạch SMD, thay thế Mosfet công suất và kiểm tra sóng xung động cơ',
      'Sổ theo dõi Master Log thiết bị đo: Thước kẹp, súng siết lực, đồng hồ VOM, panme',
      'Quy trình dán tem hiệu chuẩn hợp quy và kế hoạch gửi kiểm định tại Quatest'
    ]
  },

  // ==================== NHÓM 3: MTCV THEO RACI & BIÊN BẢN BÀN GIAO ====================
  {
    id: 'doc-mtcv-01',
    code: 'MTCV-TP',
    title: 'MTCV Theo Chuẩn RACI: Trưởng Phòng Quản Lý Chất Lượng',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Lãnh đạo Phòng QLCL',
    fileName: 'DKBike_MTCV_TruongPhong_QLCL_V5_Fixed.docx',
    relPath: 'MTCV/Theo RACI/DKBike_MTCV_TruongPhong_QLCL_V5_Fixed.docx',
    fileSizeKB: 31.3,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Bản mô tả công việc phân định chi tiết vai trò Accountable (Chịu trách nhiệm tối cao) của Trưởng phòng QLCL đối với toàn bộ chất lượng xe DKBike.',
    scope: 'Vị trí Trưởng phòng Quản lý chất lượng DKBike.',
    keyContents: [
      'Chịu trách nhiệm trực tiếp trước Ban Tổng Giám đốc về chỉ số FPY, tỷ lệ lỗi và sự cố thị trường',
      'Quyền hạn tối cao: Kích hoạt Lệnh Stop-Line, Chủ tịch Hội đồng MRB, Phê duyệt xuất kho',
      'Quản trị mục tiêu KPI và đào tạo phát triển đội ngũ cán bộ QLCL'
    ]
  },
  {
    id: 'doc-mtcv-02',
    code: 'MTCV-QA',
    title: 'MTCV Theo Chuẩn RACI: Kỹ Sư Đảm Bảo Chất Lượng (QA / QE)',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QA/QE',
    fileName: 'DKBike_MTCV_KySu_QA_V1_1_Formal.docx',
    relPath: 'MTCV/Theo RACI/DKBike_MTCV_KySu_QA_V1_1_Formal.docx',
    fileSizeKB: 40.0,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Phân nhiệm vai trò Responsible (Thực thi) trong việc xây dựng tiêu chuẩn, đánh giá năng lực nhà cung cấp và dẫn dắt các dự án cải tiến 8D.',
    scope: 'Vị trí Kỹ sư QA / QE / SQE.',
    keyContents: [
      'Biên soạn và cập nhật bảng tiêu chuẩn kiểm soát kỹ thuật cho sản phẩm mới',
      'Thực hiện audit năng lực nhà xưởng và đánh giá định kỳ nhà cung ứng (SQE)',
      'Phát hành phiếu CAR/PAR và chủ trì phân tích nguyên nhân gốc rễ lỗi 5-Whys'
    ]
  },
  {
    id: 'doc-mtcv-03',
    code: 'MTCV-KTTD',
    title: 'MTCV Theo Chuẩn RACI: Kỹ Sư Thẩm Định Kỹ Thuật (KTTĐ)',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    fileName: 'DKBike_MTCV_KySu_ThamDinh_V1_1_Formal.docx',
    relPath: 'MTCV/Theo RACI/DKBike_MTCV_KySu_ThamDinh_V1_1_Formal.docx',
    fileSizeKB: 40.2,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Quy định trách nhiệm phân tích chuyên sâu lỗi hư hỏng bảo hành, phục hồi linh kiện giá trị cao và kiểm chuẩn thiết bị đo lường toàn nhà máy.',
    scope: 'Vị trí Kỹ sư Thẩm định Kỹ thuật & Đo lường.',
    keyContents: [
      'Tiếp nhận, mổ xẻ phân tích nguyên nhân hỏng hóc linh kiện xe điện',
      'Phân định trách nhiệm bảo hành chính xác giữa NCC, Nhà máy và Khách hàng',
      'Kiểm soát và tổ chức hiệu chuẩn đúng hạn 100% trang thiết bị đo kiểm'
    ]
  },
  {
    id: 'doc-mtcv-04',
    code: 'MTCV-IQC-IPQC',
    title: 'MTCV Theo Chuẩn RACI: Nhân Viên Kiểm Soát IQC & Tuần Tra IPQC',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'DKBike_MTCV_NhanVien_IQC_IPQC_V1_1_Formal.docx',
    relPath: 'MTCV/Theo RACI/DKBike_MTCV_NhanVien_IQC_IPQC_V1_1_Formal.docx',
    fileSizeKB: 39.7,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Trách nhiệm kiểm tra đo đếm vật tư đầu vào theo AQL và tuần tra trực tiếp trên các công đoạn lắp ráp, dán tem phân loại và thổi còi khi phát hiện lỗi.',
    scope: 'Vị trí Nhân viên IQC & Kỹ thuật viên IPQC.',
    keyContents: [
      'Lấy mẫu kiểm tra kích thước, ngoại quan, tính năng theo bảng tiêu chuẩn QA',
      'Dán tem phân loại Xanh, Vàng, Đỏ và cách ly ngay lô hàng lỗi',
      'Kiểm định xe mẫu đầu ca và tuần tra giám sát công nhân thao tác trên chuyền'
    ]
  },
  {
    id: 'doc-mtcv-05',
    code: 'MTCV-OQC',
    title: 'MTCV Theo Chuẩn RACI: Nhân Viên Nghiệm Thu Thành Phẩm (OQC / KCS)',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'DKBike_MTCV_NhanVien_OQC_V1_1_Formal.docx',
    relPath: 'MTCV/Theo RACI/DKBike_MTCV_NhanVien_OQC_V1_1_Formal.docx',
    fileSizeKB: 39.8,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Trách nhiệm chốt chặn cuối cùng kiểm tra 100% xe xuất xưởng, chạy thử đường trường, dán tem KCS và đối soát tính chính xác của số Khung/Máy.',
    scope: 'Vị trí Nhân viên KCS / OQC thành phẩm.',
    keyContents: [
      'Nghiệm thu 100% ngoại quan, tính năng điện, phanh, giảm xóc của xe thành phẩm',
      'Chạy thử đường trường mô phỏng điều kiện thực tế',
      'Dán tem KCS xuất xưởng và xác thực khớp đúng số Khung (VIN) và số Động cơ'
    ]
  },
  {
    id: 'doc-bg-01',
    code: 'BG-NV-01',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Nguyễn Thao (Trưởng Phòng QLCL)',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Lãnh đạo Phòng QLCL',
    fileName: 'Nguyễn Thao_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Nguyễn Thao_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 30.2,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Hồ sơ pháp lý giao nhận quyền hạn, chỉ tiêu KPI, danh mục tài liệu và trang thiết bị bàn giao cho vị trí Trưởng phòng Quản lý chất lượng.',
    scope: 'Nhân sự: Nguyễn Thao - Trưởng phòng QLCL DKBike.',
    keyContents: [
      'Bàn giao toàn diện hệ thống quản lý chất lượng và quyền ra quyết định Stop-Line',
      'Cam kết chỉ tiêu tỷ lệ xuất xưởng FPY và tỷ lệ lỗi thị trường năm 2026',
      'Danh mục hồ sơ tài liệu ISO 9001 và con dấu kiểm tra chất lượng'
    ]
  },
  {
    id: 'doc-bg-02',
    code: 'BG-NV-02',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Trần Thế Quang',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'Tran_The_Quang_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Tran_The_Quang_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 30.5,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biên bản bàn giao công việc phụ trách giám sát kiểm tra chất lượng hiện trường và nghiệm thu công đoạn lắp ráp.',
    scope: 'Nhân sự: Trần Thế Quang.',
    keyContents: ['Bàn giao khu vực kiểm soát công đoạn chuyền lắp ráp và danh mục dụng cụ đo']
  },
  {
    id: 'doc-bg-03',
    code: 'BG-NV-03',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Nguyễn Văn Điểm',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'Nguyen_Van_Diem_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Nguyen_Van_Diem_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 29.9,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biên bản bàn giao công việc phụ trách kiểm soát chất lượng linh kiện vật tư đầu vào (IQC).',
    scope: 'Nhân sự: Nguyễn Văn Điểm.',
    keyContents: ['Bàn giao hồ sơ tiếp nhận linh kiện, tiêu chuẩn kiểm tra vật tư và khu vực cách ly phế phẩm']
  },
  {
    id: 'doc-bg-04',
    code: 'BG-NV-04',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Hoàng Văn Phan',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    fileName: 'Hoang_Van_Phan_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Hoang_Van_Phan_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 29.8,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biên bản bàn giao công tác thẩm định kỹ thuật, mổ xẻ linh kiện bảo hành và theo dõi hiệu chuẩn trang thiết bị.',
    scope: 'Nhân sự: Hoàng Văn Phan.',
    keyContents: ['Bàn giao kho mẫu bảo hành, dụng cụ phân tích bo mạch IC và sổ cái theo dõi hiệu chuẩn']
  },
  {
    id: 'doc-bg-05',
    code: 'BG-NV-05',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Hà Khắc Việt',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'Ha_Khac_Viet_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Ha_Khac_Viet_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 30.2,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biên bản bàn giao nhiệm vụ kiểm tra chất lượng xe thành phẩm (OQC/KCS) và thủ tục bàn giao sang kho thành phẩm.',
    scope: 'Nhân sự: Hà Khắc Việt.',
    keyContents: ['Bàn giao trạm chạy thử đường trường, tem kiểm định KCS và sổ ghi nhận số Khung/Máy']
  },
  {
    id: 'doc-bg-06',
    code: 'BG-NV-06',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Lãnh Xuân Hải',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QC Hiện trường',
    fileName: 'Lanh_Xuan_Hai_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Lanh_Xuan_Hai_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 29.6,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biên bản bàn giao nhiệm vụ kiểm soát chất lượng linh kiện và tuần tra giám sát công đoạn lắp ráp.',
    scope: 'Nhân sự: Lãnh Xuân Hải.',
    keyContents: ['Bàn giao checklist tuần tra IPQC và dưỡng gá mẫu kiểm tra']
  },
  {
    id: 'doc-bg-07',
    code: 'BG-NV-07',
    title: 'Biên Bản Bàn Giao Nhiệm Vụ: Liễu Tùng Lâm',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Bộ phận QA/QE',
    fileName: 'Lieu_Tung_Lam_Ban_Giao_Nhiem_Vu.docx',
    relPath: 'MTCV/Lieu_Tung_Lam_Ban_Giao_Nhiem_Vu.docx',
    fileSizeKB: 29.9,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biên bản bàn giao công tác đảm bảo chất lượng, đánh giá định kỳ nhà cung cấp và theo dõi hồ sơ cải tiến CAR/PAR.',
    scope: 'Nhân sự: Liễu Tùng Lâm.',
    keyContents: ['Bàn giao danh sách theo dõi nhà cung cấp SQE và hệ thống hồ sơ CAR/PAR']
  },
  {
    id: 'doc-bg-08',
    code: 'MTCV-REF',
    title: 'Bảng Tra Cứu Chức Năng Nhiệm Vụ Phân Định Nội Bộ',
    category: 'mtcv-ban-giao',
    categoryName: 'MTCV & Biên bản Bàn giao Nhân sự',
    department: 'Toàn Phòng QLCL',
    fileName: 'Bảng tra cứu chức năng nhiệm vụ.docx',
    relPath: 'MTCV/Bảng tra cứu chức năng nhiệm vụ.docx',
    fileSizeKB: 31.0,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Bảng tra cứu nhanh ma trận trách nhiệm, nhiệm vụ thường trực và luồng phối hợp công việc giữa các nhân sự.',
    scope: 'Toàn thể nhân sự phòng QLCL.',
    keyContents: ['Bảng ma trận tra cứu nhanh công việc - người phụ trách - người phê duyệt']
  },

  // ==================== NHÓM 4: BỘ BIỂU MẪU GỐC WORD ====================
  {
    id: 'doc-bm-01',
    code: 'BM-MASTER',
    title: 'Bộ Biểu Mẫu Chuẩn Quản Lý Chất Lượng DKBike (Phiên Bản V4)',
    category: 'bieu-mau-goc',
    categoryName: 'Bộ Biểu mẫu Gốc Word',
    department: 'Toàn Phòng QLCL',
    fileName: 'Bo_Bieu_Mau_Chuan_Quan_Ly_Chat_Luong_DKBike_v4.docx',
    relPath: 'Bo_Bieu_Mau_Chuan_Quan_Ly_Chat_Luong_DKBike_v4.docx',
    fileSizeKB: 47.8,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Tập tin tài liệu Word (.docx) tổng hợp toàn bộ 10 biểu mẫu chuẩn hóa ISO 9001:2015 của DKBike, dùng để lưu trữ và in ấn theo văn bản gốc.',
    scope: 'Toàn thể các phân hệ và trạm kiểm soát của nhà máy.',
    keyContents: [
      'Trọn bộ 10 biểu mẫu từ BM-QLCL-01 đến BM-KTTD-02',
      'Định dạng chuẩn văn bản Microsoft Word có sẵn bảng biểu và ký duyệt RACI'
    ]
  },
  {
    id: 'doc-bm-02',
    code: 'BM-KTTD-01-DOC',
    title: 'Biểu Mẫu BM-KTTD-01: Biên Bản Giám Định Kỹ Thuật & Bảo Hành (File Word Gốc)',
    category: 'bieu-mau-goc',
    categoryName: 'Bộ Biểu mẫu Gốc Word',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    fileName: 'BM-KTTD-01.docx',
    relPath: 'QUy trình/Biểu mẫu/BM-KTTD-01.docx',
    fileSizeKB: 17.3,
    fileExt: 'docx',
    updatedDate: '11/2026',
    summary: 'Biểu mẫu Word chuyên biệt dùng cho việc lập biên bản giám định linh kiện xe điện bảo hành gửi về từ đại lý.',
    scope: 'Kho bảo hành và kỹ sư thẩm định.',
    keyContents: [
      'Mẫu biên bản độc lập chuyên dụng cho BP Kỹ thuật Thẩm định'
    ]
  }
];
