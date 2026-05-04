"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncPlayersButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sync-players", { method: "POST" });
      const json = (await res.json()) as {
        teams?: number;
        players?: number;
        cricapi_hits?: { hitsToday?: number; hitsLimit?: number };
        error?: string;
      };
      if (!res.ok || json.error) {
        toast.error(`Sync failed: ${json.error ?? res.statusText}`);
        return;
      }
      toast.success(
        `Synced ${json.players} players across ${json.teams} teams.`,
        json.cricapi_hits
          ? {
              description: `CricAPI hits today: ${json.cricapi_hits.hitsToday}/${json.cricapi_hits.hitsLimit}`,
            }
          : undefined,
      );
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={busy || pending}>
      <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Syncing…" : "Sync from CricAPI"}
    </Button>
  );
}
