import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  MapPin,
  Printer
} from 'lucide-react';

type FiveSDocTab = 'standards' | 'schedule' | 'checksheet' | 'floorplan';

interface StandardRow {
  stt: string;
  location: string;
  requirements: string[];
  isGroupHeader?: boolean;
}

const STANDARD_ROWS: StandardRow[] = [
  { stt: '1', location: 'Kệ linh kiện mẫu', requirements: [], isGroupHeader: true },
  {
    stt: '1.1',
    location: 'Mặt kệ',
    requirements: [
      '- Được lau chùi sạch sẽ, không bụi bẩn',
      '- Không để đồ vật không liên quan trên mặt kệ ngoài khay ốc và máy laser',
      '- Các khay ốc xếp ngay ngắn, thẳng hàng'
    ]
  },
  {
    stt: '1.2',
    location: 'Các khay LK',
    requirements: [
      '- Đầy đủ tem nhãn, thông tin rõ ràng',
      '- Sắp xếp đều, thẳng hàng, mỗi ngăn tối đa 3 khay',
      '- Linh kiện trong khay xếp vừa đủ, không chồm ra ngoài'
    ]
  },
  { stt: '2', location: 'Tủ đồ DC, MM, TL', requirements: [], isGroupHeader: true },
  {
    stt: '2.1',
    location: 'Mặt tủ',
    requirements: [
      '- Được lau chùi sạch sẽ',
      '- Không để vật dụng không liên quan trên mặt tủ ngoài máy laser và trạm hàn thiếc',
      '- Các khay ốc xếp ngay ngắn, thẳng hàng'
    ]
  },
  {
    stt: '2.2',
    location: 'Ngăn súng, máy',
    requirements: [
      '- Tất cả dụng cụ dùng pin, điện, khí nén được xếp vào ngăn kéo sau khi sử dụng',
      '- Tắt nguồn, cuộn gọn dây',
      '- Đóng kín ngăn kéo'
    ]
  },
  {
    stt: '2.3',
    location: 'Ngăn dụng cụ đo',
    requirements: [
      '- Tất cả dụng cụ đo được xếp đúng vị trí quy định sau khi sử dụng',
      '- Có khay/đệm chống va đập',
      '- Đóng kín ngăn kéo'
    ]
  },
  {
    stt: '2.4',
    location: 'Các ngăn còn lại',
    requirements: [
      '- Đóng kín ngăn nắp',
      '- Không chứa vật dụng không đúng công năng'
    ]
  },
  {
    stt: '3',
    location: 'Vách treo dụng cụ',
    requirements: [
      '- Đầy đủ dụng cụ theo tiêu chuẩn',
      '- Treo đúng vị trí theo ảnh đối chiếu đã ghim',
      '- Không thiếu, không thừa'
    ]
  },
  {
    stt: '4',
    location: 'Vách treo linh kiện',
    requirements: [
      '- Linh kiện treo đầy đủ, đúng vị trí',
      '- Có ảnh đối chiếu, tem nhãn rõ ràng',
      '- Không treo lẫn linh kiện lỗi'
    ]
  },
  {
    stt: '5',
    location: 'Bàn, ghế họp',
    requirements: [
      '- Bàn ghế sạch sẽ, không bám bụi',
      '- Sắp xếp ngay ngắn sau khi sử dụng',
      '- Không để tài liệu, đồ cá nhân tồn trên bàn'
    ]
  },
  {
    stt: '6',
    location: 'Bàn đo/ bàn làm việc',
    requirements: [
      '- Mặt bàn sạch, gọn',
      '- Chỉ để dụng cụ phục vụ công việc hiện tại',
      '- Kết thúc ca phải dọn bàn'
    ]
  },
  {
    stt: '7',
    location: 'Giá treo động cơ',
    requirements: [
      '- Động cơ treo đúng vị trí quy định',
      '- Có tem phân loại (OK / NG / chờ xử lý)',
      '- Không treo chồng, không để dưới sàn'
    ]
  },
  {
    stt: '8',
    location: 'Bàn nâng',
    requirements: [
      '- Sạch sẽ, không dính dầu mỡ',
      '- Không để vật dụng không liên quan',
      '- Có vạch vị trí đặt bàn'
    ]
  },
  {
    stt: '9',
    location: 'Xe để dụng cụ',
    requirements: [
      '- Dụng cụ sắp xếp đúng khay, đúng vị trí',
      '- Có nhãn nhận diện xe',
      '- Không để dụng cụ rơi, lộn xộn'
    ]
  },
  {
    stt: '10',
    location: 'Khu vực AQ, pin, sạc',
    requirements: [
      '- Phân khu rõ ràng: pin tốt / pin lỗi / pin chờ kiểm tra',
      '- Có biển cảnh báo an toàn điện',
      '- Không để pin trực tiếp xuống sàn'
    ]
  },
  {
    stt: '11',
    location: 'Khu vực để xe mẫu',
    requirements: [
      '- Xe xếp ngay ngắn theo vạch kẻ',
      '- Có tem trạng thái (đang test / OK / NG)',
      '- Không để vật cản xung quanh xe'
    ]
  },
  {
    stt: '12',
    location: 'Nền xưởng (khu vực QLCL)',
    requirements: [
      '- Sạch sẽ, không dầu mỡ, rác thải',
      '- Không để vật dụng trực tiếp dưới sàn'
    ]
  },
  {
    stt: '13',
    location: 'Nền xưởng (lối đi)',
    requirements: [
      '- Lối đi thông thoáng, không bị chiếm dụng',
      '- Vạch kẻ rõ ràng, dễ nhận biết'
    ]
  },
  {
    stt: '14',
    location: 'Bóng điện (3 tuýp, 2 bóng)',
    requirements: [
      '- Đầy đủ số lượng, hoạt động bình thường',
      '- Không nhấp nháy, ánh sáng đủ tiêu chuẩn',
      '- Thay thế ngay khi hỏng'
    ]
  }
];

