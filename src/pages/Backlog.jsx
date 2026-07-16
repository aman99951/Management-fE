import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'

const PRIORITIES = ['All', 'Low', 'Medium', 'High', 'Critical']
const STATUSES = ['New', 'Reviewed', 'In Progress', 'Done', 'Closed', 'Future Consideration']

const PRIORITY_COLORS = {
  Low: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  High: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  Critical: 'bg-red-500/20 text-red-300 border-red-500/30',
}

const STATUS_COLORS = {
  New: 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-300)] border-[var(--color-primary-500)]/30',
  Reviewed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'In Progress': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Done: 'bg-green-500/20 text-green-300 border-green-500/30',
  Closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'Future Consideration': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7)
}

function getWeekOptions() {
  const now = new Date()
  const current = getWeekNumber(now)
  const year = now.getFullYear()
  const weeks = []
  for (let w = current; w <= current + 5; w++) {
    weeks.push({ value: `W${w}`, label: `W${w} (${year})` })
  }
  return weeks
}

export default function Backlog() {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [notification, setNotification] = useState(null)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [generating, setGenerating] = useState(false)
  const [showAiGenerate, setShowAiGenerate] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [unconvertedCount, setUnconvertedCount] = useState(0)
  const [convertedCount, setConvertedCount] = useState(0)
  const [tab, setTab] = useState('all') // 'pending' | 'converted' | 'all'
  const [releaseWeekFilter, setReleaseWeekFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [meetingFrom, setMeetingFrom] = useState('')
  const [meetingTo, setMeetingTo] = useState('')
  const [convertingId, setConvertingId] = useState(null)
  const [closingId, setClosingId] = useState(null)
  const fileInputRef = useRef(null)

  const WEEK_OPTIONS = getWeekOptions()

  const [form, setForm] = useState({
    description: '',
    priority: 'Medium',
    owner: '',
    status: 'New',
    release_week: WEEK_OPTIONS.length > 0 ? WEEK_OPTIONS[0].value : '',
    eta: '',
    image_data: '',
    image_name: '',
  })

  function fetchItems() {
    setLoading(true)
    api.getBacklogItems({ page, pageSize, search, priority: priorityFilter, status: statusFilter, tab, release_week: releaseWeekFilter, owner: assigneeFilter, date_from: meetingFrom, date_to: meetingTo })
      .then(data => {
        setItems(data.results || [])
        setTotalCount(data.count || 0)
        if (data.pending_count !== undefined) setUnconvertedCount(data.pending_count)
        if (data.converted_count !== undefined) setConvertedCount(data.converted_count)
      })
      .catch(() => showNotif('Failed to load backlog items', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    api.getEmployees().then(data => {
      setEmployees(data)
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchItems() }, [page, pageSize, search, priorityFilter, statusFilter, tab, releaseWeekFilter, assigneeFilter, meetingFrom, meetingTo])

  useEffect(() => {
    if (!loading) api.autoRollWeeks().catch(() => {})
  }, [loading])

  // Lock body scroll when any modal is open (same pattern as Tasks page)
  useEffect(() => {
    const modalOpen = detailItem || showAdd || showAiGenerate
    const main = document.querySelector('main')
    if (modalOpen) {
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
  }, [detailItem, showAdd, showAiGenerate])

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showNotif('Image must be under 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, image_data: ev.target.result, image_name: file.name }))
    }
    reader.readAsDataURL(file)
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      showNotif('Please enter a prompt', 'error')
      return
    }
    setGenerating(true)
    try {
      const created = await api.generateBacklogFromPrompt(aiPrompt.trim())
      setItems(prev => [created, ...prev])
      showNotif('Backlog item generated by AI!')
      setAiPrompt('')
      setShowAiGenerate(false)
    } catch (err) {
      showNotif(err.message || 'AI generation failed', 'error')
    }
    setGenerating(false)
  }

  const resetForm = () => {
    setForm({ description: '', priority: 'Medium', owner: '', status: 'New', release_week: WEEK_OPTIONS.length > 0 ? WEEK_OPTIONS[0].value : '', eta: '', image_data: '', image_name: '' })
    setShowAdd(false)
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) {
      showNotif('Description is required', 'error')
      return
    }
    setSubmitting(true)
    try {
      const created = await api.createBacklogItem({
        description: form.description.trim(),
        priority: form.priority,
        owner: form.owner || null,
        status: form.status,
        release_week: form.release_week,
        eta: form.eta || null,
        image: form.image_data || null,
      })
      setItems(prev => [created, ...prev])
      showNotif('Backlog item added')
      resetForm()
    } catch (err) {
      showNotif(err.message || 'Failed to add backlog item', 'error')
    }
    setSubmitting(false)
  }

  const handleClose = async (id) => {
    setClosingId(id)
    try {
      const result = await api.closeBacklogItem(id)
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...result.backlog_item } : i))
      if (result.closed_task) {
        showNotif('Backlog closed. Linked task also closed.', 'success')
      } else {
        showNotif('Backlog item closed', 'success')
      }
    } catch (err) {
      showNotif(err.message || 'Failed to close item', 'error')
    } finally {
      setClosingId(null)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await api.updateBacklogItem(id, { status: newStatus })
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    } catch (err) {
      showNotif(err.message || 'Failed to update status', 'error')
    }
  }

  const handlePriorityChange = async (id, newPriority) => {
    try {
      const updated = await api.updateBacklogItem(id, { priority: newPriority })
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    } catch (err) {
      showNotif(err.message || 'Failed to update priority', 'error')
    }
  }

  const handleOwnerChange = async (id, newOwner) => {
    try {
      const updated = await api.updateBacklogItem(id, { owner: newOwner || null })
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    } catch (err) {
      showNotif(err.message || 'Failed to update assignee', 'error')
    }
  }

  const handleReleaseWeekChange = async (id, week) => {
    try {
      const updated = await api.updateBacklogItem(id, { release_week: week })
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    } catch (err) {
      showNotif(err.message || 'Failed to update release week', 'error')
    }
  }

  const handleEtaChange = async (id, eta) => {
    try {
      const updated = await api.updateBacklogItem(id, { eta: eta || null })
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i))
    } catch (err) {
      showNotif(err.message || 'Failed to update ETA', 'error')
    }
  }

  const getOwnerName = (owner) => {
    if (!owner) return 'Unassigned'
    const emp = employees.find(e => String(e.id) === String(owner))
    return emp?.name || emp?.email || 'Unassigned'
  }

  const handleConvertToTask = async (backlogItem) => {
    setConvertingId(backlogItem.id)
    try {
      const result = await api.convertBacklogToTask(backlogItem.id)
      if (result.status === 'already_converted') {
        showNotif('Task already created for this item', 'info')
      } else {
        showNotif('Task created automatically from backlog item!', 'success')
      }
      fetchItems()
    } catch (err) {
      showNotif(err.message || 'Failed to convert to task', 'error')
    }
    setConvertingId(null)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedItems = items

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary-500)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-up ${
          notification.type === 'error' ? 'bg-red-600 text-white' : notification.type === 'info' ? 'bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)]' : 'bg-green-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}



      {/* ════════ TABS & FILTERS ════════ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-badge-bg)] border border-[var(--color-card-border)]">
          {[
            { key: 'all', label: 'All Items', count: totalCount },
            { key: 'pending', label: 'Unconverted', count: unconvertedCount },
            { key: 'converted', label: 'Tasks', count: convertedCount },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.key
                  ? 'bg-[var(--color-primary-600)] text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                tab === t.key ? 'bg-white/15' : 'bg-[var(--color-card-border)]'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search backlog..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
        >
          {PRIORITIES.map(p => (
            <option key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={releaseWeekFilter}
          onChange={e => { setReleaseWeekFilter(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
        >
          <option value="">All Weeks</option>
          {getWeekOptions().map(w => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={e => { setAssigneeFilter(e.target.value); setPage(1) }}
          className="px-4 py-2 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
        >
          <option value="">All Assignees</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
          <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wider">Meeting</span>
        </label>
        <input
          type="date"
          value={meetingFrom}
          onChange={e => { setMeetingFrom(e.target.value); setPage(1) }}
          placeholder="From"
          className="px-4 py-2 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all"
        />
        <input
          type="date"
          value={meetingTo}
          onChange={e => { setMeetingTo(e.target.value); setPage(1) }}
          placeholder="To"
          className="px-4 py-2 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <span>{totalCount} item{totalCount !== 1 ? 's' : ''}{totalCount > pageSize ? ` — Page ${currentPage} of ${totalPages}` : ''}</span>
      </div>

      {/* ════════ BACKLOG ITEMS LIST ════════ */}
      {paginatedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-[var(--color-text-muted)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-lg font-medium text-[var(--color-text-secondary)]">
            {tab === 'pending' ? 'All items converted to tasks!' : tab === 'converted' ? 'No converted items yet' : 'No backlog items yet'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
            {tab === 'pending'
              ? 'All backlog items have been converted to tasks. Great work!'
              : tab === 'converted'
              ? 'Items approved from the review panel will appear here as tasks.'
              : 'Add your first item or scan discussions to capture backlog ideas'}
          </p>
          {tab === 'all' && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <>
        <div className="grid gap-3">
          {paginatedItems.map(item => (
            <div
              key={item.id}
              className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 hover:border-[var(--color-primary-500)]/20 transition-all duration-200 animate-slide-up"
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium}`}>
                      {item.priority}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[item.status] || STATUS_COLORS.New}`}>
                      {item.status}
                    </span>
                    {item.release_week && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-500)]/10 text-[var(--color-primary-400)]">
                        {item.release_week}
                      </span>
                    )}
                    {item.eta && (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                        new Date(item.eta) < new Date() ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                      }`}>
                        {new Date(item.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {item.source === 'auto-capture' && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/20 text-purple-300">
                        Auto-captured
                      </span>
                    )}
                    {item.task_id ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-500/30 bg-green-500/20 text-green-300">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Task #{item.task_id}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-gray-500/30 bg-gray-500/20 text-gray-400">
                        No task
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed cursor-pointer hover:text-[var(--color-primary-400)] transition-colors" onClick={() => setDetailItem(item)}>{item.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {getOwnerName(item.owner)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {item.meeting_date ? formatDate(item.meeting_date) : formatDate(item.created_at)}
                    </span>
                    {item.source_ref && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {item.source_ref}
                      </span>
                    )}
                  </div>
                  {item.task_id && (
                    <div className="mt-2 flex items-center gap-2 text-xs bg-green-500/10 rounded-lg px-3 py-1.5 border border-green-500/20 w-fit">
                      <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-green-300">Task <span className="font-semibold">#{item.task_id}</span> created</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.task_status === 'completed' ? 'bg-green-500/20 text-green-300' :
                        item.task_status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {item.task_status?.replace('_', ' ')}
                      </span>
                      <a href={`/tasks?task=${item.task_id}`} className="text-[var(--color-primary-400)] hover:text-[var(--color-primary-300)] underline ml-1">
                        View in Tasks
                      </a>
                    </div>
                  )}
                  {item.image && (
                    <div className="mt-3">
                      <img
                        src={item.image}
                        alt="Attachment"
                        className="max-h-32 rounded-lg object-cover border border-[var(--color-card-border)] cursor-pointer"
                        onClick={() => setSelectedImage(selectedImage === item.id ? null : item.id)}
                      />
                    </div>
                  )}
                  {selectedImage === item.id && item.image && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                      <img src={item.image} alt="" className="max-w-full max-h-full rounded-2xl" />
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[130px]">
                  <div className="flex sm:flex-col gap-2 w-full">
                    <div className="relative flex-1 sm:flex-none">
                      <select
                        value={item.status}
                        onChange={e => handleStatusChange(item.id, e.target.value)}
                        className="appearance-none w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] cursor-pointer pr-7 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                      <select
                        value={item.priority}
                        onChange={e => handlePriorityChange(item.id, e.target.value)}
                        className="appearance-none w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] cursor-pointer pr-7 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40"
                      >
                        {PRIORITIES.filter(p => p !== 'All').map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                      <select
                        value={item.owner || ''}
                        onChange={e => handleOwnerChange(item.id, e.target.value)}
                        className="appearance-none w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] cursor-pointer pr-7 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40"
                      >
                        <option value="">Unassigned</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
                        ))}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                      <select
                        value={item.release_week || ''}
                        onChange={e => handleReleaseWeekChange(item.id, e.target.value)}
                        className="appearance-none w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] cursor-pointer pr-7 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40"
                      >
                        <option value="">No week</option>
                        {WEEK_OPTIONS.map(w => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <input
                      type="date"
                      value={item.eta || ''}
                      onChange={e => handleEtaChange(item.id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all w-full"
                      title="ETA"
                    />
                  </div>

                  {/* ── Convert to Task button ── */}
                  {!item.task_id && (
                    <button
                      onClick={() => handleConvertToTask(item)}
                      disabled={convertingId === item.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors border border-green-500/20 disabled:opacity-50 w-full"
                    >
                      {convertingId === item.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                      {convertingId === item.id ? 'Converting...' : 'Create Task'}
                    </button>
                  )}

                  {/* ── Close ── */}
                  <button
                    onClick={() => handleClose(item.id)}
                    disabled={closingId === item.id || item.status === 'Closed'}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border w-full disabled:opacity-50 ${
                      item.status === 'Closed'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 cursor-not-allowed'
                        : 'bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-card-border)] border-[var(--color-card-border)]'
                    }`}
                  >
                    {closingId === item.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : item.status === 'Closed' ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {closingId === item.id ? 'Closing...' : item.status === 'Closed' ? 'Closed' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--color-text-muted)]">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">Per page:</label>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="px-2 py-1 rounded-lg text-xs bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
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
        )}
        </>
      )}

      {/* ════════ AI GENERATE MODAL ════════ */}
      {showAiGenerate && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowAiGenerate(false); setAiPrompt('') }}>
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-card-border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-500)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--color-primary-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Generate with AI</h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">Describe what needs to be done — AI will structure it</p>
                </div>
              </div>
              <button onClick={() => { setShowAiGenerate(false); setAiPrompt('') }} className="p-1.5 rounded-lg hover:bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Your Prompt *</label>
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={5}
                  placeholder="e.g. We need a user authentication system with Google OAuth, JWT tokens, and password reset functionality. Assign to Sekar with high priority."
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all resize-none"
                  required
                />
              </div>
              <div className="bg-[var(--color-badge-bg)] rounded-xl p-3 border border-[var(--color-card-border)]">
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  <span className="text-[var(--color-primary-400)] font-medium">💡 Tip:</span> Be specific about what needs to be built, who should do it, and the priority. The AI will generate a well-structured backlog item from your description.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleAiGenerate}
                  disabled={generating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] transition-colors shadow-lg shadow-[var(--color-primary-600)]/20 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      Generate Backlog Item
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setShowAiGenerate(false); setAiPrompt('') }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] hover:bg-[var(--color-card-border)] transition-colors border border-[var(--color-card-border)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('portal-root')
      )}

      {/* ════════ ADD ITEM MODAL ════════ */}
      {showAdd && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-card-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Add Backlog Item</h2>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Describe the backlog item..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all resize-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
                  >
                    {PRIORITIES.filter(p => p !== 'All').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Assign To</label>
                  <select
                    value={form.owner}
                    onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Release Week</label>
                <select
                  value={form.release_week}
                  onChange={e => setForm(prev => ({ ...prev, release_week: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all cursor-pointer"
                >
                  {WEEK_OPTIONS.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">ETA (Target Date)</label>
                <input
                  type="date"
                  value={form.eta}
                  onChange={e => setForm(prev => ({ ...prev, eta: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] border border-[var(--color-card-border)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Image Attachment</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-[var(--color-badge-bg)] border border-dashed border-[var(--color-card-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary-500)]/40 hover:text-[var(--color-text-secondary)] transition-all cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {form.image_name ? form.image_name : 'Click to upload image (max 5MB)'}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                {form.image_data && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.image_data} alt="Preview" className="h-20 rounded-lg object-cover border border-[var(--color-card-border)]" />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, image_data: '', image_name: '' }))}
                      className="absolute -top-2 -right-2 p-0.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] transition-colors shadow-lg shadow-[var(--color-primary-600)]/20 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add to Backlog'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-badge-bg)] text-[var(--color-text-primary)] hover:bg-[var(--color-card-border)] transition-colors border border-[var(--color-card-border)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('portal-root')
      )}

      {/* ════════ DETAIL MODAL ════════ */}
      {detailItem && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-[var(--color-card-bg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-card-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Backlog Details</h2>
              <button onClick={() => setDetailItem(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-badge-bg)] text-[var(--color-text-muted)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${PRIORITY_COLORS[detailItem.priority] || PRIORITY_COLORS.Medium}`}>
                  {detailItem.priority}
                </span>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[detailItem.status] || STATUS_COLORS.New}`}>
                  {detailItem.status}
                </span>
                {detailItem.source === 'auto-capture' && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/20 text-purple-300">
                    Auto-captured
                  </span>
                )}
                {detailItem.task_id && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-500/30 bg-green-500/20 text-green-300">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Task #{detailItem.task_id}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Description</label>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{detailItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Assignee</label>
                  <p className="text-[var(--color-text-primary)]">{getOwnerName(detailItem.owner)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Created</label>
                  <p className="text-[var(--color-text-primary)]">{formatDate(detailItem.created_at)}</p>
                </div>
                {detailItem.eta && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">ETA</label>
                    <p className={`text-[var(--color-text-primary)] ${new Date(detailItem.eta) < new Date() ? 'text-red-400 font-medium' : ''}`}>
                      {new Date(detailItem.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {new Date(detailItem.eta) < new Date() && ' (Overdue)'}
                    </p>
                  </div>
                )}
                {detailItem.source_ref && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Source</label>
                      <p className="text-[var(--color-text-primary)]">{detailItem.source_ref}</p>
                    </div>
                  </>
                )}
                {detailItem.task_id && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Linked Task</label>
                    <p className="text-[var(--color-text-primary)]">
                      Task #{detailItem.task_id} — {detailItem.task_title || ''}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        detailItem.task_status === 'completed' ? 'bg-green-500/20 text-green-300' :
                        detailItem.task_status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {detailItem.task_status?.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              {detailItem.image && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Attachment</label>
                  <img src={detailItem.image} alt="" className="max-h-48 rounded-lg object-cover border border-[var(--color-card-border)]" />
                </div>
              )}
            </div>
          </div>
        </div>,
        document.getElementById('portal-root')
      )}

      {/* ════════ CUSTOM SCAN MODAL ════════ */}
    </div>
  )
}
