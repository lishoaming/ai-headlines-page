/**
 * API配置文件
 * 包含API基础URL和AI问答功能所需的API参数
 * 敏感信息（API Key等）从环境变量读取
 */

export const aiChatConfig = {
  apiEndpoint: import.meta.env.VITE_AI_API_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  apiKey: import.meta.env.VITE_AI_API_KEY || '',
  model: import.meta.env.VITE_AI_MODEL || 'qwen3-max-preview',
}