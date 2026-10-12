/**
 * "Chuẩn bị máy": the steps every tool's guide assumes were done first, as
 * docs.lmarket.net keeps them under "PC setup" (the owner, 12/10/2026:
 * "Thêm 1 trang tài liệu cho khách hàng như lmarket"). Written once here,
 * public, and linked from every tool's page; a tool's own guide says which
 * of them it needs.
 */

export interface PcSetupPage {
  slug: string;
  title: string;
  /** The checklist line on the landing page. */
  short: string;
  intro: string;
  steps: string[];
  notes?: string[];
  /** How to see the step took. */
  check?: string;
}

export const PC_SETUP_PAGES: readonly PcSetupPage[] = [
  {
    slug: "tat-windows-defender",
    title: "Tắt Windows Defender",
    short: "Tắt bảo vệ thời gian thực và thêm thư mục tool vào loại trừ",
    intro:
      "Windows Defender coi loader của tool là phần mềm lạ và xoá hoặc chặn ngay khi giải nén. Tắt bảo vệ thời gian thực trước khi tải, rồi thêm thư mục chứa tool vào danh sách loại trừ để Defender không đụng tới sau này.",
    steps: [
      'Mở Windows Security (bấm Start, gõ "Windows Security").',
      "Vào Virus & threat protection → Manage settings.",
      "Tắt Tamper Protection trước (nếu bật thì các công tắc khác sẽ tự bật lại).",
      "Tắt Real-time protection, Cloud-delivered protection và Automatic sample submission.",
      "Cuộn xuống Exclusions → Add or remove exclusions → Add an exclusion → Folder, chọn thư mục bạn sẽ để tool.",
      "Giải nén tool vào đúng thư mục đó rồi mới chạy.",
    ],
    notes: [
      "Sau khi khởi động lại, Windows thường tự bật lại Real-time protection; thư mục loại trừ thì giữ nguyên, nên tool trong đó vẫn an toàn.",
      "Dùng phần mềm diệt virus khác (Kaspersky, Avast, BKAV…) thì thêm thư mục tool vào loại trừ của phần mềm đó, hoặc tắt hẳn trong lúc cài.",
    ],
    check:
      'Virus & threat protection hiện "Real-time protection: Off" và thư mục tool nằm trong Exclusions.',
  },
  {
    slug: "tat-secure-boot",
    title: "Tắt Secure Boot",
    short: "Tắt trong BIOS/UEFI khi tool yêu cầu",
    intro:
      "Secure Boot chỉ cho Windows nạp driver có chữ ký Microsoft. Nhiều tool dùng driver riêng nên cần tắt nó trong BIOS/UEFI. Chỉ làm khi hướng dẫn của tool nói rõ, vì có game (Valorant với Vanguard) lại bắt buộc bật.",
    steps: [
      "Khởi động lại máy, bấm liên tục phím vào BIOS khi vừa lên logo hãng (thường là Delete, F2; laptop hay là F2, F10 hoặc Esc).",
      "Tìm mục Boot hoặc Security (mainboard ASUS: Boot → Secure Boot; MSI: Settings → Advanced → Windows OS Configuration; Gigabyte: BIOS → Secure Boot).",
      "Đặt Secure Boot = Disabled. Có máy bắt đổi OS Type sang Other OS hoặc xoá Secure Boot keys trước.",
      "Bấm F10 để lưu và khởi động lại.",
    ],
    notes: [
      "Windows 11 vẫn chạy bình thường khi Secure Boot tắt; chỉ Windows Update bản lớn mới nhắc.",
      "Nếu máy có BitLocker, tạm ngưng BitLocker (Suspend) trước khi đổi, không thì phải nhập key khôi phục.",
    ],
    check: "Bấm Start, gõ msinfo32 → dòng Secure Boot State ghi Off.",
  },
  {
    slug: "tat-core-isolation",
    title: "Tắt Core Isolation (Memory integrity)",
    short: "Tắt Memory integrity trong Windows Security rồi khởi động lại",
    intro:
      "Core Isolation (Memory integrity) chặn driver không có chữ ký nạp vào nhân Windows, nên loader của tool báo lỗi hoặc không chạy. Tắt nó trong Windows Security và khởi động lại.",
    steps: [
      "Mở Windows Security → Device security.",
      "Bấm Core isolation details.",
      "Tắt Memory integrity. Nếu có thêm Kernel-mode Hardware-enforced Stack Protection, tắt luôn.",
      "Khởi động lại máy (bắt buộc, công tắc chỉ có hiệu lực sau khi khởi động lại).",
    ],
    notes: [
      "Windows có thể bật lại sau một bản cập nhật lớn; tool báo lỗi driver thì vào kiểm tra lại mục này đầu tiên.",
      "Nếu không tắt được (xám), vào Registry: HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity, đặt Enabled = 0 rồi khởi động lại.",
    ],
    check:
      "Mở msinfo32 → Virtualization-based security không còn ghi Running, hoặc Core isolation details hiện Memory integrity: Off.",
  },
  {
    slug: "tat-tpm",
    title: "Tắt TPM",
    short: "Chỉ khi hướng dẫn của tool yêu cầu, tắt fTPM/PTT trong BIOS",
    intro:
      "Một số tool và spoofer yêu cầu tắt TPM (chip bảo mật) để che được định danh máy. Chỉ làm khi hướng dẫn của tool ghi rõ; đa số tool không cần.",
    steps: [
      "Nếu máy đang bật BitLocker: vào Control Panel → BitLocker Drive Encryption → Suspend protection trước. Không thì sau khi tắt TPM, Windows đòi key khôi phục.",
      "Khởi động lại, vào BIOS (Delete hoặc F2).",
      "Tìm mục TPM: mainboard AMD gọi là fTPM (Advanced → AMD fTPM configuration), Intel gọi là PTT (Advanced → PCH-FW Configuration → PTT) hoặc Security → TPM Device.",
      "Đặt Disabled, bấm F10 lưu và khởi động lại.",
    ],
    notes: [
      "Windows 11 vẫn chạy khi TPM tắt. Xong việc có thể bật lại y như cũ.",
      "Windows Hello (đăng nhập bằng PIN/vân tay) có thể phải cài lại sau khi đổi TPM.",
    ],
    check:
      'Bấm Start, gõ tpm.msc → báo "Compatible TPM cannot be found" là đã tắt.',
  },
  {
    slug: "tat-anti-cheat-khac",
    title: "Tắt các anti-cheat khác",
    short:
      "Đóng FACEIT, Vanguard, EAC, BattlEye của game khác trước khi chạy tool",
    intro:
      "Anti-cheat của game khác vẫn chạy nền sau khi thoát game, và chúng chặn hoặc ghi lại driver của tool. Trước khi chạy tool, tắt hết những thứ này; tool nào yêu cầu gỡ hẳn thì hướng dẫn của tool sẽ nói.",
    steps: [
      "Riot Vanguard (Valorant, LoL): bấm chuột phải biểu tượng Vanguard ở khay hệ thống → Exit Vanguard, rồi khởi động lại máy. Nếu tool yêu cầu gỡ: Settings → Apps → Riot Vanguard → Uninstall.",
      "FACEIT Anti-Cheat: thoát FACEIT client, mở services.msc, dừng dịch vụ FACEIT. Chơi FACEIT lại thì bật lên sau.",
      "EasyAntiCheat và BattlEye: mở services.msc, dừng các dịch vụ EasyAntiCheat, BEService (BattlEye) của game khác; hoặc đổi Startup type sang Manual.",
      "Đóng overlay và phần mềm ghi hình (Discord overlay, OBS game capture, MSI Afterburner/RTSS, GeForce Experience overlay) nếu hướng dẫn của tool ghi rõ.",
    ],
    notes: [
      "Thoát game bằng nút Exit chứ không tắt ngang; dịch vụ anti-cheat thường chỉ dừng khi game thoát đúng cách.",
      "Chạy tool xong, bật lại các dịch vụ này trước khi chơi game có anti-cheat đó, không thì vào game không được.",
    ],
    check:
      "Task Manager → Details không còn vgc.exe, vgtray.exe, FACEITService.exe, EasyAntiCheat.exe, BEService.exe.",
  },
  {
    slug: "cai-runtime",
    title: "Cài runtime cần thiết",
    short:
      "Visual C++ Redistributable, .NET và DirectX bản chính thức của Microsoft",
    intro:
      'Lỗi "VCRUNTIME140.dll", "MSVCP140.dll", ".NET runtime not found" hay "d3dx9_43.dll" khi mở tool đều do thiếu runtime. Cài đủ ba bộ dưới đây, từ trang chính thức của Microsoft.',
    steps: [
      "Visual C++ Redistributable 2015–2022: tải bản x64 tại https://aka.ms/vs/17/release/vc_redist.x64.exe và bản x86 tại https://aka.ms/vs/17/release/vc_redist.x86.exe, cài cả hai.",
      ".NET: cài .NET Framework 4.8 (https://dotnet.microsoft.com/download/dotnet-framework/net48) và .NET Desktop Runtime 8 (https://dotnet.microsoft.com/download/dotnet/8.0, mục Desktop Runtime, x64).",
      "DirectX End-User Runtime (cho các file d3dx9/d3dx11): https://www.microsoft.com/download/details.aspx?id=35, chạy file dxwebsetup.exe.",
      "Cập nhật Windows Update đến hết rồi khởi động lại.",
    ],
    notes: [
      'Chỉ tải từ microsoft.com hoặc aka.ms; bộ "All in one" trôi nổi trên mạng hay kèm phần mềm lạ.',
      "Tool nào cần thêm (ví dụ Java, Python) thì hướng dẫn của tool đó sẽ ghi.",
    ],
    check:
      "Settings → Apps → Installed apps có Microsoft Visual C++ 2015-2022 Redistributable (x64) và (x86).",
  },
  {
    slug: "reset-hwid",
    title: "Reset HWID",
    short: "Khi nào cần đổi định danh máy và làm thế nào",
    intro:
      'HWID là định danh phần cứng của máy (ổ cứng, mainboard, card mạng…). Khi một tài khoản bị khoá, anti-cheat thường khoá luôn HWID, và tài khoản mới trên cùng máy cũng bị khoá theo. Lúc đó cần spoofer để đổi HWID, hoặc tool báo "HWID mismatch" khi bạn đổi máy.',
    steps: [
      "Xác định mình cần gì: tài khoản mới vẫn bị khoá ngay khi vào game → cần spoofer; tool báo key đã gắn với máy khác → cần reset key ở shop (gửi yêu cầu bảo hành kèm mã đơn).",
      "Dọn dấu vết trước khi đổi: gỡ tool cũ, xoá thư mục game trong %LOCALAPPDATA% và %APPDATA% của game bị khoá, xoá tài khoản game cũ khỏi máy.",
      "Chạy spoofer trước khi mở game, theo đúng hướng dẫn của spoofer (thường phải khởi động lại sau khi spoof, và spoof lại sau mỗi lần khởi động nếu là bản tạm thời).",
      "Vào game bằng tài khoản mới; không đăng nhập lại tài khoản đã bị khoá trên máy đã spoof.",
    ],
    notes: [
      "Shop có bán spoofer theo từng game; xem mục danh mục trên trang chủ hoặc hỏi hỗ trợ để chọn đúng bản.",
      "Đổi HWID không gỡ khoá cho tài khoản đã bị khoá; nó chỉ cho tài khoản mới chơi được trên máy đó.",
    ],
    check:
      "Spoofer báo thành công và serial ổ cứng trong Command Prompt (gõ: wmic diskdrive get serialnumber) đã khác lúc trước.",
  },
];

export function pcSetupPage(slug: string): PcSetupPage | null {
  return PC_SETUP_PAGES.find((page) => page.slug === slug) ?? null;
}

export function pcSetupHref(slug: string): string {
  return `/tai-lieu/chuan-bi/${slug}`;
}
