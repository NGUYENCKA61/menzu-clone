"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  EditorContent,
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
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
  MoveHorizontal,
  Play,
  Redo2,
  SquareCode,
  SquarePlay,
  Strikethrough,
  TextQuote,
  UnderlineIcon,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";

import { youtubeVideoId } from "@/lib/youtube";

/** The palette the color buttons write — hex twins of the site's accents. */
const PALETTE: { name: string; hex: string; dot: string }[] = [
  { name: "đỏ", hex: "#fb7185", dot: "bg-rose-400" },
  { name: "vàng", hex: "#fbbf24", dot: "bg-amber-400" },
  { name: "xanh", hex: "#34d399", dot: "bg-emerald-400" },
  { name: "tím", hex: "#a78bfa", dot: "bg-violet-400" },
];

/** A margin that is a push from the edge ("20%"), as opposed to 0 or auto. */
const PUSH = /^\d+(?:\.\d+)?%$/;

/** The side an element leans to, read off its two margins; null = centred. */
function alignFrom(element: HTMLElement): "left" | "right" | null {
  const left = element.style.marginLeft;
  const right = element.style.marginRight;
  if (right === "auto" && (left === "0px" || PUSH.test(left))) return "left";
  if (left === "auto" && (right === "0px" || PUSH.test(right))) return "right";
  return null;
}

/** How far it is pushed in from that side ("20%"), or null for flush. */
function offsetFrom(element: HTMLElement): string | null {
  const left = element.style.marginLeft;
  const right = element.style.marginRight;
  if (right === "auto" && PUSH.test(left)) return left;
  if (left === "auto" && PUSH.test(right)) return right;
  return null;
}

/** A picture's corners: "square" when it was set sharp, null for rounded. */
function cornerFrom(element: HTMLElement): "square" | null {
  return element.getAttribute("data-corner") === "square" ? "square" : null;
}

/**
 * Width, side and push, shared by pictures and video blocks — all written as
 * the inline styles the sanitizer's `width: N%` and side-margin allowances
 * let through, so a video sizes and leans exactly as a picture does.
 *
 * The push ("Lề") is the margin on the side the element leans to: 20% on a
 * left-leaning picture is `margin-left: 20%`. A centred one has no side to
 * push from. `data-offset` names the pushed side, so a phone can drop the
 * push and give the picture the whole narrow screen.
 */
const SIZE_AND_ALIGN = {
  width: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.width || null,
    renderHTML: (attributes: { width?: string | null }) =>
      attributes.width ? { style: `width: ${attributes.width}` } : {},
  },
  // Written by `align`, which knows which side it belongs to.
  offset: {
    default: null,
    parseHTML: offsetFrom,
    renderHTML: () => ({}),
  },
  // null = centered, the stylesheet default. Left and right override the
  // auto margins inline, pushed in by the offset where there is one.
  align: {
    default: null,
    parseHTML: alignFrom,
    renderHTML: (attributes: { align?: string | null; offset?: string | null }) => {
      const push = attributes.offset ?? null;
      if (attributes.align === "left") {
        return {
          style: `margin-left: ${push ?? "0"}; margin-right: auto`,
          ...(push ? { "data-offset": "left" } : {}),
        };
      }
      if (attributes.align === "right") {
        return {
          style: `margin-left: auto; margin-right: ${push ?? "0"}`,
          ...(push ? { "data-offset": "right" } : {}),
        };
      }
      return {};
    },
  },
};

/** The inline style a width, side and push come to — the node view's own
 *  copy of what SIZE_AND_ALIGN writes into the stored HTML. */
function sizeStyle(
  width: string | null,
  align: string | null,
  offset: string | null,
): React.CSSProperties {
  return {
    ...(width ? { width } : {}),
    ...(align === "left"
      ? { marginLeft: offset ?? 0, marginRight: "auto" }
      : align === "right"
        ? { marginLeft: "auto", marginRight: offset ?? 0 }
        : {}),
  };
}

/** "50%" → 50; null, which is full width, → 100. */
function widthPercent(width: string | null): number {
  return width ? parseFloat(width) : 100;
}

/**
 * A push that still fits beside something this wide, or null. Past the room
 * left over, a pushed picture would hang off the far edge of the page.
 */
function fittingOffset(offset: string | null, width: string | null): string | null {
  if (!offset) return null;
  const n = Math.min(parseFloat(offset), 100 - widthPercent(width));
  return n >= 1 ? `${Math.round(n)}%` : null;
}

