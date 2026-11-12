import "server-only";
import { Resend } from "resend";
import { roleLabel } from "@/lib/auth/permissions";

/** Invitation e-mail */

export type SendResult = { sent: true } | { sent: false; reason: string };

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendInviteEmail(params: {
  to: string;
  url: string;
  role: string;
  inviterName: string;
  companyName?: string | null;
  expires: Date;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "Wysyłka e-maili nie jest skonfigurowana (RESEND_API_KEY, RESEND_FROM)." };
  }

  const app = params.companyName ? `Ślad węglowy — ${params.companyName}` : "Ślad węglowy";
  const expires = params.expires.toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short" });
  const role = roleLabel(params.role);

  const text = [
    "Dzień dobry,",
    "",
    `${params.inviterName} zaprasza Cię do systemu ${app} z rolą: ${role}.`,
    "Aby aktywować konto, otwórz link i ustaw hasło:",
    params.url,
    "",
    `Link jest ważny do ${expires}.`,
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#232936;line-height:1.5">
<p>Dzień dobry,</p>
<p><strong>${escape(params.inviterName)}</strong> zaprasza Cię do systemu <strong>${escape(app)}</strong> z rolą: <strong>${escape(role)}</strong>.</p>
<p><a href="${escape(params.url)}" style="display:inline-block;padding:10px 18px;background:#2f4b7c;color:#ffffff;border-radius:999px;text-decoration:none">Aktywuj konto</a></p>
<p style="color:#8c95a5;font-size:12px">Link jest ważny do ${escape(expires)}. Jeśli przycisk nie działa, skopiuj adres:<br>${escape(params.url)}</p>
</div>`;

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: params.to,
      subject: `Zaproszenie do systemu ${app}`,
      text,
      html,
    });
    if (error) return { sent: false, reason: error.message };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}
