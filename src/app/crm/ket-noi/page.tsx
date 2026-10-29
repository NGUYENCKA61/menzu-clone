import type { Metadata } from "next";

import {
  CrmConnections,
  type ConnectionsState,
} from "@/components/sites/menzu-lol-f7ae197a/crm/CrmConnections";
import { ASSISTANT_MODEL } from "@/lib/assistant";
import { CRM_KEYS, getSettingValue } from "@/lib/crmSettings";
import { readFacebookPage } from "@/lib/facebookPage";
import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Kết nối" };
export const dynamic = "force-dynamic";

export default async function CrmConnectionsPage() {
  const [settings, facebook, manychatKey, manychatSecret] = await Promise.all([
    getShopSettings(),
    readFacebookPage(),
    getSettingValue(CRM_KEYS.manychatApiKey),
    getSettingValue(CRM_KEYS.manychatSecret),
  ]);

  const initial: ConnectionsState = {
    telegram: {
      ready: Boolean(settings.telegramBotToken.trim() && settings.telegramChatId.trim()),
    },
    zalo: {
      groupsConfigured: settings.zaloGroupIds.length,
      groupPostOn: settings.zaloGroupPost,
    },
    facebook: { pageId: facebook?.pageId ?? "", tokenSet: Boolean(facebook) },
    manychat: {
      keySet: Boolean(manychatKey.trim()),
      secretSet: Boolean(manychatSecret.trim()),
      webhookUrl: absoluteUrl("/api/integrations/manychat"),
    },
    assistant: {
      provider: settings.assistantProvider,
      model:
        settings.assistantProvider === "compatible"
          ? settings.assistantModel.trim() || "(chưa đặt)"
          : ASSISTANT_MODEL,
      claudeKeySet: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    },
  };

  return <CrmConnections initial={initial} />;
}
