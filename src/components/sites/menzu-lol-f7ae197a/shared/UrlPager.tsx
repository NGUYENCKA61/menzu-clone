"use client";

import { useRouter } from "next/navigation";

import { ListPager } from "./AccountListChrome";

/**
 * The account pages' pager for a list the server draws a page of: each press
 * is the same address with `?trang=N` (the first page has none), so a page
 * can be linked to and the back button walks back through them.
 */
export function UrlPager({
  base,
  page,
  pageCount,
}: {
  /** The list's address without the page, e.g. "/thong-bao". */
  base: string;
  /** Zero-based. */
  page: number;
  pageCount: number;
}) {
  const router = useRouter();
  return (
    <ListPager
      page={page}
      pageCount={pageCount}
      onSelect={(next) => router.push(next <= 0 ? base : `${base}?trang=${next + 1}`)}
    />
  );
}
