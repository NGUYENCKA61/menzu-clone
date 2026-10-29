import "server-only";

import { CRM_KEYS, getSettingValue } from "@/lib/crmSettings";

/**
 * The Messenger lane, through ManyChat — the Meta-approved platform the
 * owner picked for the no-papers route (plan of 28/10). ManyChat holds the
 * page connection and the review; this code only speaks to ManyChat's own
 * API: their External Request posts a customer's message into
 * /api/integrations/manychat, and the desk's answer goes back with the
 * subscriber id through sendContent. No key, no sends.
 *
 * Replies ride as RESPONSE within Messenger's 24-hour window — the desk
 * answers people who just wrote in, which is exactly that window. Outside
 * it ManyChat refuses, the error lands in the desk's reply box, and the
 * customer is reached some other way. No tag games.
 */

const API = "https://api.manychat.com";

/** The guestKey prefix naming a thread's ManyChat subscriber. */
export const MANYCHAT_GUEST_PREFIX = "mc_";

export async function manychatConfigured(): Promise<boolean> {
  return Boolean((await getSettingValue(CRM_KEYS.manychatApiKey)).trim());
}

export type ManychatSendResult = { ok: true } | { ok: false; error: string };

export async function manychatSendText(
  subscriberId: string,
  text: string,
): Promise<ManychatSendResult> {
  const key = (await getSettingValue(CRM_KEYS.manychatApiKey)).trim();
  if (!key) return { ok: false, error: "Chưa có API key ManyChat (CRM > Kết nối)." };

  try {
    const response = await fetch(`${API}/fb/sending/sendContent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        data: {
          version: "v2",
          content: { messages: [{ type: "text", text: text.slice(0, 1990) }] },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await response.json().catch(() => null)) as
      | { status?: string; message?: string }
      | null;
    if (!response.ok || data?.status !== "success") {
      return { ok: false, error: data?.message ?? `ManyChat trả lỗi ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Không gọi được ManyChat",
    };
  }
}
