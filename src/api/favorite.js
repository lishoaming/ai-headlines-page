import request from '../utils/request'

export function checkFavorite(newsId) {
  return request.get('/api/favorite/check', { params: { newsId } })
}

export function addFavorite(newsId) {
  return request.post('/api/favorite/add', { newsId })
}

export function removeFavorite(newsId) {
  return request.post('/api/favorite/remove', { newsId })
}

export function getFavoriteList() {
  return request.get('/api/favorite/list')
}