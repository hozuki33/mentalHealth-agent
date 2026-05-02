import service from '@/utils/request'

type ApiParams = Record<string, unknown>
type ApiPayload = Record<string, unknown>
type ApiId = string | number

export function login(data: ApiPayload) {
  return service.post('/user/login', data, { skipAuth: true })
}

// 知识文章页面获取分类信息
export function categoryTree() {
  return service.get('/knowledge/category/tree')
}

export function articleTagList() {
  return service.get('/knowledge/tag/list')
}

export function articlePage(params: ApiParams) {
  return service.get('/knowledge/article/page', { params })
}

// 文件上传
export function uploadFile(file: File, businessInfo: { businessId: ApiId }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('businessType', 'ARTICLE')
  formData.append('businessId', String(businessInfo.businessId))
  formData.append('businessField', 'cover')

  return service.post('/file/upload', formData)
}

// 创建文章
export function createArticle(data: ApiPayload) {
  return service.post('/knowledge/article', data)
}

// 获取已创建文章信息
export function getArticleDetail(id: ApiId) {
  return service.get(`/knowledge/article/${id}`)
}

// 更新文章
export function updateArticle(id: ApiId, data: ApiPayload) {
  return service.put(`/knowledge/article/${id}`, data)
}

// 修改文章状态
export function changeArticleStatus(id: ApiId, data: ApiPayload) {
  return service.put(`/knowledge/article/${id}/status`, data)
}

// 删除文章
export function deleteArticle(id: ApiId) {
  return service.delete(`/knowledge/article/${id}`)
}

// 分页查询咨询对话
export function getConsultationPage(params: ApiParams) {
  return service.get('/psychological-chat/sessions', { params })
}

// 咨询id
export function getSessionDetail(sessionID: ApiId) {
  return service.get(`/psychological-chat/sessions/${sessionID}/messages`)
}

// 情绪评价分页列表
export function getEmotionalPage(params: ApiParams) {
  return service.get('/emotion-diary/admin/page', { params })
}

// 删除情绪日志
export function deleteEmotional(id: ApiId) {
  return service.delete(`/emotion-diary/admin/${id}`)
}

// 获取综合数据分析
export function getAnalyticsOverview() {
  return service.get('/data-analytics/overview')
}

// 用户登出接口
export function logout() {
  return service.post('/user/logout')
}
