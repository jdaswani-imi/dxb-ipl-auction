import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Phase 0B
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Dxb IPL Auction 2026
        </h1>
        <p className="text-base text-muted-foreground">
          Scaffold + auth ready. Trades and squad management land in Phase 1.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className={buttonVariants({ variant: "default" })}>
            Sign in
          </Link>
          <Link href="/account" className={buttonVariants({ variant: "outline" })}>
            Account
          </Link>
        </div>
      </div>
    </main>
  );
}
