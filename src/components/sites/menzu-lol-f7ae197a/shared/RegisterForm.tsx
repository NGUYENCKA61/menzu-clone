"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";

import { canGoBack } from "@/lib/navigation";

import { AuthPanelSlider } from "./AuthPanelSlider";
import { StatusToast } from "./StatusToast";
import { TurnstileBox } from "./TurnstileBox";

const FIELD_CLASS =
  "w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[var(--menzu-accent)]/60 transition-colors placeholder-neutral-600";
const LABEL_CLASS =
  "block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2.5 ml-1";

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
 * Sign-up counterpart to LoginForm, reusing its split-card layout.
 *
 * The live site links to a registration page from "Tạo mới ngay" but its
 * markup was never captured — the browser session ended before it could be
 * opened. The layout here is deliberately the login card's, so it stays
 * consistent with what was measured rather than inventing a new design.
 */
export function RegisterForm({
  turnstileSiteKey,
  panelImages,
  slideEnabled,
  slideSeconds,
  panelSubtitle,
  panelTitle,
  refCode = null,
  next = "/",
}: {
  turnstileSiteKey: string | null;
  /** Artwork behind the card. Comes from Cấu hình → Giao diện. */
  panelImages: string[];
  slideEnabled: boolean;
  slideSeconds: number;
  panelSubtitle: string;
  /** Newlines are line breaks, which is how the two-row overlay is written. */
  panelTitle: string;
  /** The ?ref= a referral link arrived with; rides along on submit. */
  refCode?: string | null;
  /** Where to go after signing up, already sanitised on the server. "/" means
   *  the visitor came on their own, so land them on their profile instead. */
  next?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  // Hidden until the server asks: a refusal carrying captchaRequired means
  // this address has been creating accounts, and the widget appears for the
  // next try. Never lowered again while the page lives.
  const [captchaNeeded, setCaptchaNeeded] = useState(false);
  // Ticked by hand every time. Not remembered and not pre-checked: consent
  // that arrives already given is not consent.
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    // An untouched form gets one sentence, not a lecture about its first
    // field - "phải có ít nhất 3 ký tự" reads wrong aimed at somebody who
    // has not typed anything yet. Email is not counted: it is optional,
    // so a form with only an email in it is still an empty form.
    if (!username.trim() && !password && !confirm) {
      setError("Vui lòng nhập đủ thông tin");
      return;
    }
    if (username.trim().length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự");
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Email không hợp lệ");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email: email || undefined,
          ...(refCode ? { ref: refCode } : {}),
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
        setError(data.error ?? "Không tạo được tài khoản");
        setPending(false);
        return;
      }

      router.refresh();
      // Back to whatever gate sent them here (a product they were buying), or
      // their profile when they arrived on their own.
      router.push(next === "/" ? "/profile" : next);
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
          {/* Was a link that always went to /login, whatever the visitor had
              been looking at. Back means back. */}
          <button
            type="button"
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
                    Đăng ký
                  </h1>
                  <p className="text-sm text-neutral-400 mt-2 font-medium">
                    Tạo tài khoản để bắt đầu mua sắm
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="reg-username" className={LABEL_CLASS}>
                      Tên đăng nhập
                    </label>
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="reg-username"
                        type="text"
                        autoComplete="username"
                        required
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Ít nhất 3 ký tự"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="reg-email" className={LABEL_CLASS}>
                      Email <span className="text-neutral-600">(không bắt buộc)</span>
                    </label>
                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="email@example.com"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <label htmlFor="reg-password" className={LABEL_CLASS}>
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Ít nhất 6 ký tự"
                        className={`${FIELD_CLASS} pr-12`}
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

                  <div className="mt-5">
                    <label htmlFor="reg-confirm" className={LABEL_CLASS}>
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="reg-confirm"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(event) => setConfirm(event.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  {error ? (
                    <StatusToast
                      title="Đăng ký thất bại"
                      message={error}
                      onClose={() => setError(null)}
                    />
                  ) : null}

                  {turnstileSiteKey && captchaNeeded ? (
                    <TurnstileBox siteKey={turnstileSiteKey} onToken={setCaptcha} />
                  ) : null}

                  <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--menzu-accent)]"
                    />
                    {/* Both point at the article index rather than at slugs
                        that do not exist yet — the shop has no terms or
                        privacy article written. A consent line whose links
                        404 is worse than one that lands somewhere real; give
                        them their own articles and these get the slugs. */}
                    <span className="text-[11px] leading-relaxed text-neutral-400">
                      Tôi đồng ý với{" "}
                      <Link
                        href="/docs"
                        className="font-bold text-[var(--menzu-accent)] hover:underline"
                      >
                        Điều khoản sử dụng
                      </Link>{" "}
                      và{" "}
                      <Link
                        href="/docs"
                        className="font-bold text-[var(--menzu-accent)] hover:underline"
                      >
                        Chính sách bảo mật
                      </Link>{" "}
                      của Menzu.
                    </span>
                  </label>

                  <button
                    type="submit"
                    // The consent box is enforced here only. It is a promise
                    // between the shop and the customer, not something the
                    // server can verify was read — unlike the CAPTCHA, which
                    // the server checks because the browser's word is worth
                    // nothing there.
                    disabled={
                      pending ||
                      !agreed ||
                      (Boolean(turnstileSiteKey) && captchaNeeded && !captcha)
                    }
                    className="w-full rounded-2xl bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors mt-5"
                  >
                    {pending ? "ĐANG XỬ LÝ…" : "ĐĂNG KÝ"}
                  </button>
                </form>

                <p className="mt-8 text-center text-xs text-neutral-500">
                  Đã có tài khoản?
                  <Link
                    href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}
                    className="text-[var(--menzu-accent)] hover:text-[var(--menzu-accent-dark)] font-black transition-colors ml-1"
                  >
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
