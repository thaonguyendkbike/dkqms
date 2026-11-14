import React, { useMemo, useRef, useState } from 'react';
import {
  Bike,
  Camera,
  Check,
  Eye,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { compressImageFile } from '../imageCompressor';
import { safeStorage } from '../safeStorage';

export type ProductSeries =
  | 'Người đi làm'
  | 'Phổ thông'
  | 'Dòng D'
  | 'Dòng S'
  | 'Dòng V'
  | 'Dòng EZ'
  | 'Xe đạp trợ lực'
  | 'Khác';

export interface ProductSpecField {
  stt: string;
  label: string;
}

export interface ProductSpecItem {
  id: string;
  code: string;
  name: string;
  series: ProductSeries;
  groupType: 'ev' | 'ebike';
  image?: string;
  noteBadge?: string;
  specs: Record<string, string>;
  updatedAt: string;
}

const PRODUCTS_STORAGE_KEY = 'dk_qms_products_v2';

export const EV_SPEC_FIELDS: ProductSpecField[] = [
  { stt: '1', label: 'Màu sắc' },
  { stt: '2', label: 'Ngày bắt đầu Sản Xuất' },
  { stt: '3', label: 'Số lượng phiên bản' },
  { stt: '4', label: 'Kiểu loại' },
  { stt: '5', label: 'Ngày hết hạn' },
  { stt: '6', label: 'Đối tượng sử dụng' },
  { stt: '7', label: 'Khối lượng (chưa bao gồm pin, AQ)' },
  { stt: '8', label: 'Kích thước xe' },
  { stt: '9', label: 'Chiều dài cơ sở' },
  { stt: '10', label: 'Khoảng sáng gầm' },
  { stt: '11', label: 'Độ cao yên' },
  { stt: '12', label: 'Loại động cơ' },
  { stt: '13', label: 'Công suất danh định' },
  { stt: '14', label: 'Công suất tối đa' },
  { stt: '15', label: 'Bộ điều khiển' },
  { stt: '16', label: 'Điện áp sử dụng. Bình sử dụng' },
  { stt: '17', label: 'Công suất sạc (nhãn hiệu DK Bike)' },
  { stt: '18', label: 'Tốc độ tối đa' },
  { stt: '19', label: 'Tải trọng tối đa (kg)' },
  { stt: '20', label: 'Quãng đường di chuyển' },
  { stt: '21', label: 'Chế độ tốc độ' },
  { stt: '22', label: 'Linh kiện khung' },
  { stt: '23', label: 'Linh kiện nổi bật' },
  { stt: '24', label: 'Tính năng tiện ích' }
];

export const EBIKE_SPEC_FIELDS: ProductSpecField[] = [
  { stt: '1', label: 'Loại xe' },
  { stt: '2', label: 'Khung xe' },
  { stt: '3', label: 'Khối lượng xe (bao gồm pin)' },
  { stt: '4', label: 'Kích thước xe (D*R*C)' },
  { stt: '5', label: 'Chiều cao yên (mm)' },
  { stt: '6', label: 'Trục cơ sở (mm)' },
  { stt: '7', label: 'Động cơ' },
  { stt: '8', label: 'Công suất tối đa' },
  { stt: '9', label: 'Tốc độ' },
  { stt: '10', label: 'Pin' },
  { stt: '11', label: 'Quãng đường' },
  { stt: '12', label: 'Bộ điều khiển | Màn hình' },
  { stt: '13', label: 'Cảm biến trợ lực' },
  { stt: '14', label: 'Vành/lốp' },
  { stt: '15', label: 'Hệ thống phanh' },
  { stt: '16', label: 'Hệ thống líp xích' },
  { stt: 'II', label: 'LINH KIỆN NỔI BẬT' },
  { stt: 'III', label: 'TÍNH NĂNG NỔI BẬT' }
];

const CHARGER_180_225 =
  '180 W - 225W\nDòng sạc 1.8A -3A\nTự động ngắt điện vào AQ/pin khi đầy dung lượng\nTự động ngắt điện động cơ khi sạc';

const CHARGER_3A =
  'Dòng sạc 3A\nTự động ngắt điện vào AQ/pin khi đầy dung lượng\nTự động ngắt điện động cơ khi sạc';

const CHARGER_225 =
  '225 W\nDòng sạc 3A\nTự động ngắt điện vào AQ/pin khi đầy dung lượng\nTự động ngắt điện động cơ khi sạc';

const NOVA_HIGHLIGHT =
  'Đèn pha sáng lên đến 26000cd\nNâng cấp giảm xóc trước sau, cực kỳ êm ái khi sử dụng\nCông tắc và tay ga tách rời, dễ dàng mua thay thế, bảo hành\nKhoang cốp rộng 15 lít\nNâng cấp động cơ và IC tang cường độ êm ái khi tăng ga';

const NOVA_FEATURES =
  '- Thẻ từ NFC tiện lợi\n- Đồng hồ led bền bỉ, thông báo lỗi trên đồng hồ\n- Tái tạo năng lượng khi xe di chuyển nhưng không vặn ga\n- Chế độ dừng xe an toàn (P) – khoá động cơ\n- Chế độ dừng giữa dốc (chống trôi dốc)\n- App điều khiển, kết nối bluetooth\n- Mở khóa: Khóa cơ, app, nút chức năng\n- Chế độ sửa\n- Tắt mở tiếng cảnh báo/tiếng xi nhan';

const D_HIGHLIGHT =
  'Giảm xóc trước sau êm nhún êm ái khi di chuyển trên địa hình không bằng phẳng\nKhay cốp trước tiện lợi. Sạc USB, Type C 2.0A\nĐồng hồ thế mới – Màn hình rộng 7inch sắc nét\nCốp Yên rộng, sức chứa lên đến 15 lít\nChiều cao yên 730 phù hợp với cả học sinh có chiều cao từ 1m55\nNâng cấp sức mạnh động cơ so với các dòng S2, V1\nĐồng hồ APP';

const D_FEATURES =
  'Thẻ từ NFC tiện lợi, chống trộm sau 6s, bỏ chống trộm bóp phanh và tắt khóa.\nBa số tốc độ (1, 2, 3)\nĐồng hồ led bền bỉ, thông báo lỗi trên đồng hồ\nTái tạo năng lượng khi không vặn ga.\nChế độ sửa chữa/sự cố, mở P, số chung nút S.\nChế độ đỗ xe (P) có thể tắt mở chủ động\nKích hoạt hạn chế tốc độ chủ động\nApp điều khiển, kết nối bluetooth';

const S_HIGHLIGHT =
  '14 lựa chọn màu sắc – cá nhân hoá phù hợp với mọi đối tượng khách hàng\nCó 2 options lựa chọn 48v (4 bình AQ) và 60v (5 bình AQ)\nPhanh đĩa trước an toàn\nLà phiên bản nâng cấp của xe S1: Thay nhựa CB sau thành nhựa ABS, Tăng chiều dài bụng xe, chiều dài cơ sở xe';

const S_FEATURES_WITH_LIMIT =
  'IC điều khiển và đồng hồ hỗ trợ cả 48v và 60v\nThẻ từ NFC tiện lợi\nĐiện tử, LED 7 thanh hiển thị đa màu sắc, báo lỗi sự cố xe\nchống trộm dễ dàng (bóp phanh trước khi tắt chìa khóa)\nCó thể lắp cả 2 lựa chọn 2 yên ngắn hoặc 1 yên dài\nCó thể lắp ghế trẻ em\nCó thẻ lắp giỏ xe\nKhay cốp trước tiện lợi\nTái tạo năng lượng khi không vặn ga\nKích hoạt/Hạn chế tốc độc dưới 25km/h\nApp điều khiển, kết nối bluetooth';

const EZ12_HIGHLIGHT =
  'Tay lái phi công thế hệ mới hiện đại phong cách\nGiảm xóc trước sau êm nhún êm ái khi di chuyển trên địa hình không bằng phẳng\nKhay cốp trước tiện lợi\nĐồng hồ thế mới – Màn hình rộng 7inch sắc nét\nCốp Yên rộng, sức chứa lên đến 15 lít\nChiều cao yên 730 phù hợp với cả học sinh có chiều cao từ 1m55\nNâng cấp sức mạnh động cơ so với các dòng S2, V1';

const DEFAULT_PRODUCTS: ProductSpecItem[] = [
  {
    id: 'dk-nova-x',
    code: 'DK NOVA X',
    name: 'DK NOVA X',
    series: 'Người đi làm',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '7 màu',
      'Ngày bắt đầu Sản Xuất': '',
      'Số lượng phiên bản': '2 phiên bản 60v-72v',
      'Kiểu loại': 'Xe máy điện tốc độ >50km/h',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Người đi làm, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '70',
      'Kích thước xe': '1900x690x1110',
      'Chiều dài cơ sở': '1610',
      'Khoảng sáng gầm': '190',
      'Độ cao yên': '790',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '2000W',
      'Công suất tối đa': '2400W',
      'Bộ điều khiển': 'Điện áp DC 60V/72V\nDòng điện ra: 45A±1\nĐiện áp bảo vệ khi sụt áp: 52/63V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n60V20Ah 72V20Ah\nPin 72V24Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_3A,
      'Tốc độ tối đa': '60 km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Tinh Nhuệ',
      'Linh kiện nổi bật': NOVA_HIGHLIGHT,
      'Tính năng tiện ích': NOVA_FEATURES
    }
  },
  {
    id: 'dk-nova',
    code: 'DK NOVA',
    name: 'DK NOVA',
    series: 'Phổ thông',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '7 màu',
      'Ngày bắt đầu Sản Xuất': '',
      'Số lượng phiên bản': '2 phiên bản 60v-72v',
      'Kiểu loại': 'Xe máy điện',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh > 16 tuổi, SV\nNgười đi làm',
      'Khối lượng (chưa bao gồm pin, AQ)': '70',
      'Kích thước xe': '1900x690x1110',
      'Chiều dài cơ sở': '1610',
      'Khoảng sáng gầm': '190',
      'Độ cao yên': '790',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '1200W',
      'Công suất tối đa': '2100W',
      'Bộ điều khiển': 'Điện áp DC 60V/72V\nDòng điện ra: 40A±1\nĐiện áp bảo vệ khi sụt áp: 52/63V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n60V20Ah 72V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_3A,
      'Tốc độ tối đa': '50km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Tinh Nhuệ',
      'Linh kiện nổi bật': NOVA_HIGHLIGHT,
      'Tính năng tiện ích': NOVA_FEATURES
    }
  },
  {
    id: 'dk-d1',
    code: 'DK D1',
    name: 'DK D1',
    series: 'Dòng D',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '10 màu',
      'Ngày bắt đầu Sản Xuất': '2026-01-30',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '50',
      'Kích thước xe': '1670x715x1040',
      'Chiều dài cơ sở': '1240',
      'Khoảng sáng gầm': '150',
      'Độ cao yên': '150',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '400 W',
      'Công suất tối đa': '1000 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 28A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '42 km/h',
      'Tải trọng tối đa (kg)': '150',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': D_HIGHLIGHT,
      'Tính năng tiện ích': D_FEATURES
    }
  },
  {
    id: 'dk-d2',
    code: 'DK D2',
    name: 'DK D2',
    series: 'Dòng D',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '10 màu',
      'Ngày bắt đầu Sản Xuất': '2026-01-30',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '50',
      'Kích thước xe': '1670x715x1040',
      'Chiều dài cơ sở': '1240',
      'Khoảng sáng gầm': '150',
      'Độ cao yên': '150',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '240W',
      'Công suất tối đa': '950 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 25A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '30 km/h',
      'Tải trọng tối đa (kg)': '150',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': D_HIGHLIGHT,
      'Tính năng tiện ích': D_FEATURES
    }
  },
  {
    id: 'dk-s2',
    code: 'DK S2',
    name: 'DK S2',
    series: 'Dòng S',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '14 màu',
      'Ngày bắt đầu Sản Xuất': '13/03/2025',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': 'Dựa vào KQ ĐK thực tế',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '45',
      'Kích thước xe': '1630x690x1040',
      'Chiều dài cơ sở': '1170',
      'Khoảng sáng gầm': '150',
      'Độ cao yên': '780',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '400 W',
      'Công suất tối đa': '1000 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 28A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '42km/h',
      'Tải trọng tối đa (kg)': '150',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': S_HIGHLIGHT,
      'Tính năng tiện ích':
        'IC điều khiển và đồng hồ hỗ trợ cả 48v và 60v\nThẻ từ NFC tiện lợi\nĐiện tử, LED 7 thanh hiển thị đa màu sắc, báo lỗi sự cố xe\nchống trộm dễ dàng (bóp phanh trước khi tắt chìa khóa)\nCó thể lắp cả 2 lựa chọn 2 yên ngắn hoặc 1 yên dài\nCó thể lắp ghế trẻ em\nCó thẻ lắp giỏ xe\nKhay cốp trước tiện lợi\nTái tạo năng lượng khi không vặn ga\nApp điều khiển, kết nối bluetooth'
    }
  },
  {
    id: 'dk-s3',
    code: 'DK S3',
    name: 'DK S3',
    series: 'Dòng S',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '14 màu',
      'Ngày bắt đầu Sản Xuất': '2026-02-05',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp 240W tốc độ 25km',
      'Ngày hết hạn': 'Dựa vào KQ ĐK thực tế',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '45',
      'Kích thước xe': '1630x690x1040',
      'Chiều dài cơ sở': '1170',
      'Khoảng sáng gầm': '150',
      'Độ cao yên': '770',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '240W',
      'Công suất tối đa': '950 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 25A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '35 km/h',
      'Tải trọng tối đa (kg)': '150',
      'Quãng đường di chuyển': 'AQ: 80km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': S_HIGHLIGHT,
      'Tính năng tiện ích': S_FEATURES_WITH_LIMIT
    }
  },
  {
    id: 'dk-s5',
    code: 'DK S5',
    name: 'DK S5',
    series: 'Dòng S',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '14 màu',
      'Ngày bắt đầu Sản Xuất': '2026-02-05',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp 240W tốc độ 25km',
      'Ngày hết hạn': 'Dựa vào KQ ĐK thực tế',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '45',
      'Kích thước xe': '1630x690x1040',
      'Chiều dài cơ sở': '1170',
      'Khoảng sáng gầm': '150',
      'Độ cao yên': '770',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '240W',
      'Công suất tối đa': '950 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 25A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah\nPin 48v24Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '35 km/h',
      'Tải trọng tối đa (kg)': '150',
      'Quãng đường di chuyển': 'AQ: 80km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': S_HIGHLIGHT,
      'Tính năng tiện ích': S_FEATURES_WITH_LIMIT
    }
  },
  {
    id: 'dk-v1',
    code: 'DK V1',
    name: 'DK V1',
    series: 'Dòng V',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '11 màu',
      'Ngày bắt đầu Sản Xuất': '2025-06-25',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': 'Dựa vào KQ ĐK thực tế',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '45',
      'Kích thước xe': '1725x645x1065',
      'Chiều dài cơ sở': '1175',
      'Khoảng sáng gầm': '150',
      'Độ cao yên': '770',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '400 W',
      'Công suất tối đa': '1000 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 28A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '35 km/h',
      'Tải trọng tối đa (kg)': '150',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật':
        '14 lựa chọn màu sắc – cá nhân hoá phù hợp với mọi đối tượng khách hàng\nChiều dài cơ sở lớn, dễ dàng điều khiển phương tiện, tăng cường cảm giác lái\nCó 2 options lựa chọn 48v (4 bình AQ) và 60v (5 bình AQ)\nPhanh đĩa 2 piston an toàn tuyệt đối khi sử dụng',
      'Tính năng tiện ích':
        'IC điều khiển và đồng hồ hỗ trợ cả 48v và 60v\nThẻ từ NFC tiện lợi\nĐiện tử, LED 7 thanh hiển thị đa màu sắc, báo lỗi sự cố xe\nTự động chống trộm sau 7s (bỏ chống trộm bóp phanh trước khi tắt chìa khóa)\nCó thể lắp cả 2 lựa chọn 2 yên ngắn hoặc 1 yên dài\nCó thể lắp ghế trẻ em\nKhay cốp trước tiện lợi\nApp điều khiển, kết nối bluetooth'
    }
  },
  {
    id: 'dk-v2',
    code: 'DK V2',
    name: 'DK V2',
    series: 'Dòng V',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '12 màu',
      'Ngày bắt đầu Sản Xuất': '22/11/2025',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '',
      'Kích thước xe': '1650x700x1050',
      'Chiều dài cơ sở': '1220',
      'Khoảng sáng gầm': '140',
      'Độ cao yên': '760',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '400 W',
      'Công suất tối đa': '1000 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 28A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah\nPin 60V24Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '42 km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật':
        'Nâng cấp từ xe V1 lên\nKhay cốp trước tiện lợi. Sạc USB, Type C 2.0A\nĐồng hồ thế mới – Màn hình rộng 7inch sắc nét\nCốp Yên rộng, sức chứa lên đến 15 lít\nChiều cao yên 760\nNâng cấp sức mạnh động cơ so với các dòng S2, V1\nĐồng hồ APP',
      'Tính năng tiện ích': D_FEATURES
    }
  },
  {
    id: 'dk-ez1',
    code: 'DK EZ1',
    name: 'DK EZ1',
    series: 'Dòng EZ',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '13 màu',
      'Ngày bắt đầu Sản Xuất': '2025-06-17',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '55',
      'Kích thước xe': '1650x715x1050',
      'Chiều dài cơ sở': '1220',
      'Khoảng sáng gầm': '160',
      'Độ cao yên': '740',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '400 W',
      'Công suất tối đa': '1000 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 28A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '42 km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': EZ12_HIGHLIGHT,
      'Tính năng tiện ích':
        'Thẻ từ NFC tiện lợi, chống trộm sau 6s, bỏ chống trộm bóp phanh và tắt khóa.\nBa số tốc độ (1, 2, 3)\nĐồng hồ led bền bỉ, thông báo lỗi trên đồng hồ\nTái tạo năng lượng khi không vặn ga.\nChế độ sửa chữa/sự cố, mở P, số chung nút S.\nChế độ đỗ xe (P) có thể tắt mở chủ động\nApp điều khiển, kết nối bluetooth'
    }
  },
  {
    id: 'dk-ez2',
    code: 'DK EZ2',
    name: 'DK EZ2',
    series: 'Dòng EZ',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '13 màu',
      'Ngày bắt đầu Sản Xuất': '2025-06-19',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '55',
      'Kích thước xe': '1650x715x1050',
      'Chiều dài cơ sở': '1220',
      'Khoảng sáng gầm': '160',
      'Độ cao yên': '740',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '400 W',
      'Công suất tối đa': '1000 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 28A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '42 km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 70km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': EZ12_HIGHLIGHT,
      'Tính năng tiện ích':
        'Thẻ từ NFC tiện lợi, chống trộm sau 6s, bỏ chống trộm bóp phanh và tắt khóa.\nBa số tốc độ (1, 2, 3)\nĐồng hồ led bền bỉ, thông báo lỗi trên đồng hồ\nTái tạo năng lượng khi không vặn ga.\nChế độ sửa chữa/sự cố, mở P, số chung nút S.\nChế độ đỗ xe (P) có thể tắt mở chủ động\nApp điều khiển, kết nối bluetooth'
    }
  },
  {
    id: 'dk-ez3',
    code: 'DK EZ3',
    name: 'DK EZ3',
    series: 'Dòng EZ',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '12 màu',
      'Ngày bắt đầu Sản Xuất': '2026-01-20',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp 240W tốc độ 25km',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '55',
      'Kích thước xe': '1650x715x1050',
      'Chiều dài cơ sở': '1220',
      'Khoảng sáng gầm': '160',
      'Độ cao yên': '740',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '240W',
      'Công suất tối đa': '950 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 25A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '35 km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 80km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Thiên Bình',
      'Linh kiện nổi bật': EZ12_HIGHLIGHT,
      'Tính năng tiện ích': S_FEATURES_WITH_LIMIT
    }
  },
  {
    id: 'dk-ez5',
    code: 'DK EZ5',
    name: 'DK EZ5',
    series: 'Dòng EZ',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '12 màu',
      'Ngày bắt đầu Sản Xuất': '2026-02-26',
      'Số lượng phiên bản': '2 phiên bản 48v-60v',
      'Kiểu loại': 'Xe máy điện có bàn đạp',
      'Ngày hết hạn': '',
      'Đối tượng sử dụng': 'Học sinh, sinh viên',
      'Khối lượng (chưa bao gồm pin, AQ)': '55',
      'Kích thước xe': '1600x650x1070',
      'Chiều dài cơ sở': '1220',
      'Khoảng sáng gầm': '160',
      'Độ cao yên': '740',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '240W',
      'Công suất tối đa': '950 W',
      'Bộ điều khiển': 'Điện áp DC 48-60V\nDòng điện ra: 25A±1\nĐiện áp bảo vệ khi sụt áp: 39/52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\n48V20Ah 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_180_225,
      'Tốc độ tối đa': '35 km/h',
      'Tải trọng tối đa (kg)': '',
      'Quãng đường di chuyển': 'AQ: 80km',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'UMV',
      'Linh kiện nổi bật': EZ12_HIGHLIGHT,
      'Tính năng tiện ích':
        'IC điều khiển và đồng hồ hỗ trợ cả 48v và 60v\nThẻ từ NFC tiện lợi\nĐiện tử, LED 7 thanh hiển thị đa màu sắc, báo lỗi sự cố xe\nchống trộm dễ dàng (bóp phanh trước khi tắt chìa khóa)\nCó thể lắp cả 2 lựa chọn 2 yên ngắn hoặc 1 yên dài\nCó thể lắp ghế trẻ em\nCó thẻ lắp giỏ xe\nKhay cốp trước tiện lợi\nTái tạo năng lượng khi không vặn ga\nKích hoạt/Hạn chế tốc độc dưới 25km/h'
    }
  },
  {
    id: 'dk-gogo-s',
    code: 'DK GOGO S',
    name: 'DK GOGO S',
    series: 'Phổ thông',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '18 màu',
      'Ngày bắt đầu Sản Xuất': '2026-02-28',
      'Số lượng phiên bản': '2 phiên bản Có app và không app',
      'Kiểu loại': 'Xe máy điện',
      'Ngày hết hạn': 'Dựa vào KQ ĐK thực tế',
      'Đối tượng sử dụng': 'Học sinh > 16 tuổi, SV\nNgười đi làm',
      'Khối lượng (chưa bao gồm pin, AQ)': '61',
      'Kích thước xe': '1720x690x1000',
      'Chiều dài cơ sở': '1255',
      'Khoảng sáng gầm': '750',
      'Độ cao yên': '750',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '800W',
      'Công suất tối đa': '1650 W',
      'Bộ điều khiển': 'Điện áp DC 60V\nDòng điện ra: 32A±1\nĐiện áp bảo vệ khi sụt áp: 52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\nAQ 60V20Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_225,
      'Tốc độ tối đa': '44 km/h',
      'Tải trọng tối đa (kg)': '220',
      'Quãng đường di chuyển': '60km',
      'Chế độ tốc độ': 'Eco - Sport',
      'Linh kiện khung': 'Lichuang',
      'Linh kiện nổi bật':
        'Nâng cấp cụm phanh dầu trước sau từ Gogo Super 2024 – Tăng cường độ bền má phanh\nGiữ nguyên độ êm mượt Gogo Super 2024\nMở khóa cốp điện',
      'Tính năng tiện ích':
        'Thẻ từ NFC tiện lợi\nĐồng hồ led bền bỉ, thông báo lỗi trên đồng hồ\nTái tạo năng lượng khi không vặn ga\nChế độ dừng xe an toàn (P) – khoá động cơ\nMở khóa cốp từ xa (không cần mở khóa xe)\nChế độ chống trộm thông minh, mở khóa bằng mật khẩu\nChế độ sửa chữa/sự cố\nMở khóa cốp điện'
    }
  },
  {
    id: 'dk-roma-sx',
    code: 'DK ROMA SX',
    name: 'DK ROMA SX',
    series: 'Phổ thông',
    groupType: 'ev',
    updatedAt: '2026-11-14',
    specs: {
      'Màu sắc': '10 màu',
      'Ngày bắt đầu Sản Xuất': '',
      'Số lượng phiên bản': '2 Phiên bản. Chạy Pin 60V 24Ah và AQ 60V',
      'Kiểu loại': 'Xe máy điện',
      'Ngày hết hạn': 'Dựa vào KQ ĐK thực tế',
      'Đối tượng sử dụng': 'Học sinh > 16 tuổi, SV\nNgười đi làm',
      'Khối lượng (chưa bao gồm pin, AQ)': '61',
      'Kích thước xe': '1760x760x1140',
      'Chiều dài cơ sở': '1210',
      'Khoảng sáng gầm': '190',
      'Độ cao yên': '770',
      'Loại động cơ': 'BLDC - Động cơ 1 chiều không chổi than',
      'Công suất danh định': '800W',
      'Công suất tối đa': '1650 W',
      'Bộ điều khiển': 'Điện áp DC 60V\nDòng điện ra: 32A±1\nĐiện áp bảo vệ khi sụt áp: 52V±1',
      'Điện áp sử dụng. Bình sử dụng': '2 Option\nAQ 60V20Ah\nPin 60V24Ah',
      'Công suất sạc (nhãn hiệu DK Bike)': CHARGER_225,
      'Tốc độ tối đa': '44 km/h',
      'Tải trọng tối đa (kg)': '220',
      'Quãng đường di chuyển': '60v24Ah - 60km\nPin - ',
      'Chế độ tốc độ': 'Eco - Normal - Sport',
      'Linh kiện khung': 'Hảo Vương',
      'Linh kiện nổi bật':
        'Nâng cấp đèn pha 4 bi cầu, tang cường sáng.\nNâng cấp giảm xóc trước sau, cực kỳ êm ái khi sử dụng\nCông tắc và tay ga tách rời, dễ dàng mua thay thế, bảo hành\nBộ càng sau thiết kế khỏe khoắn 2 mảnh tăng cường độ êm ái.\nNâng cấp động cơ và IC tang cường độ êm ái khi tăng ga',
      'Tính năng tiện ích':
        'Thẻ từ NFC tiện lợi\nĐồng hồ led bền bỉ, thông báo lỗi trên đồng hồ\nTái tạo năng lượng khi không vặn ga\nChân chống ngắt điện – an toàn khi đỗ xe\nChế độ dừng xe an toàn (P) – khoá động cơ\nNâng hạ giảm xóc chủ động theo nhu cầu sử dụng\nApp điều khiển, kết nối bluetooth'
    }
  },
  // Xe đạp trợ lực ET1 & EC5
  {
    id: 'dk-et1',
    code: 'ET1',
    name: 'ET1',
    series: 'Xe đạp trợ lực',
    groupType: 'ebike',
    noteBadge: 'Nghiêm cấm can thiệp chế độ điều khiển • Ngày ban hành 1/1/2025',
    updatedAt: '2026-11-14',
    specs: {
      'Loại xe': 'Xe đạp trợ lực\nXe đi đa địa hình',
      'Khung xe': 'Hợp kim nhôm',
      'Khối lượng xe (bao gồm pin)': '24.2 kg',
      'Kích thước xe (D*R*C)': '1820*695*1040 mm',
      'Chiều cao yên (mm)': 'Min 800 mm\nMax 970 mm',
      'Trục cơ sở (mm)': '1100mm',
      'Động cơ': 'Tích hợp bánh sau\n36V250W',
      'Công suất tối đa': '400W',
      'Tốc độ': '25 Km/h',
      'Pin': 'Lithium-ion | Cell 18650\n36V10.4AH - 374 Wh',
      'Quãng đường': '35-40km',
      'Bộ điều khiển | Màn hình': 'Màn hình LCD hiển thị tốc độ, dung lượng pin, mức trợ lực\nTiêu chuẩn châu âu EN',
      'Cảm biến trợ lực': '12 cực từ - cảm biến kép',
      'Vành/lốp': 'Vành 26\nLốp 26-2.5',
      'Hệ thống phanh': 'Phanh đĩa trước sau',
      'Hệ thống líp xích': 'Shimano 7 cấp độ',
      'LINH KIỆN NỔI BẬT':
        'Động cơ Ananda\nCell pin 18650\nKhung hợp kim nhôm toàn phần độ bền cao\nCảm biến kép trợ lực\nPhanh đĩa trước sau\nGiảm xóc trước\nLíp 7 cấp độ',
      'TÍNH NĂNG NỔI BẬT': 'Trợ lực điện lên đến 25 km/h\nHỗ trợ đi địa hình với bộ tăng líp 7 cấp độ'
    }
  },
  {
    id: 'dk-ec5',
    code: 'EC5',
    name: 'EC5',
    series: 'Xe đạp trợ lực',
    groupType: 'ebike',
    noteBadge: 'Nghiêm cấm can thiệp chế độ điều khiển • Ngày ban hành 1/1/2025',
    updatedAt: '2026-11-14',
    specs: {
      'Loại xe': 'Xe đạp trợ lực\nXe đi thành phố',
      'Khung xe': 'Hợp kim nhôm',
      'Khối lượng xe (bao gồm pin)': '22.65 kg',
      'Kích thước xe (D*R*C)': '1880*720*1200 mm',
      'Chiều cao yên (mm)': 'Min 800 mm\nMax 990 mm',
      'Trục cơ sở (mm)': '1120mm',
      'Động cơ': 'Tích hợp bánh sau\n36V250W',
      'Công suất tối đa': '400W',
      'Tốc độ': '25 Km/h',
      'Pin': 'Lithium-ion | Cell 18650\n36V10.4AH 374 Wh',
      'Quãng đường': '35-40km',
      'Bộ điều khiển | Màn hình': 'Màn hình LCD hiển thị tốc độ, dung lượng pin, mức trợ lực\nTiêu chuẩn châu âu EN',
      'Cảm biến trợ lực': '12 cực từ - cảm biến kép',
      'Vành/lốp': 'Vành 26\nLốp 26-2.5',
      'Hệ thống phanh': 'Phanh đĩa trước sau',
      'Hệ thống líp xích': '1 cấp độ',
      'LINH KIỆN NỔI BẬT':
        'Động cơ Ananda\nCell pin 18650\nKhung hợp kim nhôm toàn phần độ bền cao\nCảm biến kép trợ lực\nPhanh đĩa trước sau',
      'TÍNH NĂNG NỔI BẬT': ''
    }
  }
];

