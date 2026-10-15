import { defineStore } from 'pinia'
import { getNewsCategories, getNewsList, getNewsDetail as fetchNewsDetail } from '../../api/news'

export const useNewsStore = defineStore('news', {
  state: () => ({
    newsList: [],
    newsDetail: {},
    categories: [],
    currentCategory: 1,
    loading: false,
    refreshing: false,
    finished: false,
    error: false,
    categoriesLoading: false,
  }),

  actions: {
    async getCategories() {
      if (this.categoriesLoading) return
      this.error = false

      this.categoriesLoading = true

      try {
        const res = await getNewsCategories()

        if (res && res.code === 200) {
          this.categories = [...res.data, { id: 10, name: '更多' }]

          if (!this.currentCategory && this.categories.length > 0) {
            this.currentCategory = this.categories[0].id
          }
        }
      } catch {
        this.error = true
        this.categories = [
          { id: 1, name: '头条' },
          { id: 2, name: '社会' },
          { id: 3, name: '国内' },
          { id: 4, name: '国际' },
          { id: 5, name: '娱乐' },
          { id: 6, name: '体育' },
          { id: 7, name: '科技' },
        ]
      } finally {
        this.categoriesLoading = false
      }
    },

    changeCategory(categoryId) {
      if (this.currentCategory !== categoryId) {
        this.currentCategory = categoryId
        this.newsList = []
        this.finished = false
        this.error = false
        this.getNewsList(true)
      }
    },

    async getNewsList(isRefresh = false) {
      // 如果已出错且不是手动刷新，阻止重试
      if (this.error && !isRefresh) return

      if (isRefresh) {
        this.refreshing = true
        this.newsList = []
        this.finished = false
        this.error = false
      }

      this.loading = true

      try {
        const params = {
          categoryId: this.currentCategory,
          page: isRefresh ? 1 : Math.ceil(this.newsList.length / 10) + 1,
          pageSize: 10,
        }

        const res = await getNewsList(params)

        if (res && res.code === 200) {
          const newsData = res.data.list

          this.newsList = isRefresh ? newsData : [...this.newsList, ...newsData]

          if (newsData.length < params.pageSize) {
            this.finished = true
          }
        }
      } catch {
        this.error = true
        this.finished = true
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },

    async getNewsDetail(id) {
      try {
        const res = await fetchNewsDetail(id)

        if (res && res.code === 200) {
          this.newsDetail = res.data
        }
      } catch {
        // 错误已由拦截器统一处理
      }
    },

  },
})