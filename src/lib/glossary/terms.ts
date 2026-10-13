/**
 * The words the shop's tool pages use, explained once (the owner, 13/10/2026:
 * "https://unnamedtech.cc/wiki trang thuật ngữ học theo unnamed nè").
 *
 * Pure data and types, no React: the page at /docs/thuat-ngu draws these, the
 * search on it folds and ranks them (lib/glossary/search.ts), and its
 * schema.org record lists them (lib/seo.tsx). A word added here is a card, a
 * search hit, a link of its own and a DefinedTerm at once.
 *
 * Field by field:
 *  - short: the one-line meaning, about 110 characters at most.
 *  - detail: one to three sentences of explanation and advice.
 *  - aliases: the other names a menu prints for the same thing. Each one is
 *    also an anchor (#smoothness, #rcs), so a link to it lands on this card.
 *  - tags: small notes drawn as chips, never another name for the word.
 *  - related: ids of other words, drawn as links to them.
 *  - exposure ("Độ lộ"): how easily other players or a replay notice it. It
 *    is NOT whether the anti-cheat detects the tool; the page says so.
 *  - doc: one of the wiki's own articles, never an invented address.
 */

export const GLOSSARY_GROUPS = [
  {
    id: "ngam-ban",
    label: "Ngắm bắn",
    blurb: "Các chức năng giúp ngắm và bắn.",
    icon: "Crosshair",
  },
  {
    id: "nhin-thay",
    label: "Nhìn thấy (ESP)",
    blurb: "Thông tin tool vẽ thêm lên màn hình.",
    icon: "Eye",
  },
  {
    id: "di-chuyen",
    label: "Di chuyển và vũ khí",
    blurb: "Chức năng đổi cách nhân vật chạy và bắn, đa số rất lộ.",
    icon: "Zap",
  },
  {
    id: "menu",
    label: "Menu và cài đặt",
    blurb: "Cách bật, chỉnh và lưu thiết lập của tool.",
    icon: "SlidersHorizontal",
  },
  {
    id: "he-thong",
    label: "Tool, loader và anti-cheat",
    blurb: "Tool chạy thế nào, bị phát hiện và bị ban ra sao.",
    icon: "Cpu",
  },
  {
    id: "may",
    label: "Chuẩn bị máy",
    blurb: "Những thứ trên Windows và BIOS mà tool hay yêu cầu.",
    icon: "MonitorCog",
  },
  {
    id: "shop",
    label: "Mua hàng và tài khoản",
    blurb: "Từ dùng khi mua key, acc và xin bảo hành trên shop.",
    icon: "ShoppingBag",
  },
] as const;

export type GlossaryGroup = (typeof GLOSSARY_GROUPS)[number];
export type GlossaryGroupId = GlossaryGroup["id"];
/** The lucide component the page draws in front of a group. */
export type GlossaryGroupIcon = GlossaryGroup["icon"];

/** "Độ lộ": how obvious it is to other players and replays. */
export type GlossaryExposure = "thap" | "vua" | "cao";

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases?: string[];
  group: GlossaryGroupId;
  short: string;
  detail: string;
  tags?: string[];
  related?: string[];
  exposure?: GlossaryExposure;
  doc?: { href: string; label: string };
}

/** The page itself. */
export const GLOSSARY_PATH = "/docs/thuat-ngu";

/** One word's own address: /docs/thuat-ngu#fov. */
export const termHref = (id: string): string => `${GLOSSARY_PATH}#${id}`;

/**
 * An alias as an anchor: "Show FOV circle" -> "show-fov-circle",
 * "Nạp tool" -> "nap-tool". Lowercase ASCII, accents dropped, đ to d, and
 * every run of anything else one hyphen.
 */
