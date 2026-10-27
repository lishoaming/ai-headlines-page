import request from '../utils/request'

export function getNewsCategories() {
  return request.get('/api/news/categories')
}

export function getNewsList(params) {
  return request.get('/api/news/list', { params })
}

export function getNewsDetail(id) {
  return request.get('/api/news/detail', { params: { id } })
}