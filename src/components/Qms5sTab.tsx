import React, { useEffect, useMemo, useState } from 'react';
import XLSXStyle from 'xlsx-js-style';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users
} from 'lucide-react';
import { QmsBmSyncRecord } from '../types';
import { safeStorage } from '../safeStorage';
import { formatDateStrVi, getLocalYmd } from '../utils/dateUtils';

interface Qms5sStandardItem {
  code: string;
  location: string;
  requirements: string[];
}

const QMS_5S_STANDARDS: Qms5sStandardItem[] = [
  {
    code: '1.1',
    location: 'Kệ linh kiện mẫu — Mặt kệ',
    requirements: [
      'Được lau chùi sạch sẽ, không bụi bẩn',
      'Không để đồ vật không liên quan trên mặt kệ ngoài khay ốc và máy laser',
      'Các khay ốc xếp ngay ngắn, thẳng hàng'
    ]
  },
  {
    code: '1.2',
    location: 'Kệ linh kiện mẫu — Các khay LK',
    requirements: [
      'Đầy đủ tem nhãn, thông tin rõ ràng',
      'Sắp xếp đều, thẳng hàng, mỗi ngăn tối đa 3 khay',
      'Linh kiện trong khay xếp vừa đủ, không chồm ra ngoài'
    ]
  },
  {
    code: '2.1',
    location: 'Tủ đồ DC, MM, TL — Mặt tủ',
    requirements: [
      'Được lau chùi sạch sẽ',
      'Không để vật dụng không liên quan trên mặt tủ ngoài máy laser và trạm hàn thiếc',
      'Các khay ốc xếp ngay ngắn, thẳng hàng'
    ]
  },
  {
    code: '2.2',
    location: 'Tủ đồ DC, MM, TL — Ngăn súng, máy',
    requirements: [
      'Tất cả dụng cụ dùng pin, điện, khí nén được xếp vào ngăn kéo sau khi sử dụng',
      'Tắt nguồn, cuộn gọn dây',
      'Đóng kín ngăn kéo'
    ]
  },
  {
    code: '2.3',
    location: 'Tủ đồ DC, MM, TL — Ngăn dụng cụ đo',
    requirements: [
      'Tất cả dụng cụ đo được xếp đúng vị trí quy định sau khi sử dụng',
      'Có khay/đệm chống va đập',
      'Đóng kín ngăn kéo'
    ]
  },
  {
    code: '2.4',
    location: 'Tủ đồ DC, MM, TL — Các ngăn còn lại',
    requirements: [
      'Đóng kín ngăn nắp',
      'Không chứa vật dụng không đúng công năng'
    ]
  },
  {
    code: '3',
    location: 'Vách treo dụng cụ',
    requirements: [
      'Đầy đủ dụng cụ theo tiêu chuẩn',
      'Treo đúng vị trí theo ảnh đối chiếu đã ghim',
      'Không thiếu, không thừa'
    ]
  },
  {
    code: '4',
    location: 'Vách treo linh kiện',
    requirements: [
      'Linh kiện treo đầy đủ, đúng vị trí',
      'Có ảnh đối chiếu, tem nhãn rõ ràng',
      'Không treo lẫn linh kiện lỗi'
    ]
  },
  {
    code: '5',
    location: 'Bàn, ghế họp',
    requirements: [
      'Bàn ghế sạch sẽ, không bám bụi',
      'Sắp xếp ngay ngắn sau khi sử dụng',
      'Không để tài liệu, đồ cá nhân tồn trên bàn'
    ]
  },
  {
    code: '6',
    location: 'Bàn đo / bàn làm việc',
    requirements: [
      'Mặt bàn sạch, gọn',
      'Chỉ để dụng cụ phục vụ công việc hiện tại',
      'Kết thúc ca phải dọn bàn'
    ]
  },
  {
    code: '7',
    location: 'Giá treo động cơ',
    requirements: [
      'Động cơ treo đúng vị trí quy định',
      'Có tem phân loại (OK / NG / chờ xử lý)',
      'Không treo chồng, không để dưới sàn'
    ]
  },
  {
    code: '8',
    location: 'Bàn nâng',
    requirements: [
      'Sạch sẽ, không dính dầu mỡ',
      'Không để vật dụng không liên quan',
      'Có vạch vị trí đặt bàn'
    ]
  },
  {
    code: '9',
    location: 'Xe để dụng cụ',
    requirements: [
      'Dụng cụ sắp xếp đúng khay, đúng vị trí',
      'Có nhãn nhận diện xe',
      'Không để dụng cụ rơi, lộn xộn'
    ]
  },
  {
    code: '10',
    location: 'Khu vực AQ, pin, sạc',
    requirements: [
      'Phân khu rõ ràng: pin tốt / pin lỗi / pin chờ kiểm tra',
      'Có biển cảnh báo an toàn điện',
      'Không để pin trực tiếp xuống sàn'
    ]
  },
  {
    code: '11',
    location: 'Khu vực để xe mẫu',
    requirements: [
      'Xe xếp ngay ngắn theo vạch kẻ',
      'Có tem trạng thái (đang test / OK / NG)',
      'Không để vật cản xung quanh xe'
    ]
  },
  {
    code: '12',
    location: 'Nền xưởng (khu vực QLCL)',
    requirements: [
      'Sạch sẽ, không dầu mỡ, rác thải',
      'Không để vật dụng trực tiếp dưới sàn'
    ]
  },
  {
    code: '13',
    location: 'Nền xưởng (lối đi)',
    requirements: [
      'Lối đi thông thoáng, không bị chiếm dụng',
      'Vạch kẻ rõ ràng, dễ nhận biết'
    ]
  },
  {
    code: '14',
    location: 'Bóng điện (3 tuýp, 2 bóng)',
    requirements: [
      'Đầy đủ số lượng, hoạt động bình thường',
      'Không nhấp nháy, ánh sáng đủ tiêu chuẩn',
      'Thay thế ngay khi hỏng'
    ]
  }
];

