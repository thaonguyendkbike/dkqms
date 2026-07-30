# Project Context & User Preferences

## User Information
- **Name**: Thao
- **Gender**: Nam (Male)
- **Important Addressing Guideline**: 
  - ALWAYS call him "anh Thao" or "anh".
  - NEVER call him "Thảo" or "chị Thảo". Ensure correct spelling ("Thao", no tone accent) and correct gender terms ("anh", not "chị").

## Project-Scoped QMS Standards & Rules

### 1. Quy tắc về Hình ảnh và Dung lượng (Image & Quota Rules)
- Tất cả ảnh đính kèm chọn từ file của người dùng phải được nén chủ động bằng `compressImageFile(file, 500, 500, 0.4)` trước khi chuyển đổi thành Base64.
- Mục đích: Giới hạn dung lượng mỗi ảnh dưới **30KB** để tránh lỗi tràn bộ nhớ LocalStorage (tối đa 5MB) và lỗi từ chối ghi tài liệu của Firestore (tối đa 1MB).
- Tuyệt đối không ghi đè trực tiếp dữ liệu ảnh Base64 thô kích thước lớn từ camera thiết bị di động vào cơ sở dữ liệu.

### 2. Quy tắc Lưu trữ và Đồng bộ (Safe Storage & Sync Rules)
- Mọi thao tác ghi dữ liệu cục bộ bắt buộc phải đi qua wrapper `safeStorage.setItem`. 
- Nếu bộ nhớ LocalStorage bị tràn, hệ thống bắt buộc phải tự động kích hoạt tiến trình dọn dẹp các ảnh Base64 của các khóa khác trước. Nếu vẫn đầy, tiến hành lọc bỏ ảnh Base64 của chính bản ghi hiện tại để cứu dữ liệu chữ (Text), tuyệt đối không để mất bản ghi chữ khi tải lại trang (F5).
- Luồng đồng bộ hóa dữ liệu lúc nạp trang phải ưu tiên bảo vệ dữ liệu bẩn (`isDirty` flag) trên thiết bị của người dùng để tránh bị đè mất dữ liệu chưa kịp đồng bộ lên Cloud.

### 3. Quy tắc Đồng nhất Biểu mẫu (Form Unification Rules)
- Mọi thay đổi đối với biểu mẫu của các phân hệ (như CAPA, ECO, PTSP, Nhà cung cấp) phải được thực hiện đồng thời và đồng nhất giữa **Biểu mẫu Khởi tạo mới** (Creation Form) và **Biểu mẫu Chỉnh sửa** (Edit Modal).
- Cần đảm bảo đồng nhất về:
  - Danh sách các trường dữ liệu.
  - Kiểu nhập liệu (Droplist, Checkbox, Text input).
  - Tên thuộc tính cơ sở dữ liệu (ví dụ: luôn dùng `id` cho dự án thay vì dùng lẫn lộn `code`).

### 4. Quy chuẩn Thông tin Doanh nghiệp & Thương hiệu (Corporate Brand & Naming Standards)
- **Tên công ty**: "Công ty TNHH Xe điện DK Việt Nhật" (Tuyệt đối tuân thủ, không sử dụng các biến thể sai khác).
- **Tên thương hiệu**: "DKBike"
- **Slogan**: "Xe cho cả gia đình"
- **Phòng ban**: "Quản lý chất lượng", viết tắt tiếng Việt là "QLCL", viết tắt tiếng Anh là "DK QMS"
- **Yêu cầu áp dụng**: Khi thiết kế, chỉnh sửa, hiển thị biểu mẫu hoặc xuất bản/in các báo cáo, bắt buộc phải hiển thị đúng tên công ty, thương hiệu, khẩu hiệu và phòng ban theo quy chuẩn này.

