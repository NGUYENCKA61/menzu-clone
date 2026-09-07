import type { Metadata } from "next";
import { CartEmpty, CartView } from "@/components/sites/menzu-lol-f7ae197a/shared/CartView";
import { SimplePage } from "@/components/sites/menzu-lol-f7ae197a/shared/SimplePage";
import { clampAgencyPercent } from "@/lib/agency";
import { db } from "@/lib/db";
import { readMemberTier, TIER_RULES } from "@/lib/memberTiers";
import { productHref } from "@/lib/routes";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Giỏ Hàng",
  // Nothing here is worth indexing and it is per-visitor by nature.
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

/**
 * The basket.
 *
 * Software only. Accounts are one of a kind and are still paid for on their
 * own page — holding one here would either reserve it against every other
 * shopper or promise something that could be gone by checkout.
 */
export default async function CartPage() {
  const user = await getCurrentUser();

  // Signed out there is no basket to read, only the invitation to sign in.
  if (!user) {
    return (
      <SimplePage title="Giỏ Hàng Của Bạn" crumb="Giỏ hàng">
        <CartEmpty signedIn={false} />
      </SimplePage>
    );
  }

  // Signed in, the basket is always mounted, empty or not: it draws its own
  // empty state, and after a checkout it keeps the receipt on screen while the
  // refresh that follows finds nothing left in it.
  const items = await db.cartItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: {
          code: true,
          slug: true,
          name: true,
          imageUrl: true,
          category: { select: { slug: true } },
        },
      },
      package: { select: { label: true, price: true } },
    },
  });

  // What this shopper's own account is worth against the basket, decided the
  // way the checkout decides it: wholesale beats the tier and never stacks.
  const agencyPercent =
    user.role === "AGENCY" ? clampAgencyPercent(user.agencyPercent) : 0;
  const memberTier = readMemberTier(user.tier);
  const tierPercent =
    agencyPercent === 0 ? TIER_RULES[memberTier].discountPercent : 0;

  return (
    <SimplePage title="Giỏ Hàng Của Bạn" crumb="Giỏ hàng">
      <CartView
        viewer={{
          balance: user.balance,
          tier: tierPercent > 0 ? memberTier : null,
          tierLabel: TIER_RULES[memberTier].label,
          tierPercent,
          agencyPercent,
        }}
        lines={items.map((i) => ({
          id: i.id,
          code: i.product.code,
          href: productHref(i.product.category.slug, i.product.slug),
          name: i.product.name ?? i.product.code,
          packageLabel: i.package.label,
          unitPrice: Number(i.package.price),
          quantity: i.quantity,
          imageUrl: i.product.imageUrl,
        }))}
      />
    </SimplePage>
  );
}
