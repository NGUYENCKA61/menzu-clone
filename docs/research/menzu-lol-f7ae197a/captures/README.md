# Trang cần chụp thủ công

Cloudflare trả 403 cho mọi request không phải trình duyệt thật, nên các trang
dưới đây không tự lấy được. Bảy trang này hiện là khung trống (`NotCapturedYet`).

## Cách lấy (mỗi trang ~20 giây)

1. Mở trang trong Chrome (đăng nhập sẵn nếu trang cần)
2. `F12` mở DevTools → tab **Elements**
3. Chuột phải vào thẻ `<html>` trên cùng → **Copy** → **Copy outerHTML**
4. Dán vào file tương ứng bên dưới, lưu lại

Dùng "Copy outerHTML" chứ không phải `Ctrl+U` (View source): trang này render
bằng JavaScript, view-source chỉ ra khung rỗng chưa có nội dung.

## Danh sách

| File cần tạo | URL |
|---|---|
| `news.html`     | https://menzu.lol/news |
| `docs.html`     | https://menzu.lol/docs |
| `bio.html`      | https://menzu.lol/bio |
| `trade.html`    | https://menzu.lol/trade |
| `2fa.html`      | https://menzu.lol/2fa |
| `checkwc.html`  | https://menzu.lol/checkwc |
| `download.html` | https://menzu.lol/app/download |

Không cần làm hết một lượt — có file nào tôi dựng trang đó.

## Kho đồ skin

Trang `/account/[code]` hiện hiển thị ô xám theo số lượng vì ảnh từng skin đến
từ một API riêng, không nằm trong HTML. Muốn có kho đồ thật:

1. Mở một trang acc bất kỳ, `F12` → tab **Network** → lọc **Fetch/XHR**
2. Bấm qua các tab kho đồ (Skin súng, Bùa, Nhân vật…)
3. Chuột phải request nào trả về danh sách skin → **Copy** → **Copy response**
4. Lưu thành `inventory-<mã acc>.json`
