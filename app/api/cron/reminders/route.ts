import { timingSafeEqual, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/db/company";
import { getReminders } from "@/lib/reminders/query";
import { renderReminderDigest } from "@/lib/email/reminders";
import { emailConfigured, sendEmail } from "@/lib/email/send";

const digest = (s: string) => createHash("sha256").update(s).digest();

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || !header) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

const json = (body: object, status = 200) => Response.json(body, { status });

// GET /api/cron/reminders
export async function GET(req: Request) {
  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);
  if (!emailConfigured()) return json({ sent: 0, reason: "email not configured" });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const already = await prisma.auditLog.findFirst({
    where: { entity: "Reminder", action: "NOTIFY", createdAt: { gte: monthStart } },
    select: { id: true },
  });
  if (already && new URL(req.url).searchParams.get("force") !== "1") {
    return json({ sent: 0, reason: "already sent this month" });
  }

  const reminders = await getReminders(now);
  if (reminders.missing.length === 0 && reminders.factors.length === 0) {
    return json({ sent: 0, reason: "nothing to report" });
  }

  const recipients = await prisma.user.findMany({
    where: { role: "ANALYST", active: true, passwordHash: { not: "" } },
    select: { email: true },
  });
  if (recipients.length === 0) return json({ sent: 0, reason: "no active Analityk" });

  const company = await getCompany();
  const mail = renderReminderDigest(reminders, {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    companyName: company?.shortName || company?.name,
  });

  const results = await Promise.all(recipients.map((r) => sendEmail({ to: r.email, ...mail })));
  const sent = results.filter((r) => r.sent).length;
  const failed = results.flatMap((r) => (r.sent ? [] : [r.reason]));

  await prisma.auditLog.create({
    data: {
      userName: "System",
      action: "NOTIFY",
      entity: "Reminder",
      details: JSON.stringify({
        recipients: sent,
        failed: failed.length,
        missing: reminders.missing.length,
        factors: reminders.factors.length,
      }),
    },
  });

  return json({ sent, failed });
}
