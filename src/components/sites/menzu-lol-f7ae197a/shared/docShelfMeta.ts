import {
  BookOpen,
  CircleHelp,
  Library,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { DOC_SHELF_LABEL, type DocShelf } from "@/lib/docCategories";

/** Each wiki shelf's glyph and hue on the admin screens (the article list and
 *  the editor), its name from the one list the public page uses. */
export const DOC_SHELF_META: Record<DocShelf, { label: string; icon: LucideIcon; tint: string }> = {
  FAQ: {
    label: DOC_SHELF_LABEL.FAQ,
    icon: CircleHelp,
    tint: "border-indigo-500/25 bg-indigo-500/10 text-indigo-400",
  },
  GLOSSARY: {
    label: DOC_SHELF_LABEL.GLOSSARY,
    icon: Library,
    tint: "border-cyan-500/25 bg-cyan-500/10 text-cyan-400",
  },
  GUIDE: {
    label: DOC_SHELF_LABEL.GUIDE,
    icon: BookOpen,
    tint: "border-violet-500/25 bg-violet-500/10 text-violet-400",
  },
  WARRANTY: {
    label: DOC_SHELF_LABEL.WARRANTY,
    icon: ShieldCheck,
    tint: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  },
  TERMS: {
    label: DOC_SHELF_LABEL.TERMS,
    icon: ScrollText,
    tint: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  },
};
