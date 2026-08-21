import { permanentRedirect } from "next/navigation";

/**
 * The sign-up route is /signup, matching the live site — its login page links
 * "Tạo mới ngay" there, and /register 404s on the original.
 *
 * This clone shipped /register first, so the old path stays as a permanent
 * redirect rather than a 404: any bookmark or link already pointing here keeps
 * working, and crawlers move their index entry across on their own.
 *
 * ?ref= rides across the redirect — the referral links the CTV page hands out
 * read /register?ref=…, and a redirect that dropped the query would silently
 * cost the referrer their commission.
 */
export default async function RegisterRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  permanentRedirect(ref ? `/signup?ref=${encodeURIComponent(ref)}` : "/signup");
}
