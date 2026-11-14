import "server-only";
import { escapeHtml as escape, sendEmail, type SendResult } from "./send";

/** Password reset e-mail */

export async function sendPasswordResetEmail(params: {
  to: string;
  url: string;
  expires: Date;
  companyName?: string | null;
}): Promise<SendResult> {
  const app = params.companyName ? `Ślad węglowy — ${params.companyName}` : "Ślad węglowy";
  const expires = params.expires.toLocaleString("pl-PL", { timeStyle: "short", timeZone: "Europe/Warsaw" });

  const text = [
    "Dzień dobry,",
    "",
    `otrzymaliśmy prośbę o zmianę hasła do systemu ${app}.`,
    "Aby ustawić nowe hasło, otwórz link:",
    params.url,
    "",
    `Link jest ważny do godz. ${expires} i działa jeden raz.`,
    "Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość — obecne hasło pozostanie bez zmian.",
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#232936;line-height:1.5">
<p>Dzień dobry,</p>
<p>otrzymaliśmy prośbę o zmianę hasła do systemu <strong>${escape(app)}</strong>.</p>
<p><a href="${escape(params.url)}" style="display:inline-block;padding:10px 18px;background:#2f4b7c;color:#ffffff;border-radius:999px;text-decoration:none">Ustaw nowe hasło</a></p>
<p style="color:#8c95a5;font-size:12px">Link jest ważny do godz. ${escape(expires)} i działa jeden raz. Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość — obecne hasło pozostanie bez zmian.<br>${escape(params.url)}</p>
</div>`;

  return sendEmail({ to: params.to, subject: `Zmiana hasła — ${app}`, text, html });
}
