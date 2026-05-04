import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, created_at")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="font-mono text-xs">{user.id}</dd>
          <dt className="text-muted-foreground">Display name</dt>
          <dd>{profile?.display_name ?? "—"}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <span className="rounded-full border px-2 py-0.5 text-xs">
              {profile?.role ?? "(no profile row)"}
            </span>
          </dd>
        </dl>
        <form action="/auth/signout" method="post" className="mt-6">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
