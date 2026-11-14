import "server-only";
import { Resend } from "resend";

/** E-mail sending */

export type SendResult = { sent: true } | { sent: false; reason: string };

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM;
}

export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "Wysyłka e-maili nie jest skonfigurowana (RESEND_API_KEY, RESEND_FROM)." };
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({ from, ...msg });
    return error ? { sent: false, reason: error.message } : { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}
