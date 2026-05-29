import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'

const priorityConfig = {
  critical: { label: 'Critical', classes: 'bg-red-50 text-red-700 ring-1 ring-red-600/20', dot: 'bg-red-500' },
  high: { label: 'High', classes: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20', dot: 'bg-orange-500' },
  medium: { label: 'Medium', classes: 'bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] ring-1 ring-[var(--color-text-muted)]/30', dot: 'bg-[var(--color-text-muted)]' },
  low: { label: 'Low', classes: 'bg-slate-50 text-slate-700 ring-1 ring-slate-400/20', dot: 'bg-slate-400' },
}

const statusConfig = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    bar: 'bg-amber-400',
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2.5} fill="none" /></svg>,
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    bar: 'bg-blue-400',
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2.5} fill="none" /></svg>,
  },
  completed: {
    label: 'Completed',
    classes: 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-200)]',
    bar: 'bg-[var(--color-primary-500)]',
    icon: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  },
}

const statuses = ['pending', 'in_progress', 'completed']

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const meetingFilter = searchParams.get('meeting')
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [commentText, setCommentText] = useState({})
  const [commentExpanded, setCommentExpanded] = useState({})
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    const main = document.querySelector('main')
    if (selectedTask) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      if (main) main.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      if (main) main.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      if (main) main.style.overflow = ''
    }
  }, [selectedTask])
  const [showMentions, setShowMentions] = useState({})
  const [comments, setComments] = useState({})
  const [dragId, setDragId] = useState(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [meetingDropdownFilter, setMeetingDropdownFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    Promise.all([
      api.getTasks(),
      api.getEmployees(),
    ]).then(([tasksData, emps]) => {
      const aiTasks = tasksData.filter(t => t.source === 'ai' || t.source === 'manual')
      setTasks(aiTasks)
      setEmployees(emps)
      setLoading(false)
    })
  }, [])

  const meetingOptions = useMemo(() => {
    const map = new Map()
    tasks.forEach(t => {
      if (t.meeting && t.meeting_title) {
        map.set(t.meeting, { id: t.meeting, title: t.meeting_title })
      }
    })
    return [...map.values()]
  }, [tasks])

  const nonStatusFiltered = useMemo(() => tasks.filter(t => {
    if (meetingFilter && t.meeting !== parseInt(meetingFilter)) return false
    if (meetingDropdownFilter !== 'all' && t.meeting !== parseInt(meetingDropdownFilter)) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (assigneeFilter !== 'all' && t.assigned_to !== parseInt(assigneeFilter)) return false
    if (sourceFilter !== 'all' && t.source !== sourceFilter) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false
    if (dateTo) {
      const end = new Date(dateTo)
      end.setDate(end.getDate() + 1)
      if (new Date(t.created_at) >= end) return false
    }
    return true
  }), [tasks, meetingFilter, meetingDropdownFilter, priorityFilter, assigneeFilter, sourceFilter, searchQuery, dateFrom, dateTo])

  const tasksByStatus = useMemo(() => {
    const map = { pending: [], in_progress: [], completed: [] }
    nonStatusFiltered.forEach(t => {
      if (statusFilter === 'all' || t.status === statusFilter) {
        if (map[t.status]) map[t.status].push(t)
      }
    })
    return map
  }, [nonStatusFiltered, statusFilter])

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || sourceFilter !== 'all' || meetingDropdownFilter !== 'all' || searchQuery || meetingFilter || dateFrom || dateTo

  const activeFilterChips = []
  if (meetingFilter) {
    const mtg = tasks.find(t => t.meeting === parseInt(meetingFilter))
    activeFilterChips.push({ type: 'Meeting', label: mtg?.meeting_title || `Meeting #${meetingFilter}`, onClear: () => { setSearchParams({}); setSearchQuery(searchQuery) } })
  }
  if (statusFilter !== 'all') activeFilterChips.push({ type: 'Status', label: statusFilter.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), onClear: () => setStatusFilter('all') })
  if (priorityFilter !== 'all') activeFilterChips.push({ type: 'Priority', label: priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1), onClear: () => setPriorityFilter('all') })
  if (assigneeFilter !== 'all') {
    const emp = employees.find(e => e.id === parseInt(assigneeFilter))
    activeFilterChips.push({ type: 'Assignee', label: emp?.name || `Employee #${assigneeFilter}`, onClear: () => setAssigneeFilter('all') })
  }
  if (sourceFilter !== 'all') activeFilterChips.push({ type: 'Source', label: sourceFilter.charAt(0).toUpperCase() + sourceFilter.slice(1), onClear: () => setSourceFilter('all') })
  if (meetingDropdownFilter !== 'all') {
    const mtg = meetingOptions.find(m => m.id === parseInt(meetingDropdownFilter))
    activeFilterChips.push({ type: 'Meeting', label: mtg?.title || `Meeting #${meetingDropdownFilter}`, onClear: () => setMeetingDropdownFilter('all') })
  }
  if (searchQuery) activeFilterChips.push({ type: 'Search', label: `"${searchQuery}"`, onClear: () => setSearchQuery('') })
  if (dateFrom) activeFilterChips.push({ type: 'Date', label: `From ${dateFrom}`, onClear: () => setDateFrom('') })
  if (dateTo) activeFilterChips.push({ type: 'Date', label: `To ${dateTo}`, onClear: () => setDateTo('') })

  const clearAllFilters = () => {
    setStatusFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all')
    setSourceFilter('all'); setMeetingDropdownFilter('all'); setSearchQuery('')
    setDateFrom(''); setDateTo(''); setSearchParams({})
  }

  const updateStatus = async (id, status) => {
    await api.updateTaskStatus(id, status)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const toggleExpand = (id) => setExpanded(expanded === id ? null : id)

  const reassignTask = async (id, employeeId) => {
    const val = employeeId ? parseInt(employeeId) : null
    await api.updateTask(id, { assigned_to: val })
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, assigned_to: val, assigned_to_name: val ? employees.find(e => e.id === val)?.name : null } : t
    ))
  }

  const toggleComments = async (id) => {
    const next = !commentExpanded[id]
    setCommentExpanded(prev => ({ ...prev, [id]: next }))
    if (next && !comments[id]) {
      const data = await api.getTaskComments(id)
      setComments(prev => ({ ...prev, [id]: data }))
    }
  }

  const addComment = async (taskId) => {
    const text = commentText[taskId]?.trim()
    if (!text) return
    const newComment = await api.addTaskComment(taskId, { text })
    setComments(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), newComment] }))
    setCommentText(prev => ({ ...prev, [taskId]: '' }))
  }

  const handleDragStart = (id) => setDragId(id)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = async (newStatus) => {
    if (dragId) {
      await updateStatus(dragId, newStatus)
      setDragId(null)
    }
  }

  const selectFilterCls = "text-xs pl-8 pr-6 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] cursor-pointer appearance-none hover:border-[var(--color-primary-300)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] min-w-[130px]"
  const filterIconCls = "absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none"
  const filterArrowCls = "absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none"
  const filterInputCls = "text-xs pl-8 pr-2 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-all w-[135px]"

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="h-16 bg-[var(--color-badge-bg)] rounded-2xl animate-pulse" />
        <div className="flex justify-end"><div className="h-10 w-32 bg-[var(--color-badge-bg)] rounded-xl animate-pulse" /></div>
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-[var(--color-badge-bg)] rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Tasks</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{nonStatusFiltered.length} {nonStatusFiltered.length === 1 ? 'task' : 'tasks'} found</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-md shadow-black/10 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-all placeholder:text-[var(--color-text-muted)]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="relative">
            <svg className={filterIconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={selectFilterCls}>
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <svg className={filterArrowCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative">
            <svg className={filterIconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className={selectFilterCls}>
              <option value="all">All Assignees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <svg className={filterArrowCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative">
            <svg className={filterIconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={selectFilterCls}>
              <option value="all">All Sources</option>
              <option value="ai">AI</option>
              <option value="manual">Manual</option>
            </select>
            <svg className={filterArrowCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>

          {!meetingFilter && meetingOptions.length > 1 && (
            <div className="relative">
              <svg className={filterIconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <select value={meetingDropdownFilter} onChange={e => setMeetingDropdownFilter(e.target.value)} className={selectFilterCls}>
                <option value="all">All Meetings</option>
                {meetingOptions.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <svg className={filterArrowCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}

          <div className="relative">
            <svg className={filterIconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterInputCls} title="From date" />
          </div>

          <div className="relative">
            <svg className={filterIconCls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterInputCls} title="To date" />
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

      {/* ── Kanban Board ── */}
      {nonStatusFiltered.length === 0 ? (
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-100)] flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg className="w-8 h-8 text-[var(--color-primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[var(--color-text-primary)]">No tasks found</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto leading-relaxed">
            {hasActiveFilters
              ? 'Try adjusting your filters to find what you\'re looking for.'
              : meetingFilter
              ? 'Click "Generate Tasks" on the meeting card to create tasks from its transcript.'
              : 'Go to Meetings and click "Generate Tasks" to create tasks from transcripts.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] bg-[var(--color-primary-50)] px-3 py-1.5 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[450px]">
          {statuses.map(statusKey => {
            const columnTasks = tasksByStatus[statusKey] || []
            const config = statusConfig[statusKey]
            return (
              <div
                key={statusKey}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(statusKey)}
                className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl flex flex-col min-h-[400px] max-h-[800px] transition-colors"
              >
                <div className="p-4 border-b border-[var(--color-card-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)]">{config.icon}</span>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{config.label}</h3>
                    <span className="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-badge-bg)] px-1.5 py-0.5 rounded-full">{columnTasks.length}</span>
                  </div>
                </div>

                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <svg className="w-8 h-8 text-[var(--color-text-muted)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <p className="text-sm text-[var(--color-text-secondary)]">No tasks</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Drop tasks here</p>
                    </div>
                  ) : (
                    columnTasks.map(t => {
                      const isExpanded = expanded === t.id
                      const priority = priorityConfig[t.priority] || priorityConfig.medium
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={() => handleDragStart(t.id)}
                          className="bg-[var(--color-badge-bg)] border border-[var(--color-card-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-text-muted)]/40 transition-all duration-200 cursor-grab active:cursor-grabbing"
                        >
                          <div className={`h-0.5 w-full ${t.status === 'completed' ? 'bg-[var(--color-primary-500)]' : t.status === 'in_progress' ? 'bg-blue-400' : 'bg-amber-400'}`} />

                          <div className="p-3.5">
                            <div className="flex items-start gap-2.5">
                              <button
                                onClick={() => updateStatus(t.id, t.status === 'completed' ? 'pending' : 'completed')}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  t.status === 'completed'
                                    ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)]'
                                    : 'border-[var(--color-text-secondary)] hover:border-[var(--color-primary-400)]'
                                }`}
                              >
                                {t.status === 'completed' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <div className="flex-1 min-w-0">
                                <button onClick={() => setSelectedTask(t)} className="text-left w-full">
                                  <p className={`text-sm font-semibold text-[var(--color-text-primary)] leading-snug hover:text-[var(--color-primary-500)] transition-colors ${t.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                                    {t.title}
                                  </p>
                                </button>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  {t.priority && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${priority.classes}`}>
                                      {priority.label}
                                    </span>
                                  )}
                                  {t.assigned_to_name && (
                                    <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-card-bg)] px-2 py-0.5 rounded flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                                      {t.assigned_to_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {t.description && (
                              <div className="mt-2.5">
                                <button onClick={() => toggleExpand(t.id)} className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)] transition-colors font-medium">
                                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                  {isExpanded ? 'Hide details' : 'View details'}
                                </button>
                                {isExpanded && (
                                  <div className="mt-2 p-3 bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-card-border)]">
                                    <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap font-sans leading-relaxed">{t.description}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--color-card-border)]">
                              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                                {t.source && (
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${t.source === 'ai' ? 'text-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'text-[var(--color-text-secondary)] bg-[var(--color-card-bg)]'}`}>
                                    {t.source === 'ai' ? 'AI' : 'Manual'}
                                  </span>
                                )}
                                {t.created_at && (
                                  <span>{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => toggleComments(t.id)} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)] transition-colors flex items-center gap-1 font-medium">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                  {comments[t.id]?.length ? comments[t.id].length : 'Comment'}
                                </button>
                                <select
                                  value={t.status}
                                  onChange={e => updateStatus(t.id, e.target.value)}
                                  className="text-xs font-semibold px-2 py-0.5 rounded border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] cursor-pointer appearance-none hover:border-[var(--color-primary-400)] transition-colors"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              </div>
                            </div>

                            {commentExpanded[t.id] && (
                              <div className="mt-3 pt-3 border-t border-[var(--color-card-border)]">
                                {comments[t.id]?.length > 0 && (
                                  <div className="flex flex-col gap-2 mb-3">
                                    {comments[t.id].map(c => (
                                      <div key={c.id} className="flex items-start gap-2 bg-[var(--color-card-bg)] p-2.5 rounded-lg">
                                        <div className="w-6 h-6 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] flex items-center justify-center text-xs font-bold shrink-0">
                                          {c.author_name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[var(--color-text-primary)]">{c.author_name || 'Unknown'}</span>
                                            <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                          </div>
                                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{c.text}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <textarea
                                    value={commentText[t.id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      const hasAt = val.includes('@')
                                      setShowMentions(prev => ({ ...prev, [t.id]: hasAt }))
                                      setCommentText(prev => ({ ...prev, [t.id]: val }))
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(t.id) } }}
                                    placeholder="Add a comment... @ to mention"
                                    rows={1}
                                    className="flex-1 text-xs p-2 rounded-lg border border-[var(--color-card-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-300)] transition-shadow placeholder:text-[var(--color-text-muted)]"
                                  />
                                  <button onClick={() => addComment(t.id)} disabled={!commentText[t.id]?.trim()} className="shrink-0 px-3 py-2 text-xs font-semibold text-white bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                                    Send
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            api.getTasks().then(data => {
              setTasks(data.filter(t => t.source === 'ai' || t.source === 'manual'))
            })
          }}
        />
      )}

      {selectedTask && createPortal(
        <TaskDetailModal
          task={selectedTask}
          employees={employees}
          comments={comments[selectedTask.id] || []}
          onClose={() => setSelectedTask(null)}
          onStatusChange={(id, status) => updateStatus(id, status)}
          onReassign={(id, employeeId) => reassignTask(id, employeeId)}
          onCommentAdded={(taskId, newComment) => {
            setComments(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), newComment] }))
          }}
        />,
        document.getElementById('portal-root')
      )}
    </div>
  )
}

function TaskDetailModal({ task, employees, comments, onClose, onStatusChange, onReassign, onCommentAdded }) {
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const statusOpts = ['pending', 'in_progress', 'completed']
  const priority = priorityConfig[task.priority] || priorityConfig.medium

  const handleAddComment = async () => {
    const text = commentText.trim()
    if (!text) return
    setSubmitting(true)
    try {
      const newComment = await api.addTaskComment(task.id, { text })
      onCommentAdded(task.id, newComment)
      setCommentText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--color-card-bg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-[var(--color-card-border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <button
                onClick={() => onStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  task.status === 'completed'
                    ? 'bg-[var(--color-primary-500)] border-[var(--color-primary-500)]'
                    : 'border-[var(--color-text-secondary)] hover:border-[var(--color-primary-400)]'
                }`}
              >
                {task.status === 'completed' && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-snug">{task.title}</h2>
                {task.meeting_title && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">From: {task.meeting_title}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick badges row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${priority.classes}`}>
              <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
              {priority.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[task.status]?.classes || ''}`}>
              {statusConfig[task.status]?.icon}
              {statusConfig[task.status]?.label || task.status}
            </span>
            {task.source && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${task.source === 'ai' ? 'text-[var(--color-primary-600)] bg-[var(--color-primary-50)]' : 'text-[var(--color-text-secondary)] bg-[var(--color-badge-bg)]'}`}>
                {task.source === 'ai' ? 'AI Generated' : 'Manual'}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Description</h3>
            {task.description ? (
              <div className="p-4 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
                <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] italic">No description provided</p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Assignee</p>
              <select
                value={task.assigned_to || ''}
                onChange={e => onReassign(task.id, e.target.value)}
                className="mt-1 text-sm font-medium text-[var(--color-text-primary)] bg-transparent border-none p-0 focus:outline-none cursor-pointer appearance-none w-full"
              >
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</p>
              <select
                value={task.status}
                onChange={e => onStatusChange(task.id, e.target.value)}
                className="mt-1 text-sm font-medium text-[var(--color-text-primary)] bg-transparent border-none p-0 focus:outline-none cursor-pointer appearance-none w-full"
              >
                {statusOpts.map(s => <option key={s} value={s}>{statusConfig[s]?.label || s}</option>)}
              </select>
            </div>
            <div className="p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Priority</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">{priority.label}</p>
            </div>
            <div className="p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Created</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                {task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
              </p>
            </div>
            <div className="p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Source</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                {task.source === 'ai' ? 'AI Generated' : task.source === 'manual' ? 'Manual' : '-'}
              </p>
            </div>
            {task.due_date && (
              <div className="p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Due Date</p>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Comments ({comments.length})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-3">
              {comments.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] italic">No comments yet</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-3 bg-[var(--color-badge-bg)] rounded-xl border border-[var(--color-card-border)]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      {c.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{c.author_name || 'Unknown'}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                placeholder="Add a comment..."
                rows={1}
                className="flex-1 text-sm p-3 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent transition-all placeholder:text-[var(--color-text-muted)]"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
                className="shrink-0 px-5 py-3 text-sm font-semibold text-white bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[var(--color-card-border)] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-badge-bg)] rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateTaskModal({ onClose, onCreated }) {
  const [employees, setEmployees] = useState([])
  const [meetings, setMeetings] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    meeting: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    created_at: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    api.getEmployees().then(setEmployees)
    api.getMeetings().then(setMeetings)
  }, [])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      const body = { ...form, source: 'manual' }
      body.assigned_to = body.assigned_to ? parseInt(body.assigned_to) : null
      body.meeting = body.meeting ? parseInt(body.meeting) : null
      if (!body.due_date) delete body.due_date
      body.created_at = new Date(body.created_at).toISOString()
      await api.createTask(body)
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-[var(--color-badge-bg)] border border-[var(--color-card-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)]/40 focus:border-[var(--color-primary-400)] focus:bg-[var(--color-card-bg)] transition-all placeholder:text-[var(--color-text-muted)]"
  const selectCls = inputCls + " appearance-none cursor-pointer pr-9"

  return (
    <>
      <div className="fixed inset-0 bg-[var(--color-sidebar)]/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-[var(--color-card-bg)] shadow-2xl z-50 flex flex-col animate-slide-left border-l border-[var(--color-card-border)]" onClick={e => e.stopPropagation()}>
        <div className="shrink-0 px-6 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-600)] flex items-center justify-center shadow-md shadow-black/10">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">Create New Task</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Add a task manually to your list</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-badge-bg)] flex items-center justify-center transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 border-t border-[var(--color-card-border)]">
          <form onSubmit={e => { e.stopPropagation(); handleSubmit(e) }} className="space-y-4 pt-5">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Title <span className="text-red-500 ml-0.5">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputCls} placeholder="What needs to be done?" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputCls + " resize-none"} placeholder="Add more context or notes..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Assignee</label>
                <div className="relative">
                  <select name="assigned_to" value={form.assigned_to} onChange={handleChange} className={selectCls}>
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Priority</label>
                <div className="relative">
                  <select name="priority" value={form.priority} onChange={handleChange} className={selectCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Status</label>
                <div className="relative">
                  <select name="status" value={form.status} onChange={handleChange} className={selectCls}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Meeting</label>
                <div className="relative">
                  <select name="meeting" value={form.meeting} onChange={handleChange} className={selectCls}>
                    <option value="">None</option>
                    {meetings.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Due Date</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <input type="date" name="due_date" value={form.due_date} onChange={handleChange} className={inputCls + " pl-9"} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5 tracking-wide uppercase">Created Date</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <input type="date" name="created_at" value={form.created_at} onChange={handleChange} className={inputCls + " pl-9"} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--color-card-border)]">
              <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-badge-bg)] rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={submitting || !form.title.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary-600)] rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-md shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                {submitting ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creating...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>Create Task</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
