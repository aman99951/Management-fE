import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Schedule() {
  const [meetings, setMeetings] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(null)
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [inviting, setInviting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [gcConnected, setGcConnected] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_url: '',
  })

  useEffect(() => {
    Promise.all([
      api.getScheduledMeetings(),
      api.getEmployees(),
      api.getGoogleCalendarStatus().catch(() => ({ connected: false })),
    ]).then(([meetingsData, employeesData, gcStatus]) => {
      setMeetings(meetingsData)
      setEmployees(employeesData)
      setGcConnected(gcStatus.connected)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      meeting_url: '',
    })
    setShowCreate(false)
  }

  const createMeeting = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const meeting = await api.createScheduledMeeting(formData)

      if (gcConnected) {
        try {
          const result = await api.createMeetLinkForSchedule(meeting.id)
          setMeetings(prev => [result.meeting, ...prev])
          showNotif(`"${result.meeting.title}" scheduled with Google Meet link!`)
        } catch {
          setMeetings(prev => [meeting, ...prev])
          showNotif(`"${meeting.title}" scheduled — Calendar sync failed. Add a Meet link later.`)
        }
      } else {
        setMeetings(prev => [meeting, ...prev])
        showNotif(`Meeting "${meeting.title}" scheduled successfully!`)
      }

      resetForm()
    } catch (err) {
      showNotif(err.message, 'error')
    }
    setSubmitting(false)
  }

  const handleInvite = async (meetingId) => {
    if (selectedEmployees.length === 0) return
    setInviting(true)
    try {
      const result = await api.inviteToMeeting(meetingId, selectedEmployees)
      showNotif(`Invited ${result.invited} employee(s) — ${result.notifications_created} notification(s) sent!`)
      setShowInvite(null)
      setSelectedEmployees([])
      const updated = await api.getScheduledMeeting(meetingId)
      setMeetings(prev => prev.map(m => m.id === meetingId ? updated : m))
    } catch (err) {
      showNotif(err.message, 'error')
    }
    setInviting(false)
  }

  const handleCancel = async (id) => {
    try {
      const updated = await api.cancelScheduledMeeting(id)
      setMeetings(prev => prev.map(m => m.id === id ? updated : m))
      showNotif('Meeting cancelled')
    } catch (err) {
      showNotif(err.message, 'error')
    }
  }

  const handleComplete = async (id) => {
    try {
      const updated = await api.completeScheduledMeeting(id)
      setMeetings(prev => prev.map(m => m.id === id ? updated : m))
      showNotif('Meeting marked as completed')
    } catch (err) {
      showNotif(err.message, 'error')
    }
  }

  const handleCreateMeetLink = async (id) => {
    try {
      const result = await api.createMeetLinkForSchedule(id)
      setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...result.meeting } : m))
      showNotif('Google Meet link created!')
    } catch (err) {
      showNotif(err.message, 'error')
    }
  }

  const handleSyncAllToCalendar = async () => {
    const unsynced = meetings.filter(m => !m.google_event_id && m.status === 'scheduled')
    if (unsynced.length === 0) {
      showNotif('All meetings are already synced to Calendar!')
      return
    }
    setSyncingAll(true)
    let synced = 0
    let failed = 0
    for (const m of unsynced) {
      try {
        const result = await api.createMeetLinkForSchedule(m.id)
        setMeetings(prev => prev.map(p => p.id === m.id ? result.meeting : p))
        synced++
      } catch {
        failed++
      }
    }
    setSyncingAll(false)
    if (failed > 0) {
      showNotif(`Synced ${synced} meeting(s) to Calendar (${failed} failed)`, synced > 0 ? 'success' : 'error')
    } else {
      showNotif(`All ${synced} meeting(s) synced to Google Calendar with Meet links!`)
    }
  }

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const istOpts = { timeZone: 'Asia/Kolkata' }

  const formatDateTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      ...istOpts,
      weekday: 'short',
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-US', {
      ...istOpts,
      hour: 'numeric', minute: '2-digit',
    })
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', {
      ...istOpts,
      weekday: 'short', month: 'short', day: 'numeric',
    })
  }

  const getDuration = (start, end) => {
    if (!start || !end) return ''
    const diff = new Date(end) - new Date(start)
    const hrs = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins}m`
  }

  const statusColors = {
    scheduled: { bg: 'bg-[var(--color-primary-100)]', text: 'text-[var(--color-primary-700)]', ring: 'ring-[var(--color-primary-300)]', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ongoing: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-600/30', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
    completed: { bg: 'bg-[var(--color-badge-bg)]', text: 'text-[var(--color-text-secondary)]', ring: 'ring-[var(--color-text-muted)]/30', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-600/30', icon: 'M6 18L18 6M6 6l12 12' },
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8"><h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Schedule</h1></div>
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-16 text-center animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-card-border)] mx-auto mb-5" />
          <div className="h-5 bg-[var(--color-card-border)] rounded w-48 mx-auto mb-3" />
          <div className="h-4 bg-[var(--color-badge-bg)] rounded w-64 mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 animate-slide-up ${
          notification.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {notification.type === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Schedule</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Create, manage, and send meeting invitations</p>
            </div>
          </div>
          {gcConnected && (
            <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1.5 ml-[3.25rem]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Google Calendar connected — new meetings sync automatically with Meet links
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gcConnected && meetings.filter(m => !m.google_event_id && m.status === 'scheduled').length > 0 && (
            <button
              onClick={handleSyncAllToCalendar}
              disabled={syncingAll}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                syncingAll
                  ? 'bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] cursor-not-allowed'
                  : 'bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-badge-bg)] hover:border-[var(--color-primary-400)] shadow-sm'
              }`}
              title="Sync all scheduled meetings without Calendar events to Google Calendar"
            >
              {syncingAll ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Syncing...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Sync All to Calendar</>
              )}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-lg shadow-[var(--color-primary-600)]/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Meeting
          </button>
        </div>
      </div>
              {/* Google Calendar connected status banner */}
      {gcConnected && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-300">Google Calendar is connected</p>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                New meetings are automatically synced with Google Meet links. Fathom will detect these events and join automatically when it's time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-[var(--color-card-bg)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--color-card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-100)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Schedule New Meeting</h2>
                </div>
                <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={createMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Title *</label>
                <input
                  required value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[var(--color-card-border)] text-[var(--color-text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent bg-[var(--color-card-bg)]"
                  placeholder="Weekly Team Sync"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-[var(--color-card-border)] text-[var(--color-text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent resize-none bg-[var(--color-card-bg)]"
                  placeholder="Meeting agenda and notes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Start Time *</label>
                  <input
                    required type="datetime-local" value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[var(--color-card-border)] text-[var(--color-text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent bg-[var(--color-card-bg)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">End Time *</label>
                  <input
                    required type="datetime-local" value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[var(--color-card-border)] text-[var(--color-text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent bg-[var(--color-card-bg)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Location</label>
                  <input
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[var(--color-card-border)] text-[var(--color-text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent bg-[var(--color-card-bg)]"
                    placeholder="Room 301"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Meeting Link</label>
                  <input
                    value={formData.meeting_url}
                    onChange={e => setFormData({ ...formData, meeting_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[var(--color-card-border)] text-[var(--color-text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent bg-[var(--color-card-bg)]"
                    placeholder="meet.google.com/..."
                  />
                  {gcConnected && (
                    <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Google Meet link will be auto-generated when you schedule
                    </p>
                  )}
                  {!gcConnected && (
                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <a href="/settings" className="underline hover:text-amber-800">Connect Google Calendar</a> to auto-generate Meet links
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all shadow-sm ${
                    submitting
                      ? 'bg-[var(--color-primary-600)]/60 text-white/70 cursor-not-allowed'
                      : 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]'
                  }`}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Scheduling...
                    </span>
                  ) : (
                    'Schedule Meeting'
                  )}
                </button>
                <button type="button" onClick={resetForm} disabled={submitting} className="px-4 py-2.5 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-[var(--color-text-secondary)] text-sm font-medium rounded-xl hover:bg-[var(--color-badge-bg)] transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowInvite(null); setSelectedEmployees([]) }}>
          <div className="bg-[var(--color-card-bg)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--color-card-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-100)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Invite to "{showInvite.title}"</h2>
                </div>
                <button onClick={() => { setShowInvite(null); setSelectedEmployees([]) }} className="p-1.5 rounded-lg hover:bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {employees.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[var(--color-text-muted)]">No employees found. Add employees from the Employees page first.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {employees.map(emp => {
                    const alreadyAttending = showInvite.attendees_details?.some(a => a.id === emp.id)
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          alreadyAttending
                            ? 'border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/50 opacity-60'
                            : selectedEmployees.includes(emp.id)
                              ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] shadow-sm'
                              : 'border-[var(--color-card-border)] hover:border-[var(--color-primary-300)] hover:bg-[var(--color-badge-bg)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id) || alreadyAttending}
                          disabled={alreadyAttending}
                          onChange={() => toggleEmployee(emp.id)}
                          className="w-4 h-4 rounded border-[var(--color-card-border)] text-[var(--color-primary-600)] focus:ring-[var(--color-primary-400)]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{emp.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{emp.email}</p>
                        </div>
                        {alreadyAttending && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Invited
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
              {employees.length > 0 && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-[var(--color-card-border)]">
                  <button
                    onClick={() => handleInvite(showInvite.id)}
                    disabled={selectedEmployees.length === 0 || inviting}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      selectedEmployees.length === 0 || inviting
                        ? 'bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] shadow-sm'
                    }`}
                  >
                    {inviting ? 'Sending...' : `Send Invite${selectedEmployees.length > 0 ? ` (${selectedEmployees.length})` : ''}`}
                  </button>
                  <button onClick={() => { setShowInvite(null); setSelectedEmployees([]) }} className="px-4 py-2.5 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] text-[var(--color-text-secondary)] text-sm font-medium rounded-xl hover:bg-[var(--color-badge-bg)] transition-all">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {meetings.length === 0 ? (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary-100)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">No scheduled meetings</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-sm mx-auto">Create your first meeting to invite team members and collaborate.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-lg shadow-[var(--color-primary-600)]/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Meeting
          </button>
        </div>
      ) : (
      <>
      {/* Filters */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search meetings..."
              className="w-full text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent transition-all placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v6a4 4 0 004 4h10a4 4 0 004-4V7" />
            </svg>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm pl-9 pr-8 py-2.5 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] cursor-pointer appearance-none hover:border-[var(--color-primary-400)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] min-w-[140px]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236a6a72'%3e%3cpath d='M8 11L4 7h8l-4 4z'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '14px 14px' }}
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {(() => {
        const filtered = meetings.filter(m => {
          const matchesSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase())
          const matchesStatus = statusFilter === 'all' || m.status === statusFilter
          return matchesSearch && matchesStatus
        })

        if (filtered.length === 0) {
          return (
            <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-badge-bg)] flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">No meetings match your filters</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">Try adjusting your search or clearing the status filter.</p>
              <button
                onClick={() => { setSearch(''); setStatusFilter('all') }}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] text-sm font-medium rounded-xl hover:bg-[var(--color-card-border)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          )
        }

        return (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(meeting => {
            const sc = statusColors[meeting.status] || statusColors.scheduled

            return (
              <div
                key={meeting.id}
                className="group bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 hover:border-[var(--color-primary-400)]/30 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Status indicator line */}
                  <div className={`hidden lg:block w-1 h-full min-h-[4rem] rounded-full shrink-0 ${sc.bg}`} />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary-600)] transition-colors">
                            {meeting.title}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={sc.icon} />
                            </svg>
                            {meeting.status?.charAt(0).toUpperCase() + meeting.status?.slice(1)}
                          </span>
                            {meeting.meeting_url && meeting.status !== 'cancelled' && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Meet link ready
                              </span>
                            )}
                            {meeting.google_event_id && meeting.status !== 'cancelled' && (
                              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-600)] font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                On Calendar
                              </span>
                            )}
                        </div>

                        {/* Date, time, duration strip */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                            <svg className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(meeting.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                            <svg className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(meeting.start_time)} – {formatTime(meeting.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{getDuration(meeting.start_time, meeting.end_time)}</span>
                          </div>
                        </div>

                        {/* Description / location / link row */}
                        {(meeting.description || meeting.location || (meeting.meeting_url && meeting.status !== 'cancelled')) && (
                          <div className="mt-3 space-y-1">
                            {meeting.description && (
                              <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">{meeting.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              {meeting.location && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {meeting.location}
                                </span>
                              )}
                              {meeting.meeting_url && meeting.status !== 'cancelled' && (
                                <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline font-medium">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  {meeting.meeting_url}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: attendees + actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[var(--color-card-border)]">
                      {/* Attendees */}
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {meeting.attendees_details?.slice(0, 5).map((a, i) => (
                            <div
                              key={a.id}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] text-white flex items-center justify-center text-[11px] font-semibold ring-2 ring-[var(--color-card-bg)] shadow-sm transition-transform hover:scale-110 hover:z-10 relative"
                              style={{ zIndex: 5 - i }}
                              title={a.name}
                            >
                              {a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          ))}
                          {(meeting.attendees_details?.length || 0) > 5 && (
                            <div className="w-8 h-8 rounded-full bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] flex items-center justify-center text-[11px] font-medium ring-2 ring-[var(--color-card-bg)]">
                              +{meeting.attendees_details.length - 5}
                            </div>
                          )}
                        </div>
                        
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {meeting.meeting_url && meeting.status !== 'cancelled' && (
                          <a
                            href={meeting.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] text-xs font-medium transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Join
                          </a>
                        )}
                        {meeting.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => setShowInvite(meeting)}
                              className="p-2 rounded-lg hover:bg-[var(--color-primary-50)] text-[var(--color-primary-600)] transition-all"
                              title="Invite employees"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCreateMeetLink(meeting.id)}
                              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-all"
                              title="Create Google Meet link"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleComplete(meeting.id)}
                              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-all"
                              title="Mark completed"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this meeting?')) {
                                  handleCancel(meeting.id)
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-all"
                              title="Cancel meeting"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel Meeting
                            </button>
                          </>
                        )}
                        {meeting.status !== 'scheduled' && meeting.status !== 'cancelled' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this meeting?')) {
                                handleCancel(meeting.id)
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-all"
                            title="Cancel meeting"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel Meeting
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        )
      })()}
      </>)}
    </div>
  )
}