const DAILY_10M_ITEMS: { no: string; item: string; method: string; weeklyOnly?: boolean }[] = [
  { no: '1', item: 'Kệ linh kiện mẫu', method: 'Kiểm tra, phân loại, sắp xếp đúng vị trí, vệ sinh' },
  { no: '1.1', item: 'Mặt kệ', method: 'Lau sạch, chỉ để khay ốc & máy laser' },
  { no: '1.2', item: 'Các khay LK', method: 'Đủ tem nhãn, thẳng hàng, tối đa 3 khay/ngăn' },
  { no: '2', item: 'Tủ đồ DC, MM, TL', method: 'Kiểm tra ngăn nắp, đúng công năng' },
  { no: '2.1', item: 'Mặt tủ', method: 'Lau sạch, xếp khay ốc ngay ngắn' },
  { no: '2.2', item: 'Ngăn súng, máy', method: 'Xếp gọn vào ngăn kéo, tắt nguồn, cuộn dây' },
  { no: '2.3', item: 'Ngăn dụng cụ đo', method: 'Xếp đúng khay/đệm chống va đập, đóng kín' },
  { no: '2.4', item: 'Các ngăn còn lại', method: 'Đóng kín ngăn nắp' },
  { no: '3', item: 'Vách treo dụng cụ', method: 'Treo đủ & đúng vị trí theo ảnh mẫu' },
  { no: '4', item: 'Vách treo LK', method: 'Treo đúng vị trí, không lẫn LK lỗi' },
  { no: '5', item: 'Bàn, ghế họp', method: 'Lau sạch, xếp gọn, không để đồ tồn' },
  { no: '6', item: 'Bàn đôi làm việc', method: 'Dọn sạch mặt bàn cuối ca' },
  { no: '7', item: 'Giá treo động cơ', method: 'Đủ tem OK/NG/chờ XL, không để sàn' },
  { no: '8', item: 'Bàn nâng', method: 'Sạch dầu mỡ, đúng vạch vị trí' },
  { no: '9', item: 'Xe để dụng cụ', method: 'Đúng khay, đúng vị trí, có nhãn xe' },
  { no: '10', item: 'Khu vực để xe mẫu', method: 'Ngay ngắn theo vạch, đủ tem trạng thái' },
  { no: '11', item: 'Nền xưởng (Quét, dọn)', method: 'Quét, dọn sạch rác thải, không vật cản' },
  { no: '12', item: 'Nền xưởng (Lau chùi)', method: 'Lau chùi sạch dầu mỡ (định kỳ tuần)', weeklyOnly: true },
  { no: '13', item: 'Bóng điện (3 tuýp, 2 bóng)', method: 'Kiểm tra sáng đủ, thay ngay khi hỏng' }
];

