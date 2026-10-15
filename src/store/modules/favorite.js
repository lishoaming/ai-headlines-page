import { defineStore } from 'pinia'
import { useUserStore } from '../user'
import {
  checkFavorite,
  removeFavorite as removeFavoriteApi,
} from '../../api/favorite'

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: [],
    loading: false,
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
      } catch {
        return { success: true, isFavorite: this.isFavorite(newsId), isLocal: true }
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
          return { success: true, data: res.data }
        }
        return { success: false, message: res.message || '取消收藏失败' }
      } catch {
        return { success: false, message: '网络请求失败' }
      } finally {
        this.loading = false
      }
    },
  },
})