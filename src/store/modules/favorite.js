import { defineStore } from 'pinia'
import { useUserStore } from '../user'
import { getErrorMessage } from '../../utils/request'
import {
  checkFavorite,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  getFavoriteList as getFavoriteListApi,
} from '../../api/favorite'

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: [],
    loading: false,
    lastError: '', // 最近一次收藏操作失败的原因，供页面提示
  }),

  getters: {
    getFavorites: (state) => state.favorites,
    isFavorite: (state) => (id) => state.favorites.some((item) => item.id === id),
  },

  actions: {
    async checkFavoriteStatusApi(newsId) {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        return { success: true, isFavorite: this.isFavorite(newsId), isLocal: true }
      }

      try {
        this.loading = true
        const res = await checkFavorite(newsId)

        if (res.code === 200) {
          return { success: true, isFavorite: res.data.isFavorite }
        }
        return { success: false, message: res.message || '获取收藏状态失败' }
      } catch (error) {
        // 网络异常时回退到本地状态；业务错误（如未登录）如实返回
        if (!error.response) {
          return { success: true, isFavorite: this.isFavorite(newsId), isLocal: true }
        }
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      } finally {
        this.loading = false
      }
    },

    async removeFavoriteApi(newsId) {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        return { success: false, message: '请先登录' }
      }

      try {
        this.loading = true
        const res = await removeFavoriteApi(newsId)

        if (res.code === 200) {
          this.removeFavorite(newsId)
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '取消收藏失败' }
      } catch (error) {
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      } finally {
        this.loading = false
      }
    },

    // 本地：加入收藏列表并持久化
    addFavorite(news) {
      if (!this.isFavorite(news.id)) {
        this.favorites.unshift({ ...news })
      }
      this.saveFavorites()
    },

    // 本地：从收藏列表移除并持久化
    removeFavorite(newsId) {
      this.favorites = this.favorites.filter((item) => item.id !== newsId)
      this.saveFavorites()
    },

    // 调API获取收藏列表，成功后覆盖本地数据
    async getFavoriteListApi() {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        return { success: false, message: '请先登录' }
      }

      try {
        this.loading = true
        const res = await getFavoriteListApi()

        if (res.code === 200) {
          this.favorites = res.data.list || res.data || []
          this.saveFavorites()
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '获取收藏列表失败' }
      } catch (error) {
        return { success: false, message: getErrorMessage(error), notified: !!error.notified }
      } finally {
        this.loading = false
      }
    },

    // 页面进入时加载收藏：已登录走服务端，失败/未登录回退本地缓存
    async loadFavorites() {
      const userStore = useUserStore()
      if (userStore.getLoginStatus) {
        const result = await this.getFavoriteListApi()
        if (result.success) return result
      }
      this.loadLocalFavorites()
      return { success: true, isLocal: true }
    },

    // 切换收藏状态：成功返回 true(已收藏)/false(已取消)，失败返回 null
    async toggleFavorite(news) {
      const userStore = useUserStore()

      // 未登录：仅本地切换（NewsDetail 正常流程已在页面层拦截，此处兜底）
      if (!userStore.getLoginStatus) {
        if (this.isFavorite(news.id)) {
          this.removeFavorite(news.id)
          return false
        }
        this.addFavorite(news)
        return true
      }

      try {
        this.loading = true
        this.lastError = ''
        if (this.isFavorite(news.id)) {
          const res = await removeFavoriteApi(news.id)
          if (res && res.code === 200) {
            this.removeFavorite(news.id)
            return false
          }
          this.lastError = res?.message || '取消收藏失败'
          return null
        }
        const res = await addFavoriteApi(news.id)
        if (res && res.code === 200) {
          this.addFavorite(news)
          return true
        }
        this.lastError = res?.message || '收藏失败'
        return null
      } catch (error) {
        this.lastError = getErrorMessage(error)
        return null
      } finally {
        this.loading = false
      }
    },

    // 后端未提供批量清空接口，逐条调用取消收藏
    async clearFavoritesApi() {
      const userStore = useUserStore()
      if (!userStore.getLoginStatus) {
        this.favorites = []
        this.saveFavorites()
        return { success: true, isLocal: true }
      }

      const remain = []
      for (const item of this.favorites) {
        try {
          const res = await removeFavoriteApi(item.id)
          if (!res || res.code !== 200) remain.push(item)
        } catch {
          remain.push(item)
        }
      }
      this.favorites = remain
      this.saveFavorites()

      if (remain.length === 0) {
        return { success: true }
      }
      return { success: false, message: '部分收藏清空失败' }
    },

    saveFavorites() {
      localStorage.setItem('favorites', JSON.stringify(this.favorites))
    },

    loadLocalFavorites() {
      const saved = localStorage.getItem('favorites')
      if (saved) {
        try {
          this.favorites = JSON.parse(saved)
        } catch {
          this.favorites = []
        }
      }
    },
  },
})