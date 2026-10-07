/**
 * Two things a tool is narrowed by on its category page besides its name,
 * features, status and price: where it runs (a home PC or a net café's) and
 * which game launcher it is for (the owner, 07/10/2026: "thêm vào lọc phần
 * phân loại là hoạt động: máy nhà, máy nét, tất cả", "thêm phần lọc là nền
 * tảng nữa" → launchers). Both are set per tool in the desk.
 *
 * Plain constants, no database: the desk's form and the category page's
 * chips (both in the browser) read them as well as the server.
 */

export const RUNS_ON = ["HOME", "NET", "BOTH"] as const;
export type RunsOn = (typeof RUNS_ON)[number];

export const RUNS_ON_LABELS: Record<RunsOn, string> = {
  HOME: "Máy nhà",
  NET: "Máy nét",
  BOTH: "Cả hai",
};

/**
 * Where a tool runs. One nobody has marked runs on a home PC: the shop's
 * default requirement line already says "Net nhà", and a net-café tool is
 * the exception the desk marks.
 */
export function readRunsOn(value: unknown): RunsOn {
  return typeof value === "string" && (RUNS_ON as readonly string[]).includes(value)
    ? (value as RunsOn)
    : "HOME";
}

/** The launchers a tool can be for, in the order the desk and the chips list
 *  them. The key is what is stored; the label is what is printed. */
export const LAUNCHERS = [
  { key: "STEAM", label: "Steam" },
  { key: "EPIC", label: "Epic Games" },
  { key: "GARENA", label: "Garena" },
  { key: "VTC", label: "VTC Game" },
  { key: "RIOT", label: "Riot Client" },
  { key: "BATTLENET", label: "Battle.net" },
  { key: "OWN", label: "Launcher riêng" },
] as const;
export type LauncherKey = (typeof LAUNCHERS)[number]["key"];

const LAUNCHER_KEYS: readonly string[] = LAUNCHERS.map((l) => l.key);

/** Known keys only, each once, in the list's own order. */
export function readLaunchers(value: unknown): LauncherKey[] {
  const picked = new Set(
    (Array.isArray(value) ? value : []).filter(
      (v): v is string => typeof v === "string" && LAUNCHER_KEYS.includes(v),
    ),
  );
  return LAUNCHERS.map((l) => l.key).filter((key) => picked.has(key));
}

export function launcherLabel(key: string): string {
  return LAUNCHERS.find((l) => l.key === key)?.label ?? key;
}

/** The category page's URL words: `hd=nha|net`, `nt=<launcher key, lower>`. */
export function runsOnFromParam(value: string | undefined): "HOME" | "NET" | undefined {
  return value === "nha" ? "HOME" : value === "net" ? "NET" : undefined;
}

export function launcherFromParam(value: string | undefined): LauncherKey | undefined {
  const key = (value ?? "").toUpperCase();
  return LAUNCHER_KEYS.includes(key) ? (key as LauncherKey) : undefined;
}
