<template>
  <div class="login-page">
    <van-nav-bar
      title="用户登录"
      left-arrow
      @click-left="onClickLeft"
      fixed
    />
    
    <div class="login-container">
      <div class="login-logo">
        <van-image
          width="80"
          height="80"
          src="https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg"
          round
        />
        <h2>新闻资讯</h2>
      </div>
      
      <van-form @submit="onSubmit" class="login-form">
        <van-cell-group inset>
          <van-field
            v-model="username"
            name="username"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请填写用户名' }]"
          />
          <van-field
            v-model="password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请填写密码' }]"
          />
          <van-field
            v-model="captchaCode"
            name="captchaCode"
            label="验证码"
            placeholder="请输入验证码"
            maxlength="4"
            :rules="[{ required: true, message: '请填写验证码' }]"
          >
            <template #button>
              <div class="captcha-box" @click="refreshCaptcha">
                <img v-if="captchaImage" :src="captchaImage" class="captcha-img" alt="验证码" />
                <span v-else class="captcha-text">{{ captchaLoading ? '加载中...' : '点击获取' }}</span>
              </div>
            </template>
          </van-field>
        </van-cell-group>
        
        <div class="submit-btn">
          <van-button round block type="primary" native-type="submit" size="large">
            登录
          </van-button>
        </div>
        
        <div class="login-tips">
          <p>测试账号：admin</p>
          <p>测试密码：123456</p>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { useUserStore } from '../store/user';
import { getCaptcha } from '../api/captcha';

const router = useRouter();
const userStore = useUserStore();

const username = ref('');
const password = ref('');

// 图形验证码
const captchaId = ref('');
const captchaCode = ref('');
const captchaImage = ref('');
const captchaLoading = ref(false);

// 获取/刷新验证码（点击图片也会刷新）
const refreshCaptcha = async () => {
  if (captchaLoading.value) return;
  captchaLoading.value = true;
  try {
    const res = await getCaptcha();
    if (res && res.code === 200) {
      captchaId.value = res.data.captchaId;
      captchaImage.value = res.data.image;
      captchaCode.value = '';
    }
  } catch {
    // 拦截器已提示具体错误，这里只清空图片，用户点击可重试
    captchaImage.value = '';
  } finally {
    captchaLoading.value = false;
  }
};

onMounted(refreshCaptcha);

const onSubmit = async (values) => {
  if (!captchaId.value) {
    showToast('验证码加载失败，请点击验证码重试');
    await refreshCaptcha();
    return;
  }

  // 显示加载提示
  showToast({
    type: 'loading',
    message: '登录中...',
    forbidClick: true,
    duration: 0
  });
  
  try {
    // 调用API登录
    const result = await userStore.login({
      username: username.value,
      password: password.value,
      captchaId: captchaId.value,
      captchaCode: captchaCode.value.trim(),
    });
    
    if (result.success) {
      showToast({
        type: 'success',
        message: result.message
      });
      
      router.push('/');
    } else {
      showToast({
        type: 'fail',
        message: result.message,
        wordBreak: 'break-word',
      });
      // 验证码校验通过后即失效（密码错误时也已消耗），失败后统一换一张
      await refreshCaptcha();
    }
  } catch (error) {
    showToast({
      type: 'fail',
      message: '登录失败，请稍后再试',
      wordBreak: 'break-word',
    });
    await refreshCaptcha();
  }
};

const onClickLeft = () => {
  router.back();
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.login-container {
  padding-top: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-logo {
  margin: 40px 0;
  text-align: center;
}

.login-logo h2 {
  margin-top: 16px;
  color: #323233;
  font-size: 22px;
}

.login-form {
  width: 100%;
  padding: 0 16px;
}

.submit-btn {
  margin: 24px 16px;
}

.captcha-box {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 96px;
  height: 36px;
  cursor: pointer;
}

.captcha-img {
  width: 96px;
  height: 36px;
  border-radius: 4px;
  display: block;
}

.captcha-text {
  font-size: 13px;
  color: #1989fa;
}

.login-tips {
  text-align: center;
  color: #969799;
  font-size: 14px;
  margin-top: 16px;
}

.login-tips p {
  margin: 8px 0;
}
</style>