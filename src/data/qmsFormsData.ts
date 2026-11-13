// =========================================================================
// DANH MỤC BỘ BIỂU MẪU CHUẨN QUẢN LÝ CHẤT LƯỢNG (DK QMS FORMS)
// CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)
// =========================================================================

export interface QmsFormTableHeaderGroup {
  label: string;
  colSpan: number;
  rowSpan?: number;
}

export interface QmsFormTemplate {
  id: string;
  code: string;         // Mã BM, ví dụ: BM-QLCL-01
  procedureCode: string;// Mã QT, ví dụ: QT-QLCL-01
  title: string;        // Tên biểu mẫu
  subtitle?: string;    // Phụ đề
  department: 'Lãnh đạo Phòng QLCL' | 'Bộ phận QC Hiện trường' | 'Bộ phận QA/QE' | 'Bộ phận Kỹ thuật Thẩm định';
  revision: string;     // Lần BH: 01
  effectiveDate: string;// Ngày HL: 01/11/2026
  orientation?: 'portrait' | 'landscape';
  scope: string;        // Phạm vi áp dụng
  purpose: string;      // Mục đích sử dụng
  signRoles: { role: string; type: string; title: string }[];
  fields: { label: string; placeholder?: string; type?: string }[];
  preTableNote?: { title: string; content: string };
  tables: {
    title: string;
    headerGroups?: QmsFormTableHeaderGroup[];
    headers: string[];
    rows: (string | number)[][];
    notes?: string;
  }[];
  conclusions?: { label: string; content?: string }[];
}

