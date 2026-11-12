// =========================================================================
// DANH MỤC BỘ BIỂU MẪU CHUẨN QUẢN LÝ CHẤT LƯỢNG (DK QMS FORMS)
// CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT - PHÒNG QUẢN LÝ CHẤT LƯỢNG (QLCL)
// =========================================================================

export interface QmsFormTemplate {
  id: string;
  code: string;         // Mã BM, ví dụ: BM-QLCL-01
  procedureCode: string;// Mã QT, ví dụ: QT-QLCL-01
  title: string;        // Tên biểu mẫu
  subtitle?: string;    // Phụ đề
  department: 'Lãnh đạo Phòng QLCL' | 'Bộ phận QC Hiện trường' | 'Bộ phận QA/QE' | 'Bộ phận Kỹ thuật Thẩm định';
  revision: string;     // Lần BH: 01
  effectiveDate: string;// Ngày HL: 01/11/2026
  scope: string;        // Phạm vi áp dụng
  purpose: string;      // Mục đích sử dụng
  signRoles: { role: string; type: string; title: string }[];
  fields: { label: string; placeholder?: string; type?: string }[];
  tables: {
    title: string;
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
    subtitle: 'Lệnh quyền hạn cao nhất của Trưởng phòng QLCL nhằm khoanh vùng sự cố nghiêm trọng',
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
      { label: 'Mã sản phẩm / Lô xe bị ảnh hưởng' },
      { label: 'Quản đốc xưởng phụ trách' }
    ],
    tables: [
      {
        title: 'I. NỘI DUNG RỦI RO LỖI HỆ THỐNG PHÁT HIỆN',
        headers: ['STT', 'Hạng mục phát hiện lỗi', 'Mô tả chi tiết sự cố / Sai lệch SOP', 'Mức độ rủi ro', 'Ghi chú / Hành động lập tức'],
        rows: [
          ['1', 'Lỗi kỹ thuật / Bản vẽ', 'Sai lệch kích thước lắp ráp giữa khung và càng sau', '[X] Critical', 'Dừng chuyền lập tức'],
          ['2', 'Linh kiện / Vật tư đầu vào', 'Lô giắc nguồn động cơ chập chờn tiếp xúc', '[X] Critical', 'Cách ly toàn bộ lô LK'],
          ['3', 'Thiết bị / Súng siết lực', 'Súng siết trạm 03 lệch dải lực (+15% dung sai)', '[ ] Major', 'Thay súng dự phòng & hiệu chuẩn'],
          ['4', 'Thao tác công nhân', 'Bỏ qua bước tra mỡ vòng bi cổ phốt theo SOP', '[ ] Major', 'Đào tạo & chấn chỉnh thao tác']
        ]
      }
    ],
    conclusions: [
      { label: 'Thời gian tạm dừng chuyền', content: 'Từ: ........................ Đến: ........................' },
      { label: 'Dự kiến thời gian khắc phục', content: 'Khoảng ............ giờ' },
      { label: 'Biện pháp khoanh vùng cách ly', content: 'Cách ly 100% các xe trong dải số khung nghi ngờ và dán thẻ cảnh báo đỏ Stop-Line' },
      { label: 'Triệu tập Hội đồng MRB', content: '[X] Có triệu tập khẩn   [ ] Không cần' }
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
      { label: 'Mã linh kiện (Ecount/ERP)' },
      { label: 'Số Lô / Invoice' },
      { label: 'Tổng số lượng giao (N)' },
      { label: 'Số lượng mẫu kiểm tra (n - AQL)' }
    ],
    tables: [
      {
        title: 'I. KẾT QUẢ ĐO KIỂM THỰC TẾ THEO TIÊU CHUẨN QA',
        headers: ['STT', 'Hạng mục kiểm tra', 'Tiêu chuẩn kỹ thuật (QA)', 'Dụng cụ đo', 'Kết quả đo thực tế', 'Đánh giá'],
        rows: [
          ['1', 'Kích thước / Dung sai', 'Bản vẽ kỹ thuật: ±0.05 mm', 'Thước kẹp cơ/điện tử', '12.02 mm', 'Pass'],
          ['2', 'Ngoại quan / Bề mặt sơn', 'Không xước, không phồng rộp, đều màu', 'Bàn kiểm quang học', 'Mịn đẹp, bóng chuẩn', 'Pass'],
          ['3', 'Tính năng điện / Cơ lý', 'Điện áp 60V, dòng không tải < 1.2A', 'Đồng hồ VOM & Tải giả', '60.1V - 1.1A', 'Pass'],
          ['4', 'Lắp thử nghiệm (Trial)', 'Khớp 100% linh kiện mẫu đối chứng', 'Jig dưỡng mẫu R&D', 'Vào khớp êm khít', 'Pass'],
          ['5', 'Đóng gói / Tem nhãn', 'Đúng quy cách đóng gói và tem truy xuất', 'Kiểm quan sát', 'Có đủ tem mã vạch', 'Pass']
        ]
      }
    ],
    conclusions: [
      { label: 'Tỉ lệ lỗi phát hiện (Defect Rate)', content: '0.0% (0 lỗi trên cỡ mẫu)' },
      { label: 'Kết luận phân loại lô hàng', content: '[X] ĐẠT (Dán tem xanh Pass)   [ ] CHỜ XỬ LÝ (Tem vàng)   [ ] TRẢ HÀNG (Tem đỏ Reject)' },
      { label: 'Hướng xử lý đề xuất', content: 'Nhập kho sản xuất bình thường' }
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
        title: 'I. Ý KIẾN ĐÁNH GIÁ CHUYÊN MÔN CỦA CÁC PHÒNG BAN',
        headers: ['STT', 'Bộ phận tham gia', 'Ý kiến đánh giá chuyên môn & Phân tích rủi ro', 'Đại diện xác nhận'],
        rows: [
          ['1', 'Phòng Quản lý chất lượng (QLCL)', 'Lô càng sau lệch dưỡng 1.5mm, có thể chỉnh nguội trước khi lắp ráp', 'Đã ký'],
          ['2', 'Phòng Sản xuất (Xưởng lắp ráp)', 'Đồng ý nhận gia công sửa chữa với điều kiện NCC chịu chi phí nhân công', 'Đã ký'],
          ['3', 'Phòng Mua hàng & Cung ứng', 'Đã đàm phán trừ tiền gia công vào công nợ tháng của Nhà cung cấp', 'Đã ký'],
          ['4', 'Phòng Kỹ thuật & R&D', 'Đã kiểm tra kết cấu an toàn sau nắn chỉnh, đảm bảo tải trọng', 'Đã ký']
        ]
      }
    ],
    conclusions: [
      { label: 'Quyết định cuối cùng của Hội đồng MRB', content: '[ ] Trả lại NCC (RTV)   [X] Sửa chữa sử dụng (Rework)   [ ] Dùng nhân nhượng (UAI)   [ ] Hủy bỏ (Scrap)' },
      { label: 'Phân công trách nhiệm giám sát', content: 'Bộ phận IPQC giám sát 100% công đoạn sửa chữa và nghiệm thu lại trước khi đưa lên chuyền.' }
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
      { label: 'Thời gian hoàn thành kiểm định' }
    ],
    tables: [
      {
        title: 'I. DANH MỤC KIỂM SOÁT XE MẪU ĐẦU CHUYỀN (FIRST-PIECE CHECKLIST)',
        headers: ['STT', 'Hạng mục kiểm soát', 'Thông số tiêu chuẩn (SOP/Bản vẽ)', 'Kết quả đo thực tế', 'Đánh giá'],
        rows: [
          ['1', 'Lực siết trục bánh trước/sau', 'Trước: 45-55 Nm | Sau: 75-85 Nm', 'Trước: 50 Nm | Sau: 80 Nm', 'Pass'],
          ['2', 'Cân vành & Đảo lốp', 'Độ đảo hướng kính < 1.0 mm', '0.6 mm', 'Pass'],
          ['3', 'Hệ thống phanh cơ/đĩa', 'Hành trình tay phanh 15 - 25 mm', '20 mm', 'Pass'],
          ['4', 'Hệ thống điện & Chiếu sáng', 'Đèn pha, cốt, xi nhan, còi, cụm đồng hồ chuẩn', 'Hoạt động hoàn hảo', 'Pass'],
          ['5', 'Góc lái & Chén cổ phốt', 'Xoay nhẹ nhàng, không rơ lỏng, không sượng', 'Êm ái, chuẩn dưỡng', 'Pass']
        ]
      }
    ],
    conclusions: [
      { label: 'Kết luận xe mẫu đầu chuyền', content: '[X] ĐẠT TIÊU CHUẨN - CHO PHÉP BẤM MÁY CHẠY SẢN XUẤT HÀNG LOẠT' },
      { label: 'Ghi chú cho cả ca', content: 'Chú ý siết đều lực bu lông càng sau theo đúng thông số trên bảng hướng dẫn công việc.' }
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
          ['08:30', 'Trạm 01 - Động cơ', 'Lực siết bu lông chân máy', '05 xe', '0', 'Lực siết đạt chuẩn 42 Nm'],
          ['09:45', 'Trạm 03 - Dây điện', 'Đường đi dây nguồn chính tránh góc sắc nhọn', '10 xe', '0', 'Đã bọc thêm ống gen chống cọ xát'],
          ['10:45', 'Trạm 05 - Ốp nhựa', 'Độ khít khe hở dàn áo nhựa màu', '08 xe', '1 xe hở mép', 'Đã nhắc công nhân gá lẫy chuẩn trước khi bắn vít'],
          ['14:15', 'Trạm 07 - Bánh xe', 'Áp suất lốp trước 2.2 bar, sau 2.5 bar', '12 xe', '0', 'Áp suất chuẩn đồng hồ đo']
        ]
      }
    ],
    conclusions: [
      { label: 'Tổng kết ca tuần tra', content: 'Toàn ca phát hiện 01 lỗi ngoại quan nhỏ, đã xử lý dứt điểm tại trạm, không lọt lỗi xuống cuối chuyền.' }
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
        title: 'I. BẢNG NGHIỆM THU 100% XE THÀNH PHẨM TRƯỚC XUẤT XƯỞNG',
        headers: ['STT', 'Số Khung (VIN)', 'Số Động cơ / Máy', 'Ngoại quan', 'Chạy thử đường trường', 'Dán tem KCS', 'Kết quả'],
        rows: [
          ['1', 'DKB-2026-00801', 'DK-EG-8801', 'Bóng đẹp, không trầy', 'Êm, phanh ăn, tốc độ 45km/h', 'Đã dán', 'ĐẠT'],
          ['2', 'DKB-2026-00802', 'DK-EG-8802', 'Bóng đẹp, không trầy', 'Êm, phanh ăn, tốc độ 45km/h', 'Đã dán', 'ĐẠT'],
          ['3', 'DKB-2026-00803', 'DK-EG-8803', 'Hơi xước nhẹ dè trước', 'Đã thay mới linh kiện dè', 'Đã dán', 'ĐẠT (Sau sửa)'],
          ['4', 'DKB-2026-00804', 'DK-EG-8804', 'Bóng đẹp, không trầy', 'Êm, phanh ăn, tốc độ 45km/h', 'Đã dán', 'ĐẠT']
        ]
      }
    ],
    conclusions: [
      { label: 'Tổng số xe kiểm tra', content: 'Tổng kiểm tra: 100 xe | Đạt xuất kho: 100 xe | Tỉ lệ đạt FPY: 99.0%' },
      { label: 'Chứng thực xuất xưởng', content: 'Đủ điều kiện nhập kho thành phẩm và phát hành phiếu xuất xưởng cho Đại lý.' }
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
        headers: ['Trụ cột', 'Tỷ trọng', 'Tiêu chí chấm điểm chi tiết', 'Điểm tối đa', 'Điểm đạt', 'Đánh giá'],
        rows: [
          ['Quality (Chất lượng)', '40%', 'Tỷ lệ lô hàng đạt IQC (>98%), không phát sinh lỗi Critical', '40', '38', 'Tốt'],
          ['Cost (Chi phí & Bù lỗi)', '20%', 'Mức độ hợp tác bù linh kiện lỗi bảo hành và đền bù nhân công', '20', '19', 'Rất tốt'],
          ['Delivery (Giao hàng)', '20%', 'Giao hàng đúng hẹn, đúng số lượng, bao gói đúng quy cách', '20', '18', 'Đạt'],
          ['Service (Dịch vụ & Cải tiến)', '20%', 'Phản hồi CAR/PAR nhanh chóng (<48h), có kỹ thuật hỗ trợ hiện trường', '20', '17', 'Đạt']
        ]
      }
    ],
    conclusions: [
      { label: 'Tổng điểm đánh giá', content: '92 / 100 điểm' },
      { label: 'Xếp loại Nhà cung cấp', content: '[X] HẠNG A (Chiến lược - Ưu tiên tăng sản lượng)   [ ] HẠNG B   [ ] HẠNG C   [ ] HẠNG D (Đình chỉ)' },
      { label: 'Yêu cầu hành động đối với NCC', content: 'Tiếp tục duy trì chất lượng sơn tĩnh điện và cải thiện tiến độ gửi báo cáo 8D khi phát sinh lỗi.' }
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
      { role: 'Xác nhận [C]', type: 'C', title: 'Đơn vị bị yêu cầu (Xưởng / NCC)' },
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
          ['Man (Con người)', 'Công nhân mới chưa thuộc thao tác cài chốt giắc chống nước', 'Đào tạo lại SOP và cấp chứng chỉ thao tác', '3 ngày'],
          ['Machine (Máy móc)', 'Jig ép cốt giắc bị mòn chốt định vị sau 50.000 lần dập', 'Gia công nhiệt luyện chốt Jig mới tăng độ cứng', '5 ngày'],
          ['Material (Vật tư)', 'Nhựa vỏ giắc hơi giòn khi trời lạnh', 'Yêu cầu NCC bổ sung phụ gia tăng dẻo dai', '7 ngày'],
          ['Method (Phương pháp)', 'Quy trình kiểm tra chưa có bước thử lực kéo giật giắc', 'Bổ sung bước kéo thử lực 5kg vào bảng tiêu chuẩn KCS', '2 ngày']
        ]
      }
    ],
    conclusions: [
      { label: 'Hành động phòng ngừa diện rộng (PA)', content: 'Ban hành cảnh báo chất lượng toàn nhà máy và cập nhật vào bảng FMEA công đoạn.' },
      { label: 'Kết quả đánh giá hiệu lực sau 30 ngày', content: '[X] HIỆU QUẢ (Đóng phiếu)   [ ] CHƯA HIỆU QUẢ (Tái mở phiếu CAR)' }
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
      { role: 'Xác nhận [H]', type: 'H', title: 'Đại diện Phòng Dịch vụ Sau bán hàng' },
      { role: 'Phê duyệt [P]', type: 'P', title: 'Trưởng phòng QLCL' }
    ],
    fields: [
      { label: 'Mã biên bản giám định' },
      { label: 'Tên Đại lý / Khách hàng gửi bảo hành' },
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
          ['1', 'Cụm IC Điều tốc (ECU)', 'Mất nguồn, không kéo ga được', 'Nổ Mosfet công suất do ngập nước vượt ngưỡng', '[X] Lỗi do Khách hàng sử dụng (Từ chối BH)'],
          ['2', 'Động cơ bánh sau', 'Kêu rè rè, rung lắc khi tăng tốc', 'Vỡ nam châm từ vĩnh cửu do keo dán nhiệt kém', '[X] Lỗi do Nhà cung cấp linh kiện (Đổi mới)'],
          ['3', 'Bộ đồng hồ điện tử LCD', 'Màn hình mờ, chập chờn vạch pin', 'Hỏng tụ lọc nguồn trên mạch chính', '[X] Lỗi bảo hành chính hãng DKBike']
        ]
      }
    ],
    conclusions: [
      { label: 'Phương án xử lý linh kiện', content: '[X] Đổi mới linh kiện đạt chuẩn cho Đại lý   [ ] Sửa chữa phục hồi   [ ] Trả lại mẫu từ chối' },
      { label: 'Hành động đối với NCC', content: 'Gửi biên bản kèm ảnh mổ xẻ cho Nhà cung cấp động cơ yêu cầu giải trình và đền bù.' }
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
      { label: 'Tổ chức hiệu chuẩn bên ngoài (nếu có)' }
    ],
    tables: [
      {
        title: 'I. DANH MỤC THIẾT BỊ & TÌNH TRẠNG HIỆU CHUẨN (MASTER LOG)',
        headers: ['Mã TB', 'Tên thiết bị / Dụng cụ đo', 'Dải đo & Độ chính xác', 'Ngày HC gần nhất', 'Ngày HC kế tiếp', 'Tình trạng Tem', 'Đánh giá'],
        rows: [
          ['TB-01', 'Thước kẹp điện tử Mitutoyo', '0 - 150mm (0.01mm)', '01/11/2026', '01/05/2027', 'Tem xanh hợp chuẩn', 'ĐẠT'],
          ['TB-02', 'Súng siết lực Kanon', '10 - 100 Nm (±2%)', '15/10/2026', '15/04/2027', 'Tem xanh hợp chuẩn', 'ĐẠT'],
          ['TB-03', 'Thiết bị đo dòng & tải ECU', '0 - 50A / 0 - 100V', '20/09/2026', '20/03/2027', 'Tem xanh hợp chuẩn', 'ĐẠT'],
          ['TB-04', 'Panme đo ngoài Mitutoyo', '25 - 50mm (0.001mm)', '05/11/2026', '05/05/2027', 'Tem xanh hợp chuẩn', 'ĐẠT'],
          ['TB-05', 'Đồng hồ so đo độ đảo chân gập', '0 - 10mm (0.01mm)', '10/11/2026', '10/05/2027', 'Tem xanh hợp chuẩn', 'ĐẠT']
        ]
      }
    ],
    conclusions: [
      { label: 'Hiện trạng thiết bị', content: '100% thiết bị đo lường trên dây chuyền và phòng Lab đang trong thời hạn hiệu chuẩn hợp lệ.' },
      { label: 'Kế hoạch kỳ tới', content: 'Lập danh sách gửi Trung tâm Đo lường 1 (Quatest 1) hiệu chuẩn lại các quả cân chuẩn và súng siết lực vào tháng 04/2027.' }
    ]
  }
];
