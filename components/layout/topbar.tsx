import { UserCircle } from "lucide-react";

interface TopbarProps {
  userName: string;
  userEmail: string;
  userRole: string;
}

export function Topbar({ userName, userEmail, userRole }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-sm font-medium text-muted-foreground">
          GO GLOBAL GROUP — System śladu węglowego
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">{userName}</p>
          <p className="text-xs text-muted-foreground">
            {userRole === "MANAGER" ? "Manager" : "Pracownik"}
          </p>
        </div>
        <UserCircle className="h-8 w-8 text-muted-foreground" />
      </div>
    </header>
  );
}
