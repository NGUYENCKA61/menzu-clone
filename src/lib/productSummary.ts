/**
 * The longest "Mô tả ngắn" a tool can carry.
 *
 * Shared by the admin box, which stops typing there, and the route, which
 * refuses anything longer: the line sits under the title and is clamped to
 * two lines on the card, so past this it stops being a blurb.
 */
export const SUMMARY_MAX_LENGTH = 300;
