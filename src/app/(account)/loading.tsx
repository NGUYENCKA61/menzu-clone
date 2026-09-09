import { AccountSkeleton } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountSkeleton";

/**
 * What an account page looks like for the half-second before it exists.
 *
 * One skeleton for the whole group: every route here is drawn through the
 * same shell, so one shape fits all of them. Its presence is also what turns
 * prefetching back on for these routes — Next skips prefetch on a dynamic
 * route that has no loading boundary.
 */
export default function AccountLoading() {
  return <AccountSkeleton />;
}