export const QMS_FORM_TEMPLATES: QmsFormTemplate[] = [
  {
    id: 'bm-qlcl-01',
    code: 'BM-QLCL-01',
    procedureCode: 'QT-QLCL-01',
    title: 'LỆNH ĐÌNH CHỈ SẢN XUẤT KHẨN CẤP (STOP-LINE)',
    subtitle: 'Lệnh quyền hạn của Trưởng phòng QLCL khoanh vùng sự cố nghiêm trọng',
    department: 'Lãnh đạo Phòng QLCL',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Toàn bộ dây chuyền sản xuất, lắp ráp xe điện và gia công khung sườn',
    purpose: 'Kích hoạt đình chỉ khẩn cấp dây chuyền khi phát hiện rủi ro lỗi hệ thống, lỗi hàng loạt hoặc lỗi an toàn nghiêm trọng.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Nhân viên IPQC / QC hiện trường' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Quản đốc Xưởng Lắp ráp' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Trưởng phòng QLCL' }
    ],
    fields: [
      { label: 'Mã sự cố / Số Lệnh' },
      { label: 'Thời gian phát hiện' },
      { label: 'Dây chuyền / Trạm dừng' },
      { label: 'Người phát hiện (QC/IPQC)' },
      { label: 'Mã sản phẩm / Lô xe ảnh hưởng' },
      { label: 'Quản đốc xưởng phụ trách' }
    ],
    tables: [
      {
        title: 'I. NỘI DUNG RỦI RO LỖI HỆ THỐNG PHÁT HIỆN',
        headers: ['STT', 'Hạng mục / Trạm phát hiện', 'Mô tả chi tiết sự cố / Sai lệch SOP', 'Mức độ rủi ro', 'Hành động khẩn cấp lập tức'],
        rows: [
          ['1', '................................................', '................................................................................', '□ Critical\n□ Major\n□ Minor', '................................................'],
          ['2', '................................................', '................................................................................', '□ Critical\n□ Major\n□ Minor', '................................................'],
          ['3', '................................................', '................................................................................', '□ Critical\n□ Major\n□ Minor', '................................................'],
          ['4', '................................................', '................................................................................', '□ Critical\n□ Major\n□ Minor', '................................................']
        ]
      }
    ],
    conclusions: [
      { label: 'Thời gian tạm dừng dây chuyền', content: 'Từ: ................................................ Đến: ................................................' },
      { label: 'Dự kiến thời gian khắc phục', content: 'Khoảng .................... giờ (Dự kiến hoàn tất: ................................................)' },
      { label: 'Biện pháp khoanh vùng cách ly', content: '................................................................................................................................................' },
      { label: 'Triệu tập Hội đồng MRB', content: '□ Có triệu tập Hội đồng khẩn cấp\n□ Không cần triệu tập (Xử lý trực tiếp tại xưởng)' }
    ]
  },
  {
    id: 'bm-qc-01',
    code: 'BM-QC-01',
    procedureCode: 'QT-QC-01',
    title: 'PHIẾU KIỂM TRA CHẤT LƯỢNG VẬT TƯ ĐẦU VÀO (IQC)',
    subtitle: 'Nghiệm thu kiểm soát kỹ thuật và ngoại quan linh kiện đầu vào theo AQL ISO 2859-1',
    department: 'Bộ phận QC Hiện trường',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Kho tiếp nhận linh kiện, vật tư phục vụ lắp ráp xe điện',
    purpose: 'Đo kiểm thông số kích thước, tính năng và ngoại quan của linh kiện từ nhà cung cấp trước khi nhập kho.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Nhân viên kiểm tra IQC' },
      { role: 'Xác nhận [C]', type: 'C', title: 'Kỹ sư QA / SQE' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Tổ trưởng QC / TP QLCL' }
    ],
    fields: [
      { label: 'Tên Nhà cung cấp' },
      { label: 'Tên linh kiện / Vật tư' },
      { label: 'Mã linh kiện (ERP/Ecount)' },
      { label: 'Số Lô / Số Invoice' },
      { label: 'Tổng số lượng giao (N)' },
      { label: 'Số lượng lấy mẫu (n - AQL)' }
    ],
    tables: [
      {
        title: 'I. KẾT QUẢ ĐO KIỂM THỰC TẾ THEO TIÊU CHUẨN QA',
        headers: ['STT', 'Hạng mục kiểm tra', 'Tiêu chuẩn kỹ thuật (QA)', 'Dụng cụ đo', 'Kết quả đo thực tế', 'Đánh giá'],
        rows: [
          ['1', 'Kích thước / Dung sai lắp ráp', 'Bản vẽ kỹ thuật: ±0.05 mm', '........................', '....................................', '□ Đạt\n□ Không đạt'],
          ['2', 'Ngoại quan / Bề mặt sơn / Xi mạ', 'Không xước, đều màu, không rộp', 'Bàn kiểm quang học', '....................................', '□ Đạt\n□ Không đạt'],
          ['3', 'Tính năng điện / Cơ lý', 'Điện áp, dòng tải đúng thông số', 'Đồng hồ VOM/Tải giả', '....................................', '□ Đạt\n□ Không đạt'],
          ['4', 'Lắp ráp thử nghiệm (Trial)', 'Khớp 100% mẫu đối chứng R&D', 'Dưỡng mẫu chuẩn', '....................................', '□ Đạt\n□ Không đạt'],
          ['5', 'Quy cách đóng gói & Tem nhãn', 'Đầy đủ tem nhãn và truy xuất', 'Quan sát thực tế', '....................................', '□ Đạt\n□ Không đạt']
        ]
      }
    ],
    conclusions: [
      { label: 'Tỉ lệ lỗi phát hiện (Defect Rate)', content: 'Số lỗi phát hiện: ............ chi tiết (Tỉ lệ lỗi: ............ %)' },
      { label: 'Kết luận phân loại lô hàng', content: '□ ĐẠT TIÊU CHUẨN (Cho phép nhập kho - Dán tem xanh Pass)\n□ CHỜ XỬ LÝ (Tạm giữ cách ly - Dán tem vàng Hold)\n□ KHÔNG ĐẠT (Từ chối nhập kho - Dán tem đỏ Reject)' },
      { label: 'Ý kiến đề xuất xử lý', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-qc-02',
    code: 'BM-QC-02',
    procedureCode: 'QT-QC-01',
    title: 'BIÊN BẢN HỌP HỘI ĐỒNG XỬ LÝ VẬT TƯ KHÔNG PHÙ HỢP (MRB)',
    subtitle: 'Hội đồng phán quyết đa phòng ban xử lý vật tư, bán thành phẩm lỗi',
    department: 'Bộ phận QC Hiện trường',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Vật tư đầu vào IQC bị lỗi, bán thành phẩm IPQC hỏng hoặc phế phẩm cần xử lý',
    purpose: 'Thành lập hội đồng đa phòng ban (QLCL, Sản xuất, Mua hàng, R&D) để đưa ra phán quyết xử lý lô hàng lỗi.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Thư ký Hội đồng MRB (QC)' },
      { role: 'Xác nhận [C]', type: 'C', title: 'Đại diện Sản xuất & Mua hàng' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Chủ tịch Hội đồng MRB (TP QLCL)' }
    ],
    fields: [
      { label: 'Mã biên bản MRB' },
      { label: 'Ngày họp Hội đồng' },
      { label: 'Tên Linh kiện & Nhà cung cấp' },
      { label: 'Số lượng lô lỗi (NG)' },
      { label: 'Mã phiếu IQC/IPQC phát hiện' },
      { label: 'Chủ trì cuộc họp' }
    ],
    tables: [
      {
        title: 'I. Ý KIẾN ĐÁNH GIÁ CHUYÊN MÔN CỦA CÁC BỘ PHẬN THAM GIA',
        headers: ['STT', 'Bộ phận tham gia', 'Ý kiến đánh giá chuyên môn & Phân tích rủi ro', 'Ký xác nhận'],
        rows: [
          ['1', 'Phòng Quản lý chất lượng (QLCL)', '........................................................................................................................', '....................'],
          ['2', 'Phòng Sản xuất (Xưởng lắp ráp)', '........................................................................................................................', '....................'],
          ['3', 'Phòng Mua hàng & Cung ứng', '........................................................................................................................', '....................'],
          ['4', 'Phòng Kỹ thuật & R&D', '........................................................................................................................', '....................']
        ]
      }
    ],
    conclusions: [
      { label: 'Quyết định cuối cùng của Hội đồng MRB', content: '□ TRẢ LẠI NHÀ CUNG CẤP (RTV - Return to Vendor)\n□ SỬA CHỮA / TÁI CHẾ ĐỂ DÙNG (Rework)\n□ SỬ DỤNG CÓ ĐIỀU KIỆN / ĐẶC NHƯỢNG (UAI - Use As Is)\n□ HỦY BỎ / TIÊU HỦY PHẾ PHẨM (Scrap)' },
      { label: 'Phân công trách nhiệm & Thời hạn', content: 'Đơn vị thực hiện: ................................................ Người giám sát: ................................................ Thời hạn: ................................................' },
      { label: 'Ghi chú bổ sung', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-qc-03',
    code: 'BM-QC-03',
    procedureCode: 'QT-QC-01',
    title: 'BIÊN BẢN KIỂM ĐỊNH SẢN PHẨM ĐẦU CHUYỀN (FIRST-PIECE)',
    subtitle: 'Nghiệm thu toàn diện chiếc xe đầu tiên của ca làm việc / lệnh sản xuất mới',
    department: 'Bộ phận QC Hiện trường',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Đầu mỗi ca làm việc, đầu mỗi Lệnh sản xuất (LSX) hoặc khi chuyển đổi Model xe',
    purpose: 'Xác nhận toàn bộ điều kiện gá dưỡng, thông số súng siết lực và thao tác công nhân trước khi cho phép chạy sản xuất hàng loạt.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Kỹ thuật viên IPQC' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Tổ trưởng Chuyền Lắp ráp' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Tổ trưởng QC / Quản đốc Xưởng' }
    ],
    fields: [
      { label: 'Mã Lệnh Sản Xuất (LSX / WO)' },
      { label: 'Tên Dòng xe / Model' },
      { label: 'Dây chuyền lắp ráp' },
      { label: 'Số Khung xe mẫu (VIN)' },
      { label: 'Số Động cơ xe mẫu' },
      { label: 'Thời gian hoàn thành kiểm tra' }
    ],
    tables: [
      {
        title: 'I. DANH MỤC KIỂM SOÁT XE MẪU ĐẦU CHUYỀN (FIRST-PIECE CHECKLIST)',
        headers: ['STT', 'Hạng mục kiểm soát', 'Thông số tiêu chuẩn (SOP/Bản vẽ)', 'Kết quả kiểm tra thực tế', 'Đánh giá'],
        rows: [
          ['1', 'Lực siết trục bánh trước & sau', 'Trước: 45-55 Nm | Sau: 75-85 Nm', '................................................', '□ Đạt\n□ Không đạt'],
          ['2', 'Cân vành & Độ đảo lốp', 'Độ đảo hướng kính < 1.0 mm', '................................................', '□ Đạt\n□ Không đạt'],
          ['3', 'Hệ thống phanh cơ / đĩa', 'Hành trình tay phanh: 15 - 25 mm', '................................................', '□ Đạt\n□ Không đạt'],
          ['4', 'Hệ thống điện & Chiếu sáng', 'Đèn pha, xi nhan, còi, đồng hồ chuẩn', '................................................', '□ Đạt\n□ Không đạt'],
          ['5', 'Góc lái & Cổ phốt', 'Xoay nhẹ nhàng, không rơ lỏng', '................................................', '□ Đạt\n□ Không đạt']
        ]
      }
    ],
    conclusions: [
      { label: 'Kết luận xe mẫu đầu chuyền', content: '□ ĐẠT TIÊU CHUẨN - CHO PHÉP BẤM MÁY CHẠY SẢN XUẤT HÀNG LOẠT\n□ KHÔNG ĐẠT - YÊU CẦU CĂN CHỈNH LẠI GÁ DƯỠNG VÀ LÀM LẠI XE MẪU' },
      { label: 'Ghi chú & Lưu ý cho ca sản xuất', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-qc-04',
    code: 'BM-QC-04',
    procedureCode: 'QT-QC-01',
    title: 'SỔ NHẬT KÝ TUẦN TRA IPQC & BIÊN BẢN THỔI CÒI CÔNG ĐOẠN',
    subtitle: 'Nhật trình giám sát hiện trường từng trạm lắp ráp và cảnh báo sai lệch SOP',
    department: 'Bộ phận QC Hiện trường',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Các trạm lắp ráp trên toàn dây chuyền sản xuất xe điện',
    purpose: 'Ghi nhận tần suất tuần tra 30-60 phút/lần tại các trạm công đoạn, kịp thời thổi còi ngăn ngừa lỗi hàng loạt.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Nhân viên tuần tra IPQC' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Công nhân / Tổ trưởng trạm thao tác' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Tổ trưởng QC Hiện trường' }
    ],
    fields: [
      { label: 'Ngày tuần tra' },
      { label: 'Ca làm việc (Sáng / Chiều)' },
      { label: 'Nhân viên IPQC ca trực' },
      { label: 'Dây chuyền giám sát' }
    ],
    tables: [
      {
        title: 'I. NHẬT KÝ GIÁM SÁT TUẦN TRA CÁC TRẠM LẮP RÁP (PATROL LOG)',
        headers: ['Khung giờ', 'Trạm / Công đoạn', 'Hạng mục kiểm tra', 'SL kiểm', 'Lỗi (NG)', 'Ghi chú & Hành động khắc phục tức thời'],
        rows: [
          ['..........', '................................', '................................', '..........', '..........', '................................................'],
          ['..........', '................................', '................................', '..........', '..........', '................................................'],
          ['..........', '................................', '................................', '..........', '..........', '................................................'],
          ['..........', '................................', '................................', '..........', '..........', '................................................'],
          ['..........', '................................', '................................', '..........', '..........', '................................................']
        ]
      }
    ],
    conclusions: [
      { label: 'Tổng kết ca tuần tra', content: 'Tổng số lượt kiểm tra: ............ trạm | Tổng lỗi phát hiện: ............ lỗi | Đã khắc phục tại chỗ: ............ lỗi' },
      { label: 'Đánh giá mức độ tuân thủ SOP', content: '□ TỐT (Tuân thủ 100% SOP & thông số)\n□ CẦN CHẤN CHỈNH (Có sai lệch nhỏ nhưng đã xử lý)\n□ KHÔNG ĐẠT (Phát hiện lỗi nghiêm trọng, lập biên bản)' }
    ]
  },
  {
    id: 'bm-qc-05',
    code: 'BM-QC-05',
    procedureCode: 'QT-QC-02',
    title: 'PHIẾU KIỂM TRA THÀNH PHẨM (OQC) & TRUY XUẤT SỐ KHUNG/MÁY',
    subtitle: 'Nghiệm thu 100% xe thành phẩm cuối chuyền và đối khớp hồ sơ nguồn gốc số khung (VIN)',
    department: 'Bộ phận QC Hiện trường',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Trạm KCS thành phẩm xuất xưởng DKBike',
    purpose: 'Nghiệm thu toàn diện 100% xe thành phẩm, thử đường trường, dán tem KCS và lập hồ sơ dữ liệu đối khớp số Khung/Máy phục vụ bảo hành.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'KCS Kiểm tra thành phẩm OQC' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Thủ kho Thành phẩm DKBike' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Tổ trưởng QC / TP QLCL' }
    ],
    fields: [
      { label: 'Ngày kiểm tra OQC' },
      { label: 'Mã Lệnh Sản Xuất (LSX / WO)' },
      { label: 'Tên Dòng xe / Model' },
      { label: 'Số lượng nghiệm thu ca này' },
      { label: 'Kỹ thuật viên KCS chính' }
    ],
    tables: [
      {
        title: 'I. BẢNG NGHIỆM THU XE THÀNH PHẨM TRƯỚC XUẤT XƯỞNG',
        headers: ['STT', 'Số Khung (VIN)', 'Số Động cơ / Máy', 'Ngoại quan', 'Chạy thử đường', 'Tem KCS', 'Kết quả'],
        rows: [
          ['1', '................................', '................................', '□ Đạt\n□ Lỗi', '□ Đạt\n□ Lỗi', '□ Đã dán', '□ ĐẠT\n□ LỖI'],
          ['2', '................................', '................................', '□ Đạt\n□ Lỗi', '□ Đạt\n□ Lỗi', '□ Đã dán', '□ ĐẠT\n□ LỖI'],
          ['3', '................................', '................................', '□ Đạt\n□ Lỗi', '□ Đạt\n□ Lỗi', '□ Đã dán', '□ ĐẠT\n□ LỖI'],
          ['4', '................................', '................................', '□ Đạt\n□ Lỗi', '□ Đạt\n□ Lỗi', '□ Đã dán', '□ ĐẠT\n□ LỖI'],
          ['5', '................................', '................................', '□ Đạt\n□ Lỗi', '□ Đạt\n□ Lỗi', '□ Đã dán', '□ ĐẠT\n□ LỖI']
        ]
      }
    ],
    conclusions: [
      { label: 'Tổng số xe nghiệm thu', content: 'Tổng kiểm tra: .......... xe | Đạt xuất xưởng: .......... xe | Lỗi cần sửa: .......... xe | Tỉ lệ đạt FPY: .......... %' },
      { label: 'Chứng thực xuất xưởng', content: '□ ĐỦ ĐIỀU KIỆN NHẬP KHO THÀNH PHẨM & XUẤT XƯỞNG CHO ĐẠI LÝ\n□ CHƯA ĐỦ ĐIỀU KIỆN - CÁCH LY CHỜ XỬ LÝ LỖI' },
      { label: 'Ghi chú bàn giao', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-qc-06',
    code: 'BM-QC-06',
    procedureCode: 'QT-QC-02',
    title: 'BIÊN BẢN KIỂM TRA CHẤT LƯỢNG XE THÀNH PHẨM TRƯỚC KHI XUẤT XƯỞNG',
    subtitle: 'Áp dụng kiểm tra độc lập từng xe khi xuất kho giao Đại lý; lắp Pin rời chuyên dụng của QC để thử điện. Đánh dấu [✓] Đạt, [✗] Lỗi. Lưu hồ sơ 03 năm',
    department: 'Bộ phận QC Hiện trường',
    revision: '01',
    effectiveDate: '13/11/2026',
    orientation: 'portrait',
    scope: 'Kiểm tra xe thành phẩm tại kho trước khi đóng lên xe tải vận chuyển giao cho Đại lý / Khách hàng',
    purpose: 'Kiểm tra độc lập từng xe trước khi đóng lên xe hàng giao cho khách hàng: định danh Model/Số Seri, soi ngoại quan sơn nhựa, lắp pin rời QC thử điện, rà soát lỗi phản ánh KH, vệ sinh và phụ kiện kèm theo.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'NV QC kiểm tra xuất xưởng' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Thủ kho Thành phẩm' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Tổ trưởng QC / TP QLCL' }
    ],
    fields: [
      { label: 'Ngày xuất hàng', placeholder: '....../....../202...' },
      { label: 'Giờ kiểm', placeholder: '......h......' },
      { label: 'Tên Đại lý / Khách hàng' },
      { label: 'Tổng số xe xuất (chiếc)' },
      { label: 'NV QC kiểm tra' },
      { label: 'Biển số xe tải vận chuyển' },
      { label: 'Thủ kho Thành phẩm' }
    ],
    preTableNote: {
      title: 'CÁC LỖI TRỌNG TÂM TỪNG PHÁT SINH PHẢN ÁNH TỪ ĐẠI LÝ/ KHÁCH HÀNG CẦN KIỂM TRA KỸ TRÊN ĐƠN HÀNG NÀY (Ghi trước khi kiểm):',
      content: '1) ....................................................   2) ....................................................   3) ....................................................'
    },
    tables: [
      {
        title: 'I. BẢNG KIỂM TRA ĐỘC LẬP TỪNG XE THÀNH PHẨM TRƯỚC KHI ĐÓNG LÊN XE HÀNG',
        headerGroups: [
          { label: 'STT', colSpan: 1, rowSpan: 2 },
          { label: 'I. ĐỊNH DANH XE XUẤT KHO\n(Ghi rõ Model, Màu & số seri)', colSpan: 2 },
          { label: 'II. KIỂM TRA NGOẠI QUAN CHUYÊN SÂU\n(Soi bề mặt sơn, nhựa & độ khít lắp ghép)', colSpan: 2 },
          { label: 'III. THỬ ĐIỆN (LẮP PIN RỜI QC)\n& RÀ SOÁT LỖI PHẢN ÁNH KH', colSpan: 2 },
          { label: 'IV. VỆ SINH XE &\nPHỤ KIỆN ĐI KÈM', colSpan: 2 },
          { label: 'V. KẾT LUẬN & LƯU VẾT XỬ LÝ\n(Ký xác nhận sửa lỗi / đổi xe)', colSpan: 2 }
        ],
        headers: [
          'STT',
          'Dòng xe (Model) & Màu sắc',
          'Số Seri',
          '1. Sơn & Nhựa',
          '2. Độ khít nhựa',
          '3. Tính năng Điện',
          '4. Lỗi phản ánh KH',
          '5. Vệ sinh xe',
          '6. Phụ kiện kèm',
          'KẾT LUẬN XUẤT KHO\n(✓ Cho xuất / ✗ Giữ/Đổi)',
          'MÔ TẢ LỖI PHÁT HIỆN & CHỮ KÝ XÁC NHẬN ĐÃ XỬ LÝ'
        ],
        rows: Array.from({ length: 15 }, (_, idx) => [
          String(idx + 1),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ])
      }
    ],
    conclusions: [
      { label: 'Tổng hợp kết quả xuất kho giao hàng', content: 'Tổng số xe kiểm: .......... chiếc | Cho xuất: .......... chiếc | Giữ / Đổi xe: .......... chiếc' },
      { label: 'Ghi chú bàn giao vận chuyển', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-qa-01',
    code: 'BM-QA-01',
    procedureCode: 'QT-QA-01',
    title: 'BẢNG ĐÁNH GIÁ NĂNG LỰC NHÀ CUNG CẤP ĐỊNH KỲ (SQE)',
    subtitle: 'Thẩm định và chấm điểm năng lực Nhà cung ứng theo 4 trụ cột Q-C-D-S chuẩn ISO 9001',
    department: 'Bộ phận QA/QE',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Tất cả các Nhà cung cấp linh kiện khung, điện, nhựa, ắc quy cho DKBike',
    purpose: 'Chấm điểm định kỳ hàng quý hoặc đột xuất để xếp hạng (A, B, C, D) và làm căn cứ giao chỉ tiêu mua hàng.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Kỹ sư Đảm bảo chất lượng NCC (SQE)' },
      { role: 'Xác nhận [C]', type: 'C', title: 'Trưởng bộ phận Mua hàng' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Trưởng phòng QLCL' }
    ],
    fields: [
      { label: 'Tên Nhà cung cấp' },
      { label: 'Mã Nhà cung cấp' },
      { label: 'Nhóm linh kiện cung ứng' },
      { label: 'Năm / Quý đánh giá' },
      { label: 'Kỹ sư SQE phụ trách' }
    ],
    tables: [
      {
        title: 'I. BẢNG CHẤM ĐIỂM 4 TRỤ CỘT ĐÁNH GIÁ (Q-C-D-S)',
        headers: ['Trụ cột', 'Tỷ trọng', 'Tiêu chí chấm điểm chi tiết', 'Điểm chuẩn', 'Điểm đạt', 'Đánh giá'],
        rows: [
          ['Quality (Chất lượng)', '40%', 'Tỷ lệ lô hàng đạt IQC (>98%), không phát sinh lỗi an toàn', '40 điểm', '...... / 40', '........................'],
          ['Cost (Chi phí & Bù lỗi)', '20%', 'Mức độ hợp tác bù linh kiện lỗi bảo hành và chi phí công', '20 điểm', '...... / 20', '........................'],
          ['Delivery (Giao hàng)', '20%', 'Giao hàng đúng hẹn, đủ số lượng, bao gói đúng quy cách', '20 điểm', '...... / 20', '........................'],
          ['Service (Dịch vụ & Cải tiến)', '20%', 'Phản hồi CAR/PAR nhanh (<48h), hỗ trợ kỹ thuật hiện trường', '20 điểm', '...... / 20', '........................']
        ]
      }
    ],
    conclusions: [
      { label: 'Tổng điểm đánh giá thực tế', content: 'Tổng cộng: ............ / 100 điểm' },
      { label: 'Xếp loại Nhà cung cấp', content: '□ HẠNG A (Từ 90 - 100 điểm: Nhà cung cấp Chiến lược - Ưu tiên tăng sản lượng)\n□ HẠNG B (Từ 75 - 89 điểm: Đạt chuẩn - Tiếp tục duy trì đơn hàng)\n□ HẠNG C (Từ 60 - 74 điểm: Cần giám sát chặt chẽ - Yêu cầu lập kế hoạch cải tiến)\n□ HẠNG D (Dưới 60 điểm: Không đạt - Tạm đình chỉ hoặc cắt mã cung ứng)' },
      { label: 'Yêu cầu hành động đối với NCC', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-qa-03',
    code: 'BM-QA-03',
    procedureCode: 'QT-QA-02',
    title: 'PHIẾU YÊU CẦU HÀNH ĐỘNG KHẮC PHỤC / PHÒNG NGỪA (CAR/PAR)',
    subtitle: 'Văn bản kiểm soát nguyên nhân gốc rễ và giám sát lộ trình cải tiến theo chu trình 8D / 5-Whys',
    department: 'Bộ phận QA/QE',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Các sự cố chất lượng lặp lại, lỗi hàng loạt tại IQC, IPQC, OQC hoặc khiếu nại Đại lý',
    purpose: 'Yêu cầu đơn vị gây lỗi điều tra nguyên nhân gốc rễ bằng 4M/5-Whys và cam kết biện pháp ngăn ngừa tái phát dứt điểm.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Kỹ sư QA phát hành phiếu' },
      { role: 'Xác nhận [C]', type: 'C', title: 'Đơn vị nhận yêu cầu (Xưởng / NCC)' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Trưởng phòng QLCL' }
    ],
    fields: [
      { label: 'Mã phiếu CAR/PAR' },
      { label: 'Ngày phát hành' },
      { label: 'Đơn vị nhận yêu cầu (Xưởng / NCC)' },
      { label: 'Hạn chót gửi báo cáo khắc phục' },
      { label: 'Kỹ sư QA theo dõi' }
    ],
    tables: [
      {
        title: 'I. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (4M & 5-WHYS)',
        headers: ['Yếu tố 4M', 'Phân tích chi tiết nguyên nhân gốc rễ (5-Whys)', 'Hành động khắc phục (Corrective Action)', 'Thời hạn cam kết'],
        rows: [
          ['Man (Con người)', '................................................................................', '................................................................................', '........................'],
          ['Machine (Máy móc)', '................................................................................', '................................................................................', '........................'],
          ['Material (Vật tư)', '................................................................................', '................................................................................', '........................'],
          ['Method (Phương pháp)', '................................................................................', '................................................................................', '........................']
        ]
      }
    ],
    conclusions: [
      { label: 'Hành động phòng ngừa diện rộng (PA)', content: '................................................................................................................................................' },
      { label: 'Kết quả đánh giá hiệu lực sau 30 ngày', content: '□ ĐẠT HIỆU LỰC (Đóng phiếu CAR/PAR)\n□ CHƯA ĐẠT HIỆU LỰC (Tái phát hành phiếu CAR mới & yêu cầu giải trình lại)' },
      { label: 'Ghi chú xác nhận của QA', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-kttd-01',
    code: 'BM-KTTD-01',
    procedureCode: 'QT-KTTD-01',
    title: 'BIÊN BẢN GIÁM ĐỊNH BẢO HÀNH & NGUYÊN NHÂN SỰ CỐ',
    subtitle: 'Thẩm định chuyên sâu linh kiện lỗi bảo hành gửi về từ mạng lưới Đại lý toàn quốc',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Kho bảo hành và trạm giám định kỹ thuật phòng QLCL',
    purpose: 'Tiếp nhận mẫu linh kiện hỏng từ Đại lý, mổ xẻ phân tích nguyên nhân hư hỏng, phân định trách nhiệm bảo hành chính xác.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Kỹ sư Thẩm định Kỹ thuật (KTTĐ)' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Đại diện Phòng Sau bán hàng' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Trưởng phòng QLCL' }
    ],
    fields: [
      { label: 'Mã biên bản giám định' },
      { label: 'Tên Đại lý / Khách hàng gửi BH' },
      { label: 'Ngày tiếp nhận mẫu' },
      { label: 'Số Khung xe (VIN)' },
      { label: 'Số Động cơ / Cụm chi tiết' },
      { label: 'Thời gian đã sử dụng (km / tháng)' }
    ],
    tables: [
      {
        title: 'I. KẾT QUẢ GIÁM ĐỊNH MỔ XẺ CHI TIẾT LINH KIỆN HƯ HỎNG',
        headers: ['STT', 'Linh kiện yêu cầu BH', 'Hiện trạng thực tế khi tiếp nhận', 'Kết quả mổ xẻ giám định', 'Kết luận phân định trách nhiệm'],
        rows: [
          ['1', '................................', '................................................', '................................................', '□ Lỗi do Nhà cung cấp linh kiện\n□ Lỗi do Quá trình lắp ráp DKBike\n□ Lỗi do Khách hàng / Đại lý sử dụng'],
          ['2', '................................', '................................................', '................................................', '□ Lỗi do Nhà cung cấp linh kiện\n□ Lỗi do Quá trình lắp ráp DKBike\n□ Lỗi do Khách hàng / Đại lý sử dụng'],
          ['3', '................................', '................................................', '................................................', '□ Lỗi do Nhà cung cấp linh kiện\n□ Lỗi do Quá trình lắp ráp DKBike\n□ Lỗi do Khách hàng / Đại lý sử dụng']
        ]
      }
    ],
    conclusions: [
      { label: 'Phương án xử lý linh kiện', content: '□ ĐỔI MỚI LINH KIỆN ĐẠT CHUẨN CHO ĐẠI LÝ\n□ TỪ CHỐI BẢO HÀNH (Trả lại mẫu cho Đại lý do lỗi sử dụng)\n□ SỬA CHỮA / TÁI CHẾ THAY THẾ PHỤ TÙNG HAO MÒN' },
      { label: 'Hành động phản hồi Nhà cung cấp', content: '................................................................................................................................................' }
    ]
  },
  {
    id: 'bm-kttd-02',
    code: 'BM-KTTD-02',
    procedureCode: 'QT-KTTD-02',
    title: 'SỔ THEO DÕI HIỆU CHUẨN THIẾT BỊ & DỤNG CỤ ĐO LƯỜNG',
    subtitle: 'Sổ cái tổng hợp (Master Log) kiểm soát vòng đời, hạn kiểm định và dán tem thiết bị đo',
    department: 'Bộ phận Kỹ thuật Thẩm định',
    revision: '01',
    effectiveDate: '01/11/2026',
    scope: 'Toàn bộ trang thiết bị đo kiểm tại các phòng thí nghiệm, trạm IQC, chuyền lắp ráp và trạm KCS',
    purpose: 'Đảm bảo 100% thiết bị đo lường được hiệu chuẩn đúng hạn, dán tem hợp quy, tránh sai số đo gây lọt sản phẩm lỗi.',
    signRoles: [
      { role: 'Thực thi [T]', type: 'T', title: 'Kỹ sư Thẩm định Đo lường' },
      { role: 'Xác nhận [H]', type: 'H', title: 'Tổ trưởng QC Hiện trường' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Trưởng phòng QLCL' }
    ],
    fields: [
      { label: 'Năm theo dõi' },
      { label: 'Vị trí quản lý thiết bị' },
      { label: 'Kỹ sư hiệu chuẩn phụ trách' },
      { label: 'Tổ chức hiệu chuẩn (nếu có)' }
    ],
    tables: [
      {
        title: 'I. DANH MỤC THIẾT BỊ & TÌNH TRẠNG HIỆU CHUẨN (MASTER LOG)',
        headers: ['Mã TB', 'Tên thiết bị / Dụng cụ đo', 'Dải đo & Độ chính xác', 'Ngày HC gần nhất', 'Ngày HC kế tiếp', 'Tình trạng Tem', 'Đánh giá'],
        rows: [
          ['TB-01', '................................................', '................................', '....../....../202...', '....../....../202...', '□ Đã dán tem\n□ Chưa dán tem', '□ ĐẠT\n□ NGỪNG DÙNG'],
          ['TB-02', '................................................', '................................', '....../....../202...', '....../....../202...', '□ Đã dán tem\n□ Chưa dán tem', '□ ĐẠT\n□ NGỪNG DÙNG'],
          ['TB-03', '................................................', '................................', '....../....../202...', '....../....../202...', '□ Đã dán tem\n□ Chưa dán tem', '□ ĐẠT\n□ NGỪNG DÙNG'],
          ['TB-04', '................................................', '................................', '....../....../202...', '....../....../202...', '□ Đã dán tem\n□ Chưa dán tem', '□ ĐẠT\n□ NGỪNG DÙNG'],
          ['TB-05', '................................................', '................................', '....../....../202...', '....../....../202...', '□ Đã dán tem\n□ Chưa dán tem', '□ ĐẠT\n□ NGỪNG DÙNG']
        ]
      }
    ],
    conclusions: [
      { label: 'Đánh giá hiện trạng thiết bị', content: 'Tổng số thiết bị quản lý: ............ | Thiết bị đạt chuẩn hoạt động: ............ | Thiết bị chờ hiệu chuẩn/hỏng: ............' },
      { label: 'Kế hoạch hiệu chuẩn định kỳ', content: '................................................................................................................................................' }
    ]
  }
];
