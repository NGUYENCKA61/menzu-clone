// Typed datasets for the menzu.lol product-row sections — "Sản Phẩm Nổi Bật",
// "Đấu Trường Chân Lý", "Dịch Vụ Game" and "Dịch Vụ Khác". Titles and stats
// are verbatim from the live site.

export interface ProductStat {
  label: string;
  value: string;
}

export interface ProductCard {
  image: string;
  title: string;
  stats: [ProductStat, ProductStat];
}

const IMAGE_BASE_PATH = "/sites/menzu-lol-f7ae197a/root-8a5edab2/images";

export const FEATURED_CARDS: ProductCard[] = [
  {
    image: `${IMAGE_BASE_PATH}/upload/acctuchon.gif`,
    title: "ACCOUNT VALORANT TỰ CHỌN",
    stats: [
      { label: "Đã Bán", value: "6202" },
      { label: "Đang Bán", value: "165" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/0-5.webp`,
    title: "RANDOM VALORANT 20K | ĐỔI THÔNG TIN",
    stats: [
      { label: "Đã Bán", value: "1600" },
      { label: "Đang Bán", value: "8" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/prerankthumb.webp`,
    title: "RANDOM SMUFT BẮN RANK | ĐỔI THÔNG TIN",
    stats: [
      { label: "Đã Bán", value: "208" },
      { label: "Đang Bán", value: "3" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/rdlv20.webp`,
    title: "RANDOM VALORANT TRÊN LV 20 | ĐỔI THÔNG TIN",
    stats: [
      { label: "Đã Bán", value: "113" },
      { label: "Đang Bán", value: "0" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/nfarank.webp`,
    title: "RANDOM VALORANT TRÊN LV 20 | NFA",
    stats: [
      { label: "Đã Bán", value: "199" },
      { label: "Đang Bán", value: "0" },
    ],
  },
];

export const TFT_CARDS: ProductCard[] = [
  {
    image: `${IMAGE_BASE_PATH}/account/TFT/pettim.webp`,
    title: "RANDOM ACC TFT",
    stats: [
      { label: "Loại SP", value: "5" },
      { label: "Đang Bán", value: "840" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/petim.webp`,
    title: "ACC TFT PET TÍM",
    stats: [
      { label: "Loại SP", value: "61" },
      { label: "Đang Bán", value: "200" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/SANTFTTUCHON.webp`,
    title: "ACC TFT SÀN TÍM",
    stats: [
      { label: "Đã Bán", value: "0" },
      { label: "Đang Bán", value: "0" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/tfttuchon.webp`,
    title: "ACC TFT HÀNG HIỆU",
    stats: [
      { label: "Đã Bán", value: "0" },
      { label: "Đang Bán", value: "0" },
    ],
  },
];

export const GAME_SERVICE_CARDS: ProductCard[] = [
  {
    image: `${IMAGE_BASE_PATH}/external/www-riotgames-com/riotpr-mar2023-social-twitch-1920x1080-03-17-2023.webp`,
    title: "Dịch Vụ Riot Games",
    stats: [
      { label: "Giá từ", value: "200K ~ 800K" },
      { label: "Đã xong", value: "96 đơn" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/packvn.webp`,
    title: "Nạp Valorant Point VN",
    stats: [
      { label: "Giá từ", value: "109K ~ 2.2M" },
      { label: "Đã xong", value: "213 đơn" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/phthumb.webp`,
    title: "Nạp Valorant Point PH",
    stats: [
      { label: "Giá từ", value: "199K ~ 1.9M" },
      { label: "Đã xong", value: "64 đơn" },
    ],
  },
];

export const OTHER_SERVICE_CARDS: ProductCard[] = [
  {
    image: `${IMAGE_BASE_PATH}/external/cdn-prod-website-files-com/66daca61a92f146aa75284f7_66daca5bce3c8eca87e46731_vi-tra-sau-va-the-tin-dung.webp`,
    title: "Rút Ví Trả Sau",
    stats: [
      { label: "Báo giá", value: "Liên hệ" },
      { label: "Đã xong", value: "300 đơn" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/external/cdn-tgdd-vn/2-110423-103232-800-resize.webp`,
    title: "Youtube Premium Cá Nhân",
    stats: [
      { label: "Giá từ", value: "50K ~ 550K" },
      { label: "Đã xong", value: "8 đơn" },
    ],
  },
  {
    image: `${IMAGE_BASE_PATH}/upload/mokhoafb.webp`,
    title: "Dịch Vụ Mở Khóa Facebook",
    stats: [
      { label: "Báo giá", value: "Liên hệ" },
      { label: "Đã xong", value: "43 đơn" },
    ],
  },
];
