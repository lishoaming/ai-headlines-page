import axios from 'axios'
import { showToast } from 'vant'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const request = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---------- 统一错误信息（供 store / 页面复用，避免各自写死"网络请求失败"） ----------
export const getErrorMessage = (error, fallback = '请求失败，请稍后重试') => {
  if (!error) return fallback
  if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
  if (!error.response) return '网络连接失败，请检查网络'
  return error.response.data?.message || error.message || fallback
}

// Toast 防抖：同一条错误 3 秒内只提示一次，避免并发请求刷屏
let lastToastTime = 0
let lastToastMessage = ''
const toastOnce = (message) => {
  const now = Date.now()
  if (message !== lastToastMessage || now - lastToastTime > 3000) {
    lastToastTime = now
    lastToastMessage = message
    showToast(message)
  }
}

// ---------- 本地登录态读写（对应 pinia 持久化的 localStorage['user']） ----------
const getUserStore = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveUserStore = (patch) => {
  try {
    localStorage.setItem('user', JSON.stringify({ ...getUserStore(), ...patch }))
  } catch {
    // ignore
  }
}

const getAccessToken = () => getUserStore().token || ''
const getRefreshToken = () => getUserStore().refreshToken || ''

// 清除本地登录状态
const clearLoginState = () => {
  saveUserStore({ token: '', refreshToken: '', isLogin: false, userInfo: null })
}

// 同步清理 pinia 内存中的登录态（仅改 localStorage 会导致页面仍显示"已登录"）
const syncLogoutToStore = async () => {
  try {
    const { useUserStore } = await import('../store/user')
    useUserStore().clearAuth()
  } catch {
    // Pinia 尚未初始化（极早期请求）时忽略
  }
}

// 刷新成功后同步 pinia 中的 token，避免 store 里一直是过期值
const syncTokenToStore = async (token, refreshToken) => {
  try {
    const { useUserStore } = await import('../store/user')
    const store = useUserStore()
    store.token = token
    store.refreshToken = refreshToken
    store.isLogin = true
  } catch {
    // ignore
  }
}

// ---------- 登录过期统一处理：清登录态 + 提示 + 跳登录 ----------
let redirectingToLogin = false
export const handleAuthExpired = async () => {
  clearLoginState()
  await syncLogoutToStore()
  toastOnce('登录已过期，请重新登录')
  if (redirectingToLogin) return
  redirectingToLogin = true
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
  setTimeout(() => {
    redirectingToLogin = false
  }, 3000)
}

// ---------- 刷新 access token（并发锁：多个请求 401 时只发一次刷新） ----------
let refreshPromise = null

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new Error('无 refresh token')
      }
      // 用原生 axios 直连，避免走本实例拦截器造成递归
      const res = await axios.post(
        `${baseURL}/api/user/refresh`,
        { refreshToken },
        { timeout: 15000 },
      )
      if (res.data?.code === 200 && res.data?.data) {
        saveUserStore({
          token: res.data.data.token,
          refreshToken: res.data.data.refreshToken,
        })
        await syncTokenToStore(res.data.data.token, res.data.data.refreshToken)
        return res.data.data.token
      }
      throw new Error(res.data?.message || '刷新失败')
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// 请求拦截器：自动注入 Bearer token
request.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器：统一错误处理 + 401 自动刷新重试
request.interceptors.response.use(
  (response) => {
    const { data } = response

    // 业务码非 200/0：视为失败（后端目前都用 HTTP 状态码表达，这里兜底）
    if (data && typeof data === 'object' && data.code !== 200 && data.code !== 0) {
      const error = new Error(data.message || '请求失败')
      error.notified = false
      return Promise.reject(error)
    }

    return data
  },
  async (error) => {
    const originalRequest = error.config || {}
    const status = error.response?.status

    // access token 失效：用 refresh token 换新后重试一次
    if (
      status === 401 &&
      !originalRequest._retried &&
      !(originalRequest.url || '').includes('/api/user/refresh')
    ) {
      originalRequest._retried = true
      try {
        await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`
        return request(originalRequest)
      } catch {
        await handleAuthExpired()
        error.message = '登录已过期，请重新登录'
        error.notified = true
        return Promise.reject(error)
      }
    }

    // 重试后仍 401，或本来就没有可用 token
    if (status === 401) {
      await handleAuthExpired()
      error.message = '登录已过期，请重新登录'
      error.notified = true
      return Promise.reject(error)
    }

    // 网络异常（无响应）：调用方给不出有效提示，这里统一提示一次
    if (!error.response) {
      error.message = getErrorMessage(error)
      toastOnce(error.message)
      error.notified = true
      return Promise.reject(error)
    }

    // 5xx：服务端异常，同样由拦截器统一提示
    if (status >= 500) {
      error.message = error.response.data?.message || '服务器繁忙，请稍后重试'
      toastOnce(error.message)
      error.notified = true
      return Promise.reject(error)
    }

    // 4xx 业务错误：把后端 message 透传给调用方展示（不重复弹提示）
    error.message = getErrorMessage(error)
    error.notified = false
    return Promise.reject(error)
  },
)

export default request