export const aliasAnchor = (alias: string): string =>
  alias
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The anchors a card carries besides its id: one per alias, less any that
 * would repeat the id itself ("FOV" on the card #fov) or another alias.
 */
export function aliasAnchors(term: GlossaryTerm): string[] {
  const out: string[] = [];
  for (const alias of term.aliases ?? []) {
    const anchor = aliasAnchor(alias);
    if (anchor && anchor !== term.id && !out.includes(anchor)) out.push(anchor);
  }
  return out;
}

export const GLOSSARY_TERMS: readonly GlossaryTerm[] = [
  // NGẮM BẮN
  {
    id: "aimbot",
    term: "Aimbot",
    aliases: ["Aim", "Aim assist", "Enable aimbot"],
    group: "ngam-ban",
    short: "Tự kéo tâm ngắm vào đối thủ khi bạn giữ phím ngắm.",
    detail:
      "Chỉ kéo với đối thủ trong vòng FOV và vào phần cơ thể bạn chọn. Smooth càng cao thì càng giống tay người.",
    tags: ["Cần phím ngắm", "Đi cùng FOV và smooth"],
    related: ["fov", "smooth", "aim-key", "bone", "visible-check"],
    exposure: "vua",
  },
  {
    id: "aim-key",
    term: "Phím ngắm",
    aliases: ["Aim key", "Aim keybind"],
    group: "ngam-ban",
    short: "Phím hoặc nút chuột giữ để aimbot chạy.",
    detail:
      "Thường là chuột phải, chuột giữa hoặc nút cạnh. Kiểu giữ thì thả ra là ngắm tay lại, kiểu bật tắt thì bấm một lần là chạy tới khi bấm lại.",
    tags: ["Giữ hoặc bật tắt"],
    related: ["aimbot", "keybind"],
  },
  {
    id: "fov",
    term: "FOV ngắm",
    aliases: ["FOV", "Aim FOV", "Field of view"],
    group: "ngam-ban",
    short: "Vòng tròn quanh tâm, đối thủ lọt vào vòng thì aimbot mới kéo.",
    detail:
      "FOV nhỏ kéo chính xác và kín hơn, FOV lớn bắt mục tiêu sớm nhưng dễ bị nhìn ra khi xem lại. Đừng nhầm với đổi góc nhìn (FOV changer).",
    tags: ["Nhỏ là kín", "Lớn là lộ"],
    related: ["draw-fov", "smooth", "fov-changer", "aimbot"],
  },
  {
    id: "draw-fov",
    term: "Hiện vòng FOV",
    aliases: ["Draw FOV", "Show FOV", "Show FOV circle"],
    group: "ngam-ban",
    short: "Vẽ vòng FOV của aimbot lên màn hình.",
    detail: "Dùng khi chỉnh để thấy vùng aimbot sẽ bắt. Nên tắt khi quay hoặc stream.",
    tags: ["Chỉ để chỉnh"],
    related: ["fov", "stream-proof"],
  },
  {
    id: "smooth",
    term: "Độ mượt",
    aliases: ["Smooth", "Smoothness"],
    group: "ngam-ban",
    short: "Tốc độ tâm ngắm trượt tới mục tiêu.",
    detail:
      "Smooth cao kéo chậm, nhìn như tay người. Smooth thấp hoặc 0 là giật tâm tức thì, rất dễ bị báo cáo.",
    tags: ["Cao là mượt", "Thấp là giật"],
    related: ["fov", "stickiness", "aim-speed", "legit-rage"],
  },
  {
    id: "stickiness",
    term: "Độ bám",
    aliases: ["Stickiness"],
    group: "ngam-ban",
    short: "Mức aimbot giữ tâm trên mục tiêu sau khi đã bắt được.",
    detail:
      "Bám cao giúp theo đối thủ đang chạy, hợp đánh gần. Quá cao thì tâm dính chặt, nhìn thiếu tự nhiên.",
    related: ["smooth", "aimbot"],
  },
  {
    id: "aim-speed",
    term: "Tốc độ ngắm",
    aliases: ["Speed", "Aim speed"],
    group: "ngam-ban",
    short: "Tốc độ aimbot chỉnh tâm về mục tiêu.",
    detail: "Nhanh thì tới sớm nhưng kém tự nhiên, nên cân cùng smooth.",
    related: ["smooth"],
  },
  {
    id: "silent-aim",
    term: "Silent aim",
    aliases: ["Enable silent aim", "Ngắm ẩn"],
    group: "ngam-ban",
    short: "Đạn tự bay vào đối thủ dù tâm trên màn hình không nhúc nhích.",
    detail:
      "Nhìn từ màn hình của bạn thì sạch, nhưng xem lại replay hoặc góc người xem rất lộ. Chỉ nên dùng ở acc phụ.",
    tags: ["Đi cùng FOV", "Có thể kèm đón đầu"],
    related: ["fov", "bone", "prediction", "acc-phu"],
    exposure: "cao",
  },
  {
    id: "prediction",
    term: "Đón đầu",
    aliases: ["Prediction", "Enable prediction"],
    group: "ngam-ban",
    short: "Tính trước chỗ đối thủ sẽ tới để ngắm đón.",
    detail:
      "Cần với súng có đạn bay chậm như bắn tỉa xa, cung, rocket. Game đạn tức thời gần như không cần.",
    related: ["aimbot", "silent-aim"],
  },
  {
    id: "bone",
    term: "Điểm nhắm",
    aliases: ["Bone", "Hitbox", "Bone selection"],
    group: "ngam-ban",
    short: "Phần cơ thể aimbot nhắm tới: đầu, cổ, ngực hoặc điểm gần nhất.",
    detail:
      "Nhắm đầu sát thương cao nhất nhưng tỉ lệ headshot bất thường là thứ bị soi đầu tiên. Ngực hoặc gần nhất chơi kín hơn.",
    tags: ["Đầu", "Ngực", "Gần nhất"],
    related: ["aimbot", "head-circle"],
  },
  {
    id: "visible-check",
    term: "Kiểm tra nhìn thấy",
    aliases: ["Visible check", "Visible only", "Ignore invisible targets"],
    group: "ngam-ban",
    short: "Chỉ nhắm hoặc tô màu đối thủ thật sự nhìn thấy, không bị che.",
    detail:
      "Tránh cảnh tâm dính vào người sau tường, thứ lộ ngay khi bị xem lại. Nên bật khi dùng aimbot.",
    tags: ["Nên bật"],
    related: ["aimbot", "chams", "wallhack"],
  },
  {
    id: "ignore-knocked",
    term: "Bỏ qua người bị hạ",
    aliases: ["Ignore knocked", "Ignore downed"],
    group: "ngam-ban",
    short: "Không nhắm người đã gục, chỉ nhắm người còn đánh được.",
    detail: "Hữu ích ở game có trạng thái gục như PUBG, Apex.",
    related: ["aimbot"],
  },
  {
    id: "ignore-bots",
    term: "Bỏ qua bot",
    aliases: ["Ignore bots", "Ignore AI"],
    group: "ngam-ban",
    short: "Không nhắm nhân vật máy, chỉ nhắm người thật.",
    detail: "Hợp game nhiều bot như Delta Force, Arena Breakout.",
    related: ["aimbot"],
  },
  {
    id: "ignore-sleepers",
    term: "Bỏ qua người ngủ",
    aliases: ["Ignore sleepers"],
    group: "ngam-ban",
    short: "Không nhắm nhân vật offline đang nằm trên bản đồ.",
    detail: "Gặp ở Rust, nơi người thoát game vẫn nằm lại trong thế giới.",
    related: ["aimbot"],
  },
  {
    id: "max-distance",
    term: "Khoảng cách tối đa",
    aliases: ["Max distance", "Maximum distance"],
    group: "ngam-ban",
    short: "Tầm xa nhất mà aimbot hoặc ESP còn tính tới.",
    detail:
      "Giới hạn tầm để tool không kéo vào người ở rất xa, vừa tự nhiên hơn vừa đỡ rối màn hình.",
    related: ["aimbot", "esp", "distance"],
  },
  {
    id: "target-line",
    term: "Đường tới mục tiêu",
    aliases: ["Draw target line"],
    group: "ngam-ban",
    short: "Kẻ đường từ tâm tới mục tiêu aimbot đang bắt.",
    detail:
      "Biết aimbot đang khoá ai khi chỉnh FOV. Khác đường kẻ ESP ở chỗ chỉ vẽ cho một người.",
    related: ["snapline", "fov"],
  },
  {
    id: "triggerbot",
    term: "Triggerbot",
    aliases: ["Trigger", "Auto fire"],
    group: "ngam-ban",
    short: "Tự bóp cò khi tâm đi qua đối thủ.",
    detail:
      "Bạn vẫn tự ngắm, tool chỉ bắn đúng lúc. Hợp súng ngắm, súng bắn từng viên, ít lộ hơn aimbot nếu để độ trễ.",
    related: ["aimbot", "visible-check"],
    exposure: "vua",
  },
  {
    id: "magic-bullet",
    term: "Đạn xuyên",
    aliases: ["Magic bullet", "Auto wall", "Wallbang"],
    group: "ngam-ban",
    short: "Đạn xuyên vật cản hoặc đi vòng tới mục tiêu.",
    detail:
      "Chức năng rage, người chơi khác thấy ngay là bất thường và gần như chắc chắn bị báo cáo.",
    related: ["legit-rage"],
    exposure: "cao",
  },
  {
    id: "no-recoil",
    term: "Giảm giật",
    aliases: ["No recoil", "RCS", "Recoil control"],
    group: "ngam-ban",
    short: "Giảm hoặc triệt tiêu độ giật của súng khi xả đạn.",
    detail:
      "Để mức vừa thì nhìn như người kiểm soát tốt. Để tối đa thì đường đạn thẳng tắp, dễ bị nghi.",
    tags: ["Chỉnh được mức"],
    related: ["no-spread", "legit-rage"],
    exposure: "thap",
  },
  {
    id: "no-spread",
    term: "Không toả đạn",
    aliases: ["No spread"],
    group: "ngam-ban",
    short: "Bỏ độ toả, đạn đi đúng một điểm.",
    detail:
      "Thường đi cùng giảm giật. Trúng một điểm liên tục ở tầm xa là dấu hiệu dễ bị soi.",
    related: ["no-recoil"],
    exposure: "vua",
  },

  // NHÌN THẤY (ESP)
  {
    id: "esp",
    term: "ESP",
    aliases: ["Enable ESP", "Extra sensory perception"],
    group: "nhin-thay",
    short: "Tên chung cho mọi thông tin tool vẽ thêm lên màn hình.",
    detail:
      "Gồm vị trí, khung, bộ xương, máu, tên, khoảng cách và vật phẩm, thấy cả sau tường. Bật vừa đủ để màn hình không rối.",
    tags: ["Chỉ bạn nhìn thấy"],
    related: ["wallhack", "box", "skeleton", "item-esp", "radar"],
    exposure: "thap",
  },
  {
    id: "wallhack",
    term: "Wallhack",
    aliases: ["Wall", "WH", "ESP mỗi wall"],
    group: "nhin-thay",
    short: "Nhìn thấy đối thủ xuyên tường.",
    detail:
      "Trên shop, “ESP mỗi wall” là bản chỉ có nhìn xuyên, không aimbot, thường là lựa chọn an toàn nhất cho người mới.",
    related: ["esp", "chams", "radar", "visible-check"],
    exposure: "thap",
  },
  {
    id: "box",
    term: "Khung",
    aliases: ["Box", "2D box", "3D box", "Corner box"],
    group: "nhin-thay",
    short: "Vẽ khung quanh người đối thủ.",
    detail:
      "Khung 2D là hình chữ nhật phẳng. Khung 3D là hộp theo không gian quanh nhân vật, cho cảm giác xa gần rõ hơn.",
    tags: ["2D", "3D"],
    related: ["esp", "skeleton"],
  },
  {
    id: "skeleton",
    term: "Bộ xương",
    aliases: ["Skeleton", "Bones ESP"],
    group: "nhin-thay",
    short: "Vẽ khung xương của đối thủ.",
    detail:
      "Thấy tư thế, hướng quay, lúc đối thủ ngồi hay nằm, dễ theo chuyển động sau vật cản.",
    related: ["box", "esp"],
  },
  {
    id: "health-bar",
    term: "Thanh máu",
    aliases: ["Health bar", "HP bar", "Shield bar", "Armor bar"],
    group: "nhin-thay",
    short: "Thanh máu, thanh giáp hiện cạnh đối thủ.",
    detail:
      "Biết ai đang yếu để ưu tiên. Thanh giáp hay có ở Apex, Fortnite và game sinh tồn.",
    related: ["esp"],
  },
  {
    id: "name-esp",
    term: "Tên người chơi",
    aliases: ["Name", "Name ESP"],
    group: "nhin-thay",
    short: "Hiện tên người chơi hoặc nhân vật trên đầu đối thủ.",
    detail: "Nhận ra ngay người quen mặt hoặc người chơi giỏi trong trận.",
    related: ["esp"],
  },
  {
    id: "distance",
    term: "Khoảng cách",
    aliases: ["Distance"],
    group: "nhin-thay",
    short: "Hiện đối thủ hoặc vật phẩm cách bạn bao nhiêu mét.",
    detail: "Giúp ưu tiên mối nguy gần và quyết định có giao tranh hay không.",
    related: ["max-distance", "esp"],
  },
  {
    id: "weapon-esp",
    term: "Vũ khí đang cầm",
    aliases: ["Weapon name", "Weapon ESP"],
    group: "nhin-thay",
    short: "Hiện tên súng đối thủ đang cầm.",
    detail: "Biết trước kẻ địch cầm bắn tỉa hay súng gần để chọn cách áp sát.",
    related: ["esp"],
  },
  {
    id: "rank-level",
    term: "Rank và level",
    aliases: ["Rank", "Level"],
    group: "nhin-thay",
    short: "Hiện hạng đấu hoặc cấp tài khoản của đối thủ.",
    detail: "Đoán nhanh trình độ đối thủ, hay dùng ở chế độ xếp hạng.",
    related: ["esp"],
  },
  {
    id: "snapline",
    term: "Đường kẻ",
    aliases: ["Snapline", "Snaplines", "Tracers"],
    group: "nhin-thay",
    short: "Đường kẻ từ cạnh hoặc tâm màn hình tới từng đối thủ.",
    detail: "Biết hướng kẻ địch trong một cái liếc. Nhiều đối thủ thì màn hình rất rối.",
    related: ["target-line", "esp"],
  },
  {
    id: "head-circle",
    term: "Vòng đầu",
    aliases: ["Head circle", "Head dot"],
    group: "nhin-thay",
    short: "Khoanh tròn vị trí đầu đối thủ.",
    detail: "Hỗ trợ ngắm tay vào đầu, đi đôi với điểm nhắm đầu của aimbot.",
    related: ["bone"],
  },
  {
    id: "view-direction",
    term: "Hướng nhìn",
    aliases: ["View direction", "Look direction"],
    group: "nhin-thay",
    short: "Tia ngắn từ đầu đối thủ chỉ hướng họ đang nhìn.",
    detail: "Biết ai đang canh góc nào để tránh bị bắn khi ló ra.",
    related: ["esp"],
  },
  {
    id: "oof-arrows",
    term: "Mũi tên ngoài màn hình",
    aliases: ["OOF arrows", "Out of FOV arrows", "Offscreen indicator"],
    group: "nhin-thay",
    short: "Mũi tên ở rìa màn hình chỉ về đối thủ ngoài tầm nhìn.",
    detail: "Không bị bất ngờ khi kẻ địch đứng sau lưng hoặc hai bên.",
    related: ["radar"],
  },
  {
    id: "chams",
    term: "Chams",
    aliases: ["Player chams", "Self chams", "Glow"],
    group: "nhin-thay",
    short: "Tô màu cả người đối thủ để thấy xuyên vật cản.",
    detail:
      "Dễ nhìn hơn khung nhưng rất lộ khi quay màn hình. Self chams tô cho chính bạn, glow là viền phát sáng cùng mục đích.",
    related: ["wallhack", "visible-check", "stream-proof"],
    exposure: "vua",
  },
  {
    id: "radar",
    term: "Radar",
    aliases: ["2D radar", "Minimap ESP"],
    group: "nhin-thay",
    short: "Bản đồ nhỏ góc màn hình hiện chấm đối thủ.",
    detail: "Không vẽ gì lên người địch nên rất kín, hợp người muốn chơi tự nhiên.",
    related: ["esp", "wallhack"],
    exposure: "thap",
  },
  {
    id: "item-esp",
    term: "ESP vật phẩm",
    aliases: ["Item ESP", "Loot ESP", "World ESP", "Vehicle ESP"],
    group: "nhin-thay",
    short: "Hiện vũ khí, giáp, đồ, xe trên bản đồ.",
    detail:
      "Phổ biến ở game sinh tồn và khai thác như PUBG, Delta Force, Arena Breakout. Nên lọc theo độ hiếm để màn hình không dày đặc.",
    related: ["esp", "combat-mode"],
  },
  {
    id: "combat-mode",
    term: "Chế độ giao tranh",
    aliases: ["Combat mode"],
    group: "nhin-thay",
    short: "Phím tắt giấu ESP vật phẩm khi đang đánh nhau.",
    detail: "Màn hình gọn lúc giao tranh, xong thì bật lại để nhặt đồ.",
    related: ["item-esp", "keybind"],
  },
  {
    id: "team-check",
    term: "Lọc đồng đội",
    aliases: ["Team check", "Only enemies"],
    group: "nhin-thay",
    short: "Chỉ vẽ và nhắm kẻ địch, bỏ qua đồng đội.",
    detail: "Nên luôn bật để aimbot không kéo vào đồng đội và màn hình đỡ rối.",
    tags: ["Nên bật"],
    related: ["aimbot", "esp"],
  },
  {
    id: "crosshair",
    term: "Tâm tuỳ chỉnh",
    aliases: ["Crosshair", "Custom crosshair"],
    group: "nhin-thay",
    short: "Vẽ tâm ngắm riêng đè lên game.",
    detail: "Hữu ích khi bắn hông hoặc với game giấu tâm.",
    related: ["overlay"],
  },
  {
    id: "fov-changer",
    term: "Đổi góc nhìn",
    aliases: ["FOV changer", "Camera FOV"],
    group: "nhin-thay",
    short: "Mở rộng góc nhìn camera quá giới hạn game cho phép.",
    detail: "Thấy được nhiều hơn hai bên màn hình. Không liên quan tới FOV ngắm của aimbot.",
    related: ["fov"],
  },
  {
    id: "esp-style",
    term: "Cỡ chữ và màu ESP",
    aliases: ["Font size", "ESP font size", "Colors customization"],
    group: "nhin-thay",
    short: "Chỉnh cỡ chữ và màu của các lớp ESP.",
    detail:
      "Chữ nhỏ, màu dịu thì đỡ rối mắt và đỡ lộ nếu màn hình bị người khác nhìn thấy.",
    related: ["esp"],
  },

  // DI CHUYỂN VÀ VŨ KHÍ
  {
    id: "bhop",
    term: "Bunny hop",
    aliases: ["Bhop", "Auto jump"],
    group: "di-chuyen",
    short: "Tự nhảy liên tục để chạy nhanh mà không mất đà.",
    detail: "Hay gặp ở CS2 và game bắn súng cũ, nhìn rõ khi người khác xem.",
    exposure: "vua",
  },
  {
    id: "speed-hack",
    term: "Speed hack",
    // No "Speed" here: that name is the aim speed setting's (#speed), as the
    // menus use it.
    aliases: ["Fly", "No clip"],
    group: "di-chuyen",
    short: "Chạy nhanh bất thường, bay hoặc đi xuyên vật thể.",
    detail: "Nhóm rage, ở chế độ thường bị báo cáo và ban rất nhanh.",
    related: ["legit-rage", "ban"],
    exposure: "cao",
  },
  {
    id: "rapid-fire",
    term: "Bắn nhanh",
    aliases: ["Rapid fire", "Fast fire"],
    group: "di-chuyen",
    short: "Bắn nhanh hơn tốc độ súng cho phép.",
    detail: "Tiếng súng và sát thương bất thường, người khác nhận ra ngay.",
    related: ["legit-rage"],
    exposure: "cao",
  },
  {
    id: "open-world",
    term: "Chức năng thế giới mở",
    aliases: ["Teleport", "Vehicle spawn", "Money hack"],
    group: "di-chuyen",
    short: "Dịch chuyển, gọi xe, chỉnh tiền ở game như GTA 5 Online.",
    detail: "Chỉnh tiền bị theo dõi rất gắt. Đọc kỹ cảnh báo trên trang tool trước khi dùng.",
    related: ["ban"],
    exposure: "cao",
  },

  // MENU VÀ CÀI ĐẶT
  {
    id: "menu",
    term: "Menu tool",
    aliases: ["Menu", "Menu key"],
    group: "menu",
    short: "Bảng chỉnh chức năng mở ngay trong game.",
    detail: "Thường mở bằng INSERT, HOME hoặc một phím F, ghi trong tài liệu của tool.",
    related: ["keybind", "config"],
  },
  {
    id: "keybind",
    term: "Phím tắt",
    aliases: ["Keybind", "Hotkey", "Custom keybind"],
    group: "menu",
    short: "Phím bạn tự gán cho một chức năng.",
    detail: "Ví dụ giữ ALT để aim, bấm F3 bật tắt ESP. Gán riêng giúp tắt nhanh khi cần.",
    related: ["aim-key", "menu"],
  },
  {
    id: "overlay",
    term: "Overlay",
    aliases: ["Lớp vẽ"],
    group: "menu",
    short: "Lớp vẽ đè lên game để hiện ESP và menu.",
    detail:
      "Game phải chạy cửa sổ không viền thì overlay mới hiện. Overlay của Discord, Steam, MSI Afterburner có thể tranh chỗ làm mất ESP.",
    related: ["borderless", "external"],
  },
  {
    id: "config",
    term: "Config",
    aliases: ["Cấu hình", "Preset", "Save config", "Load config", "Delete config", "Config system"],
    group: "menu",
    short: "File lưu toàn bộ thiết lập menu để nạp lại hoặc chia sẻ.",
    detail:
      "Lưu một bản legit để chơi thường và một bản riêng khi thử. Shop tặng kèm config ở một số bản.",
    related: ["legit-rage", "menu"],
    doc: { href: "/docs/config-la-gi", label: "Config là gì" },
  },
  {
    id: "legit-rage",
    term: "Legit và rage",
    aliases: ["Legit", "Rage", "Closet"],
    group: "menu",
    short: "Hai kiểu thiết lập: kín như người chơi giỏi, hoặc bật hết để thắng nhanh.",
    detail:
      "Legit giữ FOV nhỏ, smooth cao, ít ESP. Rage bật silent aim, đạn xuyên, speed và thường bị ban nhanh.",
    related: ["config", "smooth", "fov"],
  },
  {
    id: "stream-proof",
    term: "Chống quay màn hình",
    aliases: ["Stream proof", "OBS bypass"],
    group: "menu",
    short: "Menu và ESP không hiện trên phần mềm quay, stream như OBS, Discord.",
    detail: "Chỉ giấu với phần mềm quay, không có nghĩa là an toàn với anti-cheat.",
    related: ["anti-screenshot", "overlay"],
  },
  {
    id: "anti-screenshot",
    term: "Chống chụp màn hình",
    aliases: ["Anti screenshot"],
    group: "menu",
    short: "Ảnh chụp màn hình của game không thấy menu và ESP.",
    detail: "Hữu ích khi anti-cheat tự chụp màn hình để kiểm tra.",
    related: ["stream-proof", "anti-cheat"],
  },

  // TOOL, LOADER VÀ ANTI-CHEAT
  {
    id: "loader",
    term: "Loader",
    group: "he-thong",
    short: "Chương trình tải từ “Link tải hack” trong Lịch sử mua, nhận key rồi nạp tool.",
    detail: "Loader kiểm tra bản mới mỗi lần mở. Luôn chạy bằng Run as administrator.",
    related: ["key", "injector", "run-as-admin"],
    doc: { href: "/docs/setup-may-chuan-thich-thi-hack", label: "Setup máy chuẩn" },
  },
  {
    id: "injector",
    term: "Inject",
    aliases: ["Injector", "Nạp tool"],
    group: "he-thong",
    short: "Bước đưa tool vào tiến trình game.",
    detail:
      "Có tool bắt mở game trước rồi inject, có tool ngược lại. Làm đúng thứ tự ghi trong tài liệu.",
    related: ["loader", "internal"],
  },
  {
    id: "external",
    term: "External",
    group: "he-thong",
    short: "Tool đọc game từ bên ngoài và vẽ overlay riêng.",
    detail:
      "Không chạm thẳng vào game nên thường an toàn hơn, đổi lại ít chức năng hơn internal.",
    related: ["internal", "overlay"],
  },
  {
    id: "internal",
    term: "Internal",
    group: "he-thong",
    short: "Tool nạp thẳng vào tiến trình game.",
    detail:
      "Mượt và nhiều chức năng như silent aim, chams, nhưng rủi ro bị phát hiện cao hơn external.",
    related: ["external", "injector"],
  },
  {
    id: "kernel-driver",
    term: "Kernel và driver",
    aliases: ["Kernel", "Driver", "Ring 0"],
    group: "he-thong",
    short: "Tool chạy ở tầng nhân Windows, ngang hàng anti-cheat.",
    detail:
      "Đây là lý do nhiều tool bắt tắt Secure Boot, Core Isolation và Defender, vì Windows chặn driver lạ khi các lớp đó còn bật.",
    related: ["secure-boot", "core-isolation", "defender"],
  },
  {
    id: "anti-cheat",
    term: "Anti-cheat",
    aliases: ["AC", "EAC", "BattlEye", "Vanguard", "ACE", "Ricochet"],
    group: "he-thong",
    short: "Phần mềm của game để phát hiện và khoá người dùng hack.",
    detail:
      "Mỗi game một hệ: Vanguard (Valorant), Ricochet (Call of Duty), EAC và BattlEye (nhiều game sinh tồn), ACE (Delta Force, Naraka). Tool phải làm riêng cho từng hệ.",
    related: ["undetected", "detected", "ban"],
  },
  {
    id: "status",
    term: "Trạng thái tool",
    aliases: ["Status"],
    group: "he-thong",
    short: "Tình trạng hiện tại của tool trên trang Thông báo.",
    detail:
      "Có Chưa phát hiện, Ổn định, Cập nhật mới, Rủi ro, Đang cập nhật, Đã phát hiện. Xem trước khi mua gói dài và bấm chuông để được báo qua Telegram hoặc Zalo.",
    related: ["undetected", "detected", "updating"],
    doc: {
      href: "/docs/dang-ky-nhan-thong-bao-trang-thai-hack",
      label: "Thông báo trạng thái hack",
    },
  },
  {
    id: "undetected",
    term: "Chưa phát hiện",
    aliases: ["Undetected", "UD", "An toàn"],
    group: "he-thong",
    short: "Tool hiện chưa bị anti-cheat nhận ra.",
    detail:
      "Trạng thái tốt nhất để mua, nhưng không phải lời hứa vĩnh viễn: anti-cheat cập nhật thì trạng thái có thể đổi.",
    related: ["status", "detected"],
  },
  {
    id: "detected",
    term: "Đã phát hiện",
    aliases: ["Detected", "Phát hiện"],
    group: "he-thong",
    short: "Anti-cheat đã nhận ra tool, dùng tiếp là dễ bị ban.",
    detail: "Shop khoá bán tool này và bạn nên ngừng dùng tới khi có bản mới.",
    related: ["status", "ban"],
  },
  {
    id: "updating",
    term: "Đang cập nhật",
    aliases: ["Updating", "Bảo trì"],
    group: "he-thong",
    short: "Tool tạm ngưng để làm bản mới, thường sau khi game cập nhật.",
    detail: "Shop tạm không bán key lúc này. Chờ thông báo rồi mở lại loader để tải bản mới.",
    related: ["status"],
  },
  {
    id: "ban",
    term: "Ban",
    aliases: ["Banned", "Khoá acc"],
    group: "he-thong",
    short: "Tài khoản game bị khoá vì vi phạm.",
    detail:
      "Có thể tạm vài ngày hoặc vĩnh viễn. Bị ban do người khác báo cáo thường vì chơi lộ, không hẳn vì tool bị phát hiện.",
    related: ["ban-wave", "hwid-ban", "acc-phu", "legit-rage"],
  },
  {
    id: "ban-wave",
    term: "Ban wave",
    aliases: ["Làn sóng ban"],
    group: "he-thong",
    short: "Game khoá hàng loạt tài khoản cùng một lúc.",
    detail:
      "Hãng game hay gom lại và ban trễ để khó lần ra tool nào bị lộ, nên bị ban không phải lúc nào cũng xảy ra ngay trong trận.",
    related: ["ban", "detected"],
  },
  {
    id: "hwid",
    term: "HWID",
    aliases: ["Hardware ID"],
    group: "he-thong",
    short:
      "Định danh phần cứng của máy, ghép từ serial ổ cứng, mainboard, card mạng và vài mã khác.",
    detail:
      "Trên shop chữ này có hai nghĩa: key gắn máy và máy bị game khoá. Cách xử lý khác hẳn nhau.",
    related: ["hwid-lock", "hwid-ban", "spoofer"],
    doc: { href: "/docs/hwid-la-gi-reset-hwid", label: "HWID là gì" },
  },
  {
    id: "hwid-ban",
    term: "Ban máy",
    aliases: ["HWID ban"],
    group: "he-thong",
    short: "Game khoá luôn máy, tạo acc mới vào vẫn bị khoá.",
    detail:
      "Đây là chuyện giữa bạn và game, shop không reset được. Cách xử lý là spoofer.",
    related: ["spoofer", "hwid", "ban"],
  },
  {
    id: "spoofer",
    term: "Spoofer",
    aliases: ["Spoof", "Temp spoofer", "Perm spoofer"],
    group: "he-thong",
    short: "Đổi định danh phần cứng để máy từng bị ban chơi lại được bằng acc mới.",
    detail:
      "Bản tạm thời đổi trong phiên, khởi động lại phải chạy lại. Bản vĩnh viễn ghi đè serial, không cần chạy lại nhưng sai bước có thể hỏng phần cứng.",
    tags: ["Tạm thời", "Vĩnh viễn"],
    related: ["hwid-ban", "cleaner", "reset-hwid"],
    doc: { href: "/docs/spoofer-la-gi", label: "Spoofer là gì" },
  },
  {
    id: "cleaner",
    term: "Dọn dấu vết",
    aliases: ["Cleaner", "Trace cleaner"],
    group: "he-thong",
    short: "Xoá file và registry mà game, anti-cheat để lại trên máy.",
    detail: "Thường làm trước khi spoof để game không nhận ra máy cũ.",
    related: ["spoofer"],
    doc: { href: "/docs/cai-spoofer-tai-nha", label: "Cài spoofer tại nhà" },
  },

  // CHUẨN BỊ MÁY
  {
    id: "secure-boot",
    term: "Secure Boot",
    group: "may",
    short: "Tính năng trong BIOS chỉ cho chạy phần mềm khởi động có chữ ký.",
    detail:
      "Nhiều tool driver bắt tắt. Valorant trên Windows 11 lại cần bật, nên chơi game đó phải bật lại.",
    related: ["uefi-bios", "kernel-driver", "tpm"],
    doc: { href: "/docs/tat-secure-boot-va-ao-hoa", label: "Tắt Secure Boot và bật ảo hoá" },
  },
  {
    id: "tpm",
    term: "TPM",
    aliases: ["TPM 2.0", "fTPM", "PTT"],
    group: "may",
    short: "Chip bảo mật trên mainboard hoặc trong CPU mà Windows 11 cần.",
    detail:
      "Một số spoofer yêu cầu tắt TPM. Vanguard của Valorant thì cần TPM bật trên Windows 11.",
    related: ["secure-boot", "spoofer"],
  },
  {
    id: "core-isolation",
    term: "Core Isolation",
    aliases: ["Memory integrity", "HVCI", "VBS"],
    group: "may",
    short: "Lớp bảo vệ trong Windows Security chặn driver lạ nạp vào nhân.",
    detail:
      "Phải tắt thì tool driver mới chạy. Kiểm tra bằng msinfo32: dòng Virtualization-based security ghi Not enabled.",
    related: ["kernel-driver", "virtualization"],
    doc: { href: "/docs/setup-may-chuan-thich-thi-hack", label: "Setup máy chuẩn" },
  },
  {
    id: "virtualization",
    term: "Ảo hoá",
    aliases: ["Virtualization", "VT-x", "SVM", "AMD-V"],
    group: "may",
    short: "Tính năng của CPU, bật trong BIOS.",
    detail:
      "Nhiều tool cần ảo hoá bật trong BIOS nhưng ảo hoá của Windows phải tắt. Xem trong Task Manager, mục CPU: Virtualization: Enabled.",
    related: ["hyper-v", "uefi-bios"],
    doc: { href: "/docs/tat-secure-boot-va-ao-hoa", label: "Tắt Secure Boot và bật ảo hoá" },
  },
  {
    id: "hyper-v",
    term: "Hyper-V",
    aliases: ["Windows Sandbox", "Virtual Machine Platform"],
    group: "may",
    short: "Ảo hoá của chính Windows, dùng cho máy ảo và Sandbox.",
    detail:
      "Khi bật nó giữ phần ảo hoá của CPU và nhiều tool không chạy. Tắt trong Turn Windows features on or off.",
    related: ["virtualization", "core-isolation"],
  },
  {
    id: "uefi-bios",
    term: "BIOS và UEFI",
    aliases: ["BIOS", "UEFI", "Legacy"],
    group: "may",
    short: "Phần mềm của mainboard chạy trước Windows.",
    detail:
      "Nơi tắt Secure Boot, bật ảo hoá. Tool cần máy cài ở chế độ UEFI, kiểm tra bằng msinfo32 dòng BIOS Mode.",
    related: ["secure-boot", "virtualization"],
  },
  {
    id: "defender",
    term: "Windows Defender",
    aliases: ["Real-time protection", "Exclusions", "Diệt virus"],
    group: "may",
    short: "Phần mềm diệt virus có sẵn của Windows.",
    detail:
      "Defender hay xoá nhầm loader. Tắt bảo vệ thời gian thực và thêm thư mục tool vào Exclusions trước khi tải.",
    related: ["loader", "kernel-driver"],
    doc: { href: "/docs/setup-may-chuan-thich-thi-hack", label: "Setup máy chuẩn" },
  },
  {
    id: "run-as-admin",
    term: "Run as administrator",
    aliases: ["Chạy quyền quản trị"],
    group: "may",
    short: "Mở chương trình với quyền cao nhất của Windows.",
    detail:
      "Loader cần quyền này để nạp tool. Bấm chuột phải vào file và chọn Run as administrator.",
    related: ["loader"],
  },
  {
    id: "runtime",
    term: "Runtime",
    aliases: ["Visual C++ Redistributable", ".NET", "DirectX"],
    group: "may",
    short: "Bộ thư viện Windows mà tool cần để chạy.",
    detail:
      "Thiếu là loader báo lỗi DLL hoặc tắt ngay khi mở. Cài Visual C++ 2015 đến 2022 cả x64 và x86, .NET Desktop Runtime và DirectX.",
    related: ["loader"],
  },
  {
    id: "borderless",
    term: "Cửa sổ không viền",
    aliases: ["Borderless", "Windowed fullscreen"],
    group: "may",
    short: "Game toàn màn hình nhưng vẫn chạy như một cửa sổ.",
    detail: "Overlay của tool chỉ hiện ở chế độ này. Fullscreen độc quyền sẽ che mất ESP.",
    related: ["overlay"],
  },
  {
    id: "avx",
    term: "AVX",
    group: "may",
    short: "Tập lệnh của CPU mà nhiều tool cần.",
    detail: "Gần như mọi CPU Intel, AMD từ khoảng 2012 trở lại đây đều có.",
    related: ["runtime"],
  },
  {
    id: "vpn",
    term: "VPN",
    aliases: ["Proxy", "Đổi IP", "WARP"],
    group: "may",
    short: "Phần mềm đưa kết nối qua máy chủ khác để đổi IP.",
    detail:
      "Đôi khi dùng để vào game khác khu vực. VPN chập chờn làm loader không kết nối được máy chủ tool, nên tắt thử khi loader báo lỗi mạng.",
    related: ["loader"],
  },
  {
    id: "ghost-win",
    term: "Windows bản ghost",
    aliases: ["Ghost", "Win lite"],
    group: "may",
    short: "Bản Windows đã bị cắt sửa và đóng gói lại.",
    detail:
      "Hay thiếu thành phần nên tool lỗi khó đoán. Shop khuyên dùng Windows 10, 11 nguyên gốc.",
    related: ["runtime"],
    doc: { href: "/docs/cai-windows-bang-usb", label: "Cài Windows bằng USB" },
  },

  // MUA HÀNG VÀ TÀI KHOẢN
  {
    id: "key",
    term: "Key",
    aliases: ["License", "Mã kích hoạt"],
    group: "shop",
    short: "Mã bản quyền nhập vào loader để dùng tool trong thời hạn gói.",
    detail:
      "Key nằm trong đơn ở Lịch sử mua. Mỗi key dùng trên một máy tại một thời điểm.",
    related: ["loader", "hwid-lock", "package"],
    doc: { href: "/docs/nap-tien-va-mua-tool-lan-dau", label: "Nạp tiền và mua tool lần đầu" },
  },
  {
    id: "package",
    term: "Gói",
    aliases: ["Gói ngày", "Gói tuần", "Gói tháng"],
    group: "shop",
    short: "Thời hạn của key bạn mua.",
    detail: "Mua gói ngày để quen menu trước, rồi mới lên gói tuần, tháng.",
    related: ["key", "status"],
  },
  {
    id: "hwid-lock",
    term: "Key gắn máy",
    aliases: ["HWID lock"],
    group: "shop",
    short: "Key nhớ máy đầu tiên dùng nó và chỉ chạy trên máy đó.",
    detail:
      "Đổi máy, thay ổ cứng, mainboard hoặc cài lại Windows thì cần reset HWID. Spoof xong rồi mới nhập key.",
    related: ["reset-hwid", "hwid", "key"],
  },
  {
    id: "reset-hwid",
    term: "Reset HWID",
    group: "shop",
    short: "Shop gỡ máy cũ khỏi key để bạn dùng trên máy mới.",
    detail:
      "Gửi yêu cầu ngay trong đơn ở Lịch sử mua. Reset không cộng thêm ngày và số lần có giới hạn tuỳ tool.",
    related: ["hwid-lock", "warranty"],
    doc: { href: "/docs/chinh-sach-ho-tro-doi-may", label: "Chính sách hỗ trợ đổi máy" },
  },
  {
    id: "warranty",
    term: "Bảo hành",
    aliases: ["Warranty"],
    group: "shop",
    short: "Yêu cầu shop xử lý khi key, tool hoặc acc có lỗi.",
    detail:
      "Gửi trong đơn ở Lịch sử mua. Kết quả có thể là sửa, cấp key mới, cộng ngày hoặc hoàn tiền. Tool miễn phí không bảo hành.",
    related: ["reset-hwid", "free-key"],
    doc: { href: "/docs/quy-trinh-bao-hanh", label: "Quy trình bảo hành" },
  },
  {
    id: "free-key",
    term: "Key miễn phí",
    aliases: ["Free key", "Vượt link"],
    group: "shop",
    short: "Key dùng thử nhận được sau khi vượt link rút gọn trên trang tool miễn phí.",
    detail: "Hợp để thử menu trước khi mua. Tool miễn phí không có bảo hành.",
    related: ["key", "warranty"],
  },
  {
    id: "acc-phu",
    term: "Acc phụ",
    aliases: ["Smurf", "Alt"],
    group: "shop",
    short: "Tài khoản game thứ hai, không phải acc chính bạn quý.",
    detail:
      "Nên dùng acc phụ khi thử tool hay chức năng lộ, bị ban cũng không mất acc chính.",
    related: ["acc-nfa", "ban"],
  },
  {
    id: "acc-nfa",
    term: "Acc NFA",
    aliases: ["Acc rác", "Non full access"],
    group: "shop",
    short: "Acc chỉ gồm tên đăng nhập và mật khẩu, không kèm email.",
    detail: "Rẻ, hợp làm acc phụ, nhưng người giữ email vẫn có thể lấy lại acc.",
    related: ["acc-fa", "acc-phu"],
    doc: { href: "/docs/acc-nfa-acc-rac-la-gi", label: "Acc NFA là gì" },
  },
  {
    id: "acc-fa",
    term: "Acc full thông tin",
    aliases: ["FA", "Full access"],
    group: "shop",
    short: "Acc bàn giao kèm email, bạn đổi được mọi thứ.",
    detail: "Đổi mật khẩu email và bật xác thực hai lớp ngay sau khi nhận.",
    related: ["acc-nfa", "drop-mail"],
    doc: { href: "/docs/acc-full-thong-tin-la-gi", label: "Acc full thông tin là gì" },
  },
  {
    id: "drop-mail",
    term: "Drop mail",
    group: "shop",
    short: "Email tạo mới riêng cho tài khoản game, thay cho email gốc.",
    detail:
      "Bạn có toàn quyền như acc FA, nhưng email còn mới nên đôi khi game đòi xác minh thêm.",
    related: ["acc-fa"],
    doc: { href: "/docs/drop-mail-la-gi", label: "Drop mail là gì" },
  },
  {
    id: "level-2",
    term: "Tài khoản cấp 2",
    aliases: ["Xác thực cấp 2"],
    group: "shop",
    short:
      "Tài khoản đã liên kết Zalo, Facebook, số điện thoại, ngân hàng và được shop duyệt.",
    detail: "Mang nhãn Cấp 2 và mua được sản phẩm giới hạn.",
    related: ["warranty"],
    doc: { href: "/docs/xac-thuc-tai-khoan-cap-2", label: "Xác thực tài khoản cấp 2" },
  },
];
