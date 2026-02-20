import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-5xl font-bold tracking-tight">Arxiv Map</h1>

        {user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg">{user.email}</p>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <SignInButton returnTo={returnTo} />
        )}
      </main>
    </div>
  );
}

function SignInButton({ returnTo }: { returnTo?: string }) {
  return (
    <form action="/auth/login" method="POST">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <button
        type="submit"
        className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
      >
        Sign in with Google
      </button>
    </form>
  );
}
