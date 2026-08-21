/**
 * The two social sign-in buttons, rebuilt verbatim from the captured menzu
 * login page: same shell, same lift and sheen, differing only where the brands
 * differ — Google's four-colour G against a white sheen, Discord's mark in
 * its own blurple with a blurple-tinted sheen. The labels shout in tracked
 * caps because everything on this card does: ĐĂNG NHẬP above, HOẶC TRUY CẬP
 * BẰNG beside — sentence case here read as the one quiet voice in the room.
 *
 * One thing the capture has that this pair does not: a "+1000 PTS" flag on
 * Discord's shoulder. Menzu's is a real offer — they run a points system.
 * This shop has none, and the buttons are not wired yet either, so the flag
 * would promise a bonus that does not exist on a button that does not work.
 * It returns when points and OAuth do.
 *
 * One component for the pair on purpose: they must stay identical twins, and
 * two inline copies had already drifted (py-3.5 vs py-4, flat monochrome
 * glyphs) by the time this file was made. Any page that offers social sign-in
 * renders this and cannot drift again.
 *
 * Each brand is a real link only once its keys are in Cấu hình — the flow
 * behind /api/auth/google|discord refuses politely without them, but a button
 * that navigates somewhere just to bounce back reads as broken. Unconfigured,
 * the shell stays an inert button, exactly what this pair was before OAuth
 * existed.
 */

/** The chrome both buttons share — the brand pieces slot inside it. */
const SHELL =
  "relative overflow-hidden transform-gpu flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/40 py-4 text-xs font-black uppercase tracking-widest text-neutral-300 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10 hover:text-white hover:shadow-[0_10px_20px_rgba(0,0,0,0.5)] active:translate-y-0 active:scale-95 group/btn";

/** The band that sweeps across on hover; each brand tints it its own way. */
const SHEEN =
  "absolute inset-0 w-full h-full bg-gradient-to-r from-transparent to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out";

const ICON = "w-4 h-4 relative z-10 transition-transform duration-300 group-hover/btn:scale-110";

export interface OAuthButtonsProps {
  /** True once the provider's client id and secret are both configured. */
  googleEnabled?: boolean;
  discordEnabled?: boolean;
}

/** Anchor when the door exists, button when it does not — one look, two tags. */
function BrandShell({
  enabled,
  href,
  children,
}: {
  enabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return enabled ? (
    <a href={href} className={SHELL}>
      {children}
    </a>
  ) : (
    <button type="button" className={SHELL}>
      {children}
    </button>
  );
}

export function OAuthButtons({ googleEnabled, discordEnabled }: OAuthButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <BrandShell enabled={Boolean(googleEnabled)} href="/api/auth/google">
        <span aria-hidden className={`${SHEEN} via-white/10`} />
        {/* Google's mark keeps its four colours in every state — the brand
            forbids recolouring it, and the original obeys. */}
        <svg className={ICON} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span className="relative z-10">Google</span>
      </BrandShell>

      <BrandShell enabled={Boolean(discordEnabled)} href="/api/auth/discord">
        <span aria-hidden className={`${SHEEN} via-[#5865F2]/20`} />
        {/* Blurple at rest, white at full hover — the shell's text colour
            flips and currentColor carries the mark with it. */}
        <svg
          className={`${ICON} text-[#5865F2] group-hover/btn:text-white`}
          viewBox="0 0 127.14 96.36"
          fill="currentColor"
          aria-hidden
        >
          <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83A97.68 97.68 0 0049 6.83a72.37 72.37 0 00-3.36-6.83 105.15 105.15 0 00-26.23 8.07C2.71 32.72-2.11 56.63.85 80.22a105.73 105.73 0 0032.17 16.14 77.7 77.7 0 006.89-11.23 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a67.55 67.55 0 01-10.87 5.19 77 77 0 006.89 11.22 105.47 105.47 0 0032.26-16.14c3.2-25.26-2.91-48.43-19.28-72.15zm-65 59.8c-6.19 0-11.28-5.69-11.28-12.65 0-7 4.93-12.65 11.28-12.65 6.42 0 11.4 5.75 11.28 12.65 0 7-4.93 12.65-11.28 12.65zm41.7 0c-6.19 0-11.28-5.69-11.28-12.65 0-7 4.93-12.65 11.28-12.65 6.42 0 11.4 5.75 11.28 12.65 0 7-4.93 12.65-11.28 12.65z" />
        </svg>
        <span className="relative z-10">Discord</span>
      </BrandShell>
    </div>
  );
}
