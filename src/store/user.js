import { defineStore } from 'pinia'
import { getErrorMessage } from '../utils/request'
import { login as loginApi, register as registerApi, logout as logoutApi, getUserInfo, updatePassword as updatePasswordApi, updateUserInfo } from '../api/user'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    token: '',
    refreshToken: '',
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
          captchaId: userData.captchaId,
          captchaCode: userData.captchaCode,
        })

        if (res && res.code === 200) {
          this.userInfo = res.data.userInfo
          this.token = res.data.token
          this.refreshToken = res.data.refreshToken
          this.isLogin = true

          return { success: true, message: '登录成功' }
        }

        return { success: false, message: res?.message || '登录失败' }
      } catch (error) {
        // 拦截器已把后端 message 放进 Error.message，透传给调用方展示
        return {
          success: false,
          message: getErrorMessage(error, '登录请求失败，请稍后再试'),
        }
      }
    },

    async register(userData) {
      try {
        const res = await registerApi({
          username: userData.username,
          password: userData.password,
          captchaId: userData.captchaId,
          captchaCode: userData.captchaCode,
        })

        if (res && res.code === 200) {
          return { success: true, message: '注册成功' }
        }

        return { success: false, message: res?.message || '注册失败' }
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error, '注册请求失败，请稍后再试'),
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
      } catch (error) {
        return { success: false, message: getErrorMessage(error, '获取用户信息请求失败') }
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
      } catch (error) {
        return { success: false, message: getErrorMessage(error, '密码修改请求失败') }
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
      } catch (error) {
        return { success: false, message: getErrorMessage(error, '个人简介修改请求失败') }
      }
    },

    // 退出登录：通知后端吊销 token，再清空本地登录态
    async logout() {
      try {
        await logoutApi()
      } catch {
        // 后端登出失败也继续清本地，保证一定能登出
      }
      this.clearAuth()
    },

    // 清空本地登录态（token / refreshToken / 用户信息）
    clearAuth() {
      this.userInfo = null
      this.token = ''
      this.refreshToken = ''
      this.isLogin = false
    },
  },

  // 启用持久化：整个 state 存到 localStorage['user']，与 request.js 的读取保持一致
  persist: true,
})