# Hot trending slider — các nấc mũi tên đã thử (28–29/08/2026)

Dải "Hot trending tháng này" (`ProductRow` với `marquee`, `RowSlider.tsx`)
đã đi qua mấy nấc mũi tên; chủ shop bỏ mũi tên và nói "mốt có đổi ý thì thêm
lại sau". Mỗi file ở đây là một bản `RowSlider.tsx` hoàn chỉnh (kèm
`ProductRow`/CSS khi nấc đó cần), chép đè lên
`src/components/sites/menzu-lol-f7ae197a/root-8a5edab2/` là chạy.

| Nấc | File | Mô tả |
| --- | --- | --- |
| v1 | `RowSlider.v1-edge-arrows.tsx.txt` + `row-slider.v1-edge-arrows.css.txt` | Mũi tên tròn kiểu Flash sale ở hai mép dải, luôn hiện; chưa có mép mờ, chưa có chấm. CSS là khối reduced-motion cũ trong `globals.css`. |
| v2 | = v3 nhưng bỏ phần header | Mũi tên ở mép, chỉ hiện khi rê chuột; có mép mờ + hé thẻ kế + hàng chấm. |
| v3 | `RowSlider.v3-header-arrows.tsx.txt` + `ProductRow.v3-header-arrows.tsx.txt` | Cặp nút vuông nhỏ ‹ › trên dòng tiêu đề, cạnh "XEM TẤT CẢ"; `RowSlider` nhận `title`/`viewAll` và tự vẽ header. |
| v4 (đang dùng) | `RowSlider.v4-current-no-arrows.tsx.txt` | Không mũi tên: tự trượt, mép mờ, hàng chấm bấm được. |

Lưu ý: các bản lưu này đứng yên theo thời điểm chép; nếu `RowSlider.tsx` sau
này đổi thêm (tốc độ, đo chiều rộng…), lấy phần mũi tên từ đây ghép vào bản
hiện tại thay vì chép đè nguyên file.

## Các kiểu mũi tên chưa thử (gợi ý để sau)

1. Mũi tên kẹp hàng chấm — ‹ › hai bên hàng chấm dưới dải, kiểu phân trang.
2. Dải mờ cả chiều cao ở hai mép (Netflix) — hiện khi rê chuột, chevron to, vùng bấm rộng.
3. Mũi tên bám thẻ hé — viên thuốc kính (giống chip mã ở góc thẻ) nằm trên mẩu thẻ hé mép phải; tự ẩn phía hết thẻ.
4. Nút cắt góc kiểu "XEM NGAY" — khung cắt góc xéo, viền đỏ, hover đổ đầy đỏ.
5. Không nút, kéo bằng tay — con trỏ bàn tay, kéo/vuốt có quán tính, tự canh nấc.
6. Thanh kéo tiến độ — thay hàng chấm bằng thanh mảnh kéo được, vừa báo vị trí vừa điều khiển.

Gợi ý lúc đó: (1) nếu muốn gọn, (5) nếu muốn hiện đại không thêm nút.
