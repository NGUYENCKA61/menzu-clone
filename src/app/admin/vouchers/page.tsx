import { redirect } from "next/navigation";

/**
 * Vouchers moved into the marketing screen, next to the flash sales they get
 * planned with. The route stays so a bookmark from when this was its own page
 * still lands somewhere useful.
 */
export default function AdminVouchersPage() {
  redirect("/admin/marketing");
}
