"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Power, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusDot, type Tone } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  cancelInvite,
  changeUserRole,
  resendInvite,
  setUserActive,
  type UserActionResult,
} from "@/lib/users/actions";
import { canManageUser, ROLE_LABELS, roleLabel, type Role } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/emissions/format";
import type { UserRow, UserStatus } from "@/lib/db/users";

const STATUS: Record<UserStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Aktywne", tone: "green" },
  INVITED: { label: "Zaproszenie wysłane", tone: "orange" },
  EXPIRED: { label: "Zaproszenie wygasło", tone: "pink" },
  INACTIVE: { label: "Nieaktywne", tone: "grey" },
};

type Confirm = { kind: "cancel" | "deactivate"; user: UserRow };

export function UserTable({
  users,
  viewer,
  roles,
}: {
  users: UserRow[];
  viewer: { id: string; role: string };
  roles: Role[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<UserActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  function run(userId: string, action: () => Promise<UserActionResult>, after?: () => void) {
    setBusyId(userId);
    setNotice(null);
    setCopied(false);
    start(async () => {
      const res = await action();
      setBusyId(null);
      if (!res.ok || res.message) setNotice(res);
      if (res.ok) after?.();
      router.refresh();
    });
  }

  const roleItems = roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <Card className="p-0 pt-4">
      <div className="px-5">
        <h2 className="text-[0.9375rem] text-strong">Użytkownicy</h2>
        <p className="text-[0.8125rem] text-muted-foreground">
          Dezaktywowane konto nie może się zalogować, ale jego wpisy zostają w historii.
        </p>
      </div>

      {notice && (
        <div className="mx-5 space-y-2 text-sm" role="status">
          <p className={notice.ok ? "text-foreground" : "text-destructive"}>{notice.error ?? notice.message}</p>
          {notice.inviteUrl && (
            <div className="flex items-center gap-2">
              <Input readOnly value={notice.inviteUrl} aria-label="Link aktywacyjny" className="flex-1 font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(notice.inviteUrl!).then(() => setCopied(true))}
              >
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {copied ? "Skopiowano" : "Kopiuj link"}
              </Button>
            </div>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Użytkownik</TableHead>
            <TableHead>Rola</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const manageable = canManageUser(viewer, u);
            const busy = pending && busyId === u.id;
            const pendingInvite = u.status === "INVITED" || u.status === "EXPIRED";
            return (
              <TableRow key={u.id} className={u.status === "INACTIVE" ? "text-muted-foreground" : ""}>
                <TableCell className="max-w-72">
                  <span className="block truncate font-medium text-strong">
                    {u.name || "—"}
                    {u.id === viewer.id && <span className="ml-1 font-normal text-muted-foreground">(Ty)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                </TableCell>
                <TableCell>
                  {manageable && roles.includes(u.role as Role) ? (
                    <Select
                      items={roleItems}
                      value={u.role}
                      disabled={busy}
                      aria-label={`Rola: ${u.email}`}
                      onValueChange={(v) => run(u.id, () => changeUserRole(u.id, v as Role))}
                    />
                  ) : (
                    roleLabel(u.role)
                  )}
                </TableCell>
                <TableCell>
                  <StatusDot tone={STATUS[u.status].tone}>{STATUS[u.status].label}</StatusDot>
                  {u.status === "INVITED" && u.invitationExpires && (
                    <span className="block text-xs text-muted-foreground">do {formatDate(u.invitationExpires)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {manageable && (
                    <div className="flex justify-end gap-1">
                      {busy && <Loader2 className="size-4 animate-spin self-center text-muted-foreground" aria-hidden="true" />}
                      {pendingInvite && (
                        <>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(u.id, () => resendInvite(u.id))}>
                            <Send aria-hidden="true" />
                            Wyślij ponownie
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy}
                            title="Anuluj zaproszenie"
                            aria-label={`Anuluj zaproszenie: ${u.email}`}
                            onClick={() => setConfirm({ kind: "cancel", user: u })}
                          >
                            <X />
                          </Button>
                        </>
                      )}
                      {!pendingInvite && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            u.status === "INACTIVE"
                              ? run(u.id, () => setUserActive(u.id, true))
                              : setConfirm({ kind: "deactivate", user: u })
                          }
                        >
                          <Power aria-hidden="true" />
                          {u.status === "INACTIVE" ? "Aktywuj" : "Dezaktywuj"}
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {users.length === 0 && (
        <p className="pb-6 text-center text-sm text-muted-foreground">Brak użytkowników — zaproś pierwszą osobę.</p>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "cancel" ? "Anulować zaproszenie?" : "Dezaktywować konto?"}
          description={
            confirm.kind === "cancel"
              ? `Link wysłany na ${confirm.user.email} przestanie działać.`
              : `${confirm.user.name || confirm.user.email} nie będzie mógł się zalogować. Jego wpisy pozostaną w systemie; konto można później aktywować ponownie.`
          }
          confirmLabel={confirm.kind === "cancel" ? "Anuluj zaproszenie" : "Dezaktywuj"}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { kind, user } = confirm;
            run(
              user.id,
              () => (kind === "cancel" ? cancelInvite(user.id) : setUserActive(user.id, false)),
              () => setConfirm(null),
            );
          }}
        />
      )}
    </Card>
  );
}
