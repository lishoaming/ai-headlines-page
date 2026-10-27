import request, { refreshAccessToken, handleAuthExpired } from '../utils/request'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

// 从持久化的登录态中取 access token（与 utils/request.js 的读取方式保持一致）
const getAccessToken = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw).token || '' : ''
  } catch {
    return ''
  }
}

// 非流式问答：等模型生成完整回答后一次性返回
export function sendChatMessage(messages) {
  return request.post('/api/ai/chat', { messages })
}

// 发起一次流式请求（fetch 不走 axios 拦截器，需要自己带 token）
const postStream = (token, messages, signal) => {
  return fetch(`${baseURL}/api/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  })
}

/**
 * 流式问答（SSE）
 * @param {Array<{role: string, content: string}>} messages 完整对话历史，最后一条必须是 user
 * @param {(text: string) => void} onChunk 收到增量文本时回调
 * @param {AbortSignal} [signal] 用于中断请求
 * @returns {Promise<string>} 完整回答
 */
export async function streamChatMessage(messages, onChunk, signal) {
  if (!getAccessToken()) {
    throw new Error('请先登录后再使用 AI 问答')
  }

  let response
  try {
    response = await postStream(getAccessToken(), messages, signal)

    // access token 过期：刷新后重试一次（与 axios 拦截器行为保持一致）
    if (response.status === 401) {
      let token
      try {
        token = await refreshAccessToken()
      } catch {
        await handleAuthExpired()
        throw new Error('登录已过期，请重新登录')
      }
      response = await postStream(token, messages, signal)
    }
  } catch (error) {
    if (error.name === 'AbortError') throw error
    // 已经带上明确业务提示（如登录过期）时原样抛出
    if (error.message && !/Failed to fetch|NetworkError|Load failed/i.test(error.message)) throw error
    throw new Error('网络连接失败，请检查网络')
  }

  if (response.status === 401) {
    await handleAuthExpired()
    throw new Error('登录已过期，请重新登录')
  }

  if (!response.ok) {
    // 后端统一响应体：{ code, message, data }
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `AI 接口请求失败: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue

      let json
      try {
        json = JSON.parse(data)
      } catch {
        continue
      }

      // 流式过程中后端抛错时会下发 error 事件
      if (json.error) {
        throw new Error(json.error.message || 'AI 服务异常')
      }

      const content = json.choices?.[0]?.delta?.content || ''
      if (content) {
        answer += content
        onChunk?.(content)
      }
    }
  }

  return answer
}
