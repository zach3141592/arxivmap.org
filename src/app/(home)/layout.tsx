import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HeaderNav } from "../header-nav";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-100 px-6 py-3 sm:px-8">
        <a href="/" className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight">
          <img src="/arxivmap.png" alt="" className="h-6 w-6" />
          Arxiv Map
        </a>
        <HeaderNav />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-400 sm:inline">{user.email}</span>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
