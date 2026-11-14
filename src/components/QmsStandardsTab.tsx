import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Car,
  Check,
  ClipboardCheck,
  Edit3,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
  X
} from 'lucide-react';
import { safeStorage } from '../safeStorage';

type StandardMainSection = 'parts_link' | 'sample_eval' | 'vehicle_guide';
type VehicleSubFilter = 'all' | 'A' | 'B' | 'C' | 'D';

interface SampleEvalRow {
  groupId: 'I' | 'II' | 'III' | 'IV';
  groupTitle: string;
  sttGroup: string;
  sttPoint: string;
  item: string;
  checkPoint: string;
  description: string;
  standard: string;
  method: string;
}

interface VehicleGuideABRow {
  section: 'A' | 'B';
  stt: string;
  position: string;
  guide: string;
  standard: string;
  tool: string;
  frequency: string;
}

interface VehicleGuideCDRow {
  section: 'C' | 'D';
  stt: string;
  item: string;
  standard: string;
}

const COMPONENT_LINK_STORAGE_KEY = 'dk_qms_component_standards_link';
const STANDARDS_DATA_STORAGE_KEY = 'dk_qms_standards_custom_v1';

const SAMPLE_EVAL_ROWS: SampleEvalRow[] = [
  // I. Ngoại quan
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '1',
    sttPoint: '1',
    item: 'Dàn nhựa',
    checkPoint: 'Khe hở lắp ráp',
    description: 'Là khoảng cách giữa các tấm nhựa ốp (ốp đầu, yếm, thân).',
    standard: 'Các khớp nối giữa ốp đầu, yếm, thân xe phải < 1mm (hoặc theo spec), đều nhau 2 bên',
    method: 'Thước căn lá'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '',
    sttPoint: '2',
    item: 'Dàn nhựa',
    checkPoint: 'Chất lượng nhựa',
    description: 'KT chất lượng nhựa, dầy mỏng, bề mặt nhựa, độ cứng nhựa.',
    standard: 'Nhựa dầy > 3mm, cầm vào có cảm giác cứng cáp. Không bị giòn dễ vỡ khi sử dụng tay tác động',
    method: 'Thao tác tay'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '',
    sttPoint: '3',
    item: 'Dàn nhựa',
    checkPoint: 'Độ chắc chắn',
    description: 'Các tiếng "lọc cọc", "rè rè" phát ra từ vỏ xe khi đi đường xóc hoặc khi vỗ mạnh.',
    standard: 'Vỗ nhẹ vào các tấm nhựa, không phát ra tiếng kêu lọc cọc (lỏng phe/ngàm)',
    method: 'Thao tác tay'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '2',
    sttPoint: '4',
    item: 'Yên xe',
    checkPoint: 'Chất lượng da',
    description: 'KT',
    standard: 'Đường may thẳng, không nhăn. Da không bị phồng rộp',
    method: 'Quan sát'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '',
    sttPoint: '5',
    item: 'Yên xe',
    checkPoint: 'Cơ cấu khóa yên',
    description: 'Thử KT độ êm và chắc chắn của khóa yên, đảm bảo chắc chắn và an toàn',
    standard: 'Đóng/mở nhẹ nhàng. Bản lề yên không lắc ngang quá 3mm',
    method: 'Thao tác'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '3',
    sttPoint: '6',
    item: 'Cụm tay lái',
    checkPoint: 'Cụm công tắc',
    description: 'KT các nút hoạt động êm, không cứng, hoạt động đúng chức năng khi tác động',
    standard: 'Nút bấm (nhan, còi, đèn) nảy tốt, không kẹt, ký hiệu in rõ nét',
    method: 'Bấm thử'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '',
    sttPoint: '7',
    item: 'Cụm tay lái',
    checkPoint: 'Tay nắm',
    description: 'KT tình trạng chắc chắn của tay nắm',
    standard: 'Cao su bám tay, không bị xoay tròn quanh ghi-đông',
    method: 'Vặn mạnh'
  },
  {
    groupId: 'I',
    groupTitle: 'I. Ngoại quan',
    sttGroup: '4',
    sttPoint: '8',
    item: 'Chân chống',
    checkPoint: 'Chân chống cạnh/giữa',
    description: 'KT độ ồn khi sử dụng, góc nghiêng khi sử dụng, để đảm bảo xe không bị đổ khi dựng',
    standard: 'Bật lên/xuống dứt khoát, lò xo đủ lực giữ không bị tuột khi đi đường xóc',
    method: 'Thao tác'
  },

  // II. Hệ thống điện
  {
    groupId: 'II',
    groupTitle: 'II. Hệ thống điện',
    sttGroup: '1',
    sttPoint: '1',
    item: 'Đồng hồ',
    checkPoint: 'Hiển thị ngoài trời',
    description: 'Mang xe ra giữa trời nắng gắt (tầm 12h trưa) để xem có đọc được số km/h không.',
    standard: 'Nhìn rõ thông số (Tốc độ, % Pin) dưới trời nắng gắt',
    method: 'Quan sát nắng'
  },
  {
    groupId: 'II',
    groupTitle: 'II. Hệ thống điện',
    sttGroup: '',
    sttPoint: '2',
    item: 'Đồng hồ',
    checkPoint: 'Báo lỗi',
    description: 'KT tính năng hiển thị báo lỗi khi tháo lần lượt các rắc liên quan (Rắc động cơ, ngắt phanh, IC…)',
    standard: 'Hiển thị đầy đủ các tính năng trên mặt đồng hồ',
    method: 'Quan sát'
  },
  {
    groupId: 'II',
    groupTitle: 'II. Hệ thống điện',
    sttGroup: '2',
    sttPoint: '3',
    item: 'Đèn chiếu sáng',
    checkPoint: 'Độ sáng',
    description: 'KT độ chiếu sáng. Vị trí đèn sáng, phạm vi tỏa sáng',
    standard: 'Đèn pha đủ sáng, vùng chiếu sáng không gây chói mắt người đối diện',
    method: 'Máy đo Lux/Tường'
  },
  {
    groupId: 'II',
    groupTitle: 'II. Hệ thống điện',
    sttGroup: '',
    sttPoint: '4',
    item: 'Đèn chiếu sáng',
    checkPoint: 'Đèn tín hiệu',
    description: 'KT đèn xi nhan, độ sáng, khoảng cách giữa 2 đèn xi nhan, màu sắc đèn',
    standard: 'Xi nhan, đèn hậu sáng rõ, tần số nháy đúng chuẩn (60-120 lần/phút)',
    method: 'Bấm giờ'
  },
  {
    groupId: 'II',
    groupTitle: 'II. Hệ thống điện',
    sttGroup: '3',
    sttPoint: '7',
    item: 'Smartkey / App',
    checkPoint: 'Kết nối',
    description: 'KT kết nối của xe.',
    standard: 'Mở khóa xe nhanh (< 2s), tìm xe trong bãi hoạt động tốt',
    method: 'Thử nghiệm'
  },

  // III. Hệ thống lái
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '1',
    sttPoint: '1',
    item: 'Động cơ & Ga',
    checkPoint: 'Độ trễ ga',
    description: 'Khoảng thời gian từ lúc bạn vặn tay ga đến lúc bánh xe thực sự quay.',
    standard: 'Xe phản hồi ngay khi vặn ga, không bị "hụt" (Trễ) quá 0.5s',
    method: 'Lái thử'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '',
    sttPoint: '2',
    item: 'Động cơ & Ga',
    checkPoint: 'Khởi hành',
    description: 'Thực hiện khởi hành KT độ giật của ga.',
    standard: 'Xe lăn bánh mượt mà, không bị giật cục, không có hiện tượng giật ga đầu ở dải tốc độ thấp (0-10km/h)',
    method: 'Lái thử chậm'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '',
    sttPoint: '3',
    item: 'Động cơ & Ga',
    checkPoint: 'Leo dốc',
    description: 'Thử dừng xe giữa dốc (hầm chung cư), sau đó vặn ga đi tiếp',
    standard: 'Không bị tụt tua/ngắt động cơ khi leo dốc hầm chung cư (thường 9-15 độ)',
    method: 'Test dốc'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '2',
    sttPoint: '4',
    item: 'Phanh (Brakes)',
    checkPoint: 'Hiệu quả phanh',
    description: 'Đảm bảo phanh đúng chức năng. Khi không sử dụng, dắt xe hoặc quay bánh trên không không bị cản lại',
    standard: 'Quãng đường phanh đạt chuẩn. Không có tiếng kêu rít (Squeal noise)',
    method: 'Đo mét'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '',
    sttPoint: '5',
    item: 'Phanh (Brakes)',
    checkPoint: 'Ngắt động cơ',
    description: 'Khi bóp phanh (dù chỉ bóp nhẹ), động cơ phải lập tức ngắt điện, dù tay ga vẫn đang vặn.',
    standard: 'Khi bóp phanh, động cơ phải tự ngắt điện',
    method: 'Vừa ga vừa phanh'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '3',
    sttPoint: '6',
    item: 'Giảm xóc & Khung',
    checkPoint: 'Qua gờ giảm tốc',
    description: 'Chạy nhanh qua gờ giảm tốc hoặc ổ gà.',
    standard: 'Không có tiếng "kịch" (Bottom out) ở giảm xóc. Nhựa đầu xe không rung lắc mạnh',
    method: 'Đường xấu'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '',
    sttPoint: '7',
    item: 'Giảm xóc & Khung',
    checkPoint: 'Cổ phốt',
    description: 'KT tình trạng độ dơ, êm ái khi vào góc cua hoặc khi đi tốc độ cao',
    standard: 'Không bị sượng, không bị lạng tay lái khi chạy tốc độ > 40km/h',
    method: 'Lái thử'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '',
    sttPoint: '8',
    item: 'Giảm xóc & Khung',
    checkPoint: 'Giảm xóc',
    description: 'Kiểm tra độ êm khi nhún giảm xóc',
    standard: 'Nhún tại chỗ và khi đi qua gờ cao',
    method: 'Lái thử'
  },
  {
    groupId: 'III',
    groupTitle: 'III. Hệ thống lái',
    sttGroup: '',
    sttPoint: '9',
    item: 'Giảm xóc & Khung',
    checkPoint: 'Cảm giác lái',
    description: 'Cảm giác lái khi đi trên đường thẳng vào đường cua',
    standard: 'Đi thử đường thẳng và vào cua',
    method: 'Lái thử'
  },

  // IV. Thông số chạy
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '1',
    sttPoint: '1',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Sai số đồng hồ tốc độ (Ở tốc độ 40km/h)',
    standard: '-10% đến +15% (36-46 km/h)',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '2',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Vận tốc lớn nhất',
    standard: '41-45 (km/h)',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '3',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Lực phanh bánh trước',
    standard: '≥ 440N',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '4',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Lực phanh bánh sau',
    standard: '≥ 420N',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '5',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Độ không trùng vết',
    standard: '(-5)-5 mm/m',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '6',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Âm lượng còi',
    standard: '65-115 dB',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '7',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Đo ánh sáng',
    standard: 'Không lệch lên (giá trị đo ≥ 0)\nKhông lệch trái quá 1/100 (giá trị đo ≥ -10; ≤ 0)\nKhông lệch phải quá 2/100 (giá trị đo ≥ 0; ≤ 20)\nKhông lệch dưới quá 2/100 (giá trị đo ≤ 200)',
    method: 'Máy đo ánh sáng'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '8',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Điện áp bảo vệ khi sụt áp',
    standard: '(Tuỳ vào IC điều khiển mỗi dòng xe)',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '9',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Dòng điện bảo vệ khi quá dòng / Dòng điện chạy',
    standard: '(Tuỳ vào IC điều khiển mỗi dòng xe)',
    method: 'Thiết bị kiểm tra'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '10',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Độ ồn ống xả',
    standard: '≤ 95dB',
    method: 'Máy đo độ ồn'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '11',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Nồng độ CO',
    standard: 'CO ≤ 4.5%',
    method: 'Thiết bị đo khí xả'
  },
  {
    groupId: 'IV',
    groupTitle: 'IV. Thông số chạy',
    sttGroup: '',
    sttPoint: '12',
    item: 'Thiết bị',
    checkPoint: 'Thông số hiển thị',
    description: 'Nồng độ HC',
    standard: 'HC ≤ 1200 ppm',
    method: 'Thiết bị đo khí xả'
  }
];

