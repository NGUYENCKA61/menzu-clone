"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  SquareCode,
  Strikethrough,
  TextQuote,
  UnderlineIcon,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";

/** The palette the color buttons write — hex twins of the site's accents. */
const PALETTE: { name: string; hex: string; dot: string }[] = [
  { name: "đỏ", hex: "#fb7185", dot: "bg-rose-400" },
  { name: "vàng", hex: "#fbbf24", dot: "bg-amber-400" },
  { name: "xanh", hex: "#34d399", dot: "bg-emerald-400" },
  { name: "tím", hex: "#a78bfa", dot: "bg-violet-400" },
];

/** The image node, taught to carry a width — written as an inline style the
 *  sanitizer's `width: N%` allowance lets through. */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // The sizing attributes each emit `style`; tiptap's mergeAttributes
      // concatenates them, so an image can carry all of these at once.
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.width || null,
        renderHTML: (attributes: { width?: string | null }) =>
          attributes.width ? { style: `width: ${attributes.width}` } : {},
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.height || null,
        renderHTML: (attributes: { height?: string | null }) =>
          attributes.height ? { style: `height: ${attributes.height}` } : {},
      },
      // null = centered, the stylesheet default. Left and right override the
      // auto margins inline.
      align: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const left = element.style.marginLeft;
          const right = element.style.marginRight;
          if (left === "0px" && right === "auto") return "left";
          if (left === "auto" && right === "0px") return "right";
          return null;
        },
        renderHTML: (attributes: { align?: string | null }) =>
          attributes.align === "left"
            ? { style: "margin-left: 0; margin-right: auto" }
            : attributes.align === "right"
              ? { style: "margin-left: auto; margin-right: 0" }
              : {},
      },
      // Lives in the <figcaption>, never on the img tag itself.
      caption: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
      /** Whether the caption leans — italic by tradition, upright on demand. */
      captionItalic: {
        default: true,
        parseHTML: () => true,
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const img = element.querySelector("img");
          if (!img?.getAttribute("src")) return false;
          const left = img.style.marginLeft;
          const right = img.style.marginRight;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.style.width || null,
            height: img.style.height || null,
            align:
              left === "0px" && right === "auto"
                ? "left"
                : left === "auto" && right === "0px"
                  ? "right"
                  : null,
            caption: element.querySelector("figcaption")?.textContent?.trim() || null,
            captionItalic:
              element.querySelector("figcaption")?.style.fontStyle !== "normal",
          };
        },
      },
      { tag: "img[src]" },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const caption = (node.attrs.caption as string | null) ?? null;
    if (!caption) return ["img", HTMLAttributes];
    return [
      "figure",
      {},
      ["img", HTMLAttributes],
      [
        "figcaption",
        { style: `font-style: ${node.attrs.captionItalic === false ? "normal" : "italic"}` },
        caption,
      ],
    ];
  },
});

/** Quick stops for the image width, alongside the free-typed box. */
const IMAGE_SIZES = ["25%", "50%", "75%", "100%"];

const PANEL_LABEL = "text-[9px] font-black uppercase tracking-widest text-neutral-500";
const PANEL_INPUT =
  "h-7 rounded-md border border-white/10 bg-neutral-950/60 px-1.5 text-[11px] font-bold tabular-nums text-white outline-none focus:border-[var(--brand)]/60 placeholder-neutral-600";

/**
 * Everything about the selected image, in one visible panel.
 *
 * The size boxes hold a draft while you type and only commit on Enter or
 * blur — clamping every keystroke made "30" impossible to type (the "3" was
 * seized and rounded before the "0" arrived).
 */
function ImagePanel({ editor }: { editor: Editor }) {
  // Remount per selected node, so drafts reset when another image is picked.
  return <ImagePanelInner key={editor.state.selection.from} editor={editor} />;
}