const SCHEDULE_STAFF = [
  { stt: 1, name: 'Thao', offset: 0 },
  { stt: 2, name: 'Diệm', offset: 1 },
  { stt: 3, name: 'Việt', offset: 2 },
  { stt: 4, name: 'Quảng', offset: 3 },
  { stt: 5, name: 'Phấn', offset: 4 },
  { stt: 6, name: 'Hùng', offset: 5 }
];

interface ChecksheetRow {
  no: string;
  item: string;
  method: string;
  timeSec: string;
  weeklySaturdayOnly?: boolean;
}

const CHECKSHEET_ROWS: ChecksheetRow[] = [
  { no: '1', item: 'Kệ linh kiện mẫu', method: 'Kiểm tra, phân loại, sắp xếp đúng vị trí, vệ sinh', timeSec: '' },
  { no: '1.1', item: 'Mặt kệ', method: '', timeSec: '' },
  { no: '1.2', item: 'Các khay LK', method: '', timeSec: '' },
  { no: '2', item: 'Tủ đồ DC, MM, TL', method: '', timeSec: '' },
  { no: '2.1', item: 'Mặt tủ', method: '', timeSec: '' },
  { no: '2.2', item: 'Ngăn súng, máy', method: '', timeSec: '' },
  { no: '2.3', item: 'Ngăn dụng cụ đo', method: '', timeSec: '' },
  { no: '2.4', item: 'Các ngăn còn lại', method: '', timeSec: '' },
  { no: '3', item: 'Vách treo dụng cụ', method: '', timeSec: '' },
  { no: '4', item: 'Vách treo LK', method: '', timeSec: '' },
  { no: '5', item: 'Bàn, ghế họp', method: '', timeSec: '' },
  { no: '6', item: 'Bàn đôi làm việc', method: '', timeSec: '' },
  { no: '7', item: 'Giá treo động cơ', method: '', timeSec: '' },
  { no: '8', item: 'Bàn nâng', method: '', timeSec: '' },
  { no: '9', item: 'Xe để dụng cụ', method: '', timeSec: '' },
  { no: '10', item: 'Khu vực để xe mẫu', method: '', timeSec: '' },
  { no: '11', item: 'Nền xưởng', method: 'Quét, dọn', timeSec: '' },
  { no: '12', item: 'Nền xưởng', method: 'Lau chùi', timeSec: '', weeklySaturdayOnly: true },
  { no: '13', item: 'Bóng điện (3 tuýp, 2 bóng)', method: '', timeSec: '' }
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default function Qms5sTab() {
  const [activeDoc, setActiveDoc] = useState<FiveSDocTab>('standards');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { year, month, daysInMonth, dayMeta } = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const y = Number(yStr) || 2026;
    const m = Number(mStr) || 11;
    const total = new Date(y, m, 0).getDate();
    const meta = Array.from({ length: total }, (_, idx) => {
      const day = idx + 1;
      const dow = new Date(y, m - 1, day).getDay(); // 0 = CN, 6 = T7
      return {
        day,
        isSunday: dow === 0,
        isSaturday: dow === 6
      };
    });
    return { year: y, month: m, daysInMonth: total, dayMeta: meta };
  }, [selectedMonth]);

  const handlePrintActiveDoc = () => {
    if (activeDoc === 'floorplan') {
      window.open('/docs/5S/Mat_bang_cac_xuong_ABC_Model.pdf', '_blank', 'noopener,noreferrer');
      return;
    }

    const isLandscape = activeDoc === 'schedule' || activeDoc === 'checksheet';
    const orientation = isLandscape ? 'landscape' : 'portrait';
    const titleMap: Record<Exclude<FiveSDocTab, 'floorplan'>, string> = {
      standards: 'Yêu cầu về 5S khu vực QLCL',
      schedule: `Kế hoạch kiểm tra thực hiện 5S hàng ngày/hàng tuần - Tháng ${month}/${year}`,
      checksheet: `Checksheet 10 phút 5S cuối giờ - Tháng ${String(month).padStart(2, '0')}/${year}`
    };

    const bodyHtml = buildPrintableHtml(activeDoc, month, year, dayMeta);
    const printWin = window.open('', '_blank', 'width=1100,height=800');
    if (!printWin) return;

    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(titleMap[activeDoc])}</title>
  <style>
    @page {
      size: A4 ${orientation};
      margin: ${isLandscape ? '8mm 8mm' : '12mm 12mm'};
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .brand-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 8px;
      font-size: 10px;
    }
    .brand-left strong { font-size: 12px; text-transform: uppercase; }
    .brand-right { text-align: right; color: #334155; }
    h1 {
      text-align: center;
      font-size: ${isLandscape ? '14px' : '16px'};
      margin: 4px 0 6px;
      text-transform: uppercase;
      font-weight: 700;
    }
    .sub-info {
      font-size: 10px;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #1e293b;
      padding: ${isLandscape ? '2px 3px' : '4px 6px'};
      font-size: ${isLandscape ? '9.5px' : '11px'};
      vertical-align: middle;
      word-wrap: break-word;
    }
    th {
      background-color: #e2e8f0;
      font-weight: 700;
      text-align: center;
    }
    .group-row td {
      background-color: #f1f5f9;
      font-weight: 700;
    }
    .center { text-align: center; }
    .sunday-col { background-color: #f1f5f9; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      margin: 10px 0 4px;
      text-transform: uppercase;
    }
    .legend-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      margin-bottom: 4px;
    }
    .footer-sign {
      margin-top: 8px;
      font-size: 10px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="brand-bar">
    <div class="brand-left">
      <strong>Công ty TNHH Xe điện DK Việt Nhật — DKBike</strong><br/>
      <span>Phòng Quản lý chất lượng (QLCL / DK QMS) • Slogan: Xe cho cả gia đình</span>
    </div>
    <div class="brand-right">
      Tài liệu 5S Khu vực QLCL<br/>
      Tháng ${String(month).padStart(2, '0')}/${year}
    </div>
  </div>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Thanh điều hướng & Nút In */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Tài Liệu 5S Khu Vực QLCL (Xem & In)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Hiển thị nguyên bản 4 tài liệu 5S để xem và in trực tiếp ra giấy A4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(activeDoc === 'schedule' || activeDoc === 'checksheet') && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                <Calendar className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700">Tháng in:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                />
              </div>
            )}

            <a
              href="/docs/5S/QLCL_5S_2026.xlsx"
              download="QLCL_-_5S_2026.xlsx"
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Excel gốc</span>
            </a>

            <button
              type="button"
              onClick={handlePrintActiveDoc}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {activeDoc === 'floorplan'
                  ? 'Mở & In bản vẽ PDF'
                  : activeDoc === 'standards'
                    ? 'In A4 (Dọc)'
                    : 'In A4 (Ngang)'}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Tab tài liệu */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setActiveDoc('standards')}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              activeDoc === 'standards'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Tiêu chuẩn 5S khu vực QLCL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('schedule')}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              activeDoc === 'schedule'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. Lịch kiểm tra 5S & Biểu ghi vấn đề</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('checksheet')}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              activeDoc === 'checksheet'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>3. Checksheet 10 phút 5S cuối giờ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('floorplan')}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              activeDoc === 'floorplan'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>4. Mặt bằng các xưởng (PDF)</span>
          </button>
        </div>
      </div>

      {/* Khung xem trước trang A4 / PDF */}
      {activeDoc === 'standards' && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-5 sm:p-8 max-w-4xl mx-auto">
          <div className="flex flex-wrap justify-between items-end border-b-2 border-slate-900 pb-2 mb-4 gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase text-slate-900">
                Công ty TNHH Xe điện DK Việt Nhật — DKBike
              </p>
              <p className="text-[11px] text-slate-600">
                Phòng Quản lý chất lượng (QLCL / DK QMS) • Xe cho cả gia đình
              </p>
            </div>
            <p className="text-[11px] font-bold text-slate-700">Khổ in chuẩn: A4 Dọc</p>
          </div>

          <h3 className="text-center text-base sm:text-lg font-extrabold uppercase text-slate-900 mb-4">
            Yêu cầu về 5S khu vực QLCL
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-800 text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 px-2.5 py-2 w-14 text-center font-extrabold">STT</th>
                  <th className="border border-slate-800 px-3 py-2 w-52 text-left font-extrabold">Vị trí</th>
                  <th className="border border-slate-800 px-3 py-2 text-left font-extrabold">Yêu cầu</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_ROWS.map((row) => (
                  <tr key={row.stt} className={row.isGroupHeader ? 'bg-slate-50 font-bold' : ''}>
                    <td className="border border-slate-800 px-2.5 py-1.5 text-center font-bold align-top">
                      {row.stt}
                    </td>
                    <td className="border border-slate-800 px-3 py-1.5 font-semibold align-top">
                      {row.location}
                    </td>
                    <td className="border border-slate-800 px-3 py-1.5 align-top leading-relaxed">
                      {row.requirements.map((req, idx) => (
                        <div key={idx}>{req}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeDoc === 'schedule' && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-1.5 mb-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-slate-900">
                  Công ty TNHH Xe điện DK Việt Nhật — DKBike
                </p>
                <p className="text-[11px] text-slate-600">
                  Phòng Quản lý chất lượng (QLCL / DK QMS) • Khổ in chuẩn: A4 Ngang
                </p>
              </div>
              <p className="text-xs font-bold text-slate-800">
                Tháng {String(month).padStart(2, '0')} / Năm {year}
              </p>
            </div>

            <h3 className="text-center text-sm sm:text-base font-extrabold uppercase text-slate-900 mb-2">
              Kế hoạch kiểm tra thực hiện 5S hàng ngày/hàng tuần
            </h3>

            <div className="text-[11px] text-slate-800 space-y-0.5 mb-2">
              <p>
                <strong>Nội dung kiểm tra:</strong> Kiểm tra chi tiết checklist và kết quả thực tế =&gt; nếu phát hiện X không khớp checklist =&gt; Yêu cầu đánh dấu xử lý lại
              </p>
              <div className="flex flex-wrap justify-between gap-2">
                <span><strong>Thời gian kiểm tra:</strong> Sau thời gian làm việc 15 Phút</span>
                <span>Đảm bảo tất cả các zone phải được kiểm tra ít nhất 1 lần / 1 tuần</span>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-1 font-bold">
                <span>O : Kế hoạch</span>
                <span>● : Thực hiện</span>
                <span>X : Có vấn đề</span>
              </div>
            </div>

            {/* Bảng lịch trực */}
            <table className="w-full border-collapse border border-slate-800 text-[11px] mb-4">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 px-1.5 py-1.5 w-10 text-center">STT</th>
                  <th className="border border-slate-800 px-2 py-1.5 w-24 text-left">QL vùng</th>
                  {dayMeta.map((d) => (
                    <th
                      key={d.day}
                      className={`border border-slate-800 py-1 text-center w-6 ${
                        d.isSunday ? 'bg-slate-200 text-slate-500' : ''
                      }`}
                    >
                      {d.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCHEDULE_STAFF.map((person) => (
                  <tr key={person.stt}>
                    <td className="border border-slate-800 px-1.5 py-1.5 text-center font-bold">
                      {person.stt}
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 font-bold">
                      {person.name}
                    </td>
                    {dayMeta.map((d) => {
                      const isScheduled = !d.isSunday && ((d.day - 1 - person.offset) % 7 === 0);
                      return (
                        <td
                          key={d.day}
                          className={`border border-slate-800 text-center font-bold py-1.5 ${
                            d.isSunday ? 'bg-slate-100' : ''
                          }`}
                        >
                          {isScheduled ? 'O' : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td colSpan={2} className="border border-slate-800 px-2 py-2 font-bold">
                    Xác nhận đã vệ sinh
                  </td>
                  {dayMeta.map((d) => (
                    <td
                      key={d.day}
                      className={`border border-slate-800 py-2 ${d.isSunday ? 'bg-slate-100' : ''}`}
                    />
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Biểu ghi chép vấn đề */}
            <h4 className="text-xs font-extrabold uppercase text-slate-900 mb-1.5">
              BIỂU GHI CHÉP VẤN ĐỀ
            </h4>
            <table className="w-full border-collapse border border-slate-800 text-[11px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-800 px-1.5 py-1.5 w-10 text-center">NO</th>
                  <th className="border border-slate-800 px-2 py-1.5 w-24 text-center">Ngày</th>
                  <th className="border border-slate-800 px-2 py-1.5 text-left">Vấn đề</th>
                  <th className="border border-slate-800 px-2 py-1.5 w-28 text-left">Vị trí</th>
                  <th className="border border-slate-800 px-2 py-1.5 w-28 text-left">Tìm bởi ai</th>
                  <th className="border border-slate-800 px-2 py-1.5 text-left">Biện pháp xử lý / CM</th>
                  <th className="border border-slate-800 px-2 py-1.5 w-24 text-left">Bởi</th>
                  <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">Hạn</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }, (_, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-800 px-1.5 py-2 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-800 px-2 py-2" />
                    <td className="border border-slate-800 px-2 py-2" />
                    <td className="border border-slate-800 px-2 py-2" />
                    <td className="border border-slate-800 px-2 py-2" />
                    <td className="border border-slate-800 px-2 py-2" />
                    <td className="border border-slate-800 px-2 py-2" />
                    <td className="border border-slate-800 px-2 py-2" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeDoc === 'checksheet' && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-4 sm:p-6 overflow-x-auto">
          <div className="min-w-[1020px]">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-1.5 mb-2">
              <div>
                <p className="text-xs font-extrabold uppercase text-slate-900">
                  Công ty TNHH Xe điện DK Việt Nhật — DKBike
                </p>
                <p className="text-[11px] text-slate-600">
                  Phòng Quản lý chất lượng (QLCL / DK QMS) • Khổ in chuẩn: A4 Ngang
                </p>
              </div>
              <p className="text-xs font-extrabold text-slate-900">QLCL</p>
            </div>

            <div className="flex items-center justify-between text-xs mb-1">
              <span><strong>Shop:</strong> QLCL &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Line:</strong> ............ &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Vùng:</strong> 1.1</span>
              <span className="font-bold">Kỳ Đánh Giá: Tháng {String(month).padStart(2, '0')} - {year}</span>
            </div>

            <h3 className="text-center text-sm sm:text-base font-extrabold uppercase text-slate-900 mb-1">
              KẾ HOẠCH KIỂM TRA & THỰC HIỆN 10 Phút 5S - CUỐI GIỜ
            </h3>
            <p className="text-[11px] text-slate-700 italic mb-2">
              *Sau khi kiểm tra &amp; thực hiện 5S: Đã kiểm tra &amp; làm 5S tô đen, Bất thường tích (X) &amp; Ghi vấn đề phát hiện xuống phía dưới.
            </p>

            <table className="w-full border-collapse border border-slate-800 text-[10.5px]">
              <thead>
                <tr className="bg-slate-100">
                  <th rowSpan={2} className="border border-slate-800 px-1.5 py-1 w-14 text-center">Người</th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 w-10 text-center">No</th>
                  <th rowSpan={2} className="border border-slate-800 px-2 py-1 w-40 text-left">Hạng mục</th>
                  <th rowSpan={2} className="border border-slate-800 px-2 py-1 w-40 text-left">Cách thức</th>
                  <th rowSpan={2} className="border border-slate-800 px-1 py-1 w-14 text-center">Time (Sec)</th>
                  <th colSpan={daysInMonth} className="border border-slate-800 py-1 text-center">
                    Kỳ Đánh Giá: Tháng {String(month).padStart(2, '0')} - {year}
                  </th>
                </tr>
                <tr className="bg-slate-100">
                  {dayMeta.map((d) => (
                    <th
                      key={d.day}
                      className={`border border-slate-800 py-0.5 text-center w-5 ${
                        d.isSunday ? 'bg-slate-200 text-slate-500' : ''
                      }`}
                    >
                      {d.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHECKSHEET_ROWS.map((row, idx) => (
                  <tr key={`${row.no}-${idx}`}>
                    {idx === 0 && (
                      <td
                        rowSpan={CHECKSHEET_ROWS.length}
                        className="border border-slate-800 px-1 py-1 text-center font-extrabold align-middle"
                      >
                        QLCL
                      </td>
                    )}
                    <td className="border border-slate-800 px-1 py-1 text-center font-bold">{row.no}</td>
                    <td className="border border-slate-800 px-1.5 py-1 font-semibold">{row.item}</td>
                    <td className="border border-slate-800 px-1.5 py-1 text-slate-700">{row.method}</td>
                    <td className="border border-slate-800 px-1 py-1 text-center">{row.timeSec}</td>
                    {dayMeta.map((d) => {
                      const mark = row.weeklySaturdayOnly
                        ? d.isSaturday
                          ? 'O'
                          : ''
                        : d.isSunday
                          ? ''
                          : 'O';
                      return (
                        <td
                          key={d.day}
                          className={`border border-slate-800 text-center font-bold py-1 ${
                            d.isSunday ? 'bg-slate-100' : ''
                          }`}
                        >
                          {mark}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="border border-slate-800 px-2 py-1.5 text-right">
                    Tổng thời gian
                  </td>
                  <td className="border border-slate-800 px-1 py-1.5 text-center">0</td>
                  <td colSpan={daysInMonth} className="border border-slate-800 px-2 py-1.5" />
                </tr>
                <tr>
                  <td colSpan={3} rowSpan={2} className="border border-slate-800 px-2 py-2 font-bold align-middle">
                    Kiểm tra và ký tên
                  </td>
                  <td colSpan={2} className="border border-slate-800 px-2 py-1.5 font-semibold">
                    Tổ viên Ký tên vào ô ký hằng ngày
                  </td>
                  {dayMeta.map((d) => (
                    <td key={d.day} className={`border border-slate-800 ${d.isSunday ? 'bg-slate-100' : ''}`} />
                  ))}
                </tr>
                <tr>
                  <td colSpan={2} className="border border-slate-800 px-2 py-1.5 font-semibold">
                    GL Ký tên vào ô Thứ 6 hằng tuần
                  </td>
                  {dayMeta.map((d) => (
                    <td key={d.day} className={`border border-slate-800 ${d.isSunday ? 'bg-slate-100' : ''}`} />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeDoc === 'floorplan' && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                MẶT BẰNG CÁC XƯỞNG ABC MODEL (Bản vẽ PDF gốc)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/docs/5S/Mat_bang_cac_xuong_ABC_Model.pdf"
                download="Mat_bang_cac_xuong_ABC_Model.pdf"
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải PDF</span>
              </a>
              <a
                href="/docs/5S/Mat_bang_cac_xuong_ABC_Model.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở PDF toàn màn hình để in</span>
              </a>
            </div>
          </div>

          <iframe
            src="/docs/5S/Mat_bang_cac_xuong_ABC_Model.pdf"
            title="Mặt bằng các xưởng ABC Model"
            className="w-full h-[76vh] border-0 bg-slate-100"
          />
        </div>
      )}
    </div>
  );
}

function buildPrintableHtml(
  doc: 'standards' | 'schedule' | 'checksheet',
  month: number,
  year: number,
  dayMeta: Array<{ day: number; isSunday: boolean; isSaturday: boolean }>
): string {
  if (doc === 'standards') {
    const rows = STANDARD_ROWS.map((row) => {
      const reqHtml = row.requirements.map((r) => `<div>${escapeHtml(r)}</div>`).join('');
      return `<tr class="${row.isGroupHeader ? 'group-row' : ''}">
        <td class="center"><strong>${escapeHtml(row.stt)}</strong></td>
        <td><strong>${escapeHtml(row.location)}</strong></td>
        <td>${reqHtml}</td>
      </tr>`;
    }).join('');

    return `
      <h1>Yêu cầu về 5S khu vực QLCL</h1>
      <table>
        <thead>
          <tr>
            <th style="width: 48px;">STT</th>
            <th style="width: 170px; text-align: left;">Vị trí</th>
            <th style="text-align: left;">Yêu cầu</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  if (doc === 'schedule') {
    const dayHeaders = dayMeta
      .map((d) => `<th class="${d.isSunday ? 'sunday-col' : ''}" style="width: 20px;">${d.day}</th>`)
      .join('');

    const staffRows = SCHEDULE_STAFF.map((p) => {
      const cells = dayMeta
        .map((d) => {
          const isScheduled = !d.isSunday && ((d.day - 1 - p.offset) % 7 === 0);
          return `<td class="center ${d.isSunday ? 'sunday-col' : ''}"><strong>${isScheduled ? 'O' : ''}</strong></td>`;
        })
        .join('');
      return `<tr>
        <td class="center"><strong>${p.stt}</strong></td>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        ${cells}
      </tr>`;
    }).join('');

    const confirmCells = dayMeta
      .map((d) => `<td class="${d.isSunday ? 'sunday-col' : ''}" style="height: 20px;"></td>`)
      .join('');

    const issueRows = Array.from({ length: 10 }, (_, idx) => `
      <tr>
        <td class="center" style="height: 22px;"><strong>${idx + 1}</strong></td>
        <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    `).join('');

    return `
      <h1>Kế hoạch kiểm tra thực hiện 5S hàng ngày/hàng tuần</h1>
      <div class="sub-info">
        <div><strong>Nội dung kiểm tra:</strong> Kiểm tra chi tiết checklist và kết quả thực tế =&gt; nếu phát hiện X không khớp checklist =&gt; Yêu cầu đánh dấu xử lý lại</div>
        <div class="legend-row">
          <span><strong>Thời gian kiểm tra:</strong> Sau thời gian làm việc 15 Phút</span>
          <span>Đảm bảo tất cả các zone phải được kiểm tra ít nhất 1 lần / 1 tuần</span>
        </div>
        <div style="font-weight: 700;">O : Kế hoạch &nbsp;&nbsp;&nbsp;&nbsp; ● : Thực hiện &nbsp;&nbsp;&nbsp;&nbsp; X : Có vấn đề</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">STT</th>
            <th style="width: 72px; text-align: left;">QL vùng</th>
            ${dayHeaders}
          </tr>
        </thead>
        <tbody>
          ${staffRows}
          <tr>
            <td colspan="2"><strong>Xác nhận đã vệ sinh</strong></td>
            ${confirmCells}
          </tr>
        </tbody>
      </table>
      <div class="section-title">BIỂU GHI CHÉP VẤN ĐỀ</div>
      <table>
        <thead>
          <tr>
            <th style="width: 28px;">NO</th>
            <th style="width: 66px;">Ngày</th>
            <th style="text-align: left;">Vấn đề</th>
            <th style="width: 80px; text-align: left;">Vị trí</th>
            <th style="width: 78px; text-align: left;">Tìm bởi ai</th>
            <th style="text-align: left;">Biện pháp xử lý / CM</th>
            <th style="width: 68px; text-align: left;">Bởi</th>
            <th style="width: 56px;">Hạn</th>
          </tr>
        </thead>
        <tbody>${issueRows}</tbody>
      </table>
    `;
  }

  // checksheet
  const dayHeaders = dayMeta
    .map((d) => `<th class="${d.isSunday ? 'sunday-col' : ''}" style="width: 18px;">${d.day}</th>`)
    .join('');

  const checkRows = CHECKSHEET_ROWS.map((row, idx) => {
    const personCell =
      idx === 0
        ? `<td rowspan="${CHECKSHEET_ROWS.length}" class="center"><strong>QLCL</strong></td>`
        : '';
    const dayCells = dayMeta
      .map((d) => {
        const mark = row.weeklySaturdayOnly ? (d.isSaturday ? 'O' : '') : d.isSunday ? '' : 'O';
        return `<td class="center ${d.isSunday ? 'sunday-col' : ''}"><strong>${mark}</strong></td>`;
      })
      .join('');
    return `<tr>
      ${personCell}
      <td class="center"><strong>${escapeHtml(row.no)}</strong></td>
      <td><strong>${escapeHtml(row.item)}</strong></td>
      <td>${escapeHtml(row.method)}</td>
      <td class="center">${escapeHtml(row.timeSec)}</td>
      ${dayCells}
    </tr>`;
  }).join('');

  const blankSignCells = dayMeta
    .map((d) => `<td class="${d.isSunday ? 'sunday-col' : ''}" style="height: 20px;"></td>`)
    .join('');

  return `
    <div class="legend-row">
      <span><strong>Shop:</strong> QLCL &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Line:</strong> ............ &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Vùng:</strong> 1.1</span>
      <span><strong>Kỳ Đánh Giá:</strong> Tháng ${String(month).padStart(2, '0')} - ${year}</span>
    </div>
    <h1>KẾ HOẠCH KIỂM TRA &amp; THỰC HIỆN 10 Phút 5S - CUỐI GIỜ</h1>
    <div class="sub-info" style="font-style: italic;">
      *Sau khi kiểm tra &amp; thực hiện 5S: Đã kiểm tra &amp; làm 5S tô đen, Bất thường tích (X) &amp; Ghi vấn đề phát hiện xuống phía dưới.
    </div>
    <table>
      <thead>
        <tr>
          <th rowspan="2" style="width: 42px;">Người</th>
          <th rowspan="2" style="width: 28px;">No</th>
          <th rowspan="2" style="width: 120px; text-align: left;">Hạng mục</th>
          <th rowspan="2" style="width: 115px; text-align: left;">Cách thức</th>
          <th rowspan="2" style="width: 36px;">Time (Sec)</th>
          <th colspan="${dayMeta.length}">Kỳ Đánh Giá: Tháng ${String(month).padStart(2, '0')} - ${year}</th>
        </tr>
        <tr>${dayHeaders}</tr>
      </thead>
      <tbody>
        ${checkRows}
        <tr>
          <td colspan="4" style="text-align: right;"><strong>Tổng thời gian</strong></td>
          <td class="center"><strong>0</strong></td>
          <td colspan="${dayMeta.length}"></td>
        </tr>
        <tr>
          <td colspan="3" rowspan="2"><strong>Kiểm tra và ký tên</strong></td>
          <td colspan="2">Tổ viên Ký tên vào ô ký hằng ngày</td>
          ${blankSignCells}
        </tr>
        <tr>
          <td colspan="2">GL Ký tên vào ô Thứ 6 hằng tuần</td>
          ${blankSignCells}
        </tr>
      </tbody>
    </table>
  `;
}
