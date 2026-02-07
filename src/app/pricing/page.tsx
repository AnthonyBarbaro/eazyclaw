import Link from "next/link"

export default function Pricing() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="text-zinc-300 underline">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold">Pricing</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-zinc-900 p-6 space-y-2">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="text-zinc-300">$0/month</p>
            <ul className="text-sm text-zinc-300 list-disc ml-5 space-y-1">
              <li>Connect Telegram bot</li>
              <li>Custom prompt</li>
              <li>Uses your OpenAI key (BYOK)</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-6 space-y-2 border border-white">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="text-zinc-300">$29/month</p>
            <ul className="text-sm text-zinc-300 list-disc ml-5 space-y-1">
              <li>Uses platform key (no BYOK)</li>
              <li>Higher monthly limits</li>
              <li>Priority speed</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
