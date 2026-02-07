"use server"

import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encryptString } from "@/lib/crypto"
import { getBaseUrl } from "@/lib/baseUrl"
import { randomBytes } from "crypto"
import { revalidatePath } from "next/cache"

function periodKey(d = new Date()) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

async function requireUser() {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error("Unauthorized")

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error("User not found (try signing out/in)")

  return user
}

const createAssistantSchema = z.object({
  name: z.string().min(1).max(80),
  model: z.string().min(1).max(60),
  systemPrompt: z.string().min(1).max(4000),
})

export async function createAssistant(formData: FormData) {
  const user = await requireUser()

  const parsed = createAssistantSchema.safeParse({
    name: String(formData.get("name") || ""),
    model: String(formData.get("model") || "gpt-4o-mini"),
    systemPrompt: String(formData.get("systemPrompt") || ""),
  })
  if (!parsed.success) throw new Error(parsed.error.message)

  await prisma.assistant.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      model: parsed.data.model,
      systemPrompt: parsed.data.systemPrompt,
    },
  })

  revalidatePath("/dashboard")
}

export async function saveOpenAIKey(formData: FormData) {
  const user = await requireUser()
  const assistantId = String(formData.get("assistantId") || "")
  const openAiKey = String(formData.get("openAiKey") || "").trim()

  const assistant = await prisma.assistant.findFirst({
    where: { id: assistantId, ownerId: user.id },
  })
  if (!assistant) throw new Error("Assistant not found")

  await prisma.assistant.update({
    where: { id: assistantId },
    data: {
      openAiKeyEnc: openAiKey ? encryptString(openAiKey) : null,
    },
  })

  revalidatePath("/dashboard")
}

export async function connectTelegram(formData: FormData) {
  const user = await requireUser()

  const assistantId = String(formData.get("assistantId") || "")
  const botToken = String(formData.get("botToken") || "").trim()

  const assistant = await prisma.assistant.findFirst({
    where: { id: assistantId, ownerId: user.id },
  })
  if (!assistant) throw new Error("Assistant not found")

  // Telegram secret_token allowed chars A-Z a-z 0-9 _ -
  const secretToken = randomBytes(32).toString("base64url")
  const webhookUrl = `${getBaseUrl()}/api/telegram/webhook/${assistantId}`

  // Validate token
  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  const me = await meRes.json()
  if (!me.ok) throw new Error("Invalid Telegram bot token")

  // Set webhook + secret token header verification
  const setRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      drop_pending_updates: true,
    }),
  })
  const set = await setRes.json()
  if (!set.ok) throw new Error(`Failed to set webhook: ${set.description}`)

  await prisma.assistant.update({
    where: { id: assistantId },
    data: {
      telegramBotTokenEnc: encryptString(botToken),
      telegramSecretToken: secretToken,
    },
  })

  revalidatePath("/dashboard")
}

export async function resetUsage(formData: FormData) {
  const user = await requireUser()
  const assistantId = String(formData.get("assistantId") || "")

  const assistant = await prisma.assistant.findFirst({
    where: { id: assistantId, ownerId: user.id },
  })
  if (!assistant) throw new Error("Assistant not found")

  const period = periodKey()
  await prisma.usage.upsert({
    where: { assistantId_period: { assistantId, period } },
    create: { assistantId, period, messagesUsed: 0 },
    update: { messagesUsed: 0 },
  })

  revalidatePath("/dashboard")
}
