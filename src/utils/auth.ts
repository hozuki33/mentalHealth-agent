const AUTH_TOKEN_KEY = 'mental-health-admin-token'
const AUTH_USER_KEY = 'mental-health-admin-user'
const AUTH_PROFILE_KEY = 'mental-health-admin-profile'

export const ADMIN_PROFILE_CHANGED_EVENT = 'admin-profile-changed'

export interface AdminUser {
  username: string
  nickname: string
  phone: string
  email: string
  role: string
  department: string
  bio: string
  status: string
  avatar: string
  lastLoginAt: string
}

export type AdminProfileInput = Pick<AdminUser, 'nickname' | 'phone' | 'email' | 'department' | 'bio'>

function createDefaultAdminUser(username: string): AdminUser {
  return {
    username,
    nickname: username,
    phone: '13800000000',
    email: `${username}@example.com`,
    role: '系统管理员',
    department: '心理健康运营中心',
    bio: '负责心理健康助手后台内容维护、咨询记录跟进和用户情绪数据管理。',
    status: '正常',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    lastLoginAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

function notifyProfileChanged() {
  window.dispatchEvent(new Event(ADMIN_PROFILE_CHANGED_EVENT))
}

function readProfile(): Partial<AdminUser> | null {
  const raw = localStorage.getItem(AUTH_PROFILE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as Partial<AdminUser>
  } catch {
    return null
  }
}

export function isAdminLoggedIn() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
}

export function getAuthToken() {
  const raw = localStorage.getItem(AUTH_TOKEN_KEY)
  return raw ? raw.replace(/^Bearer\s+/i, '').trim() : ''
}

export const BACKEND_ADMIN_USERNAME = 'admin'

export function isBackendAdminSession(): boolean {
  const u = (localStorage.getItem(AUTH_USER_KEY) || '').trim().toLowerCase()
  return u === BACKEND_ADMIN_USERNAME
}

export function getAdminUser(): AdminUser {
  const username = localStorage.getItem(AUTH_USER_KEY) || 'admin'
  return {
    ...createDefaultAdminUser(username),
    ...readProfile(),
    username,
  }
}

export function getAdminDisplayName() {
  const user = getAdminUser()
  return user.nickname || user.username
}

export function updateAdminProfile(profile: AdminProfileInput) {
  const nextProfile = {
    ...getAdminUser(),
    ...profile,
  }
  localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(nextProfile))
  notifyProfileChanged()
  return nextProfile
}

/** `request` 解包后 login 接口返回的 data 结构 */
export interface LoginDataPayload {
  token?: string
  roleType?: string | number
  userInfo?: {
    username?: string
    displayName?: string
    nickname?: string
    email?: string
    phone?: string
    statusDisplayName?: string
  }
}

export function setAdminSession(username: string, token: string, apiUser?: LoginDataPayload['userInfo']) {
  const normalizedUsername = username || 'admin'
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, normalizedUsername)

  const base = createDefaultAdminUser(normalizedUsername)
  const fromApi = apiUser
    ? {
        nickname: String(apiUser.nickname || apiUser.displayName || base.nickname),
        phone: typeof apiUser.phone === 'string' ? apiUser.phone : base.phone,
        email: typeof apiUser.email === 'string' ? apiUser.email : base.email,
        status: typeof apiUser.statusDisplayName === 'string' ? apiUser.statusDisplayName : base.status,
      }
    : {}

  localStorage.setItem(
    AUTH_PROFILE_KEY,
    JSON.stringify({
      ...base,
      ...readProfile(),
      ...fromApi,
      username: normalizedUsername,
      lastLoginAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    }),
  )
  notifyProfileChanged()
}

export function clearAdminSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(AUTH_PROFILE_KEY)
  notifyProfileChanged()
}

/**
 * 解析 login() 返回值
 */
export function parseLoginData(data: unknown, fallbackUsername: string) {
  const usernameFallback = fallbackUsername.trim() || 'admin'
  if (!data || typeof data !== 'object') {
    return { token: '', username: usernameFallback, userInfo: undefined as LoginDataPayload['userInfo'] }
  }
  const d = data as LoginDataPayload
  const raw = typeof d.token === 'string' ? d.token.replace(/^Bearer\s+/i, '').trim() : ''
  const ui = d.userInfo
  const username =
    (typeof ui?.username === 'string' && ui.username.trim()) ||
    (typeof ui?.displayName === 'string' && ui.displayName.trim()) ||
    usernameFallback
  return { token: raw, username, userInfo: ui }
}