const SERIES_LIST: ProductSeries[] = [
  'Người đi làm',
  'Phổ thông',
  'Dòng D',
  'Dòng S',
  'Dòng V',
  'Dòng EZ',
  'Xe đạp trợ lực',
  'Khác'
];

function loadProducts(): { list: ProductSpecItem[]; customized: boolean } {
  try {
    const raw = safeStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return { list: DEFAULT_PRODUCTS, customized: false };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return { list: parsed, customized: true };
    return { list: DEFAULT_PRODUCTS, customized: false };
  } catch {
    return { list: DEFAULT_PRODUCTS, customized: false };
  }
}

export default function QmsProductsTab() {
  const initial = useMemo(() => loadProducts(), []);
  const [products, setProducts] = useState<ProductSpecItem[]>(initial.list);
  const [hasCustomEdits, setHasCustomEdits] = useState<boolean>(initial.customized);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<'Tất cả' | ProductSeries>('Tất cả');
  const [detailItem, setDetailItem] = useState<ProductSpecItem | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formSeries, setFormSeries] = useState<ProductSeries>('Phổ thông');
  const [formGroupType, setFormGroupType] = useState<'ev' | 'ebike'>('ev');
  const [formImage, setFormImage] = useState<string | undefined>(undefined);
  const [formNoteBadge, setFormNoteBadge] = useState('');
  const [formSpecs, setFormSpecs] = useState<Record<string, string>>({});
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const persistProducts = (next: ProductSpecItem[]) => {
    setProducts(next);
    setHasCustomEdits(true);
    safeStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(next));
  };

  const handleResetDefault = () => {
    if (!window.confirm('Khôi phục toàn bộ 17 model sản phẩm về thông số mặc định ban đầu?')) return;
    setProducts(DEFAULT_PRODUCTS);
    setHasCustomEdits(false);
    safeStorage.removeItem(PRODUCTS_STORAGE_KEY);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (seriesFilter !== 'Tất cả' && p.series !== seriesFilter) return false;
      if (!q) return true;
      return [p.name, p.code, p.series, ...Object.values(p.specs)].join(' ').toLowerCase().includes(q);
    });
  }, [products, search, seriesFilter]);

  const evFiltered = useMemo(() => filtered.filter((p) => p.groupType === 'ev'), [filtered]);
  const ebikeFiltered = useMemo(() => filtered.filter((p) => p.groupType === 'ebike'), [filtered]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormSeries('Phổ thông');
    setFormGroupType('ev');
    setFormImage(undefined);
    setFormNoteBadge('');
    setFormSpecs({});
    setIsFormOpen(true);
  };

  const openEditModal = (item: ProductSpecItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCode(item.code);
    setFormSeries(item.series);
    setFormGroupType(item.groupType);
    setFormImage(item.image);
    setFormNoteBadge(item.noteBadge || '');
    setFormSpecs({ ...item.specs });
    setDetailItem(null);
    setIsFormOpen(true);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImageFile(file, 500, 500, 0.4);
      setFormImage(compressed);
    } catch {
      alert('Không thể xử lý ảnh. Vui lòng chọn ảnh khác.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập Tên model xe.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const cleanedName = formName.trim();
    const cleanedCode = formCode.trim() || cleanedName.toUpperCase();

    if (editingId) {
      const next = products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: cleanedName,
              code: cleanedCode,
              series: formSeries,
              groupType: formGroupType,
              image: formImage,
              noteBadge: formNoteBadge.trim() || undefined,
              specs: formSpecs,
              updatedAt: today
            }
          : p
      );
      persistProducts(next);
    } else {
      const newItem: ProductSpecItem = {
        id: `sp-${Date.now()}`,
        name: cleanedName,
        code: cleanedCode,
        series: formSeries,
        groupType: formGroupType,
        image: formImage,
        noteBadge: formNoteBadge.trim() || undefined,
        specs: formSpecs,
        updatedAt: today
      };
      persistProducts([...products, newItem]);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (item: ProductSpecItem) => {
    if (!window.confirm(`Xóa model "${item.name}" khỏi danh mục sản phẩm?`)) return;
    persistProducts(products.filter((p) => p.id !== item.id));
    if (detailItem?.id === item.id) setDetailItem(null);
  };

  const activeFields = formGroupType === 'ev' ? EV_SPEC_FIELDS : EBIKE_SPEC_FIELDS;

  const getSummarySpecs = (item: ProductSpecItem) => {
    if (item.groupType === 'ev') {
      return [
        { k: 'Công suất', v: item.specs['Công suất danh định'] || '—' },
        { k: 'Tốc độ tối đa', v: item.specs['Tốc độ tối đa'] || '—' },
        { k: 'Quãng đường', v: item.specs['Quãng đường di chuyển'] || '—' },
        { k: 'Màu sắc', v: item.specs['Màu sắc'] || '—' }
      ];
    }
    return [
      { k: 'Động cơ', v: item.specs['Động cơ'] || '—' },
      { k: 'Tốc độ', v: item.specs['Tốc độ'] || '—' },
      { k: 'Pin', v: item.specs['Pin'] || '—' },
      { k: 'Quãng đường', v: item.specs['Quãng đường'] || '—' }
    ];
  };

  return (
    <div className="space-y-4">
      {/* Thanh điều khiển: Tìm kiếm, Chế độ Thẻ / Danh sách, Bộ lọc dòng xe */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Thông Tin Sản Phẩm DKBike ({products.length} model)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Tra cứu thông số kỹ thuật, ảnh model xe theo dạng Thẻ hoặc Danh sách (Bảng so sánh).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chuyển chế độ Thẻ / Danh sách */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Danh sách</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên xe, thông số, linh kiện..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 w-56 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {hasCustomEdits && (
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Khôi phục thông số mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mặc định</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm SP</span>
            </button>
          </div>
        </div>

        {/* Chip lọc dòng xe */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
          {(['Tất cả', ...SERIES_LIST] as const).map((sr) => (
            <button
              key={sr}
              type="button"
              onClick={() => setSeriesFilter(sr)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                seriesFilter === sr
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sr}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== CHẾ ĐỘ THẺ (CARDS) ==================== */}
      {viewMode === 'cards' && (
        <>
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Không tìm thấy sản phẩm nào phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => {
                const summary = getSummarySpecs(item);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
                  >
                    <div
                      onClick={() => setDetailItem(item)}
                      className="relative h-40 bg-slate-100 border-b border-slate-200 flex items-center justify-center cursor-pointer group overflow-hidden"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition duration-200"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Bike className="w-9 h-9 stroke-[1.5]" />
                          <span className="text-[11px] font-medium">Chưa có ảnh model</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 text-[10px] font-extrabold text-slate-700">
                        {item.series}
                      </span>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{item.name}</h3>
                          <span className="text-[10px] font-mono font-bold text-indigo-600">{item.code}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mt-2.5 text-xs">
                          {summary.map((s) => (
                            <div key={s.k} className="bg-slate-50 rounded-lg px-2 py-1.5">
                              <span className="text-[10px] text-slate-500 block">{s.k}</span>
                              <span className="font-bold text-slate-800 line-clamp-1 whitespace-pre-line">{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="py-1.5 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Chỉnh sửa thông số & ảnh"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== CHẾ ĐỘ DANH SÁCH (BẢNG SO SÁNH) ==================== */}
      {viewMode === 'table' && (
        <div className="space-y-5">
          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Không tìm thấy sản phẩm nào phù hợp.
            </div>
          )}

          {/* Bảng 1: Xe máy điện / Xe điện DKBike (24 hạng mục) */}
          {evFiltered.length > 0 && (
            <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold uppercase">
                  Bảng Thông Số Kỹ Thuật Xe Điện DKBike ({evFiltered.length} model)
                </span>
                <span className="text-[11px] text-slate-300">Cuộn ngang để xem tất cả model • Bấm nút bút để sửa</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-indigo-50 text-indigo-950">
                      <th className="border border-slate-300 px-2 py-1.5 w-10 text-center sticky left-0 z-20 bg-indigo-50">
                        STT
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 min-w-[180px] text-left sticky left-10 z-20 bg-indigo-50 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                        Hạng mục / Dòng xe
                      </th>
                      {evFiltered.map((item) => (
                        <th key={item.id} className="border border-slate-300 px-2.5 py-2 min-w-[190px] align-top bg-white">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.series}
                            </span>
                            <div
                              onClick={() => setDetailItem(item)}
                              className="w-24 h-16 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer"
                            >
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Bike className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="font-extrabold text-slate-900 hover:text-indigo-700 cursor-pointer"
                              >
                                {item.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1 rounded hover:bg-indigo-50 text-indigo-600 cursor-pointer"
                                title={`Sửa ${item.name}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EV_SPEC_FIELDS.map((field, fIdx) => (
                      <tr key={field.stt} className={fIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-700 align-top sticky left-0 z-10 bg-inherit">
                          {field.stt}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 font-bold text-slate-900 align-top sticky left-10 z-10 bg-inherit shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          {field.label}
                        </td>
                        {evFiltered.map((item) => (
                          <td
                            key={`${item.id}-${field.stt}`}
                            className="border border-slate-300 px-2.5 py-2 text-slate-800 whitespace-pre-line align-top"
                          >
                            {item.specs[field.label] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bảng 2: Xe đạp trợ lực (ET1, EC5) */}
          {ebikeFiltered.length > 0 && (
            <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-900 text-white flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-extrabold uppercase">
                  Xe Đạp Trợ Lực ({ebikeFiltered.length} model)
                </span>
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-100 border border-amber-400/40 px-2.5 py-0.5 rounded">
                  Nghiêm cấm can thiệp chế độ điều khiển • Ngày ban hành 1/1/2025
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-950">
                      <th className="border border-slate-300 px-2 py-1.5 w-10 text-center sticky left-0 z-20 bg-emerald-50">
                        STT
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 min-w-[180px] text-left sticky left-10 z-20 bg-emerald-50">
                        Hạng mục
                      </th>
                      {ebikeFiltered.map((item) => (
                        <th key={item.id} className="border border-slate-300 px-2.5 py-2 min-w-[230px] align-top bg-white">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              onClick={() => setDetailItem(item)}
                              className="w-24 h-16 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer"
                            >
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Bike className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailItem(item)}
                                className="font-extrabold text-slate-900 hover:text-indigo-700 cursor-pointer"
                              >
                                {item.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1 rounded hover:bg-indigo-50 text-indigo-600 cursor-pointer"
                                title={`Sửa ${item.name}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EBIKE_SPEC_FIELDS.map((field, fIdx) => {
                      const isSectionRow = field.stt === 'II' || field.stt === 'III';
                      return (
                        <tr
                          key={field.stt}
                          className={
                            isSectionRow
                              ? 'bg-emerald-50/60 font-semibold'
                              : fIdx % 2 === 1
                              ? 'bg-slate-50/70'
                              : 'bg-white'
                          }
                        >
                          <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-700 align-top sticky left-0 z-10 bg-inherit">
                            {field.stt}
                          </td>
                          <td className="border border-slate-300 px-2.5 py-2 font-bold text-slate-900 align-top sticky left-10 z-10 bg-inherit">
                            {field.label}
                          </td>
                          {ebikeFiltered.map((item) => (
                            <td
                              key={`${item.id}-${field.stt}`}
                              className="border border-slate-300 px-2.5 py-2 text-slate-800 whitespace-pre-line align-top"
                            >
                              {item.specs[field.label] || '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL XEM CHI TIẾT SẢN PHẨM ==================== */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-extrabold">
                  {detailItem.series}
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{detailItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="h-52 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {detailItem.image ? (
                  <img src={detailItem.image} alt={detailItem.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <Bike className="w-12 h-12 stroke-[1.5]" />
                    <span className="text-xs">Chưa có ảnh model xe</span>
                  </div>
                )}
              </div>

              {detailItem.noteBadge && (
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                  {detailItem.noteBadge}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="border border-slate-300 px-2 py-1.5 w-12 text-center">STT</th>
                      <th className="border border-slate-300 px-2.5 py-1.5 w-56 text-left">Hạng mục</th>
                      <th className="border border-slate-300 px-3 py-1.5 text-left">Thông số / Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailItem.groupType === 'ev' ? EV_SPEC_FIELDS : EBIKE_SPEC_FIELDS).map((f, idx) => (
                      <tr key={f.stt} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-700 align-top">
                          {f.stt}
                        </td>
                        <td className="border border-slate-300 px-2.5 py-2 font-bold text-slate-900 align-top">
                          {f.label}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-800 whitespace-pre-line align-top">
                          {detailItem.specs[f.label] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                type="button"
                onClick={() => openEditModal(detailItem)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Chỉnh sửa / Đổi ảnh</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL THÊM / SỬA SẢN PHẨM ==================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? `Chỉnh sửa thông số: ${formName}` : 'Thêm sản phẩm / model xe mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Ảnh model xe */}
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-32 h-24 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {formImage ? (
                    <img src={formImage} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Bike className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <div className="font-bold text-slate-800">Ảnh model xe</div>
                  <p className="text-[11px] text-slate-500">
                    Ảnh được tự động nén dưới 30KB bằng <code>compressImageFile</code> để tránh tràn bộ nhớ.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImagePick}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={compressing}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{compressing ? 'Đang nén ảnh...' : formImage ? 'Đổi ảnh' : 'Chọn ảnh'}</span>
                    </button>
                    {formImage && (
                      <button
                        type="button"
                        onClick={() => setFormImage(undefined)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin định danh */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên model *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: DK ROMA SX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã SP</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="VD: DK ROMA SX"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dòng xe</label>
                  <select
                    value={formSeries}
                    onChange={(e) => setFormSeries(e.target.value as ProductSeries)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {SERIES_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bộ tiêu chí</label>
                  <select
                    value={formGroupType}
                    onChange={(e) => setFormGroupType(e.target.value as 'ev' | 'ebike')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ev">Xe điện (24 hạng mục)</option>
                    <option value="ebike">Xe đạp trợ lực (18 hạng mục)</option>
                  </select>
                </div>
              </div>

              {/* Toàn bộ bảng thông số */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                {activeFields.map((f) => {
                  const isLong =
                    f.label.includes('nổi bật') ||
                    f.label.includes('Tính năng') ||
                    f.label.includes('Bộ điều khiển') ||
                    f.label.includes('Công suất sạc') ||
                    f.label.includes('Điện áp') ||
                    f.label.includes('NỔI BẬT');
                  return (
                    <div key={f.stt} className={isLong ? 'sm:col-span-2' : ''}>
                      <label className="block font-bold text-slate-700 mb-1">
                        {f.stt}. {f.label}
                      </label>
                      {isLong ? (
                        <textarea
                          rows={3}
                          value={formSpecs[f.label] || ''}
                          onChange={(e) => setFormSpecs((prev) => ({ ...prev, [f.label]: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formSpecs[f.label] || ''}
                          onChange={(e) => setFormSpecs((prev) => ({ ...prev, [f.label]: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thông tin</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
