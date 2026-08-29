/**
 * How a long tile row is revealed.
 *
 * Pure: the row on the home page reads its column count off the grid it
 * renders and everything else is arithmetic that deserves a test — a "Xem
 * thêm" that shows one tile too few reads as a bug and one too many as a
 * broken line.
 */

/** Lines of tiles shown before "Xem thêm"; the press then shows the rest. */
export const FIRST_ROWS = 1;

/** How many tiles fit in `rows` lines of a grid `columns` wide. */
export function revealLimit(columns: number, rows: number = FIRST_ROWS): number {
  const cols = Math.max(1, Math.floor(columns));
  const lines = Math.max(1, Math.floor(rows));
  return cols * lines;
}

/** Tiles still hidden after the limit, never below zero. */
export function hiddenAfter(total: number, limit: number): number {
  return Math.max(0, total - limit);
}

/**
 * The column count of a rendered grid, read off its computed template —
 * "290px 290px 290px 290px" is four columns. Falls back to 1 for anything
 * that does not look like a track list, so a row never hides everything.
 */
export function columnsOf(gridTemplateColumns: string): number {
  const tracks = gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
  return tracks.length > 0 && tracks[0] !== "none" ? tracks.length : 1;
}
