import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PaperInput } from "./paper-input";

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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <main className="flex flex-col items-center gap-8">
          <h1 className="text-5xl font-bold tracking-tight">Arxiv Map</h1>
          <p className="text-lg text-gray-600">AI-powered paper summaries</p>
          <SignInButton returnTo={returnTo} />
        </main>
      </div>
    );
  }

  // Fetch recent summaries for the dashboard
  const serviceClient = createServiceClient();
  const { data: recentPapers } = await serviceClient
    .from("paper_summaries")
    .select("arxiv_id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">Arxiv Map</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="border border-black px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-medium">Look up a paper</h2>
          <PaperInput />
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold">Recent Summaries</h2>
          {recentPapers && recentPapers.length > 0 ? (
            <ul className="mt-4 divide-y divide-gray-100">
              {recentPapers.map((paper) => (
                <li key={paper.arxiv_id}>
                  <a
                    href={`/abs/${paper.arxiv_id}`}
                    className="block py-3 transition-colors hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium leading-snug">
                      {paper.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {paper.arxiv_id}
                      {paper.created_at && (
                        <> &middot; {new Date(paper.created_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              No summaries yet. Look up a paper to get started.
            </p>
          )}
        </section>
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
