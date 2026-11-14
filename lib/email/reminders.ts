import "server-only";
import type { Reminders } from "@/lib/reminders/query";
import { escapeHtml as escape } from "./send";
import { plural } from "@/lib/reminders/rules";

/** Monthly reminder digest */

export function renderReminderDigest(r: Reminders, opts: { appUrl: string; companyName?: string | null }) {
  const app = opts.companyName ? `Ślad węglowy — ${opts.companyName}` : "Ślad węglowy";
  const missingLines = r.missing.map((m) => `${m.sourceName} — brak danych za ${m.period.label}`);
  const factorLines = r.factors.map((f) => f.text);

  const text = [
    "Dzień dobry,",
    "",
    `comiesięczne podsumowanie systemu ${app}.`,
    ...(missingLines.length ? ["", "Brakujące dane:", ...missingLines.map((l) => `- ${l}`)] : []),
    ...(factorLines.length ? ["", "Wskaźniki emisji:", ...factorLines.map((l) => `- ${l}`)] : []),
    "",
    `Otwórz system: ${opts.appUrl}/dashboard`,
  ].join("\n");

  const list = (title: string, lines: string[]) =>
    lines.length
      ? `<p style="margin:16px 0 4px"><strong>${escape(title)}</strong></p><ul style="margin:0;padding-left:18px">${lines
          .map((l) => `<li>${escape(l)}</li>`)
          .join("")}</ul>`
      : "";

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#232936;line-height:1.5">
<p>Dzień dobry,</p>
<p>comiesięczne podsumowanie systemu <strong>${escape(app)}</strong>.</p>
${list("Brakujące dane", missingLines)}
${list("Wskaźniki emisji", factorLines)}
<p style="margin-top:20px"><a href="${escape(opts.appUrl)}/dashboard" style="display:inline-block;padding:10px 18px;background:#2f4b7c;color:#ffffff;border-radius:999px;text-decoration:none">Otwórz system</a></p>
<p style="color:#8c95a5;font-size:12px">Wiadomość wysyłana automatycznie 10. dnia miesiąca do Analityków, gdy coś wymaga uwagi.</p>
</div>`;

  const parts = [
    r.missing.length ? `${r.missing.length} ${plural(r.missing.length, "brak", "braki", "braków")} danych` : "",
    r.factors.length
      ? `${r.factors.length} ${plural(r.factors.length, "ostrzeżenie", "ostrzeżenia", "ostrzeżeń")} o wskaźnikach`
      : "",
  ].filter(Boolean);

  return { subject: `${app}: ${parts.join(", ")}`, text, html };
}