const VEHICLE_GUIDE_AB_ROWS: VehicleGuideABRow[] = [
  // A. Kiểm tra ngoại quan
  {
    section: 'A',
    stt: '1',
    position: 'Trục trước, vành, bánh, củ phanh trước',
    guide: 'Độ chắc chắn các chi tiết\nĐộ tròn bánh\nĐủ ốc, trục, có đánh dấu mực ở Bulong + trục',
    standard: 'Đầy đủ, chắc chắn',
    tool: 'Cờ-lê cân lực',
    frequency: '5 xe 1 lần'
  },
  {
    section: 'A',
    stt: '',
    position: 'Yếm trước, tem, logo, xi nhan',
    guide: 'Đầy đủ, chắc chắn',
    standard: 'Đầy đủ, chắc chắn',
    tool: 'Quan sát',
    frequency: '100%'
  },
  {
    section: 'A',
    stt: '2',
    position: 'Yếm trước, tem, logo, xi nhan',
    guide: 'Không trầy xước, biến dạng',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện:\n1. Độ rộng vết xước nhỏ hơn hoặc bằng sợi tóc\n2. Độ dài vết xước < 5mm\n3. Không lộ vết xước quá 2/5 hướng nhìn (thẳng, trên, dưới, trái, phải)',
    tool: 'Quan sát, Thước',
    frequency: 'Khi phát hiện xước'
  },
  {
    section: 'A',
    stt: '3',
    position: 'Ốp đầu, ghi đông, cụm công tắc',
    guide: 'Độ chắc chắn ghi đông, thăng bằng ghi đông',
    standard: '2 tay lái cân bằng độ thăng bằng chênh lệch < 2 độ',
    tool: 'Bằng mắt, Thước cân bằng',
    frequency: '100% / 30%'
  },
  {
    section: 'A',
    stt: '',
    position: 'Ốp đầu, ghi đông, cụm công tắc',
    guide: 'Độ kín khít nhựa',
    standard: 'Độ hở < 0,8mm ± 0,2 mm\nKhông quá 1 vị trí hở',
    tool: 'Thước đo khe hở',
    frequency: 'Khi phát hiện vị trí hở'
  },
  {
    section: 'A',
    stt: '',
    position: 'Ốp đầu, ghi đông, cụm công tắc',
    guide: 'Không trầy xước, biến dạng',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện',
    tool: 'Bằng mắt',
    frequency: 'Khi phát hiện xước'
  },
  {
    section: 'A',
    stt: '4',
    position: 'Yếm sau, ổ khóa, móc treo',
    guide: 'Đủ ốc. Không trầy xước, biến dạng',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện',
    tool: 'Bằng mắt',
    frequency: 'Khi phát hiện xước, biến dạng'
  },
  {
    section: 'A',
    stt: '',
    position: 'Yếm sau, ổ khóa, móc treo',
    guide: 'Khóa cổ chắc chắn',
    standard: 'Không: rung, lắc, lỏng, lệch vị trí',
    tool: 'Bằng tay, bằng mắt',
    frequency: '100%'
  },
  {
    section: 'A',
    stt: '5',
    position: 'Sàn, gầm',
    guide: 'Độ kín khít nhựa',
    standard: 'Độ hở < 0,8mm ± 0,2 mm\nKhông quá 1 vị trí hở',
    tool: 'Thước đo khe hở',
    frequency: 'Khi phát hiện vị trí hở'
  },
  {
    section: 'A',
    stt: '',
    position: 'Sàn, gầm',
    guide: 'Đủ ốc. Không trầy xước, biến dạng',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện',
    tool: 'Bằng mắt',
    frequency: 'Khi phát hiện xước'
  },
  {
    section: 'A',
    stt: '6',
    position: 'Sườn trái, càng sau',
    guide: 'Độ kín khít nhựa\nKhông trầy xước, biến dạng\nCàng sau đủ ốc, đủ tem chắc chắn',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện',
    tool: 'Bằng mắt',
    frequency: '100%'
  },
  {
    section: 'A',
    stt: '7',
    position: 'Ốp đuôi, chắn bùn sau, đèn hậu',
    guide: 'Độ kín khít nhựa',
    standard: 'Độ hở < 0,8mm ± 0,2 mm\nKhông quá 1 vị trí hở',
    tool: 'Thước đo khe hở',
    frequency: 'Khi phát hiện vị trí hở'
  },
  {
    section: 'A',
    stt: '',
    position: 'Ốp đuôi, chắn bùn sau, đèn hậu',
    guide: 'Không trầy xước, biến dạng',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện',
    tool: 'Bằng mắt',
    frequency: 'Khi phát hiện xước'
  },
  {
    section: 'A',
    stt: '',
    position: 'Ốp đuôi, chắn bùn sau, đèn hậu',
    guide: 'Chắn bùn thẳng tâm bánh sau',
    standard: 'Lấy rãnh giữa lốp sau làm chuẩn, soi máy\nĐộ lệch tâm lốp và điểm giữa tay xách < 1cm',
    tool: 'Máy Laser cân bằng, Thước',
    frequency: 'Kiểm tra bằng mắt 100%; phát hiện lệch đo bằng máy'
  },
  {
    section: 'A',
    stt: '8',
    position: 'Sườn phải, càng sau',
    guide: 'Độ kín khít nhựa\nKhông trầy xước, biến dạng\nCàng sau đủ ốc, đủ tem chắc chắn',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện',
    tool: 'Bằng mắt',
    frequency: 'Khi phát hiện xước'
  },
  {
    section: 'A',
    stt: '9',
    position: 'Phản quang, tay xách',
    guide: 'Độ chắc chắn, Không trầy xước, biến dạng',
    standard: 'Cho phép 1 vết xước đáp ứng lần lượt 3 điều kiện\nKhông: rung, lắc, lỏng, lệch vị trí',
    tool: 'Bằng mắt, bằng tay',
    frequency: 'Khi phát hiện xước'
  },
  {
    section: 'A',
    stt: '',
    position: 'Phản quang, tay xách',
    guide: 'Có phản quang lại ánh sáng',
    standard: 'Soi đèn vào phản quang kiểm tra phản quang ánh sáng (có/không)',
    tool: 'Đèn LED',
    frequency: 'Kiểm tra bằng đèn LED 5 xe đầu LSX'
  },
  {
    section: 'A',
    stt: '10',
    position: 'Yên cốp',
    guide: 'Không rách, không xước. Đóng mở yên linh hoạt\nĐủ phụ kiện',
    standard: 'Đạt yêu cầu ngoại quan & phụ kiện đầy đủ',
    tool: 'Bằng mắt',
    frequency: '100%'
  },
  {
    section: 'A',
    stt: '11',
    position: 'Cổ phốt',
    guide: 'Không mắc, kẹt, quay linh hoạt',
    standard: 'Quay nhẹ nhàng, không sượng/kẹt',
    tool: 'Bằng tay',
    frequency: '100%'
  },
  {
    section: 'A',
    stt: '12',
    position: 'Giảm xóc sau, bánh sau',
    guide: 'Đủ ốc, chắc chắn, đủ hơi lốp. Vành mới không dập, móp méo',
    standard: 'Đủ ốc, lốp đủ hơi, vành không dập/móp',
    tool: 'Bằng mắt',
    frequency: '100%'
  },

  // B. Kiểm tra hệ thống điện, dừng, rẽ, lái (Cấp nguồn 60V trước khi kiểm tra)
  {
    section: 'B',
    stt: '1',
    position: 'Khóa điện',
    guide: 'Kiểm tra đóng mở khóa điện và các nấc chức năng',
    standard: 'Hoạt động bình thường (HĐBT). Đủ chức năng, tắt mở dễ dàng',
    tool: 'Thao tác trực tiếp',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '2',
    position: 'Còi',
    guide: 'HĐBT. Kêu vang, không chạm, rè.',
    standard: 'HĐBT. Kêu vang, không chạm, rè.\nĐộ lớn âm thanh: 65-115 dB',
    tool: 'Bằng tai, Máy đo tiếng ồn',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '3',
    position: 'Xi nhan (trước, sau)',
    guide: 'HĐBT. Đúng hướng với công tắc điều khiển',
    standard: 'HĐBT. Đúng hướng với công tắc điều khiển',
    tool: 'Quan sát',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '4',
    position: 'Đèn: Pha, cốt, đèn hậu, đèn phanh, đèn soi biển, đèn cảnh báo',
    guide: 'Tất cả HĐBT. Đúng chức năng công tắc điều khiển',
    standard: 'Tất cả HĐBT. Đúng chức năng công tắc điều khiển\nĐộ chiếu cao thấp đèn pha cốt đúng tiêu chuẩn',
    tool: 'Quan sát',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '',
    position: 'Đèn: Pha, cốt, đèn hậu, đèn phanh, đèn soi biển, đèn cảnh báo',
    guide: 'Kiểm tra độ sáng đèn pha, đèn cốt',
    standard: 'Đèn pha > 1000cd, đèn cốt đạt chuẩn',
    tool: 'Máy đo ánh sáng',
    frequency: '10% (0.1)'
  },
  {
    section: 'B',
    stt: '',
    position: 'Đèn: Pha, cốt, đèn hậu, đèn phanh, đèn soi biển, đèn cảnh báo',
    guide: 'Kiểm tra độ cao, thấp đèn pha, đèn cốt',
    standard: 'Đúng tiêu chuẩn góc chiếu sáng',
    tool: 'Máy đo ánh sáng',
    frequency: '10% (0.1)'
  },
  {
    section: 'B',
    stt: '5',
    position: 'Hoạt động động cơ',
    guide: 'Động cơ chạy bình thường, không có tiếng kêu lạ, đúng số tốc độ điều khiển\nNgắt động cơ khi phanh',
    standard: 'Chạy êm, đúng cấp tốc độ, ngắt điện ngay khi bóp phanh',
    tool: 'Thao tác trực tiếp',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '6',
    position: 'Mặt đồng hồ',
    guide: 'Hiển thị đầy đủ chức năng (Tốc độ, báo pin, báo nhan, báo pha, báo ngắt phanh)\nKhông thiếu nét, mờ, nhấp nháy,…',
    standard: 'Hiển thị rõ nét, đầy đủ thông số',
    tool: 'Quan sát',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '7',
    position: 'Báo động',
    guide: 'Kiểm tra còi báo động / chống trộm',
    standard: 'HĐBT. Đủ chức năng, tắt mở dễ dàng',
    tool: 'Thao tác trực tiếp',
    frequency: '100%'
  },
  {
    section: 'B',
    stt: '8',
    position: 'Phanh',
    guide: 'Đủ chức năng ngắt phanh. Độ nảy bật tay phanh\nPhanh chắc chắn, dừng xe an toàn.\nKhông có tiếng động lạ khi quay bánh và di chuyển xe',
    standard: 'Ngắt động cơ khi phanh, phanh ăn chắc, không bó kẹt',
    tool: 'Thao tác trực tiếp',
    frequency: '100%'
  }
];

