"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Headphones,
  KeyRound,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";

import { badgePillClass, BADGE_PILL_BASE } from "@/lib/productBadges";
import {
  FREE_CLAIM_GAP_MS,
  type FreeToolPanel,
  freePackageOf,
  freeWaitWording,
} from "@/lib/freeKeyRules";
import { isSalesLocked, salesLockReason } from "@/lib/softwareStatus";

import { BadgeIcon } from "./BadgeIcon";
import { sentenceCase } from "@/lib/displayCase";
import { type SoftwareDetail } from "./SoftwareBuyPanel";
import { StockLine } from "./StockLine";

type Phase =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "link"; claimId: string; shortUrl: string }
  | { kind: "done"; key: string | null; orderCode: string; until: Date }
  | { kind: "error"; message: string };

type Outcome =
  | { state: "link"; claimId: string; shortUrl: string }
  | { state: "claimed"; key: string | null; orderCode: string }
  | { state: "missing" }
  | { state: "expired" }
  | { state: "wait"; until: string }
  | { state: "closed"; reason: string };

const POLL_MS = 3000;

/** The phase an answer puts the panel in; null while the ticket still waits. */
function settled(data: Outcome | null): Phase | null {
  if (!data) return null;
  if (data.state === "claimed")
    return {
      kind: "done",
      key: data.key,
      orderCode: data.orderCode,
      until: new Date(Date.now() + FREE_CLAIM_GAP_MS),
    };
  if (data.state === "wait")
    return { kind: "error", message: freeWaitWording(new Date(data.until)) };
  if (data.state === "closed")
    return { kind: "error", message: `${data.reason}.` };
  if (data.state === "expired" || data.state === "missing")
    return {
      kind: "error",
      message: "Link đã hết hạn, bấm Lấy key miễn phí để lấy link mới.",
    };
  return null;
}

const TRUST = [
  { icon: Zap, label: "Giao key tự động" },
  { icon: KeyRound, label: "Mỗi ngày 1 key" },
  { icon: RefreshCw, label: "Cập nhật thường xuyên" },
  { icon: Headphones, label: "Hỗ trợ 24/7" },
];

/** The tier's own label, unless it is the shop's "forever" placeholder. */
function tierWording(tier: { label: string; durationHours: number | null }) {
  const forever =
    tier.durationHours === null || tier.durationHours >= 24 * 365 * 5;
  return forever ? "Key vĩnh viễn" : `Key ${tier.label}`;
}

/**
 * The right-hand panel of a FREE tool's page: the buy panel's frame (chips,
 * title, price line, trust tiles) with the tier list and the basket swapped
 * for one button that hands out a key behind the shop's paid shortlink
 * (the owner, 12/10/2026: "trang chi tiết sản phẩm cho phần mềm thuộc dạng
 * miễn phí… lấy key bằng cách vượt link rút gọn"). With no shortlink set up
 * in Cấu hình the button hands the key out at once.
 */