const ROTATION_STAFF = [
  { stt: 1, name: 'Thao', offset: 0 },
  { stt: 2, name: 'Diệm', offset: 1 },
  { stt: 3, name: 'Việt', offset: 2 },
  { stt: 4, name: 'Quảng', offset: 3 },
  { stt: 5, name: 'Phấn', offset: 4 },
  { stt: 6, name: 'Hùng', offset: 5 }
];

type CellMark = '' | 'O' | 'OK' | 'X';

interface FiveSIssue {
  id: string;
  date: string;
  issue: string;
  location: string;
  foundBy: string;
  action: string;
  owner: string;
  dueDate: string;
  status: 'Mở' | 'Đã xử lý';
}

interface FiveSMonthPayload {
  monthKey: string;
  rotationMarks: Record<string, CellMark>; // key: `${staffName}-${day}`
  daily10mMarks: Record<string, CellMark>; // key: `${no}-${day}`
  issues: FiveSIssue[];
}

const LOCAL_5S_PREFIX = 'dk_qms_5s_';

function buildDefaultRotationMarks(year: number, month: number): Record<string, CellMark> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const marks: Record<string, CellMark> = {};
  ROTATION_STAFF.forEach(({ name, offset }) => {
    for (let d = 1; d <= daysInMonth; d++) {
      // Weekly cycle matching anh Thao's table: day 2+offset, +7, +14, +21, +28
      const startDay = 2 + offset;
      if (d >= startDay && (d - startDay) % 7 === 0) {
        marks[`${name}-${d}`] = 'O';
      }
    }
  });
  return marks;
}

function cycleMark(curr: CellMark | undefined): CellMark {
  if (!curr) return 'O';
  if (curr === 'O') return 'OK';
  if (curr === 'OK') return 'X';
  return '';
}

function MarkBadge({ mark }: { mark: CellMark | undefined }) {
  if (mark === 'OK') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-600 text-white font-black text-[11px]">
        ✓
      </span>
    );
  }
  if (mark === 'X') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-rose-600 text-white font-black text-[11px]">
        X
      </span>
    );
  }
  if (mark === 'O') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-blue-400 bg-blue-50 text-blue-700 font-black text-[11px]">
        O
      </span>
    );
  }
  return <span className="inline-block w-6 h-6 rounded border border-slate-200 bg-white" />;
}

interface Qms5sTabProps {
  bmRecords: QmsBmSyncRecord[];
  onSaveBmRecord?: (record: QmsBmSyncRecord) => boolean | void;
}

