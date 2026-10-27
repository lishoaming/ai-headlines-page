import request from '../utils/request'

export function addHistory(newsId) {
  return request.post('/api/history/add', { newsId })
}

export function getHistoryList() {
  return request.get('/api/history/list')
}

export function removeHistory(id) {
  return request.delete('/api/history/remove', { params: { id } })
}

export function clearHistory() {
  return request.delete('/api/history/clear')
}