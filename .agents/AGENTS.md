# Quy tắc cốt lõi khi làm việc với dự án DK QMS (Anh Thao)

## 1. Bảo đảm tuyệt đối hệ thống Đồng bộ & Sao lưu Dữ liệu
- Mọi thao tác ghi dữ liệu cục bộ bắt buộc phải qua `safeStorage.setItem`.
- Giữ nguyên và bảo vệ toàn bộ cơ chế **Realtime Listener (`onSnapshot`)**, cơ chế **Backup / Restore dữ liệu**, cũng như tính năng đồng bộ thời gian thực giữa các thiết bị (máy này - máy khác, tài khoản này - tài khoản khác).
- Giữ nguyên cờ `isDirty` bảo vệ dữ liệu bẩn chưa kịp push lên Cloud.
- Luôn kiểm tra kỹ các thay đổi có ảnh hưởng đến hệ thống đồng bộ và sao lưu dữ liệu, nếu có phải hỏi anh Thao trước khi sửa.
## 2. Phạm vi Chỉnh sửa Chặt chẽ (Strict Scoping & Inquiry Rule)
- Khi anh Thao yêu cầu sửa bất kỳ chức năng hay lỗi nào, **chỉ sửa đúng nguyên nhân/vấn đề được chỉ định**.
- **KHÔNG TỰ Ý** refactor, bóc tách cấu trúc file lớn (`App.tsx`), thay đổi giao diện (màu sắc, thẻ báo cáo, gom nhóm, bố cục) trừ khi có yêu cầu trực tiếp.
- Nếu chỉnh sửa có ảnh hưởng liên quới hoặc thay đổi cách hiển thị ở phân hệ/chức năng khác, **BẮT BUỘC PHẢI HỎI Ý KIẾN VÀ ĐƯỢC ANH THAO ĐỒNG Ý TRƯỚC KIÊN SỬA**.

## 3. Xây dựng & Giữ nguyên Giao diện Nguyên bản
- Mọi thẻ báo cáo tổng hợp (KPI Cards), bảng biểu chi tiết, gom nhóm thứ tự thời gian (như Báo cáo ngày mới nhất -> cũ nhất), màu sắc HSL gradient nguyên bản trong `App.tsx` phải được bảo toàn 100%.

## 4. Chuẩn mực Thương hiệu & Thâm xưng
- Người dùng: **anh Thao** (không dùng "Thảo" hoặc "chị Thảo").
- Tên công ty: **Công ty TNHH Xe điện DK Việt Nhật**
- Thương hiệu: **DKBike** | Slogan: **Xe cho cả gia đình** | Phòng ban: **Quản lý chất lượng** (**QLCL** / **DK QMS**)
