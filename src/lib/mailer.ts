import "server-only";

import nodemailer from "nodemailer";

import { mailEnabled, type ShopSettings } from "@/lib/settings";

/**
 * One message out through whatever SMTP the shop configured in Cấu hình.
 *
 * A fresh transport per call, no pooling: the shop sends a handful of reset
 * links a day, and a pooled connection would spend its life timing out. Port
 * 465 is TLS-from-the-first-byte by convention; everything else starts plain
 * and upgrades with STARTTLS, which is what `secure: false` actually means in
 * nodemailer — not "insecure".
 *
 * Throws when the settings are incomplete: the caller decides what to tell
 * the visitor, because "we could not send" reads very differently on a reset
 * form than in a cron job.
 */
export async function sendMail(
  settings: ShopSettings,
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  if (!mailEnabled(settings)) {
    throw new Error("mail-not-configured");
  }

  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });

  await transport.sendMail({
    from: settings.mailFrom,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