export default function Qms5sTab({ bmRecords, onSaveBmRecord }: Qms5sTabProps) {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [subView, setSubView] = useState<'standards' | 'rotation' | 'daily10m' | 'issues'>('standards');
  const [stdSearch, setStdSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const [monthData, setMonthData] = useState<FiveSMonthPayload>(() => ({
    monthKey,
    rotationMarks: buildDefaultRotationMarks(year, month),
    daily10mMarks: {},
    issues: []
  }));

  // Load from Cloud bmRecords first, fallback to safeStorage, then default rotation
  useEffect(() => {
    const cloudRec = bmRecords.find((r) => r.kind === '5s' && r.targetId === monthKey);
    if (cloudRec?.payload) {
      setMonthData({
        monthKey,
        rotationMarks: cloudRec.payload.rotationMarks || buildDefaultRotationMarks(year, month),
        daily10mMarks: cloudRec.payload.daily10mMarks || {},
        issues: Array.isArray(cloudRec.payload.issues) ? cloudRec.payload.issues : []
      });
      return;
    }
    try {
      const raw = safeStorage.getItem(`${LOCAL_5S_PREFIX}${monthKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as FiveSMonthPayload;
        setMonthData({
          monthKey,
          rotationMarks: parsed.rotationMarks || buildDefaultRotationMarks(year, month),
          daily10mMarks: parsed.daily10mMarks || {},
          issues: Array.isArray(parsed.issues) ? parsed.issues : []
        });
        return;
      }
    } catch {
      // ignore
    }
    setMonthData({
      monthKey,
      rotationMarks: buildDefaultRotationMarks(year, month),
      daily10mMarks: {},
      issues: []
    });
  }, [monthKey, year, month, bmRecords]);

  const persistMonthData = (next: FiveSMonthPayload, notifyText?: string) => {
    setMonthData(next);
    safeStorage.setItem(`${LOCAL_5S_PREFIX}${monthKey}`, JSON.stringify(next));
    onSaveBmRecord?.({
      id: `5s:${monthKey}`,
      kind: '5s',
      targetId: monthKey,
      payload: next,
      updatedAt: new Date().toISOString()
    });
    if (notifyText) {
      setToastMsg(notifyText);
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  // Issue form state
  const [issueDate, setIssueDate] = useState(() => getLocalYmd());
  const [issueText, setIssueText] = useState('');
  const [issueLocation, setIssueLocation] = useState('1.1 Kệ linh kiện mẫu — Mặt kệ');
  const [issueFoundBy, setIssueFoundBy] = useState('Thao');
  const [issueAction, setIssueAction] = useState('');
  const [issueOwner, setIssueOwner] = useState('Diệm');
  const [issueDue, setIssueDue] = useState(() => getLocalYmd());

  const handleToggleRotation = (staffName: string, day: number) => {
    const key = `${staffName}-${day}`;
    const nextMarks = { ...monthData.rotationMarks, [key]: cycleMark(monthData.rotationMarks[key]) };
    persistMonthData({ ...monthData, rotationMarks: nextMarks });
  };

  const handleToggleDaily10m = (no: string, day: number) => {
    const key = `${no}-${day}`;
    const nextMarks = { ...monthData.daily10mMarks, [key]: cycleMark(monthData.daily10mMarks[key]) };
    persistMonthData({ ...monthData, daily10mMarks: nextMarks });
  };

  const handleMarkTodayAllOk = () => {
    const today = new Date();
    if (today.getFullYear() !== year || today.getMonth() + 1 !== month) {
      setToastMsg('Vui lòng chọn đúng Tháng/Năm hiện tại để chấm nhanh hôm nay.');
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }
    const d = today.getDate();
    const nextMarks = { ...monthData.daily10mMarks };
    DAILY_10M_ITEMS.forEach((item) => {
      nextMarks[`${item.no}-${d}`] = 'OK';
    });
    persistMonthData(
      { ...monthData, daily10mMarks: nextMarks },
      `Đã chấm đạt (✓) toàn bộ 10 phút 5S cho ngày ${d}/${month}!`
    );
  };

  const handleAddIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) return;
    const newIssue: FiveSIssue = {
      id: `5SI-${Date.now().toString().slice(-6)}`,
      date: issueDate,
      issue: issueText.trim(),
      location: issueLocation,
      foundBy: issueFoundBy,
      action: issueAction.trim() || 'Khắc phục ngay theo tiêu chuẩn 5S',
      owner: issueOwner,
      dueDate: issueDue,
      status: 'Mở'
    };
    persistMonthData(
      { ...monthData, issues: [newIssue, ...monthData.issues] },
      'Đã ghi nhận vấn đề 5S & đồng bộ lên Cloud!'
    );
    setIssueText('');
    setIssueAction('');
  };

  const handleToggleIssueStatus = (id: string) => {
    const nextIssues = monthData.issues.map((it) =>
      it.id === id ? { ...it, status: it.status === 'Mở' ? ('Đã xử lý' as const) : ('Mở' as const) } : it
    );
    persistMonthData({ ...monthData, issues: nextIssues }, 'Đã cập nhật trạng thái xử lý 5S.');
  };

  const handleDeleteIssue = (id: string) => {
    const nextIssues = monthData.issues.filter((it) => it.id !== id);
    persistMonthData({ ...monthData, issues: nextIssues }, 'Đã xóa dòng ghi chép 5S.');
  };

  const handleExport5sExcel = () => {
    try {
      const wb = XLSXStyle.utils.book_new();
      // Sheet 1: Tiêu chuẩn 5S
      const stdAoa = [
        ['CÔNG TY TNHH XE ĐIỆN DK VIỆT NHẬT — PHÒNG QLCL (DK QMS)'],
        [`TIÊU CHUẨN 5S KHU VỰC QLCL — THÁNG ${String(month).padStart(2, '0')}/${year}`],
        [],
        ['STT', 'Vị trí', 'Yêu cầu chi tiết'],
        ...QMS_5S_STANDARDS.map((s) => [s.code, s.location, s.requirements.map((r) => `- ${r}`).join('\n')])
      ];
      const ws1 = XLSXStyle.utils.aoa_to_sheet(stdAoa);
      ws1['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 70 }];
      XLSXStyle.utils.book_append_sheet(wb, ws1, 'Tieu chuan 5S');

      // Sheet 2: Kiểm tra luân phiên & 10 phút 5S
      const dayHeaders = daysArray.map((d) => String(d));
      const rotAoa = [
        [`KẾ HOẠCH KIỂM TRA 5S LUÂN PHIÊN & 10 PHÚT CUỐI GIỜ — THÁNG ${month}/${year}`],
        [],
        ['STT', 'QL vùng', ...dayHeaders],
        ...ROTATION_STAFF.map((s) => [
          s.stt,
          s.name,
          ...daysArray.map((d) => monthData.rotationMarks[`${s.name}-${d}`] || '')
        ]),
        [],
        ['No', 'Hạng mục 10 phút 5S', ...dayHeaders],
        ...DAILY_10M_ITEMS.map((item) => [
          item.no,
          item.item,
          ...daysArray.map((d) => monthData.daily10mMarks[`${item.no}-${d}`] || '')
        ])
      ];
      const ws2 = XLSXStyle.utils.aoa_to_sheet(rotAoa);
      ws2['!cols'] = [{ wch: 8 }, { wch: 28 }, ...daysArray.map(() => ({ wch: 4 }))];
      XLSXStyle.utils.book_append_sheet(wb, ws2, 'Lich & 10p 5S');

      // Sheet 3: Biểu ghi chép vấn đề
      const issueAoa = [
        [`BIỂU GHI CHÉP VẤN ĐỀ 5S — THÁNG ${month}/${year}`],
        [],
        ['Mã', 'Ngày', 'Vấn đề', 'Vị trí', 'Tìm bởi ai', 'Biện pháp xử lý', 'Bởi', 'Hạn', 'Trạng thái'],
        ...(monthData.issues.length > 0
          ? monthData.issues.map((it) => [
              it.id,
              formatDateStrVi(it.date),
              it.issue,
              it.location,
              it.foundBy,
              it.action,
              it.owner,
              formatDateStrVi(it.dueDate),
              it.status
            ])
          : [['Không phát sinh vấn đề 5S trong kỳ']])
      ];
      const ws3 = XLSXStyle.utils.aoa_to_sheet(issueAoa);
      ws3['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 32 }, { wch: 26 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
      XLSXStyle.utils.book_append_sheet(wb, ws3, 'Van de 5S');

      XLSXStyle.writeFile(wb, `DKBike_QLCL_5S_${monthKey}.xlsx`);
    } catch (err) {
      console.error('Lỗi xuất Excel 5S:', err);
    }
  };

  const filteredStandards = useMemo(() => {
    const q = stdSearch.trim().toLowerCase();
    if (!q) return QMS_5S_STANDARDS;
    return QMS_5S_STANDARDS.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.requirements.some((r) => r.toLowerCase().includes(q))
    );
  }, [stdSearch]);

  const openIssuesCount = monthData.issues.filter((i) => i.status === 'Mở').length;

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Quản lý 5S Khu vực QLCL (7930 × 5600 mm)
            </h2>
            <p className="text-xs text-slate-500">
              Tiêu chuẩn 14 vị trí, mặt bằng bố trí, lịch kiểm tra luân phiên, 10 phút 5S cuối giờ &amp; biểu ghi chép vấn đề (đồng bộ Cloud).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-800"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-800"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExport5sExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel 5S
            </button>
          </div>
        </div>

        {/* Sub-view navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200">
          {[
            { id: 'standards' as const, label: '1. Tiêu chuẩn & Mặt bằng (14)', icon: MapPin },
            { id: 'rotation' as const, label: '2. Lịch kiểm tra Tuần/Ngày (6 người)', icon: Users },
            { id: 'daily10m' as const, label: '3. 10 Phút 5S Cuối giờ', icon: ClipboardCheck },
            { id: 'issues' as const, label: `4. Ghi chép Vấn đề (${openIssuesCount} mở)`, icon: AlertTriangle }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {toastMsg && (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {toastMsg}
          </div>
        )}
      </div>

      {/* ==================== 1. TIÊU CHUẨN & MẶT BẰNG 5S ==================== */}
      {subView === 'standards' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Mặt bằng khu vực QLCL */}
          <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
            <div className="text-sm font-extrabold text-slate-900">
              Sơ đồ Mặt bằng 5S Khu vực QLCL (7930 × 5600 mm)
            </div>
            <div className="border border-slate-200 rounded-xl bg-slate-50 p-2">
              <svg viewBox="0 0 420 310" className="w-full h-auto">
                {/* Khung phòng 7930 x 5600 */}
                <rect x="24" y="20" width="350" height="248" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" strokeDasharray="8 4" />
                {/* Tường phải & đáy */}
                <line x1="374" y1="20" x2="374" y2="268" stroke="#0f172a" strokeWidth="3" />
                <line x1="24" y1="268" x2="374" y2="268" stroke="#0f172a" strokeWidth="3" />

                {/* Giá CB LK lắp mẫu */}
                <rect x="260" y="24" width="66" height="30" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" rx="3" />
                <text x="293" y="38" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1e3a8a">Giá CB LK</text>
                <text x="293" y="49" textAnchor="middle" fontSize="8" fill="#1e3a8a">lắp mẫu</text>

                {/* Khu vực KTTD */}
                <rect x="336" y="24" width="34" height="72" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" rx="3" />
                <text x="353" y="56" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#92400e">Khu</text>
                <text x="353" y="67" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#92400e">KTTD</text>

                {/* Kệ để linh kiện */}
                <rect x="336" y="102" width="34" height="126" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" rx="3" />
                <text x="353" y="160" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#065f46" transform="rotate(-90 353 160)">
                  Kệ để linh kiện
                </text>

                {/* Tủ đồ trưng bày, tài liệu 2970*600*800 */}
                <rect x="200" y="232" width="166" height="32" fill="#f1f5f9" stroke="#334155" strokeWidth="1.5" rx="3" />
                <text x="283" y="247" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0f172a">Tủ đồ trưng bày, tài liệu</text>
                <text x="283" y="258" textAnchor="middle" fontSize="8" fill="#475569">2970 × 600 × 800</text>

                {/* Khu vực để xe mẫu */}
                <rect x="256" y="112" width="52" height="86" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" strokeDasharray="3 3" rx="4" />
                <text x="282" y="152" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#334155">Vị trí</text>
                <text x="282" y="164" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#334155">xe mẫu</text>

                {/* Bàn họp, bàn tiếp khách 1800*1200 */}
                <rect x="50" y="154" width="96" height="54" fill="#eef2ff" stroke="#4f46e5" strokeWidth="1.5" rx="4" />
                <text x="98" y="177" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#312e81">Bàn họp / Tiếp khách</text>
                <text x="98" y="190" textAnchor="middle" fontSize="8" fill="#4338ca">1800 × 1200</text>
                {[64, 98, 132].map((cx) => (
                  <g key={cx}>
                    <circle cx={cx} cy="144" r="7" fill="#e2e8f0" stroke="#64748b" />
                    <circle cx={cx} cy="218" r="7" fill="#e2e8f0" stroke="#64748b" />
                  </g>
                ))}

                {/* Kích thước */}
                <text x="200" y="295" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a">7930 mm</text>
                <text x="283" y="281" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#334155">2980 mm</text>
                <text x="398" y="145" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a" transform="rotate(90 398 145)">5600 mm</text>
              </svg>
            </div>
            <p className="text-[11px] text-slate-500">
              Quy định kiểm tra: Thực hiện 10–15 phút cuối ca hàng ngày; đảm bảo toàn bộ các vùng được kiểm tra tối thiểu 1 lần/tuần.
            </p>
          </div>

          {/* Danh sách 14 tiêu chuẩn */}
          <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-extrabold text-slate-900">
                Yêu cầu 5S chi tiết theo Vị trí ({filteredStandards.length}/18 mục)
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={stdSearch}
                  onChange={(e) => setStdSearch(e.target.value)}
                  placeholder="Tìm vị trí, yêu cầu..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border-2 border-slate-300 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredStandards.map((s) => (
                <div key={s.code} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <div className="font-extrabold text-slate-900">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] mr-1.5">
                      {s.code}
                    </span>
                    {s.location}
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-slate-700 list-disc list-inside">
                    {s.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. LỊCH KIỂM TRA LUÂN PHIÊN (6 NGƯỜI) ==================== */}
      {subView === 'rotation' && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Kế hoạch kiểm tra thực hiện 5S hàng ngày / hàng tuần — Tháng {month}/{year}
              </div>
              <p className="text-xs text-slate-500">
                Bấm vào từng ô ngày để đổi trạng thái: <b>O</b> (Kế hoạch) → <b>✓</b> (Thực hiện) → <b>X</b> (Có vấn đề) → Trống.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
                  <th className="p-2 text-center font-bold sticky left-0 bg-slate-100 z-10">STT</th>
                  <th className="p-2 text-left font-bold sticky left-9 bg-slate-100 z-10 min-w-[90px]">QL vùng</th>
                  {daysArray.map((d) => (
                    <th key={d} className="p-1 text-center font-bold min-w-[30px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROTATION_STAFF.map((s) => (
                  <tr key={s.name} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2 text-center font-bold sticky left-0 bg-white z-10">{s.stt}</td>
                    <td className="p-2 font-extrabold text-slate-900 sticky left-9 bg-white z-10">{s.name}</td>
                    {daysArray.map((d) => (
                      <td key={d} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleRotation(s.name, d)}
                          className="cursor-pointer hover:scale-110 transition"
                          title={`${s.name} — Ngày ${d}/${month}/${year}`}
                        >
                          <MarkBadge mark={monthData.rotationMarks[`${s.name}-${d}`]} />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== 3. 10 PHÚT 5S CUỐI GIỜ ==================== */}
      {subView === 'daily10m' && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Kế hoạch kiểm tra &amp; thực hiện 10 Phút 5S Cuối giờ — Tháng {month}/{year}
              </div>
              <p className="text-xs text-slate-500">
                Bấm từng ô để chuyển trạng thái: <b>O</b> (Kế hoạch) → <b>✓</b> (Đã làm 5S) → <b>X</b> (Bất thường) → Trống.
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkTodayAllOk}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Chấm đạt (✓) hôm nay
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-300">
                  <th className="p-2 text-center font-bold sticky left-0 bg-slate-100 z-10">No</th>
                  <th className="p-2 text-left font-bold sticky left-10 bg-slate-100 z-10 min-w-[165px]">Hạng mục</th>
                  <th className="p-2 text-left font-bold min-w-[190px]">Cách thức</th>
                  {daysArray.map((d) => (
                    <th key={d} className="p-1 text-center font-bold min-w-[30px]">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAILY_10M_ITEMS.map((item) => (
                  <tr key={item.no} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2 text-center font-bold sticky left-0 bg-white z-10">{item.no}</td>
                    <td className="p-2 font-bold text-slate-900 sticky left-10 bg-white z-10">{item.item}</td>
                    <td className="p-2 text-slate-600">{item.method}</td>
                    {daysArray.map((d) => (
                      <td key={d} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleDaily10m(item.no, d)}
                          className="cursor-pointer hover:scale-110 transition"
                          title={`${item.item} — Ngày ${d}/${month}/${year}`}
                        >
                          <MarkBadge mark={monthData.daily10mMarks[`${item.no}-${d}`]} />
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== 4. BIỂU GHI CHÉP VẤN ĐỀ 5S ==================== */}
      {subView === 'issues' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={handleAddIssue}
            className="lg:col-span-4 bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm space-y-3"
          >
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" /> Ghi nhận vấn đề 5S mới
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày phát hiện</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tìm bởi ai</label>
                <select
                  value={issueFoundBy}
                  onChange={(e) => setIssueFoundBy(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
                >
                  {ROTATION_STAFF.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Vị trí</label>
              <select
                value={issueLocation}
                onChange={(e) => setIssueLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
              >
                {QMS_5S_STANDARDS.map((s) => (
                  <option key={s.code} value={`${s.code} ${s.location}`}>
                    {s.code} — {s.location}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Vấn đề phát hiện *</label>
              <textarea
                rows={2}
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder="VD: Khay ốc trên mặt kệ thiếu tem nhãn..."
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
                required
              />
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Biện pháp xử lý / CM</label>
              <textarea
                rows={2}
                value={issueAction}
                onChange={(e) => setIssueAction(e.target.value)}
                placeholder="VD: In và dán lại tem nhãn chuẩn..."
                className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phụ trách xử lý</label>
                <select
                  value={issueOwner}
                  onChange={(e) => setIssueOwner(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
                >
                  {ROTATION_STAFF.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Hạn hoàn thành</label>
                <input
                  type="date"
                  value={issueDue}
                  onChange={(e) => setIssueDue(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border-2 border-slate-300"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              + Lưu vấn đề 5S
            </button>
          </form>

          <div className="lg:col-span-8 bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-sm">
            <div className="text-sm font-extrabold text-slate-900 mb-3">
              Biểu ghi chép vấn đề 5S — Tháng {month}/{year} ({monthData.issues.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300">
                    <th className="p-2 font-bold">Ngày</th>
                    <th className="p-2 font-bold">Vị trí &amp; Vấn đề</th>
                    <th className="p-2 font-bold">Tìm bởi</th>
                    <th className="p-2 font-bold">Biện pháp xử lý</th>
                    <th className="p-2 font-bold">Bởi / Hạn</th>
                    <th className="p-2 font-bold">Trạng thái</th>
                    <th className="p-2 font-bold text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {monthData.issues.map((it) => (
                    <tr key={it.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 whitespace-nowrap">{formatDateStrVi(it.date)}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{it.issue}</div>
                        <div className="text-[11px] text-slate-500">{it.location}</div>
                      </td>
                      <td className="p-2 font-semibold">{it.foundBy}</td>
                      <td className="p-2">{it.action}</td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="font-semibold">{it.owner}</div>
                        <div className="text-[11px] text-slate-500">{formatDateStrVi(it.dueDate)}</div>
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => handleToggleIssueStatus(it.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                            it.status === 'Đã xử lý'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {it.status}
                        </button>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteIssue(it.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {monthData.issues.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        Chưa có vấn đề 5S nào được ghi nhận trong Tháng {month}/{year}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

