# Đối chiếu clone với bản gốc

Chạy `node scripts/compare-pages.mjs` để lặp lại. Công cụ so **bề mặt chức
năng** của từng trang — tiêu đề, nút, ô nhập, nhãn, đích đến — chứ không so
markup hay CSS, vì hai thứ đó khác nhau liên tục giữa một app React và bản dựng
lại mà không có nghĩa là sai.

Cần dev server đang chạy (mặc định `localhost:3100`) và các bản chụp trong
`captures/` do `scripts/capture-page.mjs` tạo ra.

Bỏ qua theo yêu cầu: **Build kho đồ, Valorant Hub, Check Skin**.

---

## Đã sửa

| Lỗi | Bản gốc | Clone trước đó |
|---|---|---|
| Route đăng ký | `/signup` | `/register` (gốc 404 ở path này) |
| Footer "Cộng đồng" | `/bio` | `href="#"` |
| Footer banner tải app | `/app/download` | không phải link |
| Trang `/services` | 2 khu: Dịch Vụ Game, Dịch Vụ Khác | 1 danh sách phẳng |
| Tab kho đồ | Buddies/Agents/Cards/Sprays có số thật | tất cả bằng 0 |
| Nút cọc | "Cọc / Trả Góp" | "Cọc / Góp — từ 0đ" |
| Thẻ trang chủ | link tới danh mục/dịch vụ | `href="#"`, không bấm được |
| Ảnh hero login | nét | vỡ (mã hoá ở 256px) |
| Lưới kho đồ | ảnh + tên từng món | ô xám trống |
| Lọc theo vũ khí | All Skin / Vandal / Phantom / … | không có |
| Nút "Xem thêm N skin" | có | không có |

Kho đồ thật lấy từ JSON nhúng sẵn trong trang account — uuid, tên và ảnh của
từng skin, bùa, agent, spray, thẻ bài. Loại vũ khí tra theo uuid qua danh sách
chính thức của valorant-api, **không** suy từ tên: dao găm như "Equilibrium"
hay "Heart Splitter" không mang tên vũ khí nào, đối chiếu theo tên sẽ âm thầm
bỏ sót toàn bộ dao.

Đã quét 31/32 sản phẩm, 1250 skin tra được vũ khí. `VLR2135` không quét được vì
đã bán trên bản gốc. Chạy `node scripts/scrape-skins.mjs` để tiếp tục,
`npx tsx prisma/skin-status.ts` để xem tiến độ.

`/register` giữ lại dưới dạng chuyển hướng vĩnh viễn, không xoá — link đã phát
hành từ bản clone này vẫn chạy.

---

## Chưa sửa được — cần thêm dữ liệu hoặc quyết định

### Widget "Chăm sóc khách hàng"

Xuất hiện ở mọi trang của bản gốc. Chưa dựng.

### Nội dung 2 bài chính sách bảo hành

Là cam kết ràng buộc về hoàn tiền và thu hồi — cần điều khoản thật của shop.

### Luật Cọc/Góp, Tiêu trước trả sau, tích điểm, thăng hạng

Nút đã có, chưa mở gì. Số tiền cọc là dữ liệu đặt theo từng sản phẩm — **không
phải phần trăm của giá**. Một sản phẩm ghi 252.000đ trên giá 2.520.000đ trông
như 10%, nhưng hai sản phẩm khác kiểm tra thêm không ghi số nào cả.

### `/trade`

Chặn khách, trả về trang đăng nhập. Cần đăng nhập trong cửa sổ Chrome ở
`.chrome-capture/` rồi chụp lại.

---

## Khác biệt hợp lệ, không phải lỗi

- `/hub`, `/checkskin`, `/build` — bỏ theo yêu cầu, giữ `href="#"`
- `/manifest.webmanifest`, `/categories` — clone thêm, bản gốc không có
- `/images`, `/logos` — bản gốc để asset ở gốc domain, clone gom vào `/sites/`
- `/news` — 404 ở **cả hai bên**; footer bản gốc cũng link tới trang 404 của
  chính nó
- `VLR2137` — đã bán trên bản gốc từ sau lần scrape, không phải lỗi clone

---

## Chưa đối chiếu được

Các trang sau chặn khách nên không chụp được khi chưa đăng nhập:

`/profile` · `/wallet` · `/orders` · `/transactions` · `/topup` ·
`/service-orders` · `/voucher` · `/trade` · toàn bộ `/admin`

Backend của chúng đã kiểm qua API, nhưng **giao diện chưa đối chiếu 1:1 với bản
gốc**.
