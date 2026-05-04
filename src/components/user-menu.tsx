"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function UserMenu({
  email,
  role,
  displayName,
}: {
  email: string;
  role: string;
  displayName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const initial = (displayName ?? email).slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-1 py-1 pr-3 text-sm transition-colors hover:bg-muted"
      >
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[140px] truncate text-muted-foreground sm:block">
          {displayName ?? email}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="border-b border-border px-3 py-3">
            <div className="truncate text-sm font-medium">{email}</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={role === "admin" ? "default" : "secondary"}>
                {role}
              </Badge>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
