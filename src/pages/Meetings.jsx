import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Meetings() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [checkingId, setCheckingId] = useState(null)
  const [generatingTaskId, setGeneratingTaskId] = useState(null)
  const [notification, setNotification] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hasTasksFilter, setHasTasksFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 6
  useEffect(() => {
    api.getMeetings().then(data => {
      setMeetings(data)
      setLoading(false)
    })
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setNotification(null)
    try {
      const result = await api.syncFathom()
      const updated = await api.getMeetings()
      setMeetings(updated)
      setNotification({
        type: 'success',
        message: `✅ Synced ${result.synced || 0} meeting${result.synced !== 1 ? 's' : ''}${result.auto_generated_tasks > 0 ? ` — ${result.auto_generated_tasks} task${result.auto_generated_tasks !== 1 ? 's' : ''} auto-generated` : ''}`,
        timestamp: Date.now(),
      })
    } catch (e) {
      setNotification({
        type: 'error',
        message: `❌ Sync failed: ${e.message || 'Unknown error'}`,
        timestamp: Date.now(),
      })
    } finally {
      setSyncing(false)
    }
  }

  const checkFathom = async (id) => {
    setCheckingId(id)
    try {
      await api.checkFathomForMeeting(id)
      const updated = await api.getMeetings()
      setMeetings(updated)
    } finally {
      setCheckingId(null)
    }
  }

  const generateTasks = async (id) => {
    setGeneratingTaskId(id)
    setNotification(null)
    try {
      const result = await api.generateTasksForMeeting(id)
      if (result.status === 'exists' || result.status === 'created') {
        const tasksCount = result.tasks?.length || 0
        const emailsCount = result.emails_sent || 0
        setNotification({
          type: 'success',
          message: `✅ ${tasksCount} task${tasksCount !== 1 ? 's' : ''} generated${emailsCount > 0 ? ` — ${emailsCount} email${emailsCount !== 1 ? 's' : ''} sent` : ''}`,
          meetingId: id,
          timestamp: Date.now(),
        })
        // Refresh meetings list to show updated task counts
        const updated = await api.getMeetings()
        setMeetings(updated)
      } else {
        setNotification({
          type: 'error',
          message: '⚠️ No tasks could be generated from this meeting',
          timestamp: Date.now(),
        })
      }
    } catch (e) {
      setNotification({
        type: 'error',
        message: `❌ ${e.message || 'Failed to generate tasks'}`,
        timestamp: Date.now(),
      })
    } finally {
      setGeneratingTaskId(null)
    }
  }

  const filteredMeetings = meetings.filter(m => {
    if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (dateFrom && m.recorded_at && new Date(m.recorded_at) < new Date(dateFrom)) return false
    if (dateTo && m.recorded_at) {
      const end = new Date(dateTo)
      end.setDate(end.getDate() + 1)
      if (new Date(m.recorded_at) >= end) return false
    }
    if (hasTasksFilter !== 'all') {
      const hasTasks = (m.tasks?.length || 0) > 0
      if (hasTasksFilter === 'yes' && !hasTasks) return false
      if (hasTasksFilter === 'no' && hasTasks) return false
    }
    return true
  })

  const hasActiveFilters = searchQuery || dateFrom || dateTo || hasTasksFilter !== 'all'

  const resetPage = () => setPage(1)
  const activeFilterChips = []
  if (searchQuery) activeFilterChips.push({ label: `"${searchQuery}"`, onClear: () => { setSearchQuery(''); resetPage() } })
  if (dateFrom) activeFilterChips.push({ label: `From ${dateFrom}`, onClear: () => { setDateFrom(''); resetPage() } })
  if (dateTo) activeFilterChips.push({ label: `To ${dateTo}`, onClear: () => { setDateTo(''); resetPage() } })
  if (hasTasksFilter !== 'all') activeFilterChips.push({ label: hasTasksFilter === 'yes' ? 'Has tasks' : 'No tasks', onClear: () => { setHasTasksFilter('all'); resetPage() } })

  const clearAllFilters = () => {
    setSearchQuery(''); setDateFrom(''); setDateTo('')
    setHasTasksFilter('all'); resetPage()
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8"><h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Meetings</h1></div>
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[var(--color-card-border)]" /><div className="flex-1"><div className="h-4 bg-[var(--color-card-border)] rounded w-48 mb-2" /><div className="h-3 bg-[var(--color-badge-bg)] rounded w-32" /></div></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Meetings</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{filteredMeetings.length} {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}{hasActiveFilters ? ' found' : ''}{filteredMeetings.length > perPage ? ` — Page ${page} of ${Math.ceil(filteredMeetings.length / perPage)}` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] disabled:opacity-50 transition-all shadow-sm shadow-black/10"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync from Fathom'}
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-3 sm:p-4 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              placeholder="Search meetings..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-all placeholder:text-[var(--color-text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="text-xs pl-8 pr-2 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-all w-[135px]" title="From date" />
          </div>

          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="text-xs pl-8 pr-2 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-all w-[135px]" title="To date" />
          </div>

          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <select value={hasTasksFilter} onChange={e => { setHasTasksFilter(e.target.value); setPage(1) }}
              className="text-xs pl-8 pr-6 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] cursor-pointer appearance-none hover:border-[var(--color-primary-300)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] min-w-[110px]">
              <option value="all">All tasks</option>
              <option value="yes">Has tasks</option>
              <option value="no">No tasks</option>
            </select>
            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[var(--color-card-border)]">
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mr-0.5">Filters:</span>
            {activeFilterChips.map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded-full border border-[var(--color-primary-200)]">
                {chip.label}
                <button onClick={chip.onClear} className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center hover:bg-[var(--color-primary-200)] transition-colors">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-[11px] text-[var(--color-text-muted)] hover:text-red-600 font-medium ml-1 transition-colors">Clear all</button>
          </div>
        )}
      </div>

      {/* ── Notification Toast ── */}
      {notification && (
        <div className={`mb-4 p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-3 animate-fade-in ${
          notification.type === 'success'
            ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-200'
            : 'bg-red-900/30 border-red-700/40 text-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-sm">{notification.message}</span>
            {notification.meetingId && (
              <button
                onClick={() => navigate(`/tasks?meeting=${notification.meetingId}`)}
                className="text-xs font-semibold underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity"
              >
                View tasks →
              </button>
            )}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {meetings.length === 0 ? (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-badge-bg)] flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[var(--color-text-secondary)] font-semibold">No meetings yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">Sync from Fathom to get started with meeting management.</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-100)] flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg className="w-8 h-8 text-[var(--color-primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[var(--color-text-primary)]">No meetings match your filters</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto leading-relaxed">Try adjusting your filters to find what you're looking for.</p>
          <button onClick={clearAllFilters} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] bg-[var(--color-primary-50)] px-3 py-1.5 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            Clear all filters
          </button>
        </div>
      ) : (
        <>
        <div className="space-y-3 animate-stagger">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / perPage))
            const currentPage = Math.min(page, totalPages)
            const start = (currentPage - 1) * perPage
            const paged = filteredMeetings.slice(start, start + perPage)
            return paged.map(m => {
              const hasRecording = !!m.fathom_recording_id
              const hasTranscriptOrSummary = m.summary || (m.transcript && m.transcript.length > 0)
              return (
                <div key={m.id} className="group bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 hover:shadow-lg hover:border-[var(--color-text-muted)]/30 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${
                          hasRecording ? 'bg-[var(--color-primary-100)]' : 'bg-[var(--color-badge-bg)]'
                        } flex items-center justify-center shrink-0 shadow-sm`}>
                          <svg className={`w-5 h-5 ${hasRecording ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-text-secondary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--color-text-primary)]">{m.title}</h3>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {m.recorded_at && new Date(m.recorded_at).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4 flex-wrap justify-end">
                      {!hasRecording ? (
                        <button
                          onClick={() => checkFathom(m.id)}
                          disabled={checkingId === m.id}
                          className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium ring-1 ring-amber-600/20 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {checkingId === m.id ? 'Checking...' : 'Check Fathom'}
                        </button>
                      ) : null}
                      {hasTranscriptOrSummary && (
                        <button
                          onClick={() => generateTasks(m.id)}
                          disabled={generatingTaskId === m.id}
                          className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1 rounded-full font-medium ring-1 ring-[var(--color-primary-200)] hover:bg-[var(--color-primary-100)] transition-colors disabled:opacity-50"
                        >
                          {generatingTaskId === m.id ? 'Generating...' : 'Generate Tasks'}
                        </button>
                      )}
                      {m.tasks?.length > 0 && (
                        <span className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3 py-1 rounded-full font-medium ring-1 ring-[var(--color-primary-200)]">{m.tasks.length} tasks</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* Pagination */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / perPage))
          const currentPage = Math.min(page, totalPages)
          if (totalPages <= 1) return null
          return (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-[var(--color-text-muted)]">
                Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filteredMeetings.length)} of {filteredMeetings.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`p-2 rounded-lg text-sm transition-all ${currentPage <= 1 ? 'text-[var(--color-text-muted)] cursor-not-allowed' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-badge-bg)]'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${p === currentPage ? 'bg-[var(--color-primary-600)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-badge-bg)]'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={`p-2 rounded-lg text-sm transition-all ${currentPage >= totalPages ? 'text-[var(--color-text-muted)] cursor-not-allowed' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-badge-bg)]'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })()}
        </>
      )}
    </div>
  )
}
