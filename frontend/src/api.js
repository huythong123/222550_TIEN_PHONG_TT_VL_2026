const BASE_ROOT = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'
const VIDEO_BASE = `${BASE_ROOT}/video`
// Token is kept in-memory only (do not persist to localStorage)
// Token kept in-memory for requests, but fall back to localStorage for persistence
let authToken = null
try {
  const stored = localStorage.getItem('auth_token')
  if (stored) authToken = stored
} catch (e) {}

function buildHeaders(withJson, extraHeaders = {}) {
  const headers = { ...extraHeaders }
  if (withJson) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  return headers
}

async function parseError(response) {
  const text = await response.text()
  if (!text) return `Lỗi HTTP ${response.status}`

  try {
    const payload = JSON.parse(text)
    return payload.detail || payload.message || text
  } catch {
    return text
  }
}

function normalizeErrorMessage(message) {
  if (message === 'Could not validate credentials') {
    return 'Không thể xác thực thông tin đăng nhập'
  }

  if (message === 'Email chưa được xác thực. Vui lòng kiểm tra Gmail hoặc gửi lại mail xác thực.') {
    return message
  }

  return message
}

async function request(path, { method = 'GET', body, withJson = true } = {}) {
  const response = await fetch(`${BASE_ROOT}${path}`, {
    method,
    headers: buildHeaders(withJson),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const detail = normalizeErrorMessage(await parseError(response))
    throw new Error(detail)
  }

  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export function getStoredToken() {
  return authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null)
}

export function setAuthToken(token) {
  authToken = token || null
  try {
    if (token) localStorage.setItem('auth_token', token)
    else localStorage.removeItem('auth_token')
  } catch (e) {}
}

export async function loginUser(identifier, password) {
  const result = await request('/auth/token', {
    method: 'POST',
    body: { identifier, password },
  })

  if (result?.access_token) {
    setAuthToken(result.access_token)
  }

  return result
}

export function getGoogleLoginUrl() {
  return `${BASE_ROOT}/auth/google/login`
}

export async function registerUser(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: { email, password },
  })
}

export async function verifyEmailToken(token) {
  return request('/auth/verify-email', {
    method: 'POST',
    body: { token },
  })
}

