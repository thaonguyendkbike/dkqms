const XLSX = require('xlsx-js-style');
const fs = require('fs');
const path = require('path');

const headers = [
  'Mã phản ánh',
  'Ngày nguồn',
  'Nhân viên',
  'Khu vực',
  'Tỉnh/Thành phố',
  'Tên khách hàng',
  'Ngày tiếp nhận',
  'Hình thức tiếp nhận',
  'Model chuẩn hóa',
  'Loại phản ánh gốc',
  'Nhóm lỗi chuẩn hóa',
  'Chi tiết phản ánh',
  'Nguyên nhân',
  'Phương án giải quyết',
  'Người thực hiện',
  'Ngày giải quyết',
  'Tình trạng xử lý',
  'Đánh giá KH',
  'Mức độ',
  'Cơ sở phân loại mức độ',
  'Ghi chú dữ liệu'
];

const sampleRows = [
  [
    'PA-001',
    '20/07/2026',
    'Quỳnh',
    'N2',
    'Hải Dương',
    'Đại lý Hoàn Hợi',
    '18/07/2026',
    'Tin nhắn',
    'DK D2',
    'Chất lượng',
    'Điện - điện tử',
    'Cụm xi nhan phải phía trước không sáng khi bật công tắc rẽ.',
    'Rắc cắm tiếp xúc lỏng, jack nhựa bavia chèn chân tiếp điểm.',
    'Gửi cụm rắc và bóng LED mới bảo hành cho đại lý thay thế.',
    'Hoàng Văn Phấn',
    '19/07/2026',
    'Đang xử lý',
    'Chưa hài lòng',
    'Cao',
    'Ảnh hưởng đến tín hiệu an toàn chuyển hướng khi tham gia giao thông.',
    'Lô phụ tùng tháng 06/2026'
  ],
  [
    'PA-002',
    '20/07/2026',
    'Quỳnh',
    'N2',
    'Thái Bình',
    'Đại lý Chính Tuyết',
    '16/07/2026',
    'Hotline CSKH',
    'DK Roma SX V2',
    'Chất lượng',
    'Cơ khí / Khung sườn',
    'Cổ phuốc trước có tiếng kêu lộc cộc khi di chuyển qua gờ giảm tốc.',
    'Lực siết đai ốc bát phuốc chưa đạt dải mô-men tiêu chuẩn, chén bi bị rơ.',
    'Kỹ thuật viên hướng dẫn đại lý siết lại ốc cân lực theo SOP và bôi mỡ chuyên dụng.',
    'Nguyễn Xuân Thao',
    '17/07/2026',
    'Đã xử lý',
    'Hài lòng',
    'Trung bình',
    'Gây khó chịu cho người điều khiển, cần kiểm soát dải siết đầu chuyền.',
    'Đã phản hồi tổ PQC lắp ráp'
  ],
  [
    'PA-003',
    '21/07/2026',
    'Trang',
    'N1',
    'Hà Nội',
    'Đại lý Tuấn Đạt',
    '20/07/2026',
    'Zalo OA',
    'DK Gogo Smart',
    'Cải tiến',
    'Tiện ích / Thiết kế',
    'Đề xuất tăng chiều sâu móc treo đồ phía trước và bố trí nắp che cổng sạc USB chống nước tốt hơn.',
    'Khách hàng phản hồi móc treo đồ nguyên bản hơi nông khi móc túi đồ nặng.',
    'Ghi nhận chuyển bộ phận R&D / PTSP nghiên cứu khuôn đúc cải tiến ECO đợt tới.',
    'Nguyễn Xuân Thao',
    '21/07/2026',
    'Đề xuất cải tiến',
    'Hài lòng',
    'Thấp',
    'Đề xuất nâng cao trải nghiệm người dùng, không ảnh hưởng an toàn.',
    'Liên kết đề xuất ECO-2026'
  ],
  [
    'PA-004',
    '22/07/2026',
    'Hoa',
    'N3',
    'Bắc Giang',
    'Đại lý Xe điện Minh Phát',
    '21/07/2026',
    'Điện thoại',
    'DK EZ3',
    'Chất lượng',
    'Nguồn điện / Pin ắc quy',
    'Xe đi được khoảng 20km thì đồng hồ sụt vạch pin nhanh bất thường.',
    'Một bình ắc quy trong bộ 4 bình có nội trở cao, sụt áp không đồng đều.',
    'Thu hồi bình lỗi về kiểm tra và đổi ngay 01 bình ắc quy mới cho đại lý.',
    'Đoàn Anh Hùng',
    '22/07/2026',
    'Đang xử lý',
    'Hài lòng',
    'Nghiêm trọng',
    'Ảnh hưởng trực tiếp đến cự ly hành trình và khả năng vận hành của xe.',
    'Báo cáo kiểm soát nhà cung cấp Chilwee'
  ],
  [
    'PA-005',
    '23/07/2026',
    'Quỳnh',
    'N2',
    'Nam Định',
    'Đại lý Thành Công',
    '22/07/2026',
    'Hotline CSKH',
    'DK Volt V2',
    'Chất lượng',
    'Hệ thống phanh',
    'Phanh đĩa trước bị bó nhẹ và phát ra tiếng kêu rít khi dắt xe.',
    'Má phanh ép sát đĩa do cặn sơn và bavia còn sót lại ở gá đỡ cụm heo dầu.',
    'Gửi video hướng dẫn thợ đại lý căn chỉnh tâm heo dầu và vệ sinh khe má phanh.',
    'Hà Khắc Việt',
    '23/07/2026',
    'Đã xử lý',
    'Hài lòng',
    'Trung bình',
    'Không gây mất phanh hoàn toàn nhưng làm giảm tuổi thọ má phanh và hao pin.',
    'Kiểm soát bavia gá phanh tại trạm PQC 2'
  ]
];

