/**
 * What a tool's receipt calls its download, under "Link tải hack".
 *
 * The default is the line every receipt printed before the shop could name
 * the download per tool. The limit is shared by the admin box, which stops
 * typing there, and the route, which refuses anything longer; the receipt
 * keeps the name to one line and cuts it short well before that on a phone.
 */
export const DEFAULT_DOWNLOAD_NAME = "Bản Loader mới nhất";

export const DOWNLOAD_NAME_MAX_LENGTH = 60;
