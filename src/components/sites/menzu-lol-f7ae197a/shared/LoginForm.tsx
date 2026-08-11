"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Eye, EyeOff, Lock, User } from "lucide-react";

const HERO_IMAGE_SRC =
  "/sites/menzu-lol-f7ae197a/root-8a5edab2/images/valorant-api/bundles/cb572643-4ce2-b10a-bb56-7c90cc09b19c.png";

/* lucide-react no longer ships brand marks, so the two OAuth buttons get
 * small hand-drawn single-color glyphs instead. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M21.6 12.23c0-.71-.06-1.42-.19-2.11H12v4h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.96-4.34 2.96-7.41Z" />
      <path d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.24-2.5c-.9.6-2.06.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.06v2.58A10 10 0 0 0 12 22Z" />
      <path d="M6.41 13.91A6 6 0 0 1 6.09 12c0-.66.11-1.31.32-1.91V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49l3.35-2.58Z" />
      <path d="M12 5.98c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.96 2.99 14.7 2 12 2A10 10 0 0 0 3.06 7.51l3.35 2.58C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M19.27 5.33A18.3 18.3 0 0 0 14.9 4c-.2.36-.42.83-.58 1.2a17 17 0 0 0-4.64 0A8 8 0 0 0 9.1 4a18.2 18.2 0 0 0-4.38 1.33C2.1 9 1.4 12.6 1.73 16.14a18.4 18.4 0 0 0 5.54 2.8c.45-.6.84-1.25 1.18-1.93-.65-.24-1.27-.54-1.86-.9.16-.11.31-.23.46-.35a13 13 0 0 0 11.02 0c.15.12.3.24.46.35-.59.36-1.21.66-1.86.9.34.68.73 1.32 1.18 1.93a18.3 18.3 0 0 0 5.54-2.8c.4-4.1-.66-7.66-2.79-10.81ZM8.68 13.93c-.83 0-1.5-.76-1.5-1.7 0-.93.66-1.7 1.5-1.7s1.52.77 1.5 1.7c0 .94-.66 1.7-1.5 1.7Zm6.64 0c-.83 0-1.5-.76-1.5-1.7 0-.93.67-1.7 1.5-1.7.84 0 1.52.77 1.5 1.7 0 .94-.66 1.7-1.5 1.7Z" />
    </svg>
  );
}

/**
 * Split login card: brand panel on the left, credential form on the right.
 * Both text inputs are controlled locally and the password field can be
 * toggled between masked and plain text. Submitting only prevents the
 * native page reload — real authentication is wired up once a backend
 * exists.
 */
export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: username, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Đăng nhập thất bại");
        setPending(false);
        return;
      }

      // Honour ?next= so the "Mua Ngay" gate returns you to the product.
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch {
      setError("Không kết nối được máy chủ");
      setPending(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-100px)] flex items-center justify-center">
      <div className="w-full max-w-[1320px] mx-auto px-4 lg:px-6 lg:py-10 py-4 sm:py-8 flex flex-col flex-1 min-h-[700px] animate-[slideUpFade_0.5s_ease-out]">
        <div className="mb-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-neutral-300 hover:text-white transition-colors duration-200 text-xs font-black uppercase tracking-widest px-4 py-2"
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
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
                  <span className="block">Welcome</span>
                  <span className="block">Back</span>
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
                        className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
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
                        href="#"
                        className="text-[10px] font-bold text-[#7C3AED] hover:text-[#6D28D9] cursor-pointer transition-colors uppercase tracking-wider mr-1"
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
                        className="w-full rounded-2xl border border-white/5 bg-white/5 pl-12 pr-12 py-4 text-sm text-white outline-none focus:border-[#7C3AED]/60 transition-colors placeholder-neutral-600"
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

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="relative overflow-hidden transform-gpu flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20 py-3.5 transition-colors"
                  >
                    <GoogleGlyph />
                    <span className="relative z-10">Google</span>
                  </button>
                  <button
                    type="button"
                    className="relative overflow-hidden transform-gpu flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20 py-3.5 transition-colors"
                  >
                    <span className="absolute -top-px right-2 text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-b-md px-1.5 py-0.5 z-20">
                      +1000 PTS
                    </span>
                    <DiscordGlyph />
                    <span className="relative z-10">Discord</span>
                  </button>
                </div>

                <p className="mt-8 text-center text-xs text-neutral-500">
                  Chưa có tài khoản?
                  <a
                    href="#"
                    className="text-[#7C3AED] hover:text-[#6D28D9] font-black transition-colors ml-1"
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
