import OpenAI from "openai"

export async function generateReply(opts: {
  apiKey: string
  model: string
  systemPrompt: string
  input: string
  maxOutputTokens?: number
}) {
  const { apiKey, model, systemPrompt, input, maxOutputTokens = 300 } = opts

  const client = new OpenAI({ apiKey })

  // Responses API
  const response = await client.responses.create({
    model,
    instructions: systemPrompt,
    input,
    max_output_tokens: maxOutputTokens,
  })

  // SDK convenience accessor
  return response.output_text ?? ""
}
