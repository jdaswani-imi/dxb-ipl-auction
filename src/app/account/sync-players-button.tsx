"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type SyncResult = {
  teams?: number;
  players?: number;
  cricapi_hits?: { hitsToday?: number; hitsLimit?: number };
  error?: string;
};

export function SyncPlayersButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleClick() {
    setResult(null);
    const res = await fetch("/api/admin/sync-players", { method: "POST" });
    const json = (await res.json()) as SyncResult;
    setResult(json);
    if (res.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={pending}>
        {pending ? "Syncing…" : "Sync players from CricAPI"}
      </Button>
      {result ? (
        result.error ? (
          <p className="text-sm text-red-500">Error: {result.error}</p>
        ) : (
          <p className="text-sm text-green-600">
            Synced {result.players} players across {result.teams} teams.{" "}
            {result.cricapi_hits ? (
              <span className="text-muted-foreground">
                (CricAPI: {result.cricapi_hits.hitsToday}/
                {result.cricapi_hits.hitsLimit} today)
              </span>
            ) : null}
          </p>
        )
      ) : null}
    </div>
  );
}