// Tạo workbook & worksheet
const wb = XLSX.utils.book_new();

// Ghép header + data
const wsData = [headers, ...sampleRows];
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Định dạng độ rộng cột (Column widths)
ws['!cols'] = [
  { wch: 14 }, // Mã phản ánh
  { wch: 13 }, // Ngày nguồn
  { wch: 14 }, // Nhân viên
  { wch: 10 }, // Khu vực
  { wch: 16 }, // Tỉnh/Thành phố
  { wch: 26 }, // Tên khách hàng
  { wch: 15 }, // Ngày tiếp nhận
  { wch: 18 }, // Hình thức tiếp nhận
  { wch: 18 }, // Model chuẩn hóa
  { wch: 18 }, // Loại phản ánh gốc
  { wch: 22 }, // Nhóm lỗi chuẩn hóa
  { wch: 45 }, // Chi tiết phản ánh
  { wch: 40 }, // Nguyên nhân
  { wch: 42 }, // Phương án giải quyết
  { wch: 18 }, // Người thực hiện
  { wch: 15 }, // Ngày giải quyết
  { wch: 16 }, // Tình trạng xử lý
  { wch: 15 }, // Đánh giá KH
  { wch: 14 }, // Mức độ
  { wch: 45 }, // Cơ sở phân loại mức độ
  { wch: 30 }  // Ghi chú dữ liệu
];

// Định dạng hàng (Row heights)
ws['!rows'] = [
  { hpt: 32 }, // Header row
  { hpt: 26 },
  { hpt: 26 },
  { hpt: 26 },
  { hpt: 26 },
  { hpt: 26 }
];

// Styling cho Header Row
const headerStyle = {
  font: {
    name: 'Segoe UI',
    sz: 10,
    bold: true,
    color: { rgb: 'FFFFFF' }
  },
  fill: {
    fgColor: { rgb: '0F5132' } // Xanh lá đậm chuẩn DKBike
  },
  alignment: {
    vertical: 'center',
    horizontal: 'center',
    wrapText: true
  },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'medium', color: { rgb: '0A3622' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } }
  }
};

// Styling cho các cột được hệ thống tự động bỏ qua (Màu xám nhạt để người dùng biết)
const excludedHeaderStyle = {
  font: {
    name: 'Segoe UI',
    sz: 10,
    bold: true,
    color: { rgb: '777777' }
  },
  fill: {
    fgColor: { rgb: 'E2E8F0' } // Slate-200
  },
  alignment: {
    vertical: 'center',
    horizontal: 'center',
    wrapText: true
  },
  border: {
    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
    bottom: { style: 'medium', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
    right: { style: 'thin', color: { rgb: 'CCCCCC' } }
  }
};

// Cột tự động bỏ qua: Cột 2 (Nhân viên), Cột 3 (Khu vực), Cột 4 (Tỉnh/Thành phố), Cột 7 (Hình thức tiếp nhận)
const excludedColIndices = [2, 3, 4, 7];

// Áp dụng Style Header
for (let c = 0; c < headers.length; c++) {
  const cellRef = XLSX.utils.encode_cell({ r: 0, c: c });
  if (ws[cellRef]) {
    ws[cellRef].s = excludedColIndices.includes(c) ? excludedHeaderStyle : headerStyle;
  }
}

// Styling cho Data Rows
for (let r = 1; r <= sampleRows.length; r++) {
  const isEven = r % 2 === 0;
  for (let c = 0; c < headers.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: {
          name: 'Segoe UI',
          sz: 9.5,
          color: { rgb: excludedColIndices.includes(c) ? '666666' : '1E293B' }
        },
        fill: {
          fgColor: { rgb: excludedColIndices.includes(c) ? (isEven ? 'F1F5F9' : 'F8FAFC') : (isEven ? 'F0FDF4' : 'FFFFFF') }
        },
        alignment: {
          vertical: 'center',
          horizontal: [0, 1, 6, 14, 15, 16, 17, 18].includes(c) ? 'center' : 'left',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };
    }
  }
}

XLSX.utils.book_append_sheet(wb, ws, 'PhanAnh_KhachHang_Mau');

const outputDir = path.resolve('d:/dkqms');
const publicDir = path.resolve('d:/dkqms/public');

const fileName = 'Mau_Nhap_Hang_Loat_Phan_Anh_Khach_Hang_DKBike.xlsx';
const outputPath = path.join(outputDir, fileName);
const publicPath = path.join(publicDir, fileName);

XLSX.writeFile(wb, outputPath);
console.log(`Đã xuất file thành công tại: ${outputPath}`);

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.copyFileSync(outputPath, publicPath);
console.log(`Đã sao chép vào thư mục public: ${publicPath}`);
