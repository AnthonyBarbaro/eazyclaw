import { prisma } from "@/lib/prisma"
import { decryptString } from "@/lib/crypto"
import { generateReply } from "@/lib/openai"

export const runtime = "nodejs"

function periodKey(d = new Date()) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

function getLimits(plan: string) {
  const freeTrial = Number(process.env.FREE_PLATFORM_TRIAL_MESSAGES || "0")
  const proLimit = Number(process.env.PRO_MESSAGES_PER_MONTH || "5000")

  return { freeTrial, proLimit, plan }
}

export async function POST(
  req: Request,
  { params }: { params: { assistantId: string } }
) {
  const assistantId = params.assistantId

  const assistant = await prisma.assistant.findUnique({
    where: { id: assistantId },
    include: { owner: true },
  })
  if (!assistant) return new Response("Not found", { status: 404 })

  // Verify Telegram secret header (only works if setWebhook secret_token was set)
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token")
  if (!assistant.telegramSecretToken || secretHeader !== assistant.telegramSecretToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  const update = await req.json()
  const chatId = update?.message?.chat?.id
  const text = update?.message?.text

  if (!chatId || typeof text !== "string") {
    return Response.json({ ok: true })
  }

  // Determine which OpenAI key to use:
  // - Free plan: BYOK required (so it costs you $0)
  // - Pro plan: can use platform key
  const { freeTrial, proLimit } = getLimits(assistant.owner.plan)

  const byokKey = assistant.openAiKeyEnc ? decryptString(assistant.openAiKeyEnc) : null
  const platformKey = process.env.PLATFORM_OPENAI_API_KEY || null

  let apiKeyToUse: string | null = null
  let monthlyLimit: number = 0

  if (assistant.owner.plan === "pro") {
    apiKeyToUse = platformKey ?? byokKey
    monthlyLimit = proLimit
  } else {
    // free
    apiKeyToUse = byokKey ?? (freeTrial > 0 ? platformKey : null)
    monthlyLimit = byokKey ? 999999 : freeTrial
  }

  // If no key available, instruct user
  if (!apiKeyToUse) {
    await safeSendTelegram(assistant, chatId, "Free plan requires your own OpenAI API key. Add it in the EazyClaw dashboard.")
    return Response.json({ ok: true })
  }

  // Usage tracking (atomic-ish): ensure row exists, then conditional increment
  const period = periodKey()
  await prisma.usage.upsert({
    where: { assistantId_period: { assistantId, period } },
    create: { assistantId, period, messagesUsed: 0 },
    update: {},
  })

  const updated = await prisma.usage.updateMany({
    where: {
      assistantId,
      period,
      messagesUsed: { lt: monthlyLimit },
    },
    data: {
      messagesUsed: { increment: 1 },
      lastMessageAt: new Date(),
    },
  })

  if (updated.count === 0) {
    await safeSendTelegram(assistant, chatId, "Monthly limit reached. Upgrade to continue.")
    return Response.json({ ok: true })
  }

  // Call OpenAI
  let reply = ""
  try {
    reply = await generateReply({
      apiKey: apiKeyToUse,
      model: assistant.model,
      systemPrompt: assistant.systemPrompt,
      input: text,
      maxOutputTokens: 300,
    })
  } catch (e) {
    reply = "Sorry — I had trouble generating a reply. Try again."
  }

  await safeSendTelegram(assistant, chatId, reply || "…")
  return Response.json({ ok: true })
}

async function safeSendTelegram(
  assistant: { telegramBotTokenEnc: string | null },
  chatId: number,
  text: string
) {
  if (!assistant.telegramBotTokenEnc) return
  const token = decryptString(assistant.telegramBotTokenEnc)

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