/** The image node, taught to carry a width — written as an inline style the
 *  sanitizer's `width: N%` allowance lets through. */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // The sizing attributes each emit `style`; tiptap's mergeAttributes
      // concatenates them, so an image can carry all of these at once.
      width: SIZE_AND_ALIGN.width,
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.height || null,
        renderHTML: (attributes: { height?: string | null }) =>
          attributes.height ? { style: `height: ${attributes.height}` } : {},
      },
      offset: SIZE_AND_ALIGN.offset,
      align: SIZE_AND_ALIGN.align,
      /** "square": sharp corners (the owner, 02/10/2026: "bo góc hoặc vuông
       *  vức"); null is the house look, rounded. */
      corner: {
        default: null,
        parseHTML: (element: HTMLElement) => cornerFrom(element),
        renderHTML: (attributes: { corner?: string | null }) =>
          attributes.corner === "square" ? { "data-corner": "square" } : {},
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
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            width: img.style.width || null,
            height: img.style.height || null,
            align: alignFrom(img),
            offset: offsetFrom(img),
            corner: cornerFrom(img),
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

/**
 * The video block's face in the editor: the video's own cover in the frame
 * the page will draw (the same .doc-video rules, at the same width and on
 * the same side), with a play mark over it. What is set here is what the
 * page shows, as with pictures.
 */
function VideoBlockView({ node, selected }: NodeViewProps) {
  const id = (node.attrs.videoId as string | null) ?? null;
  return (
    <NodeViewWrapper
      className="doc-video"
      style={sizeStyle(
        (node.attrs.width as string | null) ?? null,
        (node.attrs.align as string | null) ?? null,
        (node.attrs.offset as string | null) ?? null,
      )}
      data-drag-handle
    >
      {id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" draggable={false} />
      ) : null}
      <span className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="grid h-11 w-16 place-items-center rounded-xl bg-[#ff0033] text-white shadow-lg">
          <Play size={20} className="fill-current" aria-hidden />
        </span>
      </span>
      {selected ? (
        <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-[var(--brand)]" />
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * The video block: a YouTube video, sized and aligned the way a picture is.
 *
 * Stored as an empty `<div data-youtube="ID">` carrying the same width and
 * margin styles a picture writes. The sanitizer lets exactly that through —
 * never an iframe — and the page builds the player around the id
 * (embedVideos in lib/docHtml).
 */
const YoutubeVideo = Node.create({
  name: "youtubeVideo",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-youtube"),
        renderHTML: (attributes: { videoId?: string | null }) =>
          attributes.videoId ? { "data-youtube": attributes.videoId } : {},
      },
      width: SIZE_AND_ALIGN.width,
      offset: SIZE_AND_ALIGN.offset,
      align: SIZE_AND_ALIGN.align,
    };
  },
  parseHTML() {
    return [{ tag: "div[data-youtube]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockView);
  },
});

/** Quick stops for the image width, alongside the free-typed box. */
const IMAGE_SIZES = ["25%", "50%", "75%", "100%"];

/** Quick stops for the push from the side, alongside its own typed box. */
const OFFSETS = ["0%", "10%", "20%", "30%"];

const PANEL_LABEL = "text-[9px] font-black uppercase tracking-widest text-neutral-500";
const PANEL_INPUT =
  "h-7 rounded-md border border-white/10 bg-neutral-950/60 px-1.5 text-[11px] font-bold tabular-nums text-white outline-none focus:border-[var(--brand)]/60 placeholder-neutral-500";

/**
 * "Lề": how far the selected picture or video is pushed in from the side it
 * leans to, as a percent of the column. Shared by both panels.
 *
 * It goes with the side buttons rather than beside them. A centred element
 * has no side to push from, so typing a push there makes it lean left with
 * that push — no second click needed. A full-width one is halved first, as
 * picking a side does. The push never runs past the room beside the element:
 * a picture pushed off the page is the one result nobody wants.
 */
function OffsetControls({
  editor,
  nodeType,
  width,
  align,
  offset,
}: {
  editor: Editor;
  nodeType: "image" | "youtubeVideo";
  width: string | null;
  align: string | null;
  offset: string | null;
}) {
  const [draft, setDraft] = useState((offset ?? "0%").replace("%", ""));
  // The quick stops and the side buttons write the push from outside the
  // draft — follow them, via the adjust-during-render pattern.
  const [seen, setSeen] = useState(offset);
  if (seen !== offset) {
    setSeen(offset);
    setDraft((offset ?? "0%").replace("%", ""));
  }

  function apply(n: number) {
    if (!n) {
      editor.chain().focus().updateAttributes(nodeType, { offset: null }).run();
      return;
    }
    const nextWidth = width ?? "50%";
    editor
      .chain()
      .focus()
      .updateAttributes(nodeType, {
        width: nextWidth,
        align: align ?? "left",
        offset: fittingOffset(`${n}%`, nextWidth),
      })
      .run();
  }

  const current = offset ?? "0%";
  // The label names the edge the push is measured from, so the number never
  // has to be read against the side buttons to be understood. Centred, it
  // says what typing a push will do.
  const side = align === "left" ? "trái" : align === "right" ? "phải" : null;
  const edge = side ? `mép ${side}` : "mép trái";
  return (
    <>
      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
      <span
        className={`${PANEL_LABEL} inline-flex items-center gap-1`}
        title={
          side
            ? `Khoảng cách từ mép ${side} (đổi bên bằng nút Căn)`
            : "Đang căn giữa, đặt lề sẽ chuyển sang căn trái"
        }
      >
        {align === "right" ? "Lề phải →" : align === "left" ? "← Lề trái" : "Lề"}
      </span>
      <input
        aria-label={`Lề: khoảng cách từ ${edge} (phần trăm, Enter để áp dụng)`}
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => apply(Number(draft) || 0)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply(Number(draft) || 0);
          }
        }}
        className={`${PANEL_INPUT} w-10 text-center ${align ? "" : "opacity-60"}`}
      />
      <span className="text-[10px] font-bold text-neutral-500">%</span>
      {OFFSETS.map((stop) => {
        const on = current === stop;
        return (
          <button
            key={stop}
            type="button"
            title={stop === "0%" ? `Sát ${edge}` : `Đẩy vào ${stop} từ ${edge}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(parseFloat(stop))}
            className={`h-7 rounded-md px-1.5 text-[10px] font-black tabular-nums transition-colors ${
              on
                ? "bg-[var(--brand)]/25 text-white"
                : "text-neutral-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {stop}
          </button>
        );
      })}
    </>
  );
}

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
  const offset = (attrs.offset as string | null) ?? null;
  const corner = (attrs.corner as string | null) ?? null;
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
    // A wider picture leaves less room beside it; the push shrinks to fit.
    editor
      .chain()
      .updateAttributes("image", { width: value, offset: fittingOffset(offset, value) })
      .run();
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
            onClick={() => {
              const value = size === "100%" ? null : size;
              editor
                .chain()
                .focus()
                .updateAttributes("image", { width: value, offset: fittingOffset(offset, value) })
                .run();
            }}
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
                  // Centred has no side to push from; switching sides keeps
                  // the push.
                  offset: value ? offset : null,
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

      <OffsetControls
        editor={editor}
        nodeType="image"
        width={width}
        align={align}
        offset={offset}
      />

      {/* Rounded is the house look and the default; "Vuông" leaves this one
          picture's corners sharp, its thin frame kept. */}
      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
      <span className={PANEL_LABEL}>Góc</span>
      {(
        [
          [null, "Bo góc", "Ảnh bo góc (mặc định)"],
          ["square", "Vuông", "Ảnh góc vuông"],
        ] as const
      ).map(([value, text, label]) => {
        const on = corner === value;
        return (
          <button
            key={text}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={on}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              editor.chain().focus().updateAttributes("image", { corner: value }).run()
            }
            className={`h-7 rounded-md px-1.5 text-[10px] font-black transition-colors ${
              on
                ? "bg-[var(--brand)]/25 text-white"
                : "text-neutral-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {text}
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
            ? "Chú thích đang nghiêng, bấm để dựng thẳng"
            : "Chú thích đang thẳng, bấm để in nghiêng"
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

/**
 * The selected video block's width, side and push, in the picture panel's
 * own shape: the same box, the same quick stops, the same three sides, the
 * same "Lề". A video has no height of its own (it is always 16:9), no
 * caption and no alt.
 */
function VideoPanel({ editor }: { editor: Editor }) {
  // Remount per selected node, so the draft resets when another video is picked.
  return <VideoPanelInner key={editor.state.selection.from} editor={editor} />;
}

function VideoPanelInner({ editor }: { editor: Editor }) {
  const attrs = editor.getAttributes("youtubeVideo");
  const width = (attrs.width as string | null) ?? null;
  const align = (attrs.align as string | null) ?? null;
  const offset = (attrs.offset as string | null) ?? null;
  const id = (attrs.videoId as string | null) ?? null;

  const [wDraft, setWDraft] = useState((width ?? "100%").replace("%", ""));
  // The quick stops and the sides write width from outside the draft —
  // follow them, as the picture panel does.
  const [seenWidth, setSeenWidth] = useState(width);
  if (seenWidth !== width) {
    setSeenWidth(width);
    setWDraft((width ?? "100%").replace("%", ""));
  }

  function commitWidth() {
    const n = Number(wDraft.replace(/\D/g, ""));
    const value = !n || n >= 100 ? null : `${Math.max(10, Math.min(100, n))}%`;
    // A wider video leaves less room beside it; the push shrinks to fit.
    editor
      .chain()
      .updateAttributes("youtubeVideo", { width: value, offset: fittingOffset(offset, value) })
      .run();
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] px-3 py-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-[#a78bfa]">
        Video đang chọn
      </span>
      <span aria-hidden className="h-4 w-px bg-white/[0.08]" />

      <span className={PANEL_LABEL}>Rộng</span>
      <input
        aria-label="Chiều rộng video (phần trăm, Enter để áp dụng)"
        value={wDraft}
        onChange={(event) => setWDraft(event.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={commitWidth}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitWidth();
          }
        }}
        className={`${PANEL_INPUT} w-12 text-center`}
      />
      <span className="text-[10px] font-bold text-neutral-500">%</span>
      {IMAGE_SIZES.map((size) => {
        const on = (width ?? "100%") === size;
        return (
          <button
            key={size}
            type="button"
            title={`Video rộng ${size}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const value = size === "100%" ? null : size;
              editor
                .chain()
                .focus()
                .updateAttributes("youtubeVideo", {
                  width: value,
                  offset: fittingOffset(offset, value),
                })
                .run();
            }}
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
      <span className={PANEL_LABEL}>Căn</span>
      {(
        [
          ["left", AlignLeft, "Video căn trái"],
          [null, AlignCenter, "Video căn giữa"],
          ["right", AlignRight, "Video căn phải"],
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
                .updateAttributes("youtubeVideo", {
                  align: value,
                  // A full-width video cannot visibly lean — picking a side
                  // shrinks it to half so the choice shows, as with pictures.
                  ...(value && !width ? { width: "50%" } : {}),
                  // Centred has no side to push from; switching sides keeps
                  // the push.
                  offset: value ? offset : null,
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

      <OffsetControls
        editor={editor}
        nodeType="youtubeVideo"
        width={width}
        align={align}
        offset={offset}
      />

      {id ? (
        <>
          <span aria-hidden className="h-4 w-px bg-white/[0.08]" />
          <a
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-neutral-400 underline underline-offset-2 hover:text-white"
          >
            Mở trên YouTube
          </a>
        </>
      ) : null}
      <span className="text-[10px] text-neutral-500">
        Trên điện thoại video luôn rộng hết màn hình.
      </span>
    </div>
  );
}

/** Where a dragged picture or video can land: a side and a push, or centred. */
interface Place {
  align: "left" | "right" | null;
  offset: string | null;
}

/**
 * The selected picture or video, and the element that carries its margins —
 * the <img> itself when a caption has wrapped it in a <figure>, and for a
 * video the .doc-video frame inside the wrapper React node views are mounted
 * in. Null while anything else is selected.
 */
function selectedMovable(
  editor: Editor,
): { type: "image" | "youtubeVideo"; target: HTMLElement } | null {
  const type = editor.isActive("image")
    ? "image"
    : editor.isActive("youtubeVideo")
      ? "youtubeVideo"
      : null;
  if (!type) return null;
  const dom = editor.view.nodeDOM(editor.state.selection.from);
  if (!(dom instanceof HTMLElement)) return null;
  const target =
    type === "image"
      ? dom.tagName === "IMG"
        ? dom
        : dom.querySelector("img")
      : dom.classList.contains("doc-video")
        ? dom
        : dom.querySelector(".doc-video");
  return target instanceof HTMLElement ? { type, target } : null;
}

/**
 * Where a drag has the element, snapped: pushes in 5% steps, and centred
 * once its middle is within 3% of the column's. Past the room beside it a
 * push is cut back, as the "Lề" box does.
 */
function placeAt(x: number, w: number, columnWidth: number): Place {
  const middle = x + w / 2;
  if (Math.abs(middle - columnWidth / 2) <= columnWidth * 0.03) {
    return { align: null, offset: null };
  }
  const widthPct = `${(w / columnWidth) * 100}%`;
  const snap = (px: number) =>
    fittingOffset(`${Math.round((px / columnWidth) * 20) * 5}%`, widthPct);
  return middle < columnWidth / 2
    ? { align: "left", offset: snap(x) }
    : { align: "right", offset: snap(columnWidth - x - w) };
}

/** The left edge a place puts an element of this width at. */
function leftOf(place: Place, w: number, columnWidth: number): number {
  const push = place.offset ? (parseFloat(place.offset) / 100) * columnWidth : 0;
  if (place.align === "left") return push;
  if (place.align === "right") return columnWidth - w - push;
  return (columnWidth - w) / 2;
}

/** What the handle says while a drag is on, in the "Lề" box's own words. */
function placeLabel(place: Place): string {
  if (place.align === "left") return place.offset ? `← Lề trái ${place.offset}` : "← Sát trái";
  if (place.align === "right") return place.offset ? `Lề phải ${place.offset} →` : "Sát phải →";
  return "Giữa";
}

/**
 * The drag handle on the selected picture or video: hold it and move the
 * element left or right with the mouse (or a finger).
 *
 * It writes the same side and push the panel's buttons and "Lề" box write,
 * snapped to their 5% steps, so a drag and a typed number land on the same
 * values. Away from the middle the element leans to the nearer side, pushed
 * in from it; near the middle it snaps back to centred. A full-width element
 * has nowhere to go and is halved first, as picking a side does.
 *
 * While the drag is on, only the element's transform moves — the document
 * changes once, on release, so a drag is one step to undo.
 *
 * The handle sits over the frame, outside the editable area, so ProseMirror's
 * own drag (moving a block up or down the page) is left alone.
 */
function MoveHandle({ editor }: { editor: Editor }) {
  const subscribe = useCallback(
    (notify: () => void) => {
      // A video's node view is React, and re-renders a beat after the
      // transaction that changed it — read the box again once it has, or the
      // handle stays where the video was.
      let frame = 0;
      let later: ReturnType<typeof setTimeout> | undefined;
      const onTransaction = () => {
        notify();
        cancelAnimationFrame(frame);
        clearTimeout(later);
        frame = requestAnimationFrame(notify);
        later = setTimeout(notify, 120);
      };
      editor.on("transaction", onTransaction);
      window.addEventListener("resize", notify);
      return () => {
        editor.off("transaction", onTransaction);
        window.removeEventListener("resize", notify);
        cancelAnimationFrame(frame);
        clearTimeout(later);
      };
    },
    [editor],
  );
  // Where the selected element sits in the frame, as one string, so React is
  // handed the same value until something has actually moved.
  const box = useSyncExternalStore(
    subscribe,
    () => {
      if (editor.isDestroyed) return "";
      const hit = selectedMovable(editor);
      const frame = editor.view.dom.closest("[data-editor-frame]");
      if (!hit || !frame) return "";
      const r = hit.target.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      return [r.left - f.left, r.top - f.top, r.width, r.height].map(Math.round).join(",");
    },
    () => "",
  );

  const drag = useRef<{
    type: "image" | "youtubeVideo";
    from: number;
    // Measured on the first move, not on the press: halving the element on
    // the press re-renders it, and a video's node view does that after the
    // press has returned.
    measured: { target: HTMLElement; x0: number; w: number; columnWidth: number } | null;
    place: Place | null;
  } | null>(null);
  const [preview, setPreview] = useState<{ dx: number; label: string } | null>(null);

  if (!box) return null;
  const [left, top, width, height] = box.split(",").map(Number) as [number, number, number, number];

  function start(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const hit = selectedMovable(editor);
    if (!hit) return;
    // No width set means as wide as it goes (a video stops at 960px): there
    // is no room to move it, so it is halved first, as picking a side does.
    if (!editor.getAttributes(hit.type).width) {
      editor.chain().updateAttributes(hit.type, { width: "50%" }).run();
    }
    drag.current = { type: hit.type, from: event.clientX, measured: null, place: null };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreview({ dx: 0, label: "Kéo sang trái / phải" });
  }

  function move(event: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    if (!d.measured) {
      const hit = selectedMovable(editor);
      if (!hit) return;
      const r = hit.target.getBoundingClientRect();
      const column = editor.view.dom.getBoundingClientRect();
      d.measured = {
        target: hit.target,
        x0: r.left - column.left,
        w: r.width,
        columnWidth: editor.view.dom.clientWidth,
      };
    }
    const m = d.measured;
    const x = Math.min(Math.max(m.x0 + event.clientX - d.from, 0), m.columnWidth - m.w);
    const place = placeAt(x, m.w, m.columnWidth);
    const dx = leftOf(place, m.w, m.columnWidth) - m.x0;
    m.target.style.transform = `translateX(${dx}px)`;
    d.place = place;
    setPreview({ dx, label: placeLabel(place) });
  }

  function end() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.measured) d.measured.target.style.transform = "";
    setPreview(null);
    if (d.place) {
      editor
        .chain()
        .focus()
        .updateAttributes(d.type, { align: d.place.align, offset: d.place.offset })
        .run();
    }
  }

  return (
    <button
      type="button"
      aria-label="Kéo để dời ảnh hoặc video sang trái, phải"
      title="Giữ và kéo sang trái / phải, nhả chuột để đặt"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={(event) => event.stopPropagation()}
      className="absolute z-10 inline-flex -translate-x-1/2 cursor-ew-resize touch-none select-none items-center gap-1.5 rounded-full border border-white/15 bg-neutral-900/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:border-[var(--brand)]/60"
      style={{ left: left + width / 2 + (preview?.dx ?? 0), top: top + Math.max(height - 34, 4) }}
    >
      <MoveHorizontal size={13} aria-hidden />
      {preview ? preview.label : "Kéo để dời"}
    </button>
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
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
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
      YoutubeVideo,
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

  /**
   * Drops a video block at the caret from whatever YouTube address was
   * pasted. Anything that is not one is refused here, in words, rather than
   * becoming a block that plays nothing.
   */
  function insertVideo() {
    if (!editor) return;
    const id = youtubeVideoId(videoUrl);
    if (!id) {
      setVideoError("Link này không phải video YouTube");
      return;
    }
    editor.chain().focus().insertContent({ type: "youtubeVideo", attrs: { videoId: id } }).run();
    setVideoUrl("");
    setVideoError(null);
    setVideoOpen(false);
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
          <option value="h2">H2, Tiêu đề lớn</option>
          <option value="h3">H3, Tiêu đề nhỏ</option>
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
        <button
          type="button"
          title="Chèn video YouTube (chỉnh rộng và căn lề như ảnh)"
          aria-label="Chèn video YouTube"
          aria-pressed={videoOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setVideoError(null);
            setVideoOpen((open) => !open);
          }}
          className={`h-8 px-2.5 rounded-lg border transition-colors inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
            videoOpen
              ? "border-[var(--brand)]/50 bg-[var(--brand)]/15 text-white"
              : "border-white/[0.07] bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <SquarePlay size={14} />
          Video
        </button>
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
            className="h-8 flex-1 min-w-[220px] rounded-md border border-white/10 bg-neutral-950/60 px-2.5 text-xs text-white outline-none focus:border-[var(--brand)]/60 placeholder-neutral-500"
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

      {videoOpen ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <SquarePlay size={13} className="shrink-0 text-neutral-500" />
          <input
            autoFocus
            value={videoUrl}
            onChange={(event) => {
              setVideoUrl(event.target.value);
              setVideoError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertVideo();
              }
              if (event.key === "Escape") setVideoOpen(false);
            }}
            placeholder="Dán link YouTube (nên để Không công khai)..."
            className="h-8 flex-1 min-w-[220px] rounded-md border border-white/10 bg-neutral-950/60 px-2.5 text-xs text-white outline-none focus:border-[var(--brand)]/60 placeholder-neutral-500"
          />
          <button
            type="button"
            onClick={insertVideo}
            className="h-8 px-3.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-[10px] font-black uppercase tracking-widest text-white transition-colors"
          >
            Chèn video
          </button>
          <button
            type="button"
            onClick={() => setVideoOpen(false)}
            className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors"
          >
            Đóng
          </button>
          {videoError ? (
            <p className="basis-full text-[11px] font-bold text-red-400">{videoError}</p>
          ) : null}
        </div>
      ) : null}

      {editor?.isActive("image") ? <ImagePanel editor={editor} /> : null}
      {editor?.isActive("youtubeVideo") ? <VideoPanel editor={editor} /> : null}

      {uploadError ? (
        <p className="mb-2 text-[11px] font-bold text-red-400">{uploadError}</p>
      ) : null}

      <div
        data-editor-frame
        className="relative rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 transition-colors focus-within:border-[var(--brand)]/60 cursor-text"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
        {editor ? <MoveHandle editor={editor} /> : null}
      </div>
    </div>
  );
}
