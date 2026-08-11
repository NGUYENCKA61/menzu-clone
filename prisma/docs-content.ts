/**
 * Article bodies for the /docs wiki.
 *
 * Written from scratch rather than copied from the site this project mirrors:
 * the concepts (FA, NFA, drop mail, welcome mail) are common trade
 * terminology that nobody owns, but the prose explaining them is somebody's
 * work, and duplicate text would also cost the clone its own search ranking.
 *
 * IMPORTANT: the exact meaning of a shop's own mail tiers varies between
 * shops. Read these through and adjust the specifics to match what you
 * actually sell before publishing.
 *
 * Paragraphs are separated by blank lines and rendered as plain text — see
 * src/app/docs/[slug]/page.tsx.
 */
export const DOC_BODIES: Record<string, string> = {
  "acc-full-access-fa-la-gi": `FA là viết tắt của Full Access — tài khoản được bàn giao kèm quyền truy cập đầy đủ vào email đã đăng ký. Sau khi mua, bạn đổi được mật khẩu game, mật khẩu email, số điện thoại khôi phục và bật lại xác thực hai lớp.

Đây là mức an toàn cao nhất khi mua acc. Lý do rất đơn giản: mọi con đường lấy lại tài khoản của Riot đều đi qua email. Khi email nằm trong tay bạn, người bán không còn cách nào thu hồi acc, kể cả khi họ đổi ý sau nhiều tháng.

Việc đầu tiên nên làm sau khi nhận acc FA:

1. Đổi mật khẩu email trước, không phải mật khẩu game.
2. Gỡ toàn bộ số điện thoại và email khôi phục cũ.
3. Bật xác thực hai lớp bằng ứng dụng, không dùng SMS.
4. Đăng xuất tất cả thiết bị đang đăng nhập.

Làm đúng thứ tự này quan trọng hơn nhiều người nghĩ. Nếu đổi mật khẩu game trước mà email vẫn của người khác, họ chỉ cần bấm "quên mật khẩu" là lấy lại được ngay.

Đổi lại, acc FA thường đắt hơn cùng cấu hình ở dạng NFA. Khoản chênh đó chính là tiền mua sự an tâm.`,

  "acc-non-full-access-nfa-la-gi": `NFA là Non Full Access — bạn chỉ nhận thông tin đăng nhập game, còn email đăng ký vẫn do người bán giữ.

Acc NFA rẻ hơn đáng kể so với acc FA cùng kho đồ. Nhưng cần hiểu rõ mình đang đánh đổi cái gì: người giữ email là người có quyền lấy lại tài khoản bất cứ lúc nào. Bạn chơi được, nhưng không thực sự sở hữu.

Ba rủi ro thường gặp:

Người bán khôi phục lại acc sau khi đã bán. Riot xử lý tranh chấp dựa trên email đăng ký, nên trong mắt hệ thống họ mới là chủ.

Email bị thu hồi vì không hoạt động. Nhiều dịch vụ email xoá tài khoản bỏ trống lâu ngày, và acc game gắn với nó cũng mất đường khôi phục.

Không tự xử lý được khi mất mật khẩu. Mọi thao tác khôi phục đều cần email, tức là mỗi lần gặp sự cố bạn phải liên hệ lại người bán.

NFA phù hợp khi bạn cần acc giá rẻ để chơi ngắn hạn, chấp nhận rủi ro và không nạp thêm tiền vào. Nếu định gắn bó lâu dài hoặc nạp thêm, chênh lệch giá để lên FA gần như luôn đáng.

Trước khi mua NFA, hãy hỏi rõ shop về thời hạn bảo hành và cách xử lý nếu acc bị thu hồi.`,

  "drop-mail-la-gi": `Drop mail là email được tạo mới riêng cho tài khoản game, thay cho email gốc lúc đăng ký. Người bán tạo một hộp thư sạch, chuyển acc sang email đó, rồi bàn giao cả hai cho người mua.

Cách làm này sinh ra vì phần lớn acc trên thị trường không còn giữ được email gốc — chủ cũ đã dùng nó cho nhiều dịch vụ khác và không muốn giao đi.

Điểm mạnh của drop mail là bạn nhận được quyền truy cập đầy đủ vào một hộp thư không dính dáng gì tới ai khác. Về mặt kiểm soát, nó tương đương acc FA.

Điểm cần lưu ý: vì email được tạo gần đây, nó chưa có lịch sử sử dụng lâu dài. Một số trường hợp Riot yêu cầu xác minh bổ sung khi thấy email đăng ký thay đổi gần đây, đặc biệt nếu đăng nhập từ vị trí lạ ngay sau đó.

Nên làm sau khi nhận acc drop mail:

Đăng nhập vào email trước, đổi mật khẩu và bật xác thực hai lớp cho chính hộp thư đó.

Thêm số điện thoại khôi phục của bạn vào email, gỡ số cũ nếu có.

Đăng nhập game từ thiết bị thường dùng và giữ nguyên vài ngày đầu, hạn chế đổi vị trí liên tục.

Khác biệt lớn nhất giữa drop mail và NFA: drop mail bạn cầm email, NFA thì không. Đừng để tên gọi làm lẫn lộn hai thứ này.`,

  "huong-dan-check-thu-welcome": `Thư welcome là email Riot Games gửi tự động khi một tài khoản vừa được tạo. Nó là bằng chứng khó làm giả nhất về nguồn gốc của acc, vì thư thật mang chữ ký số do chính máy chủ Riot ký và do nhà cung cấp email của bạn xác minh.

Kiểm tra thư welcome giúp trả lời hai câu: acc này đăng ký khi nào, và email đang giữ có đúng là email gốc không.

Lấy mã nguồn thư trên máy tính:

Mở thư trong Gmail, bấm nút ba chấm ở góc phải khung thư, chọn "Hiển thị thư gốc" (Show original). Trang mới mở ra chứa toàn bộ mã nguồn — copy hết.

Lấy mã nguồn thư trên điện thoại:

Không dùng app Gmail, vì app không có chức năng này. Mở Chrome hoặc Safari, vào Gmail bản web, bật menu trình duyệt và chọn "Trang cho máy tính" (Desktop site). Sau đó làm y hệt các bước trên máy tính.

Dán mã nguồn vào công cụ Check Thư Welcome, hệ thống sẽ kiểm tra ba dấu hiệu quan trọng:

Người gửi có đúng tên miền của Riot Games hay không. Cần chú ý các tên miền giả dạng kiểu riotgames.com.xxx.net — nhìn thoáng qua rất dễ nhầm.

Chữ ký DKIM có phải do Riot ký và đã được xác minh chưa. Đây là phần không thể giả sau khi thư đã gửi đi.

Kết quả SPF và DMARC do nhà cung cấp email ghi lại.

Một lưu ý khi đọc kết quả: nếu thư đã được chuyển tiếp qua hộp thư khác, SPF có thể báo không đạt dù thư hoàn toàn thật. Chuyển tiếp làm hỏng SPF theo đúng thiết kế, trong khi DKIM vẫn còn nguyên. Vì vậy chỉ cần tên miền người gửi và chữ ký DKIM đạt là đủ tin cậy.

Nội dung bạn dán vào được xử lý ngay trên trình duyệt, không gửi lên máy chủ và không lưu lại.`,

  "menzu-mail-la-gi": `Đây là loại mail do chính cửa hàng tạo và bàn giao kèm tài khoản, thay vì dùng lại email gốc của chủ cũ.

Quy trình: cửa hàng tạo một hộp thư mới, chuyển tài khoản Valorant sang email đó, rồi giao cả thông tin game lẫn thông tin email cho người mua. Bạn nắm toàn quyền với cả hai.

Khác biệt so với các loại khác:

So với NFA, bạn cầm email nên không ai thu hồi được acc.

So với acc còn email gốc, hộp thư này sạch — không dính dữ liệu cá nhân của chủ cũ, không có dịch vụ nào khác đang gắn vào.

Sau khi nhận acc, hãy đổi mật khẩu email, bật xác thực hai lớp cho hộp thư, và thay số điện thoại khôi phục bằng số của bạn. Làm xong ba việc này thì tài khoản thực sự là của bạn.

Cửa hàng vẫn giữ bản sao thông tin trong thời gian bảo hành để hỗ trợ khi có sự cố. Hết thời hạn đó, bạn nên đổi lại toàn bộ mật khẩu một lần nữa.

Xem thêm chính sách bảo hành để biết thời hạn và phạm vi hỗ trợ cụ thể.`,
};