const VEHICLE_GUIDE_CD_ROWS: VehicleGuideCDRow[] = [
  // C. Kiểm tra trên thiết bị đăng kiểm
  { section: 'C', stt: '1', item: 'Sai số đồng hồ tốc độ (Ở tốc độ 40km/h)', standard: '-10% đến +15% (36-46 km/h)' },
  { section: 'C', stt: '2', item: 'Vận tốc lớn nhất', standard: '41-45 (km/h)' },
  { section: 'C', stt: '3', item: 'Lực phanh bánh trước', standard: '≥ 440N' },
  { section: 'C', stt: '4', item: 'Lực phanh bánh sau', standard: '≥ 420N' },
  { section: 'C', stt: '5', item: 'Độ không trùng vết', standard: '(-5)-5 mm/m' },
  { section: 'C', stt: '6', item: 'Âm lượng còi', standard: '65-115 dB' },
  {
    section: 'C',
    stt: '7',
    item: 'Đo ánh sáng',
    standard: 'Không lệch lên (giá trị đo ≥ 0)\nKhông lệch trái quá 1/100 (giá trị đo ≥ -10; ≤ 0)\nKhông lệch phải quá 2/100 (giá trị đo ≥ 0; ≤ 20)\nKhông lệch dưới quá 2/100 (giá trị đo ≤ 200)'
  },
  { section: 'C', stt: '8', item: 'Điện áp bảo vệ khi sụt áp', standard: '(Tuỳ vào IC điều khiển mỗi dòng xe)' },
  { section: 'C', stt: '9', item: 'Dòng điện bảo vệ khi quá dòng', standard: '(Tuỳ vào IC điều khiển mỗi dòng xe)' },
  { section: 'C', stt: '10', item: 'Độ ồn ống xả', standard: '≤ 95dB' },
  { section: 'C', stt: '11', item: 'Nồng độ CO', standard: 'CO ≤ 4.5%' },
  { section: 'C', stt: '12', item: 'Nồng độ HC', standard: 'HC ≤ 1200 ppm' },

  // D. Chạy thử trên đường chạy thử để kiểm tra
  { section: 'D', stt: '1', item: 'Hệ thống phanh', standard: 'An toàn, nhẹ nhàng, ổn định\nKhông khó thao tác phanh, Không dít bánh' },
  { section: 'D', stt: '2', item: 'Tốc độ', standard: 'Khả năng lên tốc độ nhanh/chậm/vừa phải\nTốc độ tối đa khi đi 1 người, 2 người\nĐộ giật ga đầu thấp, độ giật khi nhả ngắt phanh thấp.' },
  { section: 'D', stt: '3', item: 'Cảm giác lái, ngồi', standard: 'Tư thế thoải mái, thẳng, không cong lưng\nThăng bằng, an toàn\nĐộ run, rung của xe' },
  { section: 'D', stt: '4', item: 'Tay lái', standard: 'Thẳng tâm, cân đều 2 bên so với tâm xe\nKhông bị liệng, mất lái' },
  { section: 'D', stt: '5', item: 'Hệ thống treo/giảm xóc', standard: 'Cứng/mềm/vừa phải\nHành trình giảm xóc trước sau > 5; < 10cm' },
  {
    section: 'D',
    stt: '6',
    item: 'Tiếng ồn',
    standard: 'Không gây tiếng ồn khi đi đường bằng\nKhông có tiếng ồn các linh kiện như Nhựa, chân chống, càng, phanh xe, tiếng va đập của rắc điện với nhựa và khung xe.\nNhấn, nhả các chi tiết nhựa không có tình trạng ọp ẹp.\nTất cả tiếng ồn không gây khó chịu, độ ồn < 60dB'
  },
  { section: 'D', stt: '7', item: 'Gầm xe', standard: 'Đi thử đường lên/xuống dốc, lên xuống bậc vỉa hè 10cm Không chạm gầm' }
];

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface SavedStandardsPayload {
  sampleRows?: SampleEvalRow[];
  vehicleABRows?: VehicleGuideABRow[];
  vehicleCDRows?: VehicleGuideCDRow[];
}

