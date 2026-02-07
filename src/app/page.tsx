import Link from "next/link"
import { auth, signIn, signOut } from "@/auth"

export default async function Home() {
  const session = await auth()

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 p-8 space-y-6 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">EazyClaw</h1>
          <p className="text-zinc-300">
            Connect a Telegram bot, add a prompt, and it starts replying with AI.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg bg-zinc-800 p-3">✅ Google login</div>
          <div className="rounded-lg bg-zinc-800 p-3">✅ Telegram webhook</div>
          <div className="rounded-lg bg-zinc-800 p-3">✅ BYOK free plan</div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {session?.user?.email ? (
            <>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded bg-white text-black font-semibold"
              >
                Go to dashboard
              </Link>
              <form
                action={async () => {
                  "use server"
                  await signOut()
                }}
              >
                <button className="px-4 py-2 rounded bg-zinc-800">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <form
                action={async () => {
                  "use server"
                  await signIn("google")
                }}
                className="w-full sm:w-auto"
              >
                <button className="w-full px-4 py-2 rounded bg-white text-black font-semibold">
                  Sign in with Google
                </button>
              </form>
              <Link
                href="/pricing"
                className="px-4 py-2 rounded bg-zinc-800"
              >
                Pricing
              </Link>
            </>
          )}
        </div>

        <p className="text-xs text-zinc-500">
          Free plan uses your own OpenAI key, so it costs you $0 to offer.
        </p>
      </div>
    </main>
  )
}
