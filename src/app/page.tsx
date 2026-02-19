import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          <SignInButton />
        )}
      </main>
    </div>
  );
}

function SignInButton() {
  return (
    <form action="/auth/login" method="POST">
      <button
        type="submit"
        className="border border-black px-6 py-2 text-sm font-medium transition-colors hover:bg-black hover:text-white"
      >
        Sign in with Google
      </button>
    </form>
  );
}
