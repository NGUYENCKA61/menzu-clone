import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";

/**
 * The words an account listing is known by outside its page: the <title>, the
 * meta description and the Product markup.
 *
 * They were built from a Valorant template, so a LoL or CFVN account went out
 * as "Mã ACC77 - ACC#77" with "rank , 0 skin súng, 0 agent, level 0" while its
 * heading read "ACC RÁC LOL - CÓ TƯỚNG + SKIN" (the owner's SEO review,
 * 13/10/2026). They now lead with the listing's own name, use its write-up
 * when there is one, and name a figure only when it has a value and the game
 * has such a thing.
 */
export interface AccountSeoInput {
  code: string;
  /** The listing's own name; "" when the shop has not given one. */
  name: string;
  /** The write-up as running text; "" when there is none. */
  descriptionText: string;
  categoryName: string;
  categorySlug: string;
  rank: string;
  weaponSkins: number;
  agents: number;
  level: number;
  price: number;
}

/** Shortens to `max` characters at a word, with an ellipsis. */
export function clampText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atWord = cut.replace(/\s+\S*$/, "");
  return `${(atWord.length >= max * 0.6 ? atWord : cut).trimEnd()}…`;
}

/** Weapon skins and agents are Valorant's; other games have neither. */
export function isValorantAccount(account: Pick<AccountSeoInput, "categoryName" | "categorySlug">): boolean {
  return /valorant/i.test(`${account.categorySlug} ${account.categoryName}`);
}

/** The listing as its heading names it, or by its code when it has no name. */
export function accountDisplayName(account: Pick<AccountSeoInput, "name" | "code">): string {
  return account.name.trim() || `Mã ${account.code}`;
}

/**
 * The figures worth saying, each only with a value: the rank when typed, and
 * the skins, agents and level of a Valorant account when above zero. The buy
 * panel prints its rows by the same rule (a row with nothing after its label
 * read as a broken page).
 */
export function accountStatParts(account: AccountSeoInput): string[] {
  const parts: string[] = [];
  const rank = account.rank.trim();
  if (rank) parts.push(`rank ${rank}`);
  if (isValorantAccount(account)) {
    if (account.weaponSkins > 0) parts.push(`${account.weaponSkins} skin súng`);
    if (account.agents > 0) parts.push(`${account.agents} agent`);
    if (account.level > 0) parts.push(`level ${account.level}`);
  }
  return parts;
}

/** "<name> | ACC77 | 60.000đ": the price kept, the code said once. */
export function accountMetaTitle(account: AccountSeoInput): string {
  const price = `${formatVnd(account.price)}đ`;
  const name = account.name.trim();
  return name ? `${name} | ${account.code} | ${price}` : `Mã ${account.code} | ${price}`;
}

/** The sentence built from the figures, for a listing with no write-up. */
function builtSentence(account: AccountSeoInput): string {
  const stats = accountStatParts(account);
  return (
    `Tài khoản ${account.categoryName} mã ${account.code}${stats.length ? `, ${stats.join(", ")}` : ""}. ` +
    `Giá ${formatVnd(account.price)}đ. Bàn giao ngay sau khi thanh toán.`
  );
}

/** The meta description: the write-up when there is one, else the figures. */
export function accountMetaDescription(account: AccountSeoInput, max = 155): string {
  const written = account.descriptionText.trim();
  return clampText(written || builtSentence(account), max);
}

/** The Product markup's description: the same, with more room. */
export function accountLdDescription(account: AccountSeoInput): string {
  return accountMetaDescription(account, 300);
}
