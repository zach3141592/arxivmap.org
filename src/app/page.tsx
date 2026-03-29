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
    redirect("/papers");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <main className="flex w-full max-w-lg flex-col items-center">
        <h1 className="flex items-center gap-3 text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl">
          <img src="/arxivmap.png" alt="" className="h-10 w-10 sm:h-12 sm:w-12" />
          Arxiv Map
        </h1>
        <p className="mt-3 text-sm tracking-wide text-gray-400">
          AI-powered paper summaries
        </p>
        <LandingInput />
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
