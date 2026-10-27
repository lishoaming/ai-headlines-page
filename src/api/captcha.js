import request from '../utils/request'

// 获取图形验证码：返回 { captchaId, image, expiresIn }
export function getCaptcha() {
  return request.get('/api/captcha')
}
