/**
 * The banking apps VietQR can open with a transfer already filled in — its
 * own published list (api.vietqr.io/v2/*-app-deeplinks), as menzu carries it.
 * `autofill` marks the apps that take the amount and the description as
 * well as the account; the picker lists those first.
 */
export interface BankApp {
  appId: string;
  appName: string;
  bankName: string;
  /** The App Store icon, 200×200. */
  logo: string;
  deeplink: string;
  autofill: boolean;
}

export const BANK_APPS: BankApp[] = [
  { appId: "icb", appName: "VietinBank iPay", bankName: "Ngân hàng TMCP Công thương Việt Nam", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple112/v4/14/04/b8/1404b8f4-a91f-f8bf-7af5-1a0e59bbdf19/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=icb", autofill: true },
  { appId: "bidv", appName: "SmartBanking", bankName: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/88/1b/e6/881be6df-e9b6-8b66-e0fb-2499ac874734/AppIcon-1x_U007emarketing-0-6-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=bidv", autofill: true },
  { appId: "ocb", appName: "OCB OMNI", bankName: "Ngân hàng TMCP Phương Đông", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/f0/66/94/f066942c-2cc6-2c87-407b-a38f2e99656f/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=ocb", autofill: true },
  { appId: "acb", appName: "ACB One", bankName: "Ngân hàng TMCP Á Châu", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/a1/ae/1e/a1ae1e68-2d58-92bc-9ec5-42917a59f767/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=acb", autofill: true },
  { appId: "vcb", appName: "Vietcombank", bankName: "Ngân hàng TMCP Ngoại Thương Việt Nam", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/c6/c9/ed/c6c9ed04-11f8-7269-fcc3-9609126682c0/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vcb", autofill: false },
  { appId: "tcb", appName: "Techcombank Mobile", bankName: "Ngân hàng TMCP Kỹ thương Việt Nam", logo: "https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/b2/b4/d1/b2b4d153-ed9f-aab6-996c-205c583c1339/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=tcb", autofill: false },
  { appId: "mb", appName: "MB Bank", bankName: "Ngân hàng TMCP Quân đội", logo: "https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/f4/0a/b6/f40ab6a2-e67d-e267-9c46-ae03dfa238a9/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=mb", autofill: false },
  { appId: "vpb", appName: "VPBank NEO", bankName: "Ngân hàng TMCP Việt Nam Thịnh Vượng", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple122/v4/0f/45/e5/0f45e506-590d-860d-8a0f-61c460d8b6dd/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vpb", autofill: false },
  { appId: "vib-2", appName: "MyVIB 2.0", bankName: "Ngân hàng TMCP Quốc tế Việt Nam", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple112/v4/72/95/f4/7295f4af-15b4-bc41-62e9-911a817e04dd/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vib-2", autofill: false },
  { appId: "shb", appName: "SHB Mobile", bankName: "Ngân hàng TMCP Sài Gòn - Hà Nội", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/cf/50/e3/cf50e3ff-1e1b-25dc-3c17-7a2f95484310/AppIcon_Release-1x_U007emarketing-0-10-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=shb", autofill: false },
  { appId: "lpb", appName: "Liên Việt 24h", bankName: "Ngân hàng TMCP Bưu Điện Liên Việt", logo: "https://is2-ssl.mzstatic.com/image/thumb/Purple112/v4/d6/dd/3a/d6dd3a04-f846-e108-12bf-74436cc7340a/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=lpb", autofill: false },
  { appId: "seab", appName: "SeAMobile", bankName: "Ngân hàng TMCP Đông Nam Á", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/19/18/68/191868f2-e019-e06a-ae1e-fd29373ef151/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=seab", autofill: false },
  { appId: "scb", appName: "SCB Mobile Banking", bankName: "Ngân hàng TMCP Sài Gòn", logo: "https://is5-ssl.mzstatic.com/image/thumb/Purple112/v4/50/3b/78/503b7850-6d35-e707-d503-c9d7d6b87ca1/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=scb", autofill: false },
  { appId: "vietbank", appName: "Vietbank Digital", bankName: "Ngân hàng TMCP Việt Nam Thương Tín", logo: "https://is5-ssl.mzstatic.com/image/thumb/Purple112/v4/3f/ca/1b/3fca1b1a-9009-2a8a-6eff-2ee63c36f18f/AppIcon-1x_U007emarketing-0-6-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vietbank", autofill: false },
  { appId: "cake", appName: "CAKE Digital Banking", bankName: "TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/7e/52/78/7e5278a7-0a19-3d30-fb30-e4a1be011e11/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=cake", autofill: false },
  { appId: "hdb", appName: "HDBank", bankName: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh", logo: "https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/a0/6c/41/a06c4139-e4a9-9d1f-9f12-52d20f4ef02d/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=hdb", autofill: false },
  { appId: "vba", appName: "Agribank E-Mobile Banking", bankName: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/a6/7e/98/a67e98e6-20c2-5f96-c364-f79a9fe03819/AppIcon-1x_U007emarketing-0-5-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vba", autofill: false },
  { appId: "tpb", appName: "TPBank Mobile", bankName: "Ngân hàng TMCP Tiên Phong", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple122/v4/c3/31/46/c3314678-be31-dda0-621b-ff8f9f100c82/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=tpb", autofill: false },
  { appId: "timo", appName: "Timo Digital Bank", bankName: "Ngân hàng TMCP Bản Việt", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple122/v4/a2/74/38/a274389d-f000-71b1-645c-91e9922cd577/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-P3-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=timo", autofill: false },
  { appId: "vib", appName: "MyVIB", bankName: "Ngân hàng TMCP Quốc tế Việt Nam", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/40/a7/46/40a74658-ed09-5706-f7c1-795d1c562d86/AppIcon-1x_U007emarketing-0-5-0-0-sRGB-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vib", autofill: false },
  { appId: "shbvn", appName: "Shinhan Bank Vietnam SOL", bankName: "Ngân hàng TNHH MTV Shinhan Việt Nam", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/4e/1a/2e/4e1a2ec7-77ca-fce6-cb67-3e104d7d1b58/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=shbvn", autofill: false },
  { appId: "abb", appName: "AB Ditizen", bankName: "Ngân hàng TMCP An Bình", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/b9/db/24/b9db243f-a89e-b156-136c-4d35558ffb06/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=abb", autofill: false },
  { appId: "eib", appName: "Eximbank Mobile Banking", bankName: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple112/v4/0f/b5/01/0fb501f0-dd2c-fab7-2702-270ccf42d88c/AppIcon-1x_U007emarketing-0-5-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=eib", autofill: false },
  { appId: "pvcb", appName: "PV Mobile Banking", bankName: "Ngân hàng TMCP Đại Chúng Việt Nam", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/10/78/4f/10784ff4-2635-bebc-74c7-5ac09d2e161d/AppIcon-1x_U007emarketing-0-10-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=pvcb", autofill: false },
  { appId: "vab", appName: "VietABank EzMobile", bankName: "Ngân hàng TMCP Việt Á", logo: "https://is2-ssl.mzstatic.com/image/thumb/Purple112/v4/a3/b5/66/a3b56687-06e7-3af1-5f1f-d4bcd745ae90/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=vab", autofill: false },
  { appId: "coopbank", appName: "Co-opBank Mobile Banking", bankName: "Ngân hàng Hợp tác xã Việt Nam", logo: "https://is5-ssl.mzstatic.com/image/thumb/Purple112/v4/e2/62/c2/e262c20f-212d-0859-5447-f0875990fcf1/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=coopbank", autofill: false },
  { appId: "pbvn", appName: "PB engage VN", bankName: "Ngân hàng TNHH MTV Public Việt Nam", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple112/v4/25/ee/83/25ee83bb-4ee0-648b-56fe-698c2bb3f21e/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=pbvn", autofill: false },
  { appId: "klb", appName: "KienlongBank Plus", bankName: "Ngân hàng TMCP Kiên Long", logo: "https://is2-ssl.mzstatic.com/image/thumb/Purple112/v4/de/97/dd/de97dd21-584c-481e-b875-112663dcccc4/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=klb", autofill: false },
  { appId: "acb-biz", appName: "ACB One Biz", bankName: "Ngân hàng TMCP Á Châu", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/df/62/de/df62de23-9f41-5498-9cd1-a73c730a1e1d/AppIcon-0-0-1x_U007emarketing-0-0-0-6-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=acb-biz", autofill: false },
  { appId: "bvb", appName: "BAOVIET Smart", bankName: "Ngân hàng TMCP Bảo Việt", logo: "https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/1c/0a/41/1c0a4107-99e1-2ffc-7ccb-54d2ca916395/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=bvb", autofill: false },
  { appId: "sgicb", appName: "SAIGONBANK Smart Banking", bankName: "Ngân hàng TMCP Sài Gòn Công Thương", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple126/v4/3e/25/fe/3e25fe28-ec84-d490-9301-580c636260c6/AppIcon-1x_U007emarketing-0-10-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=sgicb", autofill: false },
  { appId: "oceanbank", appName: "OceanBank", bankName: "Ngân hàng Thương mại TNHH MTV Đại Dương", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple122/v4/94/4a/64/944a64c3-8425-f71d-bcc6-24ac88c3214b/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=oceanbank", autofill: false },
  { appId: "ncb", appName: "NCB iziMobile", bankName: "Ngân hàng TMCP Quốc Dân", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/32/3a/b1/323ab10a-f2ad-268a-2e95-28e91a121e73/AppIcon-New-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=ncb", autofill: false },
  { appId: "cimb", appName: "OCTO by CIMB Vietnam", bankName: "Ngân hàng TNHH MTV CIMB Việt Nam", logo: "https://is1-ssl.mzstatic.com/image/thumb/Purple112/v4/ec/78/52/ec785212-1150-2d2c-4b53-8c55f593ce52/AppIconSummer-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=cimb", autofill: false },
  { appId: "tpb-pay", appName: "TPBank QuickPay", bankName: "Ngân hàng TMCP Tiên Phong", logo: "https://is5-ssl.mzstatic.com/image/thumb/Purple116/v4/80/39/e2/8039e21e-83d4-3f1a-de06-2ea1d8ef30f1/AppIcon-0-0-1x_U007emarketing-0-0-0-10-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=tpb-pay", autofill: false },
  { appId: "nab", appName: "NAM A MOBILE", bankName: "Ngân hàng TMCP Nam Á", logo: "https://is3-ssl.mzstatic.com/image/thumb/Purple116/v4/d5/21/44/d52144c9-e22f-0222-5b75-4a17d8decad9/AppIcon-1x_U007emarketing-0-7-0-0-85-220.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=nab", autofill: false },
  { appId: "wvn", appName: "Woori WON Vietnam", bankName: "Ngân hàng TNHH MTV Woori Việt Nam", logo: "https://is2-ssl.mzstatic.com/image/thumb/Purple112/v4/29/92/12/299212d8-a419-f884-b8c8-77807cf1ecca/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/200x200bb.png", deeplink: "https://dl.vietqr.io/pay?app=wvn", autofill: false },
];

/**
 * The link that opens `app` on a transfer to `account` at `bank` (VietQR's
 * short code, e.g. "mb"), built the way menzu builds it: spaces in the
 * description and the holder's name as "+".
 */
export function bankAppLink(
  app: BankApp,
  transfer: { bank: string; account: string; amount: number; note: string; holder: string },
): string {
  const plus = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");
  return (
    app.deeplink +
    `&ba=${encodeURIComponent(`${transfer.account}@${transfer.bank}`)}` +
    `&am=${transfer.amount}&tn=${plus(transfer.note)}&bn=${plus(transfer.holder)}`
  );
}