function ImagePanelInner({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes("image");
  const width = (attrs.width as string | null) ?? null;
  const height = (attrs.height as string | null) ?? null;
  const align = (attrs.align as string | null) ?? null;
  const caption = (attrs.caption as string | null) ?? "";
  const captionItalic = (attrs.captionItalic as boolean) !== false;

  const [wDraft, setWDraft] = useState((width ?? "100%").replace("%", ""));
  const [hDraft, setHDraft] = useState((height ?? "").replace("px", ""));

  // Presets and align write width from outside the drafts — follow them, via
  // the adjust-during-render pattern rather than an effect.
  const [seen, setSeen] = useState({ width, height });
  if (seen.width !== width || seen.height !== height) {
    setSeen({ width, height });
    if (seen.width !== width) setWDraft((width ?? "100%").replace("%", ""));
    if (seen.height !== height) setHDraft((height ?? "").replace("px", ""));
  }

  function commitWidth() {
    const n = Number(wDraft.replace(/\D/g, ""));
    const value = !n || n >= 100 ? null : `${Math.max(10, Math.min(100, n))}%`;
    editor.chain().updateAttributes("image", { width: value }).run();
  }

  function commitHeight() {
    const n = Number(hDraft.replace(/\D/g, ""));
    const value = n >= 24 && n <= 1200 ? `${n}px` : null;
    editor.chain().updateAttributes("image", { height: value }).run();
  }

  const onEnter =
    (commit: () => void) => (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      }
    };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] px-3 py-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-[#a78bfa]">
        Ảnh đang chọn
      </span>
      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />

      <span className={PANEL_LABEL}>Rộng</span>
      <input
        aria-label="Chiều rộng ảnh (phần trăm, Enter để áp dụng)"
        value={wDraft}
        onChange={(event) => setWDraft(event.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={commitWidth}
        onKeyDown={onEnter(commitWidth)}
        className={`${PANEL_INPUT} w-12 text-center`}
      />
      <span className="text-[10px] font-bold text-neutral-500">%</span>
      {IMAGE_SIZES.map((size) => {
        const on = (width ?? "100%") === size;
        return (
          <button
            key={size}
            type="button"
            title={`Ảnh rộng ${size}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              editor
                .chain()
                .focus()
                .updateAttributes("image", { width: size === "100%" ? null : size })
                .run()
            }
            className={`h-7 rounded-md px-1.5 text-[10px] font-black tabular-nums transition-colors ${
              on
                ? "bg-[var(--brand)]/25 text-white"
                : "text-neutral-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {size}
          </button>
        );
      })}

      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
      <span className={PANEL_LABEL}>Cao</span>
      <input
        aria-label="Chiều cao ảnh (px, để trống là tự động, Enter để áp dụng)"
        placeholder="auto"
        value={hDraft}
        onChange={(event) => setHDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={commitHeight}
        onKeyDown={onEnter(commitHeight)}
        className={`${PANEL_INPUT} w-14 text-center`}
      />
      <span className="text-[10px] font-bold text-neutral-500">px</span>

      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
      <span className={PANEL_LABEL}>Căn</span>
      {(
        [
          ["left", AlignLeft, "Ảnh căn trái"],
          [null, AlignCenter, "Ảnh căn giữa"],
          ["right", AlignRight, "Ảnh căn phải"],
        ] as const
      ).map(([value, AlignIcon, label]) => {
        const on = align === value;
        return (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              editor
                .chain()
                .focus()
                .updateAttributes("image", {
                  align: value,
                  // A full-width image cannot visibly lean — picking a side
                  // shrinks it to half so the choice shows immediately.
                  ...(value && !width ? { width: "50%" } : {}),
                })
                .run()
            }
            className={`h-7 w-7 rounded-md transition-colors inline-flex items-center justify-center ${
              on
                ? "bg-[var(--brand)]/25 text-white"
                : "text-neutral-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <AlignIcon size={13} />
          </button>
        );
      })}

      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
      <span className={PANEL_LABEL}>Chú thích</span>
      <input
        aria-label="Chú thích hiện dưới ảnh"
        placeholder="chú thích dưới ảnh..."
        value={caption}
        onChange={(event) =>
          editor
            .chain()
            .updateAttributes("image", { caption: event.target.value || null })
            .run()
        }
        className={`${PANEL_INPUT} w-44 font-normal`}
      />
      <button
        type="button"
        title={
          captionItalic
            ? "Chú thích đang nghiêng — bấm để dựng thẳng"
            : "Chú thích đang thẳng — bấm để in nghiêng"
        }
        aria-label="Đổi kiểu chữ chú thích nghiêng / thẳng"
        aria-pressed={captionItalic}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          editor
            .chain()
            .updateAttributes("image", { captionItalic: !captionItalic })
            .run()
        }
        className={`h-7 w-7 rounded-md transition-colors inline-flex items-center justify-center italic text-[12px] font-black ${
          captionItalic
            ? "bg-[var(--brand)]/25 text-white"
            : "text-neutral-400 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        I
      </button>

      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
      <span className={PANEL_LABEL}>Alt</span>
      <input
        aria-label="Mô tả ảnh (alt text cho SEO)"
        placeholder="mô tả ảnh..."
        value={(attrs.alt as string | null) ?? ""}
        onChange={(event) =>
          editor.chain().updateAttributes("image", { alt: event.target.value }).run()
        }
        className={`${PANEL_INPUT} w-36 font-normal`}
      />
    </div>
  );
}

/** One key on the formatting bar; lit while its mark is active at the caret. */
function ToolButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Mouse-down would steal the editor's selection before click runs.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`h-8 w-8 rounded-lg border transition-colors inline-flex items-center justify-center disabled:opacity-40 ${
        active
          ? "border-[var(--brand)]/50 bg-[var(--brand)]/15 text-white"
          : "border-white/[0.07] bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

/**
 * The shared TipTap desk: toolbar, link row, image panel and the editing
 * frame, styled by the same .doc-prose rules the public pages use — the
 * editor is its own preview.
 *
 * It owns everything about EDITING and nothing about SAVING: the parent gets
 * every change through `onUpdate` ("" when the document is empty) and brings
 * its own save button, dirty tracking and API call. Documents leave here as
 * HTML; the receiving API strips them to the sanctioned tags before storing,
 * and the public renderer strips again before showing.
 */
export function RichTextEditor({
  initialHtml,
  onUpdate,
  uploadEndpoint = "/api/admin/docs/image",
}: {
  initialHtml: string;
  onUpdate: (html: string) => void;
  /** Where inserted pictures upload to; defaults to the docs image desk. */
  uploadEndpoint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        horizontalRule: false,
        link: { openOnClick: false },
      }),
      TextStyle,
      FontSize,
      Color,
      SizedImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialHtml,
    // Rendered after mount: the page is server-rendered and ProseMirror's DOM
    // cannot be reproduced on the server without hydration mismatches.
    immediatelyRender: false,
    // The toolbar lights its buttons from editor state on every keystroke and
    // selection move — v3 stops re-rendering per transaction unless told to.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: "doc-prose focus:outline-none" },
    },
    onUpdate: ({ editor: e }) => {
      onUpdate(e.isEmpty ? "" : e.getHTML());
    },
  });

  /** Opens the link row, prefilled when the caret already sits on a link. */
  function openLink() {
    if (!editor) return;
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkOpen(true);
  }

  /** Normalizes and applies the typed URL to the selection. */
  function applyLink() {
    if (!editor) return;
    const raw = linkUrl.trim();
    if (!raw) {
      editor.chain().focus().unsetLink().run();
      setLinkOpen(false);
      return;
    }
    // Bare domains get https; anything the sanitizer would refuse is refused
    // here first so the admin sees it happen.
    const href = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : `https://${raw}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  /** Uploads one illustration and drops it at the caret. */
  async function insertImage(file: File) {
    if (!editor) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(uploadEndpoint, { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !data.url) {
        setUploadError(data.error ?? "Tải ảnh thất bại");
        return;
      }
      editor.chain().focus().setImage({ src: data.url, alt: "minh họa" }).run();
    } catch {
      setUploadError("Không kết nối được máy chủ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <ToolButton
          label="In đậm (Ctrl+B)"
          icon={Bold}
          active={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolButton
          label="In nghiêng (Ctrl+I)"
          icon={Italic}
          active={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolButton
          label="Gạch chân (Ctrl+U)"
          icon={UnderlineIcon}
          active={editor?.isActive("underline") ?? false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
        <ToolButton
          label="Gạch ngang"
          icon={Strikethrough}
          active={editor?.isActive("strike") ?? false}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />
        {/* Block format: what this paragraph IS. H1 stays absent on purpose —
            the hosting page already renders its own H1. */}
        <select
          aria-label="Định dạng khối"
          title="Định dạng khối"
          value={
            editor?.isActive("heading", { level: 2 })
              ? "h2"
              : editor?.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          onChange={(event) => {
            const chain = editor?.chain().focus();
            if (!chain) return;
            if (event.target.value === "h2") chain.setHeading({ level: 2 }).run();
            else if (event.target.value === "h3") chain.setHeading({ level: 3 }).run();
            else chain.setParagraph().run();
          }}
          className="h-8 rounded-lg border border-white/[0.07] bg-[#16161a] px-2 text-[11px] font-bold text-neutral-300 outline-none focus:border-[var(--brand)]/60 transition-colors"
        >
          <option value="p">Đoạn văn</option>
          <option value="h2">H2 — Tiêu đề lớn</option>
          <option value="h3">H3 — Tiêu đề nhỏ</option>
        </select>
        {/* Font size rides the same textStyle mark the colors use. */}
        <select
          aria-label="Cỡ chữ"
          title="Cỡ chữ"
          value={
            ((editor?.getAttributes("textStyle").fontSize as string | undefined) ?? "")
              .replace("px", "")
          }
          onChange={(event) => {
            const chain = editor?.chain().focus();
            if (!chain) return;
            if (event.target.value) chain.setFontSize(`${event.target.value}px`).run();
            else chain.unsetFontSize().run();
          }}
          className="h-8 rounded-lg border border-white/[0.07] bg-[#16161a] px-2 text-[11px] font-bold text-neutral-300 outline-none focus:border-[var(--brand)]/60 transition-colors"
        >
          <option value="">Cỡ chữ</option>
          {["12", "14", "16", "18", "20", "24", "28"].map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
        <ToolButton
          label="Danh sách gạch đầu dòng"
          icon={List}
          active={editor?.isActive("bulletList") ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          label="Danh sách đánh số"
          icon={ListOrdered}
          active={editor?.isActive("orderedList") ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolButton
          label="Trích dẫn / ghi chú"
          icon={TextQuote}
          active={editor?.isActive("blockquote") ?? false}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <ToolButton
          label="Code trong dòng"
          icon={Code}
          active={editor?.isActive("code") ?? false}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        />
        <ToolButton
          label="Khối code"
          icon={SquareCode}
          active={editor?.isActive("codeBlock") ?? false}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />
        <ToolButton
          label="Chèn / sửa liên kết"
          icon={LinkIcon}
          active={(editor?.isActive("link") ?? false) || linkOpen}
          onClick={openLink}
        />
        <ToolButton
          label="Gỡ liên kết"
          icon={Unlink}
          disabled={!(editor?.isActive("link") ?? false)}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />
        <ToolButton
          label="Căn trái"
          icon={AlignLeft}
          active={editor?.isActive({ textAlign: "left" }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        />
        <ToolButton
          label="Căn giữa"
          icon={AlignCenter}
          active={editor?.isActive({ textAlign: "center" }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        />
        <ToolButton
          label="Căn phải"
          icon={AlignRight}
          active={editor?.isActive({ textAlign: "right" }) ?? false}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />
        {PALETTE.map(({ name, hex, dot }) => (
          <button
            key={name}
            type="button"
            title={`Tô màu ${name}`}
            aria-label={`Tô màu ${name}`}
            aria-pressed={editor?.isActive("textStyle", { color: hex }) ?? false}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor?.chain().focus().setColor(hex).run()}
            className={`h-8 w-8 rounded-lg border transition-colors inline-flex items-center justify-center ${
              (editor?.isActive("textStyle", { color: hex }) ?? false)
                ? "border-[var(--brand)]/50 bg-[var(--brand)]/15"
                : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.08]"
            }`}
          >
            <span className={`h-3.5 w-3.5 rounded-full ${dot}`} />
          </button>
        ))}
        <ToolButton
          label="Xóa màu"
          icon={Eraser}
          onClick={() => editor?.chain().focus().unsetColor().run()}
        />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />
        <button
          type="button"
          title="Chèn ảnh minh họa (max 5MB)"
          aria-label="Chèn ảnh minh họa"
          disabled={uploading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => imageRef.current?.click()}
          className="h-8 px-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
        >
          <ImagePlus size={14} />
          {uploading ? "Đang tải..." : "Ảnh"}
        </button>
        <input
          ref={imageRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void insertImage(file);
          }}
        />
        <span aria-hidden className="mx-0.5 h-5 w-px bg-white/[0.08]" />
        <ToolButton
          label="Hoàn tác (Ctrl+Z)"
          icon={Undo2}
          disabled={!(editor?.can().undo() ?? false)}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolButton
          label="Làm lại (Ctrl+Y)"
          icon={Redo2}
          disabled={!(editor?.can().redo() ?? false)}
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>

      {linkOpen ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <LinkIcon size={13} className="shrink-0 text-neutral-500" />
          <input
            autoFocus
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://... (để trống rồi Gắn = gỡ link)"
            className="h-8 flex-1 min-w-[220px] rounded-md border border-white/10 bg-neutral-950/60 px-2.5 text-xs text-white outline-none focus:border-[var(--brand)]/60 placeholder-neutral-600"
          />
          <button
            type="button"
            onClick={applyLink}
            className="h-8 px-3.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-[10px] font-black uppercase tracking-widest text-white transition-colors"
          >
            Gắn link
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      ) : null}

      {editor?.isActive("image") ? <ImagePanel editor={editor} /> : null}

      {uploadError ? (
        <p className="mb-2 text-[11px] font-bold text-red-400">{uploadError}</p>
      ) : null}

      <div
        className="rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 transition-colors focus-within:border-[var(--brand)]/60 cursor-text"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