function loadSavedStandards(): SavedStandardsPayload | null {
  try {
    const raw = safeStorage.getItem(STANDARDS_DATA_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedStandardsPayload;
  } catch {
    return null;
  }
}

const SAMPLE_GROUP_TITLES: Record<'I' | 'II' | 'III' | 'IV', string> = {
  I: 'I. Ngoại quan',
  II: 'II. Hệ thống điện',
  III: 'III. Hệ thống lái',
  IV: 'IV. Thông số chạy'
};

type EditingTarget =
  | { kind: 'sample'; index: number | null; draft: SampleEvalRow }
  | { kind: 'ab'; index: number | null; draft: VehicleGuideABRow }
  | { kind: 'cd'; index: number | null; draft: VehicleGuideCDRow };

export default function QmsStandardsTab() {
  const [section, setSection] = useState<StandardMainSection>('sample_eval');
  const [vehicleSub, setVehicleSub] = useState<VehicleSubFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [partsLink, setPartsLink] = useState<string>(() => safeStorage.getItem(COMPONENT_LINK_STORAGE_KEY) || '');
  const [editingLink, setEditingLink] = useState(false);
  const [draftLink, setDraftLink] = useState(partsLink);

  const initialSaved = useMemo(() => loadSavedStandards(), []);
  const [sampleRows, setSampleRows] = useState<SampleEvalRow[]>(() => initialSaved?.sampleRows || SAMPLE_EVAL_ROWS);
  const [vehicleABRows, setVehicleABRows] = useState<VehicleGuideABRow[]>(() => initialSaved?.vehicleABRows || VEHICLE_GUIDE_AB_ROWS);
  const [vehicleCDRows, setVehicleCDRows] = useState<VehicleGuideCDRow[]>(() => initialSaved?.vehicleCDRows || VEHICLE_GUIDE_CD_ROWS);
  const [hasCustomEdits, setHasCustomEdits] = useState<boolean>(() => Boolean(initialSaved));
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);

  const persistStandards = (
    nextSample: SampleEvalRow[],
    nextAB: VehicleGuideABRow[],
    nextCD: VehicleGuideCDRow[]
  ) => {
    setSampleRows(nextSample);
    setVehicleABRows(nextAB);
    setVehicleCDRows(nextCD);
    setHasCustomEdits(true);
    safeStorage.setItem(
      STANDARDS_DATA_STORAGE_KEY,
      JSON.stringify({ sampleRows: nextSample, vehicleABRows: nextAB, vehicleCDRows: nextCD })
    );
  };

  const handleResetDefault = () => {
    if (!window.confirm('Khôi phục toàn bộ bảng tiêu chuẩn về nội dung mặc định ban đầu?')) return;
    setSampleRows(SAMPLE_EVAL_ROWS);
    setVehicleABRows(VEHICLE_GUIDE_AB_ROWS);
    setVehicleCDRows(VEHICLE_GUIDE_CD_ROWS);
    setHasCustomEdits(false);
    safeStorage.removeItem(STANDARDS_DATA_STORAGE_KEY);
  };

  const q = searchQuery.trim().toLowerCase();

  const indexedSampleRows = useMemo(() => {
    const mapped = sampleRows.map((row, idx) => ({ row, idx }));
    if (!q) return mapped;
    return mapped.filter(({ row: r }) =>
      [r.groupTitle, r.item, r.checkPoint, r.description, r.standard, r.method]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [sampleRows, q]);

  const filteredSampleRows = useMemo(() => indexedSampleRows.map((x) => x.row), [indexedSampleRows]);

  const indexedABRows = useMemo(() => {
    return vehicleABRows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row: r }) => {
        if (vehicleSub !== 'all' && r.section !== vehicleSub) return false;
        if (!q) return true;
        return [r.position, r.guide, r.standard, r.tool, r.frequency].join(' ').toLowerCase().includes(q);
      });
  }, [vehicleABRows, vehicleSub, q]);

  const filteredABRows = useMemo(() => indexedABRows.map((x) => x.row), [indexedABRows]);

  const indexedCDRows = useMemo(() => {
    return vehicleCDRows
      .map((row, idx) => ({ row, idx }))
      .filter(({ row: r }) => {
        if (vehicleSub !== 'all' && r.section !== vehicleSub) return false;
        if (!q) return true;
        return [r.item, r.standard].join(' ').toLowerCase().includes(q);
      });
  }, [vehicleCDRows, vehicleSub, q]);

  const filteredCDRows = useMemo(() => indexedCDRows.map((x) => x.row), [indexedCDRows]);

  const openAddModal = () => {
    if (section === 'sample_eval') {
      setEditingTarget({
        kind: 'sample',
        index: null,
        draft: {
          groupId: 'I',
          groupTitle: SAMPLE_GROUP_TITLES.I,
          sttGroup: '',
          sttPoint: String(sampleRows.length + 1),
          item: '',
          checkPoint: '',
          description: '',
          standard: '',
          method: ''
        }
      });
      return;
    }
    if (vehicleSub === 'C' || vehicleSub === 'D') {
      setEditingTarget({
        kind: 'cd',
        index: null,
        draft: {
          section: vehicleSub,
          stt: '',
          item: '',
          standard: ''
        }
      });
      return;
    }
    setEditingTarget({
      kind: 'ab',
      index: null,
      draft: {
        section: vehicleSub === 'B' ? 'B' : 'A',
        stt: '',
        position: '',
        guide: '',
        standard: '',
        tool: 'Mắt thường',
        frequency: '100% xe xuất xưởng'
      }
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;
    if (editingTarget.kind === 'sample') {
      const normalized: SampleEvalRow = {
        ...editingTarget.draft,
        groupTitle: SAMPLE_GROUP_TITLES[editingTarget.draft.groupId]
      };
      const next =
        editingTarget.index === null
          ? [...sampleRows, normalized]
          : sampleRows.map((r, i) => (i === editingTarget.index ? normalized : r));
      persistStandards(next, vehicleABRows, vehicleCDRows);
    } else if (editingTarget.kind === 'ab') {
      const next =
        editingTarget.index === null
          ? [...vehicleABRows, editingTarget.draft]
          : vehicleABRows.map((r, i) => (i === editingTarget.index ? editingTarget.draft : r));
      persistStandards(sampleRows, next, vehicleCDRows);
    } else {
      const next =
        editingTarget.index === null
          ? [...vehicleCDRows, editingTarget.draft]
          : vehicleCDRows.map((r, i) => (i === editingTarget.index ? editingTarget.draft : r));
      persistStandards(sampleRows, vehicleABRows, next);
    }
    setEditingTarget(null);
  };

  const handleDeleteTarget = () => {
    if (!editingTarget || editingTarget.index === null) return;
    if (!window.confirm('Xóa dòng tiêu chuẩn này?')) return;
    if (editingTarget.kind === 'sample') {
      persistStandards(
        sampleRows.filter((_, i) => i !== editingTarget.index),
        vehicleABRows,
        vehicleCDRows
      );
    } else if (editingTarget.kind === 'ab') {
      persistStandards(
        sampleRows,
        vehicleABRows.filter((_, i) => i !== editingTarget.index),
        vehicleCDRows
      );
    } else {
      persistStandards(
        sampleRows,
        vehicleABRows,
        vehicleCDRows.filter((_, i) => i !== editingTarget.index)
      );
    }
    setEditingTarget(null);
  };

  const handleSavePartsLink = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftLink.trim();
    setPartsLink(cleaned);
    safeStorage.setItem(COMPONENT_LINK_STORAGE_KEY, cleaned);
    setEditingLink(false);
  };

  const handlePrint = () => {
    const isSample = section === 'sample_eval';
    const title = isSample
      ? 'Tiêu chuẩn / Danh mục đánh giá mẫu'
      : 'Phiếu kết quả & Hướng dẫn kiểm tra đánh giá xe DK (4 hạng mục A–D)';

    const sampleBody = `
      <div class="meta-box">
        <span><strong>Model:</strong> ............................</span>
        <span><strong>Số khung:</strong> ............................</span>
        <span><strong>Ngày đánh giá:</strong> ............................</span>
        <span><strong>Người đánh giá:</strong> Thao, Việt, Phấn</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:32px;">STT</th>
            <th style="width:95px;">Hạng mục</th>
            <th style="width:95px;">Điểm KT</th>
            <th style="width:170px;">Diễn giải</th>
            <th>Tiêu chuẩn chấp nhận</th>
            <th style="width:80px;">Phương pháp</th>
            <th style="width:55px;">Kết quả</th>
            <th style="width:95px;">Đánh giá / Vấn đề</th>
          </tr>
        </thead>
        <tbody>
          ${(['I', 'II', 'III', 'IV'] as const)
            .map((grp) => {
              const rows = filteredSampleRows.filter((r) => r.groupId === grp);
              if (rows.length === 0) return '';
              return `
                <tr class="grp-row"><td colspan="8">${esc(rows[0].groupTitle)}</td></tr>
                ${rows
                  .map(
                    (r) => `<tr>
                      <td class="center">${esc(r.sttPoint || r.sttGroup)}</td>
                      <td><strong>${esc(r.item)}</strong></td>
                      <td>${esc(r.checkPoint)}</td>
                      <td>${esc(r.description).replace(/\n/g, '<br/>')}</td>
                      <td>${esc(r.standard).replace(/\n/g, '<br/>')}</td>
                      <td class="center">${esc(r.method)}</td>
                      <td></td>
                      <td></td>
                    </tr>`
                  )
                  .join('')}
              `;
            })
            .join('')}
        </tbody>
      </table>
      <div style="margin-top:8px;font-weight:700;font-size:11px;">Kết luận, nêu vấn đề:</div>
      <table style="margin-top:4px;">
        <thead><tr><th style="width:36px;">STT</th><th>Vấn đề</th><th>Giải pháp</th><th style="width:130px;">Ghi chú</th></tr></thead>
        <tbody>
          <tr><td class="center" style="height:22px;">1</td><td></td><td></td><td></td></tr>
          <tr><td class="center" style="height:22px;">2</td><td></td><td></td><td></td></tr>
          <tr><td class="center" style="height:22px;">3</td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
    `;

    const renderABTable = (sec: 'A' | 'B', heading: string) => {
      const rows = filteredABRows.filter((r) => r.section === sec);
      if (rows.length === 0) return '';
      return `
        <div class="sec-bar">${esc(heading)}</div>
        <table>
          <thead>
            <tr>
              <th style="width:32px;">STT</th>
              <th style="width:120px;">Vị trí</th>
              <th style="width:165px;">Hạng mục, hướng dẫn kiểm tra</th>
              <th>Tiêu chuẩn</th>
              <th style="width:85px;">Phương tiện</th>
              <th style="width:85px;">Tần suất KT</th>
              <th style="width:55px;">Kết quả KT</th>
              <th style="width:80px;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
                  <td class="center"><strong>${esc(r.stt)}</strong></td>
                  <td><strong>${esc(r.position)}</strong></td>
                  <td>${esc(r.guide).replace(/\n/g, '<br/>')}</td>
                  <td>${esc(r.standard).replace(/\n/g, '<br/>')}</td>
                  <td class="center">${esc(r.tool)}</td>
                  <td class="center">${esc(r.frequency)}</td>
                  <td></td>
                  <td></td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    };

    const renderCDTable = (sec: 'C' | 'D', heading: string) => {
      const rows = filteredCDRows.filter((r) => r.section === sec);
      if (rows.length === 0) return '';
      return `
        <div class="sec-bar">${esc(heading)}</div>
        <table>
          <thead>
            <tr>
              <th style="width:36px;">STT</th>
              <th style="width:200px;">Hạng mục</th>
              <th>Tiêu chuẩn</th>
              <th style="width:100px;">Kết quả kiểm tra</th>
              <th style="width:120px;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `<tr>
                  <td class="center"><strong>${esc(r.stt)}</strong></td>
                  <td><strong>${esc(r.item)}</strong></td>
                  <td>${esc(r.standard).replace(/\n/g, '<br/>')}</td>
                  <td></td>
                  <td></td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      `;
    };

    const vehicleBody = `
      <div class="meta-box">
        <span><strong>Thông tin xe:</strong> ................................................</span>
        <span><strong>Ngày kiểm tra:</strong> ................................</span>
      </div>
      ${renderABTable('A', 'A. CÁC BƯỚC KIỂM TRA NGOẠI QUAN')}
      ${renderABTable('B', 'B. CÁC BƯỚC KIỂM TRA HỆ THỐNG ĐIỆN, DỪNG, RẼ, LÁI (Cấp nguồn 60V trước khi kiểm tra)')}
      ${renderCDTable('C', 'C. KIỂM TRA TRÊN THIẾT BỊ ĐĂNG KIỂM')}
      ${renderCDTable('D', 'D. CHẠY THỬ TRÊN ĐƯỜNG CHẠY THỬ ĐỂ KIỂM TRA')}
    `;

    const win = window.open('', '_blank', 'width=1150,height=800');
    if (!win) return;
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${esc(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 10px; }
    .brand { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; }
    .brand strong { font-size: 12px; text-transform: uppercase; }
    h1 { text-align: center; font-size: 14px; text-transform: uppercase; margin: 4px 0 6px; }
    .meta-box { display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 6px; flex-wrap: wrap; gap: 8px; }
    .sec-bar { background: #e2e8f0; border: 1px solid #1e293b; border-bottom: none; padding: 4px 6px; font-weight: 700; font-size: 10.5px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #1e293b; padding: 3px 5px; vertical-align: top; }
    th { background: #f1f5f9; text-align: center; font-weight: 700; }
    .grp-row td { background: #e2e8f0; font-weight: 700; font-size: 10.5px; }
    .center { text-align: center; }
  </style>
</head>
<body>
  <div class="brand">
    <div><strong>Công ty TNHH Xe điện DK Việt Nhật — DKBike</strong><br/>Phòng Quản lý chất lượng (QLCL / DK QMS) • Xe cho cả gia đình</div>
    <div style="text-align:right;">Tài liệu Tiêu chuẩn QLCL</div>
  </div>
  <h1>${esc(title)}</h1>
  ${isSample ? sampleBody : vehicleBody}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Thanh điều hướng & Tìm kiếm */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Hệ Thống Tiêu Chuẩn Kiểm Tra & Đánh Giá Chất Lượng
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Tra cứu nhanh tiêu chuẩn linh kiện, danh mục đánh giá mẫu và hướng dẫn kiểm tra xe DK (A–D).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {section !== 'parts_link' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm hạng mục, tiêu chuẩn, thông số..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 w-64 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            {section !== 'parts_link' && (
              <>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng</span>
                </button>
                {hasCustomEdits && (
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Khôi phục nội dung mặc định"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Mặc định</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In A4</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3 Mục tiêu chuẩn */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setSection('parts_link')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              section === 'parts_link'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>1. Linh kiện</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('sample_eval')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              section === 'sample_eval'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>2. Đánh giá mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('vehicle_guide')}
            className={`px-3.5 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              section === 'vehicle_guide'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>3. Kiểm tra xe DK (A–D)</span>
          </button>
        </div>
      </div>

      {/* =================================================================
          1. TIÊU CHUẨN LINH KIỆN (XEM LINK RIÊNG)
          ================================================================= */}
      {section === 'parts_link' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-3xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  1. Tiêu chuẩn linh kiện (Kho tài liệu & Link riêng)
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Mở đường dẫn tài liệu Tiêu chuẩn kỹ thuật linh kiện (Google Drive / Sheet / Kho nội bộ) để tra cứu chi tiết từng mã linh kiện.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDraftLink(partsLink);
                setEditingLink((v) => !v);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{partsLink ? 'Đổi link' : 'Gắn link'}</span>
            </button>
          </div>

          {editingLink && (
            <form onSubmit={handleSavePartsLink} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Nhập đường dẫn (URL) tài liệu Tiêu chuẩn linh kiện:
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="url"
                  value={draftLink}
                  onChange={(e) => setDraftLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu link</span>
                </button>
              </div>
            </form>
          )}

          {partsLink ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-emerald-900">Đường dẫn đang liên kết:</div>
                <div className="text-xs text-emerald-700 truncate font-mono mt-0.5">{partsLink}</div>
              </div>
              <a
                href={partsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Tiêu chuẩn linh kiện</span>
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Chưa có link Tiêu chuẩn linh kiện nào được gắn. Bấm nút <strong>Gắn link</strong> ở góc phải để dán đường dẫn tài liệu của anh.
            </div>
          )}
        </div>
      )}

      {/* =================================================================
          2. TIÊU CHUẨN / DANH MỤC ĐÁNH GIÁ MẪU
          ================================================================= */}
      {section === 'sample_eval' && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap justify-between items-end border-b-2 border-slate-900 pb-2 gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase text-slate-900">
                Công ty TNHH Xe điện DK Việt Nhật — DKBike
              </p>
              <p className="text-[11px] text-slate-600">
                Phòng Quản lý chất lượng (QLCL / DK QMS) • Xe cho cả gia đình
              </p>
            </div>
            <div className="text-xs text-slate-700 flex flex-wrap gap-4">
              <span><strong>Model:</strong> ......................</span>
              <span><strong>Số khung:</strong> ......................</span>
              <span><strong>Ngày đánh giá:</strong> ......................</span>
              <span><strong>Người đánh giá:</strong> Thao, Việt, Phấn</span>
            </div>
          </div>

          <h3 className="text-center text-base font-extrabold uppercase text-slate-900">
            Tiêu chuẩn / Danh mục đánh giá mẫu
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-400 px-2 py-2 w-12 text-center">STT</th>
                  <th className="border border-slate-400 px-2.5 py-2 w-36 text-left">Hạng mục</th>
                  <th className="border border-slate-400 px-2.5 py-2 w-36 text-left">Điểm KT</th>
                  <th className="border border-slate-400 px-2.5 py-2 w-60 text-left">Diễn giải</th>
                  <th className="border border-slate-400 px-2.5 py-2 text-left">Tiêu chuẩn chấp nhận</th>
                  <th className="border border-slate-400 px-2.5 py-2 w-32 text-center">Phương pháp</th>
                  <th className="border border-slate-400 px-2 py-2 w-20 text-center">Kết quả</th>
                  <th className="border border-slate-400 px-2.5 py-2 w-36 text-left">Đánh giá / Vấn đề</th>
                  <th className="border border-slate-400 px-2 py-2 w-14 text-center">Sửa</th>
                </tr>
              </thead>
              <tbody>
                {(['I', 'II', 'III', 'IV'] as const).map((grp) => {
                  const rows = indexedSampleRows.filter((item) => item.row.groupId === grp);
                  if (rows.length === 0) return null;
                  return (
                    <React.Fragment key={grp}>
                      <tr className="bg-indigo-50 text-indigo-950 font-extrabold">
                        <td colSpan={9} className="border border-slate-400 px-3 py-2 text-xs uppercase">
                          {rows[0].row.groupTitle}
                        </td>
                      </tr>
                      {rows.map(({ row: r, idx: origIdx }, idx) => (
                        <tr key={`${grp}-${r.sttPoint}-${origIdx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                          <td className="border border-slate-400 px-2 py-2 text-center font-bold text-slate-700 align-top">
                            {r.sttPoint || r.sttGroup}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 font-bold text-slate-900 align-top">
                            {r.item}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 font-semibold text-slate-800 align-top">
                            {r.checkPoint}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 text-slate-700 whitespace-pre-line align-top">
                            {r.description}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 text-slate-900 font-medium whitespace-pre-line align-top">
                            {r.standard}
                          </td>
                          <td className="border border-slate-400 px-2.5 py-2 text-center text-slate-700 align-top">
                            {r.method}
                          </td>
                          <td className="border border-slate-400 px-2 py-2" />
                          <td className="border border-slate-400 px-2.5 py-2" />
                          <td className="border border-slate-400 px-1.5 py-1.5 text-center align-top">
                            <button
                              type="button"
                              onClick={() => setEditingTarget({ kind: 'sample', index: origIdx, draft: { ...r } })}
                              className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition cursor-pointer"
                              title="Chỉnh sửa dòng tiêu chuẩn này"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {filteredSampleRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="border border-slate-400 p-6 text-center text-slate-500">
                      Không tìm thấy hạng mục nào khớp với từ khóa "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <div className="text-xs font-extrabold uppercase text-slate-800 mb-1.5">Kết luận, nêu vấn đề</div>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-400 px-2 py-1.5 w-12 text-center">STT</th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-left">Vấn đề</th>
                  <th className="border border-slate-400 px-2.5 py-1.5 text-left">Giải pháp</th>
                  <th className="border border-slate-400 px-2.5 py-1.5 w-48 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((n) => (
                  <tr key={n}>
                    <td className="border border-slate-400 px-2 py-2 text-center font-bold text-slate-600">{n}</td>
                    <td className="border border-slate-400 px-2.5 py-2" />
                    <td className="border border-slate-400 px-2.5 py-2" />
                    <td className="border border-slate-400 px-2.5 py-2" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================
          3. TIÊU CHUẨN / HƯỚNG DẪN KIỂM TRA XE DK 4 HẠNG MỤC (A–D)
          ================================================================= */}
      {section === 'vehicle_guide' && (
        <div className="space-y-4">
          {/* Bộ lọc nhanh 4 hạng mục A, B, C, D */}
          <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-3">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Chọn hạng mục:
            </span>
            {(
              [
                { id: 'all', label: 'Tất cả (A–D)' },
                { id: 'A', label: 'A. Kiểm tra ngoại quan' },
                { id: 'B', label: 'B. Hệ thống điện, dừng, rẽ, lái' },
                { id: 'C', label: 'C. Thiết bị đăng kiểm' },
                { id: 'D', label: 'D. Đường chạy thử' }
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setVehicleSub(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  vehicleSub === btn.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap justify-between items-end border-b-2 border-slate-900 pb-2 gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase text-slate-900">
                  Công ty TNHH Xe điện DK Việt Nhật — DKBike
                </p>
                <p className="text-[11px] text-slate-600">
                  Phòng Quản lý chất lượng (QLCL / DK QMS) • Xe cho cả gia đình
                </p>
              </div>
              <div className="text-xs text-slate-700 flex flex-wrap gap-4">
                <span><strong>Thông tin xe:</strong> ..............................</span>
                <span><strong>Ngày kiểm tra:</strong> ......................</span>
              </div>
            </div>

            <h3 className="text-center text-base font-extrabold uppercase text-slate-900">
              Phiếu kết quả & Hướng dẫn kiểm tra đánh giá xe DK
            </h3>

            {/* A & B */}
            {(['A', 'B'] as const).map((sec) => {
              const rows = indexedABRows.filter((item) => item.row.section === sec);
              if (rows.length === 0) return null;
              const title =
                sec === 'A'
                  ? 'A. Các bước Kiểm tra ngoại quan'
                  : 'B. Các bước Kiểm tra hệ thống điện, dừng, rẽ, lái (Cấp nguồn 60V trước khi kiểm tra)';
              return (
                <div key={sec} className="space-y-2">
                  <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs sm:text-sm font-extrabold text-indigo-950 uppercase">
                    {title}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-400 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="border border-slate-400 px-2 py-2 w-12 text-center">STT</th>
                          <th className="border border-slate-400 px-2.5 py-2 w-44 text-left">Vị trí</th>
                          <th className="border border-slate-400 px-2.5 py-2 w-60 text-left">Hạng mục, hướng dẫn kiểm tra</th>
                          <th className="border border-slate-400 px-2.5 py-2 text-left">Tiêu chuẩn</th>
                          <th className="border border-slate-400 px-2.5 py-2 w-32 text-center">Phương tiện</th>
                          <th className="border border-slate-400 px-2.5 py-2 w-36 text-center">Tần suất KT</th>
                          <th className="border border-slate-400 px-2 py-2 w-20 text-center">Kết quả KT</th>
                          <th className="border border-slate-400 px-2 py-2 w-28 text-left">Ghi chú</th>
                          <th className="border border-slate-400 px-2 py-2 w-14 text-center">Sửa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ row: r, idx: origIdx }, idx) => (
                          <tr key={`${sec}-${origIdx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="border border-slate-400 px-2 py-2 text-center font-bold text-slate-800 align-top">
                              {r.stt}
                            </td>
                            <td className="border border-slate-400 px-2.5 py-2 font-bold text-slate-900 align-top">
                              {r.position}
                            </td>
                            <td className="border border-slate-400 px-2.5 py-2 text-slate-800 whitespace-pre-line align-top">
                              {r.guide}
                            </td>
                            <td className="border border-slate-400 px-2.5 py-2 text-slate-900 font-medium whitespace-pre-line align-top">
                              {r.standard}
                            </td>
                            <td className="border border-slate-400 px-2.5 py-2 text-center text-slate-700 align-top">
                              {r.tool}
                            </td>
                            <td className="border border-slate-400 px-2.5 py-2 text-center text-slate-700 align-top">
                              {r.frequency}
                            </td>
                            <td className="border border-slate-400 px-2 py-2" />
                            <td className="border border-slate-400 px-2 py-2" />
                            <td className="border border-slate-400 px-1.5 py-1.5 text-center align-top">
                              <button
                                type="button"
                                onClick={() => setEditingTarget({ kind: 'ab', index: origIdx, draft: { ...r } })}
                                className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition cursor-pointer"
                                title="Chỉnh sửa dòng tiêu chuẩn này"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* C & D */}
            {(['C', 'D'] as const).map((sec) => {
              const rows = indexedCDRows.filter((item) => item.row.section === sec);
              if (rows.length === 0) return null;
              const title =
                sec === 'C'
                  ? 'C. Kiểm tra trên thiết bị đăng kiểm'
                  : 'D. Chạy thử trên đường chạy thử để kiểm tra';
              return (
                <div key={sec} className="space-y-2">
                  <div className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs sm:text-sm font-extrabold text-indigo-950 uppercase">
                    {title}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-400 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="border border-slate-400 px-2 py-2 w-14 text-center">STT</th>
                          <th className="border border-slate-400 px-3 py-2 w-64 text-left">Hạng mục</th>
                          <th className="border border-slate-400 px-3 py-2 text-left">Tiêu chuẩn</th>
                          <th className="border border-slate-400 px-2.5 py-2 w-32 text-center">Kết quả KT</th>
                          <th className="border border-slate-400 px-2.5 py-2 w-40 text-left">Ghi chú</th>
                          <th className="border border-slate-400 px-2 py-2 w-14 text-center">Sửa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ row: r, idx: origIdx }, idx) => (
                          <tr key={`${sec}-${r.stt}-${origIdx}`} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="border border-slate-400 px-2 py-2 text-center font-bold text-slate-800 align-top">
                              {r.stt}
                            </td>
                            <td className="border border-slate-400 px-3 py-2 font-bold text-slate-900 align-top">
                              {r.item}
                            </td>
                            <td className="border border-slate-400 px-3 py-2 text-slate-900 font-medium whitespace-pre-line align-top">
                              {r.standard}
                            </td>
                            <td className="border border-slate-400 px-2.5 py-2" />
                            <td className="border border-slate-400 px-2.5 py-2" />
                            <td className="border border-slate-400 px-1.5 py-1.5 text-center align-top">
                              <button
                                type="button"
                                onClick={() => setEditingTarget({ kind: 'cd', index: origIdx, draft: { ...r } })}
                                className="p-1.5 rounded-md hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition cursor-pointer"
                                title="Chỉnh sửa dòng tiêu chuẩn này"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {filteredABRows.length === 0 && filteredCDRows.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                Không tìm thấy tiêu chuẩn kiểm tra xe nào khớp với từ khóa "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa / Thêm mới dòng tiêu chuẩn */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {editingTarget.index === null ? 'Thêm dòng tiêu chuẩn mới' : 'Chỉnh sửa tiêu chuẩn'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {editingTarget.kind === 'sample' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nhóm</label>
                      <select
                        value={editingTarget.draft.groupId}
                        onChange={(e) => {
                          const g = e.target.value as 'I' | 'II' | 'III' | 'IV';
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, groupId: g, groupTitle: SAMPLE_GROUP_TITLES[g] }
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        {(['I', 'II', 'III', 'IV'] as const).map((g) => (
                          <option key={g} value={g}>{SAMPLE_GROUP_TITLES[g]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">STT</label>
                      <input
                        type="text"
                        value={editingTarget.draft.sttPoint}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, sttPoint: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phương pháp</label>
                      <input
                        type="text"
                        value={editingTarget.draft.method}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, method: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hạng mục</label>
                      <input
                        type="text"
                        required
                        value={editingTarget.draft.item}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, item: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Điểm KT</label>
                      <input
                        type="text"
                        value={editingTarget.draft.checkPoint}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, checkPoint: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Diễn giải</label>
                    <textarea
                      rows={3}
                      value={editingTarget.draft.description}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          draft: { ...editingTarget.draft, description: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tiêu chuẩn chấp nhận</label>
                    <textarea
                      rows={4}
                      required
                      value={editingTarget.draft.standard}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          draft: { ...editingTarget.draft, standard: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </>
              )}

              {editingTarget.kind === 'ab' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hạng mục</label>
                      <select
                        value={editingTarget.draft.section}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, section: e.target.value as 'A' | 'B' }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="A">A. Kiểm tra ngoại quan</option>
                        <option value="B">B. Điện, dừng, rẽ, lái</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">STT</label>
                      <input
                        type="text"
                        value={editingTarget.draft.stt}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, stt: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Vị trí</label>
                      <input
                        type="text"
                        required
                        value={editingTarget.draft.position}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, position: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hạng mục, hướng dẫn kiểm tra</label>
                    <textarea
                      rows={3}
                      value={editingTarget.draft.guide}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          draft: { ...editingTarget.draft, guide: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tiêu chuẩn</label>
                    <textarea
                      rows={4}
                      required
                      value={editingTarget.draft.standard}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          draft: { ...editingTarget.draft, standard: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Phương tiện</label>
                      <input
                        type="text"
                        value={editingTarget.draft.tool}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, tool: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tần suất KT</label>
                      <input
                        type="text"
                        value={editingTarget.draft.frequency}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, frequency: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                </>
              )}

              {editingTarget.kind === 'cd' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hạng mục</label>
                      <select
                        value={editingTarget.draft.section}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, section: e.target.value as 'C' | 'D' }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="C">C. Thiết bị đăng kiểm</option>
                        <option value="D">D. Đường chạy thử</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">STT</label>
                      <input
                        type="text"
                        value={editingTarget.draft.stt}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, stt: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tên hạng mục</label>
                      <input
                        type="text"
                        required
                        value={editingTarget.draft.item}
                        onChange={(e) =>
                          setEditingTarget({
                            ...editingTarget,
                            draft: { ...editingTarget.draft, item: e.target.value }
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tiêu chuẩn</label>
                    <textarea
                      rows={4}
                      required
                      value={editingTarget.draft.standard}
                      onChange={(e) =>
                        setEditingTarget({
                          ...editingTarget,
                          draft: { ...editingTarget.draft, standard: e.target.value }
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <div>
                {editingTarget.index !== null && (
                  <button
                    type="button"
                    onClick={handleDeleteTarget}
                    className="px-3 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa dòng</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
