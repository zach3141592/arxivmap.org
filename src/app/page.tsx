import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingInput } from "./landing-input";

export default async function Home() {
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (user) {
    redirect("/feed");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <main className="flex w-full max-w-lg flex-col items-center">
        <h1 className="flex items-center gap-3 text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl">
          <img src="/arxivmap.png" alt="" className="h-10 w-10 sm:h-12 sm:w-12" />
          Arxiv Map
        </h1>
        <p className="mt-3 text-sm tracking-wide text-gray-400">
          Your personal research library.
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <li>Save papers</li>
          <li>Get AI summaries</li>
          <li>Graph your research</li>
          <li>Doomscroll through new papers</li>
        </ul>
        <LandingInput />
        <div className="mt-8 w-full text-left">
          <p className="text-base font-semibold text-gray-900">The fastest way to analyze any paper</p>
          <p className="mt-1.5 text-sm text-gray-400">
            When you&apos;re on any arXiv paper, just add <span className="font-mono text-gray-600">map</span> after <span className="font-mono text-gray-600">arxiv</span> in the URL:
          </p>
          <div className="mt-3 rounded-xl bg-gray-50 px-5 py-4 text-sm">
            <div className="flex items-baseline gap-4">
              <span className="w-12 shrink-0 text-gray-400">Before</span>
              <span className="font-mono text-gray-500">arxiv.org/abs/2601.14242</span>
            </div>
            <div className="mt-2 flex items-baseline gap-4">
              <span className="w-12 shrink-0 text-gray-400">After</span>
              <span className="font-mono text-gray-800">arxiv<span className="text-red-500">map</span>.org/abs/2601.14242</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-400">
            That&apos;s it — you&apos;ll land directly on the Arxiv Map summary for that paper.
          </p>
        </div>
      </main>
      <footer className="mt-20">
        <a
          href="/login"
          className="text-sm text-gray-400 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-gray-600 hover:decoration-gray-400"
        >
          Login
        </a>
      </footer>
    </div>
  );
}
