"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock, User } from "lucide-react";

import { canGoBack } from "@/lib/navigation";

import { AuthPanelSlider } from "./AuthPanelSlider";
import { StatusToast } from "./StatusToast";
import { OAuthButtons } from "./OAuthButtons";
import { TurnstileBox } from "./TurnstileBox";

/**
 * Back to wherever they came from, or the shop front if that was elsewhere.
 *
 * The fallback goes through the router rather than window.location so it stays
 * a client navigation — a full reload here would throw away the app shell to
 * reach a page the browser already holds.
 */
function goBack(push: (href: string) => void) {
  if (canGoBack(window.history.length, document.referrer, window.location.origin)) {
    window.history.back();
  } else {
    push("/");
  }
}

/**
 * Split login card: brand panel on the left, credential form on the right.
 *
 * Submits to /api/auth/login, surfaces the server's error message, and honours
 * ?next= so the purchase gate returns you to the product you were looking at.
 * The redirect target is required to start with "/" so it cannot be pointed at
 * another origin.
 */
export function LoginForm({
  turnstileSiteKey,
  googleEnabled,
  discordEnabled,
  panelImages,
  slideEnabled,
  slideSeconds,
  panelSubtitle,
  panelTitle,
}: {
  turnstileSiteKey: string | null;
  /** True once that provider's keys are in Cấu hình — the button becomes a door. */
  googleEnabled?: boolean;
  discordEnabled?: boolean;
  /** Artwork behind the card. Comes from Cấu hình → Giao diện. */
  panelImages: string[];
  slideEnabled: boolean;
  slideSeconds: number;
  panelSubtitle: string;
  /** Newlines are line breaks, which is how the two-row overlay is written. */
  panelTitle: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Null until the visitor solves the widget, and null again once the token
  // lapses. Only meaningful when the shop has configured Turnstile at all.
  const [captcha, setCaptcha] = useState<string | null>(null);
  // The widget stays hidden until the server asks for it — a few failures on
  // this name within the window. Flipped by the captchaRequired flag that
  // rides every refusal, and never flipped back: once suspicion is raised it
  // does not lower until the page is left.
  const [captchaNeeded, setCaptchaNeeded] = useState(false);

  // OAuth failures come back as ?oauthError=<code> — the callback endpoints
  // have no page of their own to explain on. Read once, toast, then scrub the
  // parameter so a refresh does not re-accuse.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oauthError");
    if (!code) return;
    const messages: Record<string, string> = {
      off: "Đăng nhập mạng xã hội chưa được bật trên shop này.",
      state: "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.",
      exchange: "Không xác thực được với nhà cung cấp. Vui lòng thử lại.",
      profile: "Không đọc được thông tin tài khoản. Vui lòng thử lại.",
      blocked: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.",
    };
    // Deferred a tick: the point of this effect is reacting to an external
    // input (the URL), and updating state synchronously inside an effect is
    // the double-render React's lint rule exists to stop.
    const timer = window.setTimeout(
      () => setError(messages[code] ?? "Đăng nhập mạng xã hội không thành công."),
      0,
    );
    params.delete("oauthError");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
    return () => window.clearTimeout(timer);
  }, []);

  /** Honour ?next= so the "Mua Ngay" gate returns you to the product. */
  function redirectAfterLogin() {
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") ? next : "/";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: username,
          password,
          ...(turnstileSiteKey && captchaNeeded
            ? { turnstileToken: captcha }
            : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        captchaRequired?: boolean;
      };

      if (!response.ok) {
        if (data.captchaRequired) setCaptchaNeeded(true);
        setError(data.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
        setPending(false);
        return;
      }

      redirectAfterLogin();
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      {/* Padding runs heavier below than above on purpose. The QUAY LAI row
          (32px button + 24px margin) sits between the top padding and the
          card, so a symmetric py left the card 56px closer to the footer
          than to the top of the page. Each bottom value is its top plus
          those 56px, which is what makes the card sit evenly. */}
      <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 pt-4 pb-[4.5rem] sm:pt-8 sm:pb-[5.5rem] lg:pt-10 lg:pb-24 flex flex-col flex-1 min-h-[700px] animate-[slideUpFade_0.5s_ease-out]">
        <div className="mb-6">
          <button
            type="button"
            // It had no handler at all, so it did nothing when pressed.
            onClick={() => goBack((href) => router.push(href))}
            className="inline-flex items-center gap-2 text-neutral-300 hover:text-white transition-colors duration-200 text-xs font-black uppercase tracking-widest px-4 py-2"
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
        </div>

        <div className="flex-1 w-full bg-neutral-900/80 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden transform-gpu flex flex-col">
          <div className="flex flex-col lg:flex-row flex-1 relative z-10">
            <div className="hidden lg:flex w-1/2 relative bg-[#111111] overflow-hidden transform-gpu items-end justify-center border-r border-white/5">
              <AuthPanelSlider
                images={panelImages}
                autoPlay={slideEnabled}
                seconds={slideSeconds}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="relative z-10 p-12 text-center w-full">
                <span className="text-[var(--menzu-accent)] font-black uppercase tracking-[0.5em] text-xs mb-2 drop-shadow-md block">
                  {panelSubtitle}
                </span>
                <h2 className="text-5xl font-black text-white uppercase leading-none drop-shadow-lg">
                  {/* One row per line the shop typed, so a one-word or
                      three-word title renders as written. */}
                  {panelTitle.split("\n").map((line, index) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))}
                </h2>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:py-14 lg:px-16 bg-neutral-950/60">
              <div className="w-full max-w-[420px]">
                <div className="mb-8">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--menzu-accent)] mb-2 font-black lg:hidden">
                    Menzu Shop
                  </p>
                  <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                    Đăng nhập
                  </h1>
                  <p className="text-sm text-neutral-400 mt-2 font-medium">
                    Trải nghiệm dịch vụ Valorant ngay hôm nay
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2.5 ml-1"
                    >
                      Tên đăng nhập / Email
                    </label>
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="login-username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Email hoặc Tên đăng nhập"
                        className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2.5 ml-1">
                      <label
                        htmlFor="login-password"
                        className="block text-[11px] font-black uppercase tracking-widest text-neutral-400"
                      >
                        Mật khẩu
                      </label>
                      <a
                        href="/forgot-password"
                        className="text-[10px] font-bold text-[var(--menzu-accent)] hover:text-[var(--menzu-accent-dark)] cursor-pointer transition-colors uppercase tracking-wider mr-1"
                      >
                        Quên mật khẩu?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-12 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <StatusToast
                      title="Đăng nhập thất bại"
                      message={error}
                      onClose={() => setError(null)}
                    />
                  ) : null}

                  {/* Between the password and the button, as the layout has
                      it. Absent entirely until the shop configures Turnstile,
                      so an empty frame never sits here waiting for keys. */}
                  {turnstileSiteKey && captchaNeeded ? (
                    <TurnstileBox siteKey={turnstileSiteKey} onToken={setCaptcha} />
                  ) : null}

                  <button
                    type="submit"
                    // Disabled until the widget hands over a token. The server
                    // refuses without one anyway — this only saves the visitor
                    // a round trip and an error they cannot act on.
                    disabled={
                      pending ||
                      (Boolean(turnstileSiteKey) && captchaNeeded && !captcha)
                    }
                    className={`w-full rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors ${
                      turnstileSiteKey && captchaNeeded ? "mt-5" : "mt-7"
                    }`}
                  >
                    {pending ? "ĐANG XỬ LÝ…" : "ĐĂNG NHẬP"}
                  </button>
                </form>

                <div className="flex items-center gap-4 my-7">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 whitespace-nowrap">
                    Hoặc truy cập bằng
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <OAuthButtons
                  googleEnabled={googleEnabled}
                  discordEnabled={discordEnabled}
                />

                <p className="mt-8 text-center text-xs text-neutral-500">
                  Chưa có tài khoản?
                  <a
                    href="/signup"
                    className="text-[var(--menzu-accent)] hover:text-[var(--menzu-accent-dark)] font-black transition-colors ml-1"
                  >
                    Tạo mới ngay
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
