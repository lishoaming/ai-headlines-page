import { defineStore } from 'pinia'
import { useUserStore } from '../user'
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
      } catch {
        return { success: false, message: '网络请求失败' }
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
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '删除浏览历史失败' }
      } catch {
        return { success: false, message: '网络请求失败' }
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
      } catch {
        return { success: false, message: '网络请求失败' }
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
      } catch {
        this.clearHistory()
        return { success: true, isLocal: true }
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