export function FreeKeyPanel({
  software,
  signedIn,
  loginHref,
  gated,
  downloadUrl,
  today,
}: {
  software: SoftwareDetail;
  signedIn: boolean;
  /** Where a guest signs in, back to this page. */
  loginHref: string;
  /** Whether the shop runs a shortlink: decides the steps shown and the wait. */
  gated: boolean;
  downloadUrl: string | null;
  /** The key this account took today already: the page opens on it. */
  today: FreeToolPanel["today"];
}) {
  const [phase, setPhase] = useState<Phase>(
    today
      ? {
          kind: "done",
          key: today.key,
          orderCode: today.orderCode,
          until: new Date(today.until),
        }
      : { kind: "idle" },
  );
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const tier = freePackageOf(software.packages);
  // The status still locks the key when the tool is detected or updating,
  // but a free tool carries no status label (the owner, 16/10/2026: "Hack
  // miễn phí nên bỏ cái nhãn chưa phát hiện").
  const locked = isSalesLocked(software.softwareStatus);

  // The wait on the shortlink: ask every few seconds whether the ticket was
  // spent, until it was or it ran out.
  useEffect(() => {
    if (phase.kind !== "link") return;
    const { claimId } = phase;
    const tick = async () => {
      try {
        const res = await fetch(`/api/free-key/${claimId}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as Outcome | null;
        const next = settled(data);
        if (next) {
          setPhase(next);
          return;
        }
      } catch {
        // A blip: ask again next time.
      }
      timer.current = window.setTimeout(() => void tick(), POLL_MS);
    };
    timer.current = window.setTimeout(() => void tick(), POLL_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [phase]);

  async function start() {
    setPhase({ kind: "busy" });
    // Behind a shortlink the tab is opened in the click itself and pointed at
    // the link once the server has minted it: a tab opened only after an
    // await is what popup blockers stop. Its opener is cut, so the shortlink
    // service cannot steer this page.
    const tab = gated ? window.open("", "_blank") : null;
    if (tab) {
      tab.opener = null;
      tab.document.title = "Đang tạo link rút gọn…";
      tab.document.body.textContent = "Đang tạo link rút gọn, chờ một chút…";
    }
    try {
      const res = await fetch("/api/free-key/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: software.code }),
      });
      const data = (await res.json().catch(() => null)) as
        (Outcome & { error?: string }) | null;
      if (!res.ok || !data) {
        tab?.close();
        setPhase({
          kind: "error",
          message: data?.error ?? "Có lỗi, thử lại sau.",
        });
        return;
      }
      const next = settled(data);
      if (next) {
        tab?.close();
        setPhase(next);
        return;
      }
      if (data.state === "link") {
        if (tab && !tab.closed) tab.location.href = data.shortUrl;
        else window.open(data.shortUrl, "_blank", "noopener");
        setPhase({
          kind: "link",
          claimId: data.claimId,
          shortUrl: data.shortUrl,
        });
        return;
      }
      tab?.close();
      setPhase({ kind: "error", message: "Có lỗi, thử lại sau." });
    } catch {
      tab?.close();
      setPhase({ kind: "error", message: "Mất kết nối, thử lại sau." });
    }
  }

  async function copy(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard: the key is on screen to select.
    }
  }

  const waiting = phase.kind === "busy" || phase.kind === "link";
  const steps = gated
    ? [
        "Bấm Lấy key miễn phí, link rút gọn mở ở tab mới.",
        "Vượt link rút gọn theo hướng dẫn của trang đó (xem quảng cáo, bấm tiếp tục).",
        "Key hiện ở đây và nằm trong Lịch sử mua hàng, kèm link tải và tài liệu.",
      ]
    : [
        "Bấm Lấy key miễn phí.",
        "Key hiện ở đây và nằm trong Lịch sử mua hàng, kèm link tải và tài liệu.",
        "Tải tool, nhập key, vào game.",
      ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raise px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[13px] font-medium text-emerald-300">
            Miễn phí
          </span>
        </span>
        {software.badges.map((badge) => (
          <span
            key={badge.label}
            className={`${BADGE_PILL_BASE} ${badgePillClass(badge.color)}`}
          >
            <BadgeIcon icon={badge.icon} />
            {badge.label}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-[26px] font-semibold leading-[1.15] text-frost sm:text-[30px] lg:text-[34px]">
          {sentenceCase(software.name)}
        </h1>
        {software.summary ? (
          <p className="max-w-[60ch] text-[15px] leading-[1.65] text-mist">
            {software.summary}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[36px] font-bold leading-none text-frost sm:text-[42px]">
            Miễn phí
          </span>
          {tier ? (
            <span className="text-[14px] font-medium text-mist">
              {tierWording(tier)}
            </span>
          ) : null}
        </p>
        <StockLine
          inStock={software.inStock}
          label={software.inStock ? "Còn key" : "Tạm hết key"}
        />
      </div>

      <div className="rounded-[16px] border border-line bg-panel p-5">
        <span className="block text-[14px] font-semibold text-frost">
          Cách nhận key
        </span>
        <ol className="mt-3 flex flex-col gap-2.5">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 text-[13px] leading-relaxed text-neutral-300"
            >
              <span className="lab-figure flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raise text-[12px] font-bold text-frost ring-1 ring-inset ring-line">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12px] text-neutral-500">
          Mỗi tài khoản nhận 1 key mỗi 24 giờ.
        </p>
      </div>

      {phase.kind === "link" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-200">
          <p className="flex items-center gap-2 font-semibold">
            <Loader2
              size={14}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            Đã mở link rút gọn ở tab mới. Vượt link xong, key hiện ở đây.
          </p>
          <a
            href={phase.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-white underline underline-offset-2"
          >
            <ExternalLink size={13} aria-hidden />
            Mở lại link
          </a>
        </div>
      ) : null}

      {phase.kind === "done" ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-[13px] font-semibold text-emerald-300">
            Key của bạn · đơn {phase.orderCode}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm font-bold tracking-wider text-white break-all">
              {phase.key ?? "Shop đang giao key, xem lại trong Lịch sử mua"}
            </code>
            {phase.key ? (
              <button
                type="button"
                onClick={() => void copy(phase.key!)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-300 transition-colors hover:text-white"
              >
                {copied ? (
                  <Check size={14} aria-hidden />
                ) : (
                  <Copy size={14} aria-hidden />
                )}
                {copied ? "Đã chép" : "Sao chép"}
              </button>
            ) : null}
          </div>
          <Link
            href="/orders"
            className="mt-2 inline-block text-[12px] font-bold text-white underline underline-offset-2"
          >
            Xem trong Lịch sử mua hàng
          </Link>
          <p className="mt-2 text-[12px] text-neutral-400">
            {freeWaitWording(phase.until)}
          </p>
        </div>
      ) : null}

      {phase.kind === "error" ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] leading-relaxed text-red-300">
          {phase.message}
        </p>
      ) : null}

      {locked ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] leading-relaxed text-red-300">
          Tool {salesLockReason(software.softwareStatus)}, shop tạm khóa phát
          key. Theo dõi kênh thông báo để biết khi có bản mới.
        </p>
      ) : null}

      <div className="space-y-3">
        {signedIn ? (
          <button
            type="button"
            disabled={
              waiting ||
              phase.kind === "done" ||
              !software.inStock ||
              locked ||
              !tier
            }
            onClick={() => void start()}
            className="press flex w-full h-14 items-center justify-center gap-2 rounded-[12px] bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50 text-[16px] font-semibold text-white"
          >
            {phase.kind === "busy" ? (
              <Loader2
                size={14}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <KeyRound size={16} aria-hidden />
            )}
            {phase.kind === "done"
              ? "Đã nhận key"
              : phase.kind === "link"
                ? "Đang chờ vượt link…"
                : "Lấy key miễn phí"}
          </button>
        ) : (
          <Link
            href={loginHref}
            className="press flex w-full h-14 items-center justify-center gap-2 rounded-[12px] bg-[var(--menzu-accent)] hover:bg-[var(--menzu-accent-dark)] text-[16px] font-semibold text-white"
          >
            <KeyRound size={16} aria-hidden />
            Đăng nhập để lấy key
          </Link>
        )}
        {downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex w-full h-14 items-center justify-center gap-2 rounded-[12px] border border-line-strong bg-raise hover:border-frost/40 text-[16px] font-semibold text-frost"
          >
            <Download size={16} aria-hidden />
            Tải tool
          </a>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-5">
        {TRUST.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.label} className="flex items-center gap-2.5">
              <Icon size={16} aria-hidden className="shrink-0 text-mist" />
              <span className="text-[13px] leading-tight text-mist">{t.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
