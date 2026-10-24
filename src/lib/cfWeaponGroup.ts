import { CF_WEAPON_BASES } from "@/lib/cfWeaponBases";

/**
 * Which of the game's weapon groups a typed weapon name belongs to, for the
 * account page's "Vũ khí chính / Vũ khí phụ / Cận chiến / Lựu đạn" chips.
 *
 * The wiki's bases decide first, longest match first, so "Raging Bull
 * Gunknife" is a pistol and "Desert Eagle-Sentry-MK1" too. A name that starts
 * like a gun model ("AK47-Knife", "M4A1-S", "AK12 Knife") is primary even when
 * it says knife. Then plain words: grenades, then melee. Anything else is
 * primary, which most weapons are.
 */
const BASES: [string, string][] = [
  ...CF_WEAPON_BASES.secondary.map((base): [string, string] => [base, "Vũ khí phụ"]),
  ...CF_WEAPON_BASES.melee.map((base): [string, string] => [base, "Cận chiến"]),
  ...CF_WEAPON_BASES.grenade.map((base): [string, string] => [base, "Lựu đạn"]),
].sort((a, b) => b[0].length - a[0].length);

const GUN_MODEL = /^[a-z]{1,5}-?\d/;
const GRENADE_WORDS = /grenade|flashbang|flash bang|smoke|molotov|lựu đạn/;
const MELEE_WORDS =
  /(^|[\s-])(knife|axe|kukri|knuckles?|hammer|bat|katana|sword|blade|machete|karambit|dagger|scythe|shovel|brick|sickle|cleaver|wrench|crowbar|tomahawk|kunai|dao|lưỡi hái)(?=$|[\s-])/;

export function weaponGroup(name: string): string {
  const text = name.trim().replace(/\s+/g, " ").toLowerCase();
  for (const [base, group] of BASES) {
    if (text === base || text.startsWith(`${base} `) || text.startsWith(`${base}-`)) return group;
  }
  if (GUN_MODEL.test(text)) return "Vũ khí chính";
  if (GRENADE_WORDS.test(text)) return "Lựu đạn";
  if (MELEE_WORDS.test(text)) return "Cận chiến";
  return "Vũ khí chính";
}
