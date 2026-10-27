import { defineStore } from 'pinia'
import { useUserStore } from '../user'
import { getErrorMessage } from '../../utils/request'
import {
  addHistory as addHistoryApi,
  removeHistory as removeHistoryApi,
  getHistoryList as getHistoryListApi,
  clearHistory as clearHistoryApi,
} from '../../api/history'

export const useHistoryStore = defineStore('history', {
  state: () => ({
    history: [],
  }),

  getters: {
    getHistory: (state) => state.history,
  },

  actions: {
    async addHistoryApi(newsId) {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        return { success: false, message: '请先登录' }
      }

      try {
        const res = await addHistoryApi(newsId)

        if (res.code === 200) {
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '添加浏览历史失败' }
      } catch (error) {
        // 保留后端真实提示（如参数错误），仅在无响应时给网络提示
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      }
    },

    async removeHistoryApi(id) {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        return { success: false, message: '请先登录' }
      }

      try {
        const res = await removeHistoryApi(id)

        if (res.code === 200) {
          // 删除成功后同步移除本地列表项，否则页面不会刷新
          this.history = this.history.filter(item => String(item.id) !== String(id))
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '删除浏览历史失败' }
      } catch (error) {
        // 后端业务错误（如记录已被删除）要原样提示，不能笼统说"网络请求失败"
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      }
    },

    async getHistoryListApi() {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        return { success: false, message: '请先登录' }
      }

      try {
        const res = await getHistoryListApi()

        if (res.code === 200) {
          this.history = res.data.list || res.data || []
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '获取浏览历史失败' }
      } catch (error) {
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      }
    },

    clearHistory() {
      this.history = []
      this.saveHistory()
    },

    async clearHistoryApi() {
      const userStore = useUserStore()

      if (!userStore.getLoginStatus) {
        this.clearHistory()
        return { success: true, isLocal: true }
      }

      try {
        const res = await clearHistoryApi()

        if (res.code === 200) {
          this.clearHistory()
          return { success: true }
        }
        return { success: false, message: res.message || '清空浏览历史失败' }
      } catch (error) {
        // 失败时不能假装成功清空：以服务端结果为准，否则刷新后记录又会出现
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      }
    },

    saveHistory() {
      localStorage.setItem('browseHistory', JSON.stringify(this.history))
    },

    loadHistory() {
      const saved = localStorage.getItem('browseHistory')
      if (saved) {
        try {
          this.history = JSON.parse(saved)
        } catch {
          this.history = []
        }
      }
    },
  },
})