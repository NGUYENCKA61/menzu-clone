"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";

const HERO_IMAGE_SRC =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/bundles/cb572643-4ce2-b10a-bb56-7c90cc09b19c.webp";

const FIELD_CLASS =
  "w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600";
const LABEL_CLASS =
  "block text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-2.5 ml-1";

/**
 * Sign-up counterpart to LoginForm, reusing its split-card layout.
 *
 * The live site links to a registration page from "Tạo mới ngay" but its
 * markup was never captured — the browser session ended before it could be
 * opened. The layout here is deliberately the login card's, so it stays
 * consistent with what was measured rather than inventing a new design.
 */
export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

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
        body: JSON.stringify({ username, password, email: email || undefined }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Không tạo được tài khoản");
        setPending(false);
        return;
      }

      router.refresh();
      router.push("/profile");
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 lg:py-10 py-4 sm:py-8 flex flex-col flex-1 min-h-[700px] animate-[slideUpFade_0.5s_ease-out]">
        <div className="mb-6">
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-neutral-300 hover:text-white transition-colors duration-200 text-xs font-black uppercase tracking-widest px-4 py-2"
          >
            <ArrowLeft size={14} />
            Quay lại
          </a>
        </div>

        <div className="flex-1 w-full bg-neutral-900/80 border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden transform-gpu flex flex-col">
          <div className="flex flex-col lg:flex-row flex-1 relative z-10">
            <div className="hidden lg:flex w-1/2 relative bg-[#111111] overflow-hidden transform-gpu items-end justify-center border-r border-white/5">
              <Image
                src={HERO_IMAGE_SRC}
                alt=""
                fill
                priority
                sizes="50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="relative z-10 p-12 text-center w-full">
                <span className="text-[#7C3AED] font-black uppercase tracking-[0.5em] text-xs mb-2 drop-shadow-md block">
                  Menzu Valorant
                </span>
                <h2 className="text-5xl font-black text-white uppercase leading-none drop-shadow-lg">
                  <span className="block">Join</span>
                  <span className="block">Us</span>
                </h2>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:py-14 lg:px-16 bg-neutral-950/60">
              <div className="w-full max-w-[420px]">
                <div className="mb-8">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#7C3AED] mb-2 font-black lg:hidden">
                    Menzu Shop
                  </p>
                  <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                    Đăng ký
                  </h1>
                  <p className="text-sm text-neutral-400 mt-2 font-medium">
                    Tạo tài khoản để bắt đầu mua sắm
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
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
                    <p
                      role="alert"
                      className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[12px] font-semibold text-red-400"
                    >
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-70 disabled:cursor-wait text-white font-black py-4 uppercase tracking-widest text-sm transition-colors mt-7"
                  >
                    {pending ? "ĐANG XỬ LÝ…" : "ĐĂNG KÝ"}
                  </button>
                </form>

                <p className="mt-8 text-center text-xs text-neutral-500">
                  Đã có tài khoản?
                  <a
                    href="/login"
                    className="text-[#7C3AED] hover:text-[#6D28D9] font-black transition-colors ml-1"
                  >
                    Đăng nhập ngay
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
