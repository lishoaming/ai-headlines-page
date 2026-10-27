import request from '../utils/request'

export function login(data) {
  return request.post('/api/user/login', data)
}

export function register(data) {
  return request.post('/api/user/register', data)
}

export function logout() {
  return request.post('/api/user/logout')
}

export function getUserInfo() {
  return request.get('/api/user/info')
}

export function updateUserInfo(data) {
  return request.put('/api/user/info', data)
}

export function updatePassword(data) {
  return request.post('/api/user/change-password', data)
}