import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Toast 防抖：同类型错误 3 秒内不重复提示
let lastToastTime = 0
let lastToastMessage = ''
const debouncedToast = (message) => {
  const now = Date.now()
  if (message !== lastToastMessage || now - lastToastTime > 3000) {
    lastToastTime = now
    lastToastMessage = message
    showToast(message)
  }
}

// 从 localStorage 读取 token（避免循环依赖）
const getToken = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return ''
    const data = JSON.parse(raw)
    return data?.token || ''
  } catch {
    return ''
  }
}

// 清除本地登录状态
const clearLoginState = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return
    const data = JSON.parse(raw)
    data.token = ''
    data.isLogin = false
    data.userInfo = null
    localStorage.setItem('user', JSON.stringify(data))
  } catch {
    // ignore
  }
}

// 请求拦截器：自动注入 Token
request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response) => {
    const { data } = response

    if (data.code === 401) {
      clearLoginState()
      debouncedToast('登录已过期，请重新登录')
      return Promise.reject(new Error(data.message || '未授权'))
    }

    if (data.code === 403) {
      debouncedToast(data.message || '没有权限访问')
      return Promise.reject(new Error(data.message || '禁止访问'))
    }

    if (data.code !== 200 && data.code !== 0) {
      debouncedToast(data.message || '请求失败')
      return Promise.reject(new Error(data.message || '请求失败'))
    }

    return data
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      debouncedToast('请求超时，请稍后重试')
      return Promise.reject(error)
    }

    if (error.message === 'Network Error' || !error.response) {
      debouncedToast('网络连接失败，请检查网络')
      return Promise.reject(error)
    }

    const { status } = error.response || {}
    switch (status) {
      case 401:
        clearLoginState()
        debouncedToast('登录已过期，请重新登录')
        break
      case 403:
        debouncedToast('没有权限访问')
        break
      case 404:
        debouncedToast('请求的资源不存在')
        break
      case 500:
        debouncedToast('服务器错误')
        break
      default:
        debouncedToast('网络请求失败')
    }

    return Promise.reject(error)
  }
)

export default request