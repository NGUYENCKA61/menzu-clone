import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { KeyRound, PiggyBank, Wallet } from "lucide-react";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import {
  AgencyKeyDesk,
  type DeskProduct,
} from "@/components/sites/menzu-lol-f7ae197a/shared/AgencyKeyDesk";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { clampAgencyPercent } from "@/lib/agency";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Bàn đại lý" };
export const dynamic = "force-dynamic";

/**
 * The đại lý's own room, behind its own door: /agency stays the brochure for
 * everyone, this route opens only for the AGENCY role (admins included so
 * the shop owner can inspect it). The desk buys through the same /api/orders
 * as retail — the server applies this account's own negotiated percent by
 * role, so nothing here can quote a price the checkout would disagree with.
 */
export default async function AgencyDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fagency%2Fdashboard");
  if (user.role !== "AGENCY" && user.role !== "ADMIN") redirect("/agency");

  // This account's own negotiated rate — the only place it is ever shown.
  const percent = clampAgencyPercent(user.agencyPercent);

  const [products, orders, savedAgg] = await Promise.all([
    db.product.findMany({
      where: {
        productType: "SOFTWARE_GAME",
        deletedAt: null,
        status: "AVAILABLE",
      },
      orderBy: { createdAt: "asc" },
      select: {
        code: true,
        name: true,
        packages: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true, price: true },
        },
      },
    }),
    db.order.findMany({
      where: { userId: user.id, product: { productType: "SOFTWARE_GAME" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        code: true,
        quantity: true,
        total: true,
        createdAt: true,
        product: { select: { name: true, code: true } },
        package: { select: { label: true } },
      },
    }),
    // Everything the wholesale percent has saved this account so far:
    // listPrice holds retail, total holds what was actually paid.
    db.order.aggregate({
      where: {
        userId: user.id,
        discountPct: { gt: 0 },
        packageId: { not: null },
      },
      _sum: { listPrice: true, total: true, quantity: true },
    }),
  ]);

  const deskProducts: DeskProduct[] = products
    .filter((product) => product.packages.length > 0)
    .map((product) => ({
      code: product.code,
      name: product.name ?? product.code,
      packages: product.packages.map((pack) => ({
        id: pack.id,
        label: pack.label,
        price: Number(pack.price),
      })),
    }));

  const keysBought = Number(savedAgg._sum.quantity ?? 0);
  const saved = Number(
    (savedAgg._sum.listPrice ?? 0n) - (savedAgg._sum.total ?? 0n),
  );

  const stats = [
    {
      icon: Wallet,
      label: "Số dư khả dụng",
      value: formatVnd(user.balance),
      unit: "đ",
      tone: "text-emerald-400",
      box: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
      shell: "border-emerald-500/15 bg-emerald-500/[0.04]",
    },
    {
      icon: KeyRound,
      label: "Tổng key đã mua",
      value: String(keysBought),
      unit: "key",
      tone: "text-[#a78bfa]",
      box: "border-[var(--brand)]/25 bg-[var(--brand)]/15 text-[#a78bfa]",
      shell: "border-white/10 bg-neutral-900/50",
    },
    {
      icon: PiggyBank,
      label: "Tổng đã tiết kiệm",
      value: formatVnd(saved),
      unit: "đ",
      tone: "text-amber-400",
      box: "border-amber-500/25 bg-amber-500/10 text-amber-400",
      shell: "border-amber-500/15 bg-amber-500/[0.04]",
    },
  ] as const;

  return (
    <AccountPageFrame
      title="Bàn đại lý"
      subtitle={
        percent > 0
          ? `Mức chiết khấu riêng của bạn: ${percent}% — thanh toán bằng số dư ví`
          : "Thanh toán bằng số dư ví"
      }
      crumb="Bàn đại lý"
      action={
        <a
          href="/wallet"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-[11px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--brand-dark)]"
        >
          <Wallet size={14} />
          Nạp tiền
        </a>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ icon: Icon, label, value, unit, tone, box, shell }) => (
            <div
              key={label}
              className={`flex items-center gap-4 rounded-2xl border p-5 ${shell}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${box}`}
              >
                <Icon size={18} />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">
                  {label}
                </span>
                <span className={`text-2xl font-black leading-none ${tone}`}>
                  {value}{" "}
                  <span className="text-sm font-bold opacity-80">{unit}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Mua key giá đại lý
            </h3>
            <span className="text-xs text-neutral-500">
              Admin giao key sau khi đơn được tạo
            </span>
          </div>
          {percent === 0 ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-neutral-300">
              <span className="font-black uppercase tracking-wider text-amber-400">
                Lưu ý:
              </span>{" "}
              Tài khoản chưa được gán mức chiết khấu — mua lúc này là giá niêm
              yết. Liên hệ admin để chốt mức riêng của bạn.
            </p>
          ) : null}
          <AgencyKeyDesk products={deskProducts} discountPercent={percent} />
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Đơn key gần đây
            </h3>
            <span className="text-xs text-neutral-500">
              Xem đầy đủ trong Lịch sử mua
            </span>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-10 text-center text-sm text-neutral-400">
              Chưa có đơn key nào.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {orders.map((order) => (
                <div
                  key={order.code}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <span className="font-mono text-xs font-bold text-white">
                    {order.code}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {order.product.name ?? order.product.code}
                    {order.package ? ` — ${order.package.label}` : ""}
                    {order.quantity > 1 ? ` ×${order.quantity}` : ""}
                  </span>
                  <span className="ml-auto text-sm font-black tabular-nums text-emerald-400">
                    {formatVnd(Number(order.total))}đ
                  </span>
                  <span className="w-full text-[11px] text-neutral-500 sm:w-auto">
                    {order.createdAt.toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AccountPageFrame>
  );
}
