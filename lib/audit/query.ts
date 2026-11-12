import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { ACTION_LABELS, ENTITY_LABELS, describeEvent, parseDetails, type AuditDetail } from "./describe";

/** Audit log queries */

export const ADMIN_ACTOR = "__admin";
export const ADMIN_LABEL = "Administrator systemu";
export const PAGE_SIZE = 50;

export interface AuditFilters {
  user?: string;
  entity?: string;
  action?: string;
  from?: string;
  to?: string;
  page: number;
}

export interface AuditRow {
  id: string;
  at: string;
  actor: string;
  entity: string;
  action: string;
  summary: string;
  details: AuditDetail[];
  link?: string;
}

export interface Viewer {
  role: string;
}

const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseAuditFilters(raw: Record<string, string | string[] | undefined>): AuditFilters {
  const str = (k: string) => {
    const v = one(raw[k]);
    return typeof v === "string" && v ? v : undefined;
  };
  const page = Number(str("strona") ?? 1);
  return {
    user: str("uzytkownik"),
    entity: str("obiekt"),
    action: str("akcja"),
    from: day(str("od")),
    to: day(str("do")),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function auditFiltersToSearch(f: AuditFilters, page = f.page): URLSearchParams {
  const s = new URLSearchParams();
  if (f.user) s.set("uzytkownik", f.user);
  if (f.entity) s.set("obiekt", f.entity);
  if (f.action) s.set("akcja", f.action);
  if (f.from) s.set("od", f.from);
  if (f.to) s.set("do", f.to);
  if (page > 1) s.set("strona", String(page));
  return s;
}

async function adminAccounts(viewer: Viewer) {
  if (viewer.role === "ADMIN") return { ids: new Set<string>(), emails: [] as string[] };
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
  return { ids: new Set(admins.map((a) => a.id)), emails: admins.map((a) => a.email) };
}

function whereOf(f: AuditFilters, adminIds: Set<string>): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (f.user === ADMIN_ACTOR) where.userId = { in: [...adminIds] };
  else if (f.user) where.userId = f.user;
  if (f.entity) where.entity = f.entity;
  if (f.action) where.action = f.action;
  if (f.from || f.to) {
    where.createdAt = {
      ...(f.from ? { gte: new Date(`${f.from}T00:00:00`) } : {}),
      ...(f.to ? { lt: new Date(new Date(`${f.to}T00:00:00`).getTime() + 86_400_000) } : {}),
    };
  }
  return where;
}

type RawEvent = Prisma.AuditLogGetPayload<object>;

async function buildRows(events: RawEvent[], admins: { ids: Set<string>; emails: string[] }): Promise<AuditRow[]> {
  const details = events.map((e) => parseDetails(e.details));

  const invoiceIds = new Set<string>();
  const entryIds = new Set<string>();
  const sourceIds = new Set<string>();
  const factorIds = new Set<string>();
  events.forEach((e, i) => {
    if (!e.entityId) return;
    if (e.entity === "Invoice") invoiceIds.add(e.entityId);
    if (e.entity === "EmissionEntry") entryIds.add(e.entityId);
    if (e.entity === "EmissionSource") sourceIds.add(e.entityId);
    if (e.entity === "EmissionFactor") factorIds.add(e.entityId);
    const inv = details[i]!.invoiceId;
    if (e.entity === "InvoiceAttachment" && typeof inv === "string") invoiceIds.add(inv);
  });

  const [entries, sources, factors] = await Promise.all([
    prisma.emissionEntry.findMany({ where: { id: { in: [...entryIds] } }, select: { id: true, invoiceId: true } }),
    prisma.emissionSource.findMany({ where: { id: { in: [...sourceIds] } }, select: { id: true } }),
    prisma.emissionFactor.findMany({ where: { id: { in: [...factorIds] } }, select: { id: true } }),
  ]);
  const entryInvoice = new Map(entries.map((e) => [e.id, e.invoiceId]));
  entries.forEach((e) => e.invoiceId && invoiceIds.add(e.invoiceId));
  const invoices = new Set(
    (await prisma.invoice.findMany({ where: { id: { in: [...invoiceIds] } }, select: { id: true } })).map((i) => i.id),
  );
  const liveSources = new Set(sources.map((s) => s.id));
  const liveFactors = new Set(factors.map((f) => f.id));

  const invoiceLink = (id: unknown) =>
    typeof id === "string" && invoices.has(id) ? `/entries?faktura=${id}` : undefined;

  const linkOf = (e: RawEvent, d: Record<string, unknown>): string | undefined => {
    switch (e.entity) {
      case "Invoice":
        return e.action === "DELETE" ? undefined : invoiceLink(e.entityId);
      case "InvoiceAttachment":
        return invoiceLink(d.invoiceId);
      case "EmissionEntry":
        return invoiceLink(e.entityId ? entryInvoice.get(e.entityId) : undefined);
      case "EmissionSource":
        return e.entityId && liveSources.has(e.entityId) ? "/sources" : undefined;
      case "EmissionFactor":
        return e.entityId && liveFactors.has(e.entityId) ? "/factors" : undefined;
      case "FactorCategory":
        return "/factors";
      case "Company":
        return "/company";
      case "User":
        return e.action === "LOGIN" ? undefined : "/admin";
      case "Report":
        return typeof d.query === "string" ? `/reports${d.query ? `?${d.query}` : ""}` : "/reports";
      default:
        return undefined;
    }
  };

  const redact = (s: string) => admins.emails.reduce((acc, email) => acc.split(email).join(ADMIN_LABEL), s);

  return events.map((e, i) => {
    const described = describeEvent(e);
    const isAdmin = !!e.userId && admins.ids.has(e.userId);
    return {
      id: e.id,
      at: e.createdAt.toISOString(),
      actor: isAdmin ? ADMIN_LABEL : (e.userName ?? "—"),
      entity: ENTITY_LABELS[e.entity] ?? e.entity,
      action: ACTION_LABELS[e.action] ?? e.action,
      summary: redact(described.summary),
      details: described.details.map((x) => ({ label: x.label, value: redact(x.value) })),
      link: linkOf(e, details[i]!),
    };
  });
}

export async function getAuditPage(filters: AuditFilters, viewer: Viewer) {
  const admins = await adminAccounts(viewer);
  const where = whereOf(filters, admins.ids);

  const [total, events, actors, entities, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.findMany({ distinct: ["userId"], select: { userId: true, userName: true }, where: { userId: { not: null } } }),
    prisma.auditLog.findMany({ distinct: ["entity"], select: { entity: true } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
  ]);

  const userOptions = new Map<string, string>();
  for (const a of actors) {
    if (admins.ids.has(a.userId!)) userOptions.set(ADMIN_ACTOR, ADMIN_LABEL);
    else userOptions.set(a.userId!, a.userName ?? a.userId!);
  }

  return {
    rows: await buildRows(events, admins),
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    options: {
      users: [...userOptions].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "pl")),
      entities: entities
        .map((e) => ({ value: e.entity, label: ENTITY_LABELS[e.entity] ?? e.entity }))
        .sort((a, b) => a.label.localeCompare(b.label, "pl")),
      actions: actions
        .map((a) => ({ value: a.action, label: ACTION_LABELS[a.action] ?? a.action }))
        .sort((a, b) => a.label.localeCompare(b.label, "pl")),
    },
  };
}

export const EXPORT_LIMIT = 10_000;

export async function getAuditExport(filters: AuditFilters, viewer: Viewer): Promise<AuditRow[]> {
  const admins = await adminAccounts(viewer);
  const events = await prisma.auditLog.findMany({
    where: whereOf(filters, admins.ids),
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT,
  });
  return buildRows(events, admins);
}
