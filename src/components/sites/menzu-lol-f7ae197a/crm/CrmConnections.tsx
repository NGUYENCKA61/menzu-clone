"use client";

import { Bot, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Kết nối: every lane in and out of the CRM on one screen, each through its
 * official door, each honest about its state. Keys are written here and
 * never read back — a saved field shows "đã đặt", and an empty input on
 * save means "giữ nguyên".
 */

export interface ConnectionsState {
  telegram: { ready: boolean };
  zalo: { groupsConfigured: number; groupPostOn: boolean };
  facebook: { pageId: string; tokenSet: boolean };
  manychat: { keySet: boolean; secretSet: boolean; webhookUrl: string };
  assistant: { provider: string; model: string; claudeKeySet: boolean };
}

function Pill({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        on
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-500"
      }`}
    >
      {on ? onText : offText}
    </span>
  );
}

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function CrmConnections({ initial }: { initial: ConnectionsState }) {
  const [state, setState] = useState(initial);
  const [fbPageId, setFbPageId] = useState(initial.facebook.pageId);
  const [fbToken, setFbToken] = useState("");
  const [mcKey, setMcKey] = useState("");
  const [mcSecret, setMcSecret] = useState("");
  const [saving, setSaving] = useState<"facebook" | "manychat" | null>(null);
  const [saved, setSaved] = useState<"facebook" | "manychat" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(which: "facebook" | "manychat") {
    setSaving(which);
    setSaved(null);
    setError(null);
    const payload =
      which === "facebook"
        ? { action: "integrations", which, pageId: fbPageId, token: fbToken }
        : { action: "integrations", which, key: mcKey, secret: mcSecret };
    const response = await fetch("/api/admin/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setSaving(null);
    if (!response.ok) {
      setError(data?.error ?? "Chưa lưu được.");
      return;
    }
    setSaved(which);
    if (which === "facebook") {
      setState({
        ...state,
        facebook: {
          pageId: fbPageId,
          tokenSet: state.facebook.tokenSet || fbToken.trim().length > 0,
        },
      });
      setFbToken("");
    } else {
      setState({
        ...state,
        manychat: {
          ...state.manychat,
          keySet: state.manychat.keySet || mcKey.trim().length > 0,
          secretSet: state.manychat.secretSet || mcSecret.trim().length > 0,
        },
      });
      setMcKey("");
      setMcSecret("");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 px-4 py-5 lg:px-8">
        <div>
          <h1 className="text-[19px] font-bold">Kết nối</h1>
          <p className="text-[12.5px] text-zinc-500">
            Các đường vào và ra của CRM. Khóa lưu trên máy chủ, không hiện lại ở
            đây; ô bỏ trống khi lưu nghĩa là giữ nguyên.
          </p>
        </div>
        {error ? (
          <p className="rounded-xl border border-zinc-300 bg-zinc-100 px-3.5 py-2.5 text-[12.5px] text-zinc-900">
            {error}
          </p>
        ) : null}

        {/* ----- the brain ----- */}
        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Bot size={16} className="text-red-600" />
            <h2 className="text-[14px] font-bold">Trợ lý AI (bộ não bot chat)</h2>
            <Pill
              on={state.assistant.provider === "claude" ? state.assistant.claudeKeySet : true}
              onText="Sẵn sàng"
              offText="Chưa có khóa"
            />
          </div>
          <p className="text-[12.5px] leading-relaxed text-zinc-600">
            Đang chạy: <b>{state.assistant.provider === "claude" ? "Claude" : "Dịch vụ ngoài"}</b>,
            model <b>{state.assistant.model}</b>.
            {state.assistant.provider === "claude" && !state.assistant.claudeKeySet
              ? " Chưa có ANTHROPIC_API_KEY trong .env máy chủ, bot chat đang tắt."
              : null}
          </p>
          <p className="text-[12px] text-zinc-500">
            Đổi nhà cung cấp hoặc dán khóa dịch vụ miễn phí trong{" "}
            <Link href="/admin/settings" className="font-semibold text-zinc-900 hover:underline">
              Admin, Cấu hình
            </Link>
            ; khóa Claude đặt trong .env lúc deploy. Bot học thêm từ{" "}
            <Link href="/crm/so-tay" className="font-semibold text-zinc-900 hover:underline">
              Sổ tay bot
            </Link>
            .
          </p>
        </section>

        {/* ----- telegram ----- */}
        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold">Telegram</h2>
            <Pill on={state.telegram.ready} onText="Đang hoạt động" offText="Chưa cấu hình" />
          </div>
          <p className="text-[12.5px] leading-relaxed text-zinc-600">
            Báo ca cần xử lý về Telegram admin, đăng bài lên kênh, bot shop cho
            khách. Token và kênh chỉnh trong{" "}
            <Link href="/admin/settings" className="font-semibold text-zinc-900 hover:underline">
              Admin, Cấu hình
            </Link>
            .
          </p>
        </section>

        {/* ----- zalo ----- */}
        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold">Zalo</h2>
            <Pill
              on={state.zalo.groupsConfigured > 0}
              onText={`${state.zalo.groupsConfigured} nhóm đã cấu hình`}
              offText="Chưa cấu hình nhóm"
            />
          </div>
          <p className="text-[12.5px] leading-relaxed text-zinc-600">
            Đăng bài vào nhóm Zalo và nhắn khách đã liên kết, qua bot Zalo chạy
            cạnh web. Bot đang tắt trên web thật: tin đăng sẽ nằm hàng chờ tới khi
            bật bot (build vài phút, quét QR trong Admin, Cấu hình).
          </p>
        </section>

        {/* ----- facebook page ----- */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold">Facebook Page (đăng bài)</h2>
            <Pill on={state.facebook.tokenSet} onText="Đã kết nối" offText="Chưa kết nối" />
          </div>
          <p className="text-[12.5px] leading-relaxed text-zinc-600">
            Đăng bài lên fanpage qua Graph API chính thức của Meta. Cần Page ID và
            Page Access Token từ tài khoản Facebook Developer của bạn; dán vào đây
            là mục Đăng bài có thêm ô Facebook.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={fbPageId}
              onChange={(event) => setFbPageId(event.target.value)}
              placeholder="Page ID"
              className="h-9 w-full rounded-lg border border-zinc-300 px-3 text-[13px] outline-none focus:border-zinc-500 sm:w-[200px]"
            />
            <input
              value={fbToken}
              onChange={(event) => setFbToken(event.target.value)}
              type="password"
              placeholder={state.facebook.tokenSet ? "Token: đã đặt, nhập để thay" : "Page Access Token"}
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-[13px] outline-none placeholder:text-zinc-400 focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={() => void save("facebook")}
              disabled={saving === "facebook"}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[12.5px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving === "facebook" ? <Loader2 size={13} className="animate-spin" /> : null}
              Lưu
              {saved === "facebook" ? <Check size={13} className="text-emerald-400" /> : null}
            </button>
          </div>
        </section>

        {/* ----- manychat ----- */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold">ManyChat (tin nhắn Messenger)</h2>
            <Pill
              on={state.manychat.keySet && state.manychat.secretSet}
              onText="Đã kết nối"
              offText="Chưa kết nối"
            />
          </div>
          <p className="text-[12.5px] leading-relaxed text-zinc-600">
            ManyChat giữ kết nối fanpage (không cần giấy tờ); tin khách nhắn đổ về
            Hộp thư này và bạn trả lời ngay tại đây. Trong ManyChat tạo bước
            External Request gọi địa chỉ dưới, kèm header{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11.5px]">x-crm-secret</code> và
            JSON <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11.5px]">
              {"{subscriber_id, name, text}"}
            </code>
            .
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-zinc-100 px-3 py-2 text-[12px]">
              {state.manychat.webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(state.manychat.webhookUrl).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-100"
              aria-label="Chép địa chỉ webhook"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={mcKey}
              onChange={(event) => setMcKey(event.target.value)}
              type="password"
              placeholder={state.manychat.keySet ? "API key: đã đặt, nhập để thay" : "ManyChat API key"}
              className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-[13px] outline-none placeholder:text-zinc-400 focus:border-zinc-500"
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input
                value={mcSecret}
                onChange={(event) => setMcSecret(event.target.value)}
                placeholder={
                  state.manychat.secretSet ? "Secret: đã đặt, nhập để thay" : "Mã bí mật webhook (32+ ký tự)"
                }
                className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-[13px] outline-none placeholder:text-zinc-400 focus:border-zinc-500"
              />
              <button
                type="button"
                onClick={() => setMcSecret(randomSecret())}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-100"
                aria-label="Tự sinh mã bí mật"
                title="Tự sinh mã bí mật"
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void save("manychat")}
              disabled={saving === "manychat"}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-[12.5px] font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving === "manychat" ? <Loader2 size={13} className="animate-spin" /> : null}
              Lưu
              {saved === "manychat" ? <Check size={13} className="text-emerald-400" /> : null}
            </button>
          </div>
        </section>

        {/* ----- youtube ----- */}
        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold">YouTube</h2>
            <Pill on={false} onText="" offText="Không hỗ trợ đăng tự động" />
          </div>
          <p className="text-[12.5px] leading-relaxed text-zinc-600">
            YouTube không mở API cho bài đăng cộng đồng, còn video thì phải upload
            thủ công (tự động hoá upload cần duyệt ứng dụng OAuth riêng). Khi nào
            cần, AI ở mục Đăng bài vẫn soạn sẵn mô tả video cho bạn dán tay.
          </p>
        </section>
      </div>
    </div>
  );
}
