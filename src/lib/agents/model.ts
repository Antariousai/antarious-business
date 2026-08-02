import { createOpenAI } from '@ai-sdk/openai'

const DEFAULT_GATEWAY_ID = 'openai/gpt-5.4-mini'

/** Canonical model id string for logging / usage events. */
export function resolveModelId(modelId = DEFAULT_GATEWAY_ID) {
  return modelId.startsWith('openai/') ? modelId : `openai/${modelId}`
}

/**
 * Language model for Freya agents.
 *
 * AI SDK string models like `openai/…` always go through **Vercel AI Gateway**.
 * `OPENAI_API_KEY` alone does NOT authenticate the gateway — so when only that
 * key is set, we use `@ai-sdk/openai` directly.
 */
export function resolveModel(modelId = DEFAULT_GATEWAY_ID) {
  const gatewayId = resolveModelId(modelId)
  const openAiId = gatewayId.replace(/^openai\//, '')

  if (process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_BASE_URL) {
    return gatewayId
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    return openai(openAiId)
  }

  // Caller should short-circuit via hasAiKey(); string would fail gateway auth.
  return gatewayId
}

export function hasAiKey() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY)
}
