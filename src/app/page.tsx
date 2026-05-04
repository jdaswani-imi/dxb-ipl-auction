import Link from "next/link";
import { ArrowRight, Trophy, Users, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Users,
    title: "10 league teams",
    body: "Owners, squads, and purses tracked end-to-end.",
  },
  {
    icon: Trophy,
    title: "IPL 2026 roster",
    body: "All 260 players synced live from CricAPI.",
  },
  {
    icon: ShieldCheck,
    title: "Magic-link only",
    body: "No passwords. Owners are auto-paired by email.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.78_0.15_80/0.15),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-24 text-center sm:pt-32">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-primary" />
            Mid-season · IPL 2026
          </div>
          <h1 className="font-heading text-5xl font-semibold tracking-tight sm:text-6xl">
            Dxb IPL <span className="text-primary">Auction</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            A private fantasy ledger for ten friends running the IPL 2026 season —
            squads, purses, trades, and points all in one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/teams" className={buttonVariants({ variant: "default" })}>
              Browse teams
              <ArrowRight className="ml-1 size-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5"
            >
              <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <div className="font-medium">{title}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
