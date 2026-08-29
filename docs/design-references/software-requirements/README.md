# "Yêu cầu hệ thống" — các bản đã thử

Năm bản của khối **Yêu cầu hệ thống** trên trang chi tiết phần mềm
(`/{danh-mục}/{sản-phẩm}`), chụp lại ngày 25/08.

> **Đừng `cp` đè nữa.** Năm file này chụp trước khi trang có ba khối sửa được
> từ admin — Tính năng nổi bật (`features`), Mô tả tính năng (`featuresNote`)
> và Hướng dẫn sử dụng (`guide`). Chép đè cả file là mất sạch ba khối đó cùng
> phần bảo hành đã sửa. Muốn đổi bố cục thì **chỉ bê `REQUIREMENTS` và
> `factsCard`** sang `SoftwareDescription.tsx` đang chạy, giữ nguyên phần còn
> lại.

## Đang chạy

`1-card-720.tsx` — card bo góc 720px, cột nhãn 30%. Đây là "hướng 1" trong
hai hướng shop chốt; "hướng 2" là `4-no-card.tsx` — bỏ hộp, chỉ còn gạch kẻ.

## Năm bản

| File | Hộp | Bề ngang | Cột nhãn | Tiêu đề | Nội dung |
|---|---|---|---|---|---|
| `0-four-tiles.tsx` | 4 ô nhỏ | lưới 1→2→4 cột | — | ngoài, 17px in hoa | **dữ liệu sản phẩm** |
| `1-card-720.tsx` | 1 card bo góc | 720px | 30% (~200px) | ngoài, 17px in hoa | 5 dòng cố định |
| `2-card-full.tsx` | 1 card bo góc | rộng hết khung | 220px cố định | ngoài, 17px in hoa | 5 dòng cố định |
| `3-card-like-image.tsx` | 1 card bo góc | 640px | 45% | **trong card**, 22px chữ thường | 5 dòng cố định, nhãn có dấu `:` |
| `4-no-card.tsx` | **không hộp** | rộng hết khung | 220px cố định | ngoài, 17px in hoa | 5 dòng cố định |

`3-card-like-image.tsx` là bản bám sát ảnh mẫu shop gửi (tiêu đề trong hộp,
chữ thường, nhãn có dấu hai chấm).

## Khác biệt quan trọng nhất: nội dung

Bốn bản 1→4 dùng hằng số `REQUIREMENTS` viết cứng trong file — **giống nhau ở
mọi phần mềm**:

```
Hỗ trợ               Windows 10, 11 Net nhà
Yêu cầu thêm         UEFI bios,enable virtualization,disable secure boot
CPU hỗ trợ           Intel and AMD with AVX
Thiết lập màn hình   Không viền !
Nền tảng             Steam
```

`0-four-tiles.tsx` thì đọc **dữ liệu từng sản phẩm** — Phiên bản, Nền tảng,
Thời hạn (từ các gói), Cấp key.

**Bản này không còn chạy được.** Ngày 26/08 shop chốt gỡ hai ô "Phiên bản" và
"Nền tảng" khỏi `/admin/products/<mã>`, vì từ lúc bỏ bản 4-ô thì nhập vào
không hiện ở đâu. Hai cột `version` / `platform` cũng đã xóa khỏi bảng
`products` (migration `20260826060000_drop_product_version_platform`). Muốn
quay lại bản 4-ô thì phải dựng lại cột, ô nhập và đường ống — không phải chép
một file.

## Vì sao chọn bỏ hộp

Có hộp thì phải quyết hộp rộng bao nhiêu, và cả hai đáp án đều có chỗ dở:

- **720px** — viền ôm sát chữ, nhưng thành khối duy nhất hẹp giữa các khối
  rộng hết khung (đoạn văn, danh sách tính năng, khung bảo hành).
- **rộng hết khung** — hợp nhịp, nhưng dòng dài nhất chỉ tới ~570px trong khi
  viền phải ở ~1220px: 650px trống **nằm trong một cái viền**, đọc ra là hộp
  rỗng.

Bỏ viền và nền thì không còn gì để trông rỗng, nên bảng chạy hết bề ngang như
văn xuôi và chỗ thừa chỉ là nền trang. Cột nhãn ghim 220px (không dùng %) để
giá trị không bị đẩy xa nhãn khi khung rộng ra.
