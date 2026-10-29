import "server-only";

import { CRM_KEYS, getSettingValue } from "@/lib/crmSettings";

/**
 * Posting to the shop's OWN fanpage through Meta's official Graph API —
 * the one Facebook door this codebase will ever use. The page id and a page
 * access token are pasted by the owner in CRM > Kết nối; until both exist
 * every caller gets a plain "chưa kết nối" and nothing is attempted. No
 * browser automation, no personal-account anything: a token Meta issued,
 * an endpoint Meta documents, and whatever policy outcome that has is
 * visible in the error this returns.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export interface FacebookPageConfig {
  pageId: string;
  token: string;
}

export async function readFacebookPage(): Promise<FacebookPageConfig | null> {
  const [pageId, token] = await Promise.all([
    getSettingValue(CRM_KEYS.facebookPageId),
    getSettingValue(CRM_KEYS.facebookPageToken),
  ]);
  if (!pageId.trim() || !token.trim()) return null;
  return { pageId: pageId.trim(), token: token.trim() };
}

export type FacebookPostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

/** One text post (optionally carrying a link) on the configured page. */
export async function postToFacebookPage(input: {
  message: string;
  link?: string;
}): Promise<FacebookPostResult> {
  const config = await readFacebookPage();
  if (!config) return { ok: false, error: "Chưa kết nối Facebook Page (CRM > Kết nối)." };

  const body = new URLSearchParams({ message: input.message, access_token: config.token });
  if (input.link) body.set("link", input.link);

  try {
    const response = await fetch(`${GRAPH}/${encodeURIComponent(config.pageId)}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await response.json().catch(() => null)) as
      | { id?: string; error?: { message?: string } }
      | null;
    if (!response.ok || !data?.id) {
      return {
        ok: false,
        error: data?.error?.message ?? `Facebook trả lỗi ${response.status}`,
      };
    }
    return { ok: true, postId: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không gọi được Facebook",
    };
  }
}
