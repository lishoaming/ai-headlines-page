import { defineStore } from 'pinia'
import { login as loginApi, register as registerApi, getUserInfo, updatePassword as updatePasswordApi, updateUserInfo } from '../api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: '',
    isLogin: false,
    userBio: '这是我的个人简介',
  }),

  getters: {
    getUserInfo: (state) => state.userInfo,
    getToken: (state) => state.token,
    getLoginStatus: (state) => state.isLogin,
    getUserBio: (state) => state.userInfo?.bio || state.userBio,
  },

  actions: {
    async login(userData) {
      try {
        const res = await loginApi({
          username: userData.username,
          password: userData.password,
        })

        if (res && res.code === 200) {
          this.userInfo = res.data.userInfo
          this.token = res.data.token
          this.isLogin = true

          return { success: true, message: '登录成功' }
        }

        return { success: false, message: res?.message || '登录失败' }
      } catch (error) {
        return {
          success: false,
          message: error?.response?.data?.message || '登录请求失败，请稍后再试',
        }
      }
    },

    async register(userData) {
      try {
        const res = await registerApi({
          username: userData.username,
          password: userData.password,
        })

        if (res && res.code === 200) {
          this.userInfo = res.data.userInfo
          this.token = res.data.token
          this.isLogin = true

          return { success: true, message: '注册成功' }
        }

        return { success: false, message: res?.message || '注册失败' }
      } catch (error) {
        return {
          success: false,
          message: error?.response?.data?.message || '注册请求失败，请稍后再试',
        }
      }
    },

    async getUserInfoDetail() {
      try {
        if (!this.isLogin) {
          return { success: false, message: '请先登录' }
        }

        const res = await getUserInfo()

        if (res && res.code === 200) {
          this.userInfo = res.data
          return { success: true, data: res.data }
        }

        return { success: false, message: res?.message || '获取用户信息失败' }
      } catch {
        return { success: false, message: '获取用户信息请求失败' }
      }
    },

    async updatePassword(oldPassword, newPassword) {
      try {
        if (!this.isLogin) {
          return { success: false, message: '请先登录' }
        }

        const res = await updatePasswordApi({
          oldPassword,
          newPassword,
        })

        if (res && res.code === 200) {
          return { success: true, message: '密码修改成功' }
        }

        return { success: false, message: res?.message || '密码修改失败' }
      } catch {
        return { success: false, message: '密码修改请求失败' }
      }
    },

    async updateUserBio(bio) {
      try {
        if (!this.isLogin) {
          return { success: false, message: '请先登录' }
        }

        const res = await updateUserInfo({ bio })

        if (res && res.code === 200) {
          if (this.userInfo) {
            this.userInfo.bio = bio
          }
          return { success: true, message: '个人简介修改成功' }
        }

        return { success: false, message: res?.message || '个人简介修改失败' }
      } catch {
        return { success: false, message: '个人简介修改请求失败' }
      }
    },

    logout() {
      this.userInfo = null
      this.token = ''
      this.isLogin = false
    },
  },
})