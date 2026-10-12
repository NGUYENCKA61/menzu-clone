import { describe, expect, it } from "vitest";

import {
  MAX_PER_IP,
  MAX_PER_USER,
  MAX_SHOP_PER_DAY,
  MAX_SHOP_PER_HOUR,
  throttleReason,
} from "@/lib/assistantThrottle";

/**
 * The assistant's four windows. The same-origin door the route also uses is
 * the shop-wide one, tested in sameOrigin.test.ts.
 */
describe("the assistant's throttle", () => {
  const quiet = { byIp: 0, byUser: null, shopHour: 0, shopDay: 0 };

  it("lets a quiet shop and a quiet visitor through", () => {
    expect(throttleReason(quiet)).toBeNull();
    expect(
      throttleReason({
        ...quiet,
        byIp: MAX_PER_IP - 1,
        byUser: MAX_PER_USER - 1,
      }),
    ).toBeNull();
  });

  it("stops one address or one account at its own limit", () => {
    expect(throttleReason({ ...quiet, byIp: MAX_PER_IP })).toBe("visitor");
    expect(throttleReason({ ...quiet, byUser: MAX_PER_USER })).toBe("visitor");
    // A guest has no account window to run out of.
    expect(throttleReason({ ...quiet, byUser: null, byIp: 1 })).toBeNull();
  });

  it("stops everyone when the shop's own hour or day is spent", () => {
    expect(throttleReason({ ...quiet, shopHour: MAX_SHOP_PER_HOUR })).toBe(
      "shop",
    );
    expect(throttleReason({ ...quiet, shopDay: MAX_SHOP_PER_DAY })).toBe(
      "shop",
    );
    // The shop's ceiling is named first: it is the reason everyone is refused.
    expect(
      throttleReason({
        byIp: MAX_PER_IP,
        byUser: null,
        shopHour: MAX_SHOP_PER_HOUR,
        shopDay: 0,
      }),
    ).toBe("shop");
  });
});