export async function resendVerificationMail(email) {
  return request('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  })
}

export function logoutUser() {
  setAuthToken(null)
}

export function step1Extract(url) {
  return request('/video/step1-extract', {
    method: 'POST',
    body: { url },
  })
}

export function step2Script(payload) {
  return request('/video/step2-script', {
    method: 'POST',
    body: payload,
  })
}

export function step3Scene(payload, targetDuration = null) {
  const qs = targetDuration ? `?target_duration=${encodeURIComponent(targetDuration)}` : ''
  return request(`/video/step3-scene${qs}`, {
    method: 'POST',
    body: payload,
  })
}

export function step4Prompt(payload) {
  return request('/video/step4-prompt', {
    method: 'POST',
    body: payload,
  })
}


export function step5Voice(payload) {
  return request('/video/step5-voice', {
    method: 'POST',
    body: payload,
  })
}

export function step6Video(payload) {
  return request('/video/step6-video', {
    method: 'POST',
    body: payload,
  })
}

export function step7Merge(tvcTitle, scenes, runId = null) {
  return request('/video/step7-merge', {
    method: 'POST',
    body: {
      tvc_title: tvcTitle,
      scenes,
      run_id: runId,
    },
  })
}

export function estimateCredits(payload) {
  return request('/video/credits/estimate', {
    method: 'POST',
    body: payload,
  })
}

export function getUsers() {
  return request('/admin/users', { withJson: false })
}

export function createUser(payload) {
  return request('/admin/users', {
    method: 'POST',
    body: payload,
  })
}

export function deleteUser(id) {
  return request(`/admin/users/${id}`, {
    method: 'DELETE',
    withJson: false,
  })
}

export function getUserLogs(userId) {
  return request(`/admin/users/${userId}/logs`, { withJson: false })
}

export function getUserLogDetail(userId, runId) {
  return request(`/admin/users/${userId}/logs/${runId}`, { withJson: false })
}

export function deleteUserLog(userId, runId) {
  return request(`/admin/users/${userId}/logs/${runId}`, {
    method: 'DELETE',
    withJson: false,
  })
}

export function refundRun(userId, runId) {
  return request(`/admin/users/${userId}/runs/${runId}/refund`, { method: 'POST' })
}

export function downloadRunUrl(userId, runId) {
  // Return a URL to download the run's latest MP4 through the API
  return `${BASE_ROOT}/admin/users/${userId}/runs/${runId}/download`
}

export function registerRun(payload) {
  // payload: { user_id, run_id, tvc_title, final_video_path }
  return request(`/admin/users/${payload.user_id}/runs/${payload.run_id}/register`, { method: 'POST', body: { tvc_title: payload.tvc_title, final_video_path: payload.final_video_path } })
}

export function getUserDetails(userId) {
  return request(`/admin/users/${userId}/details`)
}

export function getUserActivities(userId, limit = 50, offset = 0) {
  return request(`/admin/users/${userId}/activities?limit=${limit}&offset=${offset}`)
}

export function banUser(userId, reason) {
  return request(`/admin/users/${userId}/ban`, { method: 'POST', body: { reason } })
}

export function unbanUser(userId) {
  return request(`/admin/users/${userId}/unban`, { method: 'POST' })
}

export function resetUserPassword(userId) {
  return request(`/admin/users/${userId}/reset-password`, { method: 'POST' })
}

export function getAdminLogs(limit = 100, offset = 0) {
  return request(`/admin/logs?limit=${limit}&offset=${offset}`)
}

export function getAdminLogDetail(id) {
  return request(`/admin/logs/${id}`)
}

export function getUserAdminLogs(userId, limit = 100, offset = 0) {
  return request(`/admin/users/${userId}/admin-logs?limit=${limit}&offset=${offset}`)
}

export function getMe() {
  return request('/auth/me')
}

export function getMyLogs() {
  return request('/me/logs', { withJson: false })
}

export function getMyLogDetail(runId) {
  return request(`/me/logs/${runId}`, { withJson: false })
}

export function setUserCredits(userId, credits) {
  return request(`/admin/users/${userId}/credits`, {
    method: 'POST',
    body: { credits },
  })
}

export function adjustUserCredits(userId, delta) {
  return request(`/admin/users/${userId}/credits`, {
    method: 'PATCH',
    body: { delta },
  })
}

export function buyCredits(amount_vnd) {
  // Use the payment create endpoint for polling-based bank transfer flow
  return request('/payment/create', {
    method: 'POST',
    body: { amount_vnd },
  })
}

// Admin resources (packages, transactions, videos, settings)
export function listPackages() {
  return request('/admin/packages')
}

export function listPublicPackages() {
  return request('/packages')
}

export function createPackage(payload) {
  return request('/admin/packages', { method: 'POST', body: payload })
}

export function getPackage(id) {
  return request(`/admin/packages/${id}`)
}

export function updatePackage(id, payload) {
  return request(`/admin/packages/${id}`, { method: 'PUT', body: payload })
}

export function deletePackage(id) {
  return request(`/admin/packages/${id}`, { method: 'DELETE', withJson: false })
}

export function listTransactions(limit = 100, offset = 0) {
  return request(`/admin/transactions?limit=${limit}&offset=${offset}`)
}

export function getDashboardStats() {
  return request('/admin/dashboard')
}

export function createTransaction(payload) {
  return request('/admin/transactions', { method: 'POST', body: payload })
}

export function listVideos(limit = 100, offset = 0, userId = null) {
  const qs = `?limit=${limit}&offset=${offset}` + (userId ? `&user_id=${encodeURIComponent(userId)}` : '')
  return request(`/admin/videos${qs}`)
}


export function getVideo(id) {
  return request(`/admin/videos/${id}`)
}

export function listVideoScenes(videoId) {
  return request(`/admin/videos/${videoId}/scenes`)
}

export function listSettings() {
  return request('/admin/settings')
}

export function getSetting(key) {
  return request(`/admin/settings/${encodeURIComponent(key)}`)
}

export function setSetting(payload) {
  return request('/admin/settings', { method: 'POST', body: payload })
}

