import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Phase 0
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Dxb IPL Auction 2026
        </h1>
        <p className="text-base text-muted-foreground">
          Scaffold ready. Next.js + Tailwind + shadcn/ui + Supabase wired up.
          Auction features come in later phases.
        </p>
        <Button disabled>Coming soon</Button>
      </div>
    </main>
  );
}
