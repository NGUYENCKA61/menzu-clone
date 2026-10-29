import "server-only";

import { db } from "@/lib/db";

/**
 * The CRM's own settings rows, read and written raw. The typed ShopSettings
 * pipeline is for the shop's screens; these keys belong to the CRM desk
 * alone, so they stay self-contained and adding one is a line here, not a
 * tour of settings.ts. Same table, same storage rules as every other
 * integration key.
 */

export const CRM_KEYS = {
  quickReplies: "crm.quickReplies",
  /** The shop's voice: read into EVERY bot answer, not retrieved by match. */
  assistantVoice: "crm.assistantVoice",
  facebookPageId: "integrations.facebook.pageId",
  facebookPageToken: "integrations.facebook.pageToken",
  manychatApiKey: "integrations.manychat.apiKey",
  manychatSecret: "integrations.manychat.secret",
} as const;

export async function getSettingValue(key: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key }, select: { value: true } });
  return row?.value ?? "";
}

export async function setSettingValue(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export interface QuickReply {
  label: string;
  body: string;
}

/** The desk's canned answers; a malformed row is dropped, never thrown on. */
export async function getQuickReplies(): Promise<QuickReply[]> {
  const raw = await getSettingValue(CRM_KEYS.quickReplies);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is QuickReply =>
          !!item &&
          typeof item === "object" &&
          typeof (item as QuickReply).label === "string" &&
          typeof (item as QuickReply).body === "string",
      )
      .map((item) => ({ label: item.label.slice(0, 40), body: item.body.slice(0, 1000) }))
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function saveQuickReplies(list: QuickReply[]): Promise<void> {
  const clean = list
    .map((item) => ({ label: item.label.trim().slice(0, 40), body: item.body.trim().slice(0, 1000) }))
    .filter((item) => item.label && item.body)
    .slice(0, 20);
  await setSettingValue(CRM_KEYS.quickReplies, JSON.stringify(clean));
}
