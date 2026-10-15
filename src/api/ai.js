import { aiChatConfig } from '../config/api'

export async function sendChatMessage(messages) {
  const response = await fetch(aiChatConfig.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiChatConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: aiChatConfig.model,
      messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI 接口请求失败: ${response.status}`)
  }

  return response.json()
}