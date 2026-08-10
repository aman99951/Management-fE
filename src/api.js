const API = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('sso_token')
}

function getCSRFToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (method !== 'GET') {
    headers['X-CSRFToken'] = getCSRFToken()
  }
  const res = await fetch(`${API}${path}`, {
    headers,
    credentials: 'include',
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getSession: () => request('/api/auth/session/'),
  logout: () => request('/api/auth/logout/', { method: 'POST' }),
  getFathomOAuthUrl: () => request('/api/fathom/oauth/url/'),
  fathomOAuthCallback: (code) =>
    request('/api/fathom/oauth/callback/', { method: 'POST', body: JSON.stringify({ code }) }),

  getDashboardStats: () => request('/api/dashboard/stats/'),

  getMeetings: () => request('/api/meetings/'),
  getMeeting: (id) => request(`/api/meetings/${id}/`),
  createMeetingWithLink: (data) =>
    request('/api/meetings/create_with_link/', { method: 'POST', body: JSON.stringify(data) }),
  checkFathomForMeeting: (id) =>
    request(`/api/meetings/${id}/check_fathom/`, { method: 'POST' }),
  generateTasksForMeeting: (id) =>
    request(`/api/meetings/${id}/generate_tasks/`, { method: 'POST' }),
  batchGenerateTasks: () =>
    request('/api/meetings/batch_generate_tasks/', { method: 'POST' }),
  getGenerationStatus: (meetingId) =>
    request(`/api/tasks/generation-status/?meeting_id=${meetingId}`),
  listFathomWebhooks: () => request('/api/fathom/webhook/register/'),
  registerFathomWebhooks: (destinationUrl) =>
    request('/api/fathom/webhook/register/', { method: 'POST', body: JSON.stringify({ destination_url: destinationUrl }) }),

  getTasks: () => request('/api/tasks/'),
  updateTaskStatus: (id, status) =>
    request(`/api/tasks/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateTask: (id, data) =>
    request(`/api/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  getTaskComments: (id) => request(`/api/tasks/${id}/comments/`),
  addTaskComment: (id, data) =>
    request(`/api/tasks/${id}/comments/`, { method: 'POST', body: JSON.stringify(data) }),
  createTask: (data) =>
    request('/api/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  sendActionItems: (data) =>
    request('/api/tasks/send_action_items/', { method: 'POST', body: JSON.stringify(data) }),
  sendTaskAssignmentEmail: (id) =>
    request(`/api/tasks/${id}/send_assignment_email/`, { method: 'POST' }),

  getEmailNotifications: () =>
    request('/api/fathom/config/'),
  setEmailNotifications: (enabled) =>
    request('/api/fathom/config/', { method: 'POST', body: JSON.stringify({ email_notifications_enabled: enabled }) }),

  getEmployees: () => request('/api/employees/'),
  createEmployee: (data) =>
    request('/api/employees/', { method: 'POST', body: JSON.stringify(data) }),
  deleteEmployee: (id) =>
    request(`/api/employees/${id}/`, { method: 'DELETE' }),

  getFathomConfig: () => request('/api/fathom/config/'),
  saveFathomConfig: (data) =>
    request('/api/fathom/config/', { method: 'POST', body: JSON.stringify(data) }),
  syncFathom: () =>
    request('/api/fathom/sync/', { method: 'POST' }),
  generateAITasks: () =>
    request('/api/tasks/generate-ai/', { method: 'POST' }),

  // Google Calendar / Google Meet
  getGoogleCalendarStatus: () => request('/api/google-calendar/status/'),
  getGoogleCalendarAuthUrl: () => request('/api/google-calendar/auth-url/'),
  googleCalendarOAuthCallback: (code) =>
    request('/api/google-calendar/oauth/callback/', { method: 'POST', body: JSON.stringify({ code }) }),
  createGoogleMeet: (data) =>
    request('/api/google-calendar/create-meet/', { method: 'POST', body: JSON.stringify(data) }),
  listGoogleCalendarEvents: () => request('/api/google-calendar/events/'),
  syncGoogleCalendar: () =>
    request('/api/google-calendar/sync/', { method: 'POST' }),
  disconnectGoogleCalendar: () =>
    request('/api/google-calendar/disconnect/', { method: 'POST' }),

  // Schedule (Scheduled Meetings)
  getScheduledMeetings: () => request('/api/schedule/'),
  getScheduledMeeting: (id) => request(`/api/schedule/${id}/`),
  createScheduledMeeting: (data) =>
    request('/api/schedule/', { method: 'POST', body: JSON.stringify(data) }),
  updateScheduledMeeting: (id, data) =>
    request(`/api/schedule/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteScheduledMeeting: (id) =>
    request(`/api/schedule/${id}/`, { method: 'DELETE' }),
  inviteToMeeting: (id, employeeIds) =>
    request(`/api/schedule/${id}/invite/`, { method: 'POST', body: JSON.stringify({ employee_ids: employeeIds }) }),
  createMeetLinkForSchedule: (id) =>
    request(`/api/schedule/${id}/create_meet_link/`, { method: 'POST' }),
  cancelScheduledMeeting: (id) =>
    request(`/api/schedule/${id}/cancel/`, { method: 'POST' }),
  completeScheduledMeeting: (id) =>
    request(`/api/schedule/${id}/complete/`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/api/notifications/'),
  markNotificationsRead: (ids) =>
    request('/api/notifications/mark-read/', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Backlog
  getBacklogItems: (params = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page)
    if (params.pageSize) query.set('page_size', params.pageSize)
    if (params.search) query.set('search', params.search)
    if (params.priority && params.priority !== 'All') query.set('priority', params.priority)
    if (params.status && params.status !== 'All') query.set('status', params.status)
    if (params.tab && params.tab !== 'all') query.set('tab', params.tab)
    if (params.release_week) query.set('release_week', params.release_week)
    if (params.date_from) query.set('date_from', params.date_from)
    if (params.date_to) query.set('date_to', params.date_to)
    if (params.owner) query.set('owner', params.owner)
    if (params.created_from) query.set('created_from', params.created_from)
    if (params.created_to) query.set('created_to', params.created_to)
    const qs = query.toString()
    return request(`/api/backlog/${qs ? '?' + qs : ''}`)
  },
  createBacklogItem: (data) =>
    request('/api/backlog/', { method: 'POST', body: JSON.stringify(data) }),
  updateBacklogItem: (id, data) =>
    request(`/api/backlog/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBacklogItem: (id) =>
    request(`/api/backlog/${id}/`, { method: 'DELETE' }),
  generateBacklogFromPrompt: (prompt) =>
    request('/api/backlog/generate_from_prompt/', { method: 'POST', body: JSON.stringify({ prompt }) }),
  scanBacklogKeywords: (daysBack = 1) =>
    request('/api/backlog/scan/', { method: 'POST', body: JSON.stringify({ days_back: daysBack }) }),
  convertBacklogToTask: (id) =>
    request(`/api/backlog/${id}/convert_to_task/`, { method: 'POST' }),
  closeBacklogItem: (id) =>
    request(`/api/backlog/${id}/close/`, { method: 'POST' }),
  autoRollWeeks: () =>
    request('/api/backlog/auto_roll_weeks/', { method: 'POST' }),
  dismissSuggestion: (meetingId, contentHash) =>
    request('/api/backlog/dismiss-suggestion/', { method: 'POST', body: JSON.stringify({ meeting_id: meetingId, content_hash: contentHash }) }),
}
