import { fileBaseUrl } from '@/config'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestOptions extends RequestInit {
  params?: Record<string, unknown>
  skipAuth?: boolean
}

const AUTH_TOKEN_KEY = 'mental-health-admin-token'

function buildUrl(url: string, params?: Record<string, unknown>) {
  const fullUrl = /^https?:\/\//.test(url)
    ? url
    : `${fileBaseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
  const target = new URL(fullUrl, window.location.origin)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      target.searchParams.set(key, String(value))
    }
  })

  return target.toString()
}

async function request(method: HttpMethod, url: string, data?: unknown, options: RequestOptions = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const headers = new Headers(options.headers)
  const isFormData = data instanceof FormData

  if (!isFormData && data !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token && !options.skipAuth && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(buildUrl(url, options.params), {
    ...options,
    method,
    headers,
    body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'message' in payload ? String(payload.message) : '请求失败'
    throw new Error(message)
  }

  if (typeof payload === 'object' && payload !== null) {
    const result = payload as { code?: number | string; success?: boolean; message?: string; msg?: string; data?: unknown }
    const hasBusinessCode = result.code !== undefined
    const businessSuccess = result.success !== false && (!hasBusinessCode || ['0', '200'].includes(String(result.code)))

    if (!businessSuccess) {
      throw new Error(result.message || result.msg || '请求失败')
    }

    return Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result
  }

  return payload
}

export default {
  get(url: string, options?: RequestOptions) {
    return request('GET', url, undefined, options)
  },
  post(url: string, data?: unknown, options?: RequestOptions) {
    return request('POST', url, data, options)
  },
  put(url: string, data?: unknown, options?: RequestOptions) {
    return request('PUT', url, data, options)
  },
  delete(url: string, options?: RequestOptions) {
    return request('DELETE', url, undefined, options)
  },
}
