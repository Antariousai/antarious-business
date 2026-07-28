/** Resolve model id for AI Gateway / OpenAI. */
export function resolveModelId(modelId = 'openai/gpt-5.4-mini') {
  // Direct OpenAI key without gateway: strip openai/ prefix for @ai-sdk/openai string models
  // ToolLoopAgent accepts provider/model strings when AI Gateway is configured.
  if (process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_BASE_URL) {
    return modelId.startsWith('openai/') ? modelId : `openai/${modelId}`
  }
  if (process.env.OPENAI_API_KEY) {
    // With OPENAI_API_KEY alone, AI SDK still accepts openai/… via gateway-less provider registry
    return modelId.startsWith('openai/') ? modelId : `openai/${modelId}`
  }
  // Placeholder — routes should short-circuit when hasAiKey() is false
  return modelId.startsWith('openai/') ? modelId : `openai/${modelId}`
}

export function hasAiKey() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY)
}
