import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { redirect } from "next/navigation"
import {
  connectTelegram,
  createAssistant,
  resetUsage,
  saveOpenAIKey,
} from "./actions"

function periodKey(d = new Date()) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export default async function Dashboard() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) redirect("/")

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) redirect("/")

  const assistants = await prisma.assistant.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      usages: { where: { period: periodKey() } },
    },
  })

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-400">
              Plan: <span className="text-zinc-200">{user.plan}</span>
            </p>
          </div>

          <form
            action={async () => {
              "use server"
              await signOut()
            }}
          >
            <button className="px-3 py-2 rounded bg-zinc-800">Sign out</button>
          </form>
        </header>

        <section className="rounded-2xl bg-zinc-900 p-6 space-y-3">
          <h2 className="text-lg font-semibold">Create assistant</h2>
          <form action={createAssistant} className="grid gap-3">
            <input
              name="name"
              className="p-2 rounded bg-zinc-800"
              placeholder="Name (e.g. Eazy Support Bot)"
              required
            />
            <input
              name="model"
              className="p-2 rounded bg-zinc-800"
              defaultValue="gpt-4o-mini"
            />
            <textarea
              name="systemPrompt"
              className="p-2 rounded bg-zinc-800 min-h-[120px]"
              placeholder="System prompt (job description)"
              required
              defaultValue="You are a helpful assistant."
            />
            <button className="px-4 py-2 rounded bg-white text-black font-semibold">
              Create
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your assistants</h2>

          {assistants.length === 0 ? (
            <p className="text-zinc-400">No assistants yet.</p>
          ) : (
            assistants.map((a) => {
              const usage = a.usages[0]
              const used = usage?.messagesUsed ?? 0

              return (
                <div key={a.id} className="rounded-2xl bg-zinc-900 p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold">{a.name}</div>
                      <div className="text-sm text-zinc-400">Model: {a.model}</div>
                      <div className="text-xs text-zinc-500 mt-1">ID: {a.id}</div>
                    </div>

                    <div className="text-sm">
                      {a.telegramBotTokenEnc ? (
                        <span className="text-green-400">Telegram connected</span>
                      ) : (
                        <span className="text-yellow-400">Telegram not connected</span>
                      )}
                      <div className="text-zinc-400 mt-1">
                        This month: <span className="text-zinc-200">{used}</span> msgs
                      </div>
                    </div>
                  </div>

                  <details className="text-sm">
                    <summary className="cursor-pointer text-zinc-300">
                      Add your OpenAI key (free plan = BYOK)
                    </summary>
                    <div className="mt-3 space-y-2 text-zinc-300">
                      <p className="text-xs text-zinc-500">
                        Free plan uses your key so it costs you $0. Leave blank to clear it.
                      </p>
                      <form action={saveOpenAIKey} className="grid gap-2">
                        <input type="hidden" name="assistantId" value={a.id} />
                        <input
                          name="openAiKey"
                          className="p-2 rounded bg-zinc-800"
                          placeholder="sk-..."
                        />
                        <button className="px-3 py-2 rounded bg-white text-black font-semibold">
                          Save OpenAI Key
                        </button>
                      </form>
                    </div>
                  </details>

                  <details className="text-sm">
                    <summary className="cursor-pointer text-zinc-300">
                      2) Connect Telegram bot token
                    </summary>
                    <div className="mt-3 space-y-2 text-zinc-300">
                      <ol className="list-decimal ml-5 space-y-1">
                        <li>Open Telegram and message @BotFather</li>
                        <li>Create a bot and copy its token</li>
                        <li>Paste the token here and connect</li>
                      </ol>

                      <form action={connectTelegram} className="grid gap-2">
                        <input type="hidden" name="assistantId" value={a.id} />
                        <input
                          name="botToken"
                          className="p-2 rounded bg-zinc-800"
                          placeholder="123456:ABC-DEF..."
                          required
                        />
                        <button className="px-3 py-2 rounded bg-white text-black font-semibold">
                          Connect Telegram
                        </button>
                      </form>
                    </div>
                  </details>

                  <form action={resetUsage}>
                    <input type="hidden" name="assistantId" value={a.id} />
                    <button className="text-xs text-zinc-400 underline">
                      Reset this month’s counter (admin)
                    </button>
                  </form>
                </div>
              )
            })
          )}
        </section>
      </div>
    </main>
  )
}
