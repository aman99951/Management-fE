import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => { api.getDashboardStats().then(setStats) }, [])

  if (!stats) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8"><h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 animate-pulse">
              <div className="w-11 h-11 rounded-xl bg-[var(--color-badge-bg)] mb-3" />
              <div className="h-8 bg-[var(--color-badge-bg)] rounded w-16 mb-1" />
              <div className="h-4 bg-[var(--color-card-border)] rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const taskTotal = stats.total_tasks || 1
  const completionRate = Math.round((stats.completed_tasks / taskTotal) * 100)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Workspace overview and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-xl text-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary-500)]" />
            <span className="font-medium text-[var(--color-text-primary)]">{completionRate}%</span>
            <span className="text-[var(--color-text-muted)]">completion rate</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'Total Meetings', key: 'total_meetings', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', light: 'bg-[var(--color-primary-50)]', textColor: 'text-[var(--color-primary-600)]' },
          { label: 'Total Tasks', key: 'total_tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', light: 'bg-[var(--color-badge-bg)]', textColor: 'text-[var(--color-text-secondary)]' },
          { label: 'In Progress', key: 'in_progress_tasks', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', light: 'bg-[var(--color-primary-50)]', textColor: 'text-[var(--color-primary-600)]' },
          { label: 'Completed', key: 'completed_tasks', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', light: 'bg-[var(--color-primary-50)]', textColor: 'text-[var(--color-primary-600)]' },
          { label: 'Employees', key: 'total_employees', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', light: 'bg-[var(--color-badge-bg)]', textColor: 'text-[var(--color-text-secondary)]' },
        ].map(c => (
          <div key={c.key} className="group bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-5 hover:shadow-lg hover:border-[var(--color-text-muted)]/30 transition-all duration-200">
            <div className={`w-11 h-11 rounded-xl ${c.light} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
              <svg className={`w-5 h-5 ${c.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
              </svg>
            </div>
            <p className="text-3xl font-bold text-[var(--color-text-primary)] tabular-nums">{stats?.[c.key] ?? '—'}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Employee Progress */}
        <div className="lg:col-span-2 bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">Employee Progress</h2>
          <div className="space-y-4">
            {(stats.employee_progress || []).length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No employees with tasks yet</p>
            ) : (
              (stats.employee_progress || []).map(emp => {
                const total = emp.total || 1
                const completedPct = (emp.completed / total) * 100
                const inProgressPct = (emp.in_progress / total) * 100
                const pendingPct = (emp.pending / total) * 100
                return (
                  <div key={emp.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{emp.name}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{emp.completed}/{emp.total} tasks &middot; {emp.completion_rate}%</span>
                    </div>
                    <div className="h-2.5 bg-[var(--color-badge-bg)] rounded-full overflow-hidden flex">
                      <div className="bg-[var(--color-primary-500)] h-full rounded-l-full transition-all duration-700" style={{ width: `${completedPct}%` }} />
                      <div className="bg-[var(--color-primary-300)] h-full transition-all duration-700" style={{ width: `${inProgressPct}%` }} />
                      <div className="bg-[var(--color-text-muted)] h-full rounded-r-full transition-all duration-700" style={{ width: `${pendingPct}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-500)]" /> {emp.completed} done
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-300)]" /> {emp.in_progress} in progress
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" /> {emp.pending} pending
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Task Status Donut */}
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">Task Status</h2>
          {(() => {
            const { pending, in_progress, completed } = stats.task_by_status || {}
            const total = pending + in_progress + completed || 1
            const pPct = (pending / total) * 100
            const ipPct = (in_progress / total) * 100
            const cPct = (completed / total) * 100
            const dashArray = 2 * Math.PI * 45
            const cOffset = dashArray * (1 - cPct / 100)
            const ipOffset = dashArray * (1 - (cPct + ipPct) / 100)
            return (
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-badge-bg)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-primary-500)" strokeWidth="8" strokeDasharray={dashArray} strokeDashoffset={cOffset} strokeLinecap="round" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-primary-300)" strokeWidth="8" strokeDasharray={dashArray} strokeDashoffset={ipOffset} strokeLinecap="round" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-card-border)" strokeWidth="8" strokeDasharray={dashArray} strokeDashoffset={0} strokeLinecap="round" opacity="0.5" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{completionRate}%</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">complete</p>
                    </div>
                  </div>
                </div>
                <div className="w-full mt-5 space-y-2">
                  {[
                    { label: 'Completed', value: completed, pct: cPct, color: 'bg-[var(--color-primary-500)]' },
                    { label: 'In Progress', value: in_progress, pct: ipPct, color: 'bg-[var(--color-primary-300)]' },
                    { label: 'Pending', value: pending, pct: pPct, color: 'bg-[var(--color-text-muted)]' },
                  ].map(d => (
                    <div key={d.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                        <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                      </span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Priority Distribution */}
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">Task Priority</h2>
          <div className="space-y-3">
            {[
              { label: 'Critical', key: 'critical', color: 'bg-red-500' },
              { label: 'High', key: 'high', color: 'bg-orange-500' },
              { label: 'Medium', key: 'medium', color: 'bg-[var(--color-primary-400)]' },
              { label: 'Low', key: 'low', color: 'bg-[var(--color-text-muted)]' },
            ].map(p => {
              const count = stats.task_by_priority?.[p.key] || 0
              const pct = (count / taskTotal) * 100
              return (
                <div key={p.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--color-text-secondary)]">{p.label}</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--color-badge-bg)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Task Trend (Last 7 days) */}
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">Task Trend (7 Days)</h2>
          {(() => {
            const trends = stats.task_trends || []
            const maxCount = Math.max(...trends.map(t => t.count), 1)
            return (
              <div className="flex items-end justify-between gap-1.5 h-32">
                {trends.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] w-full text-center pt-8">No task data this week</p>
                ) : (
                  trends.map((t, i) => {
                    const height = (t.count / maxCount) * 100
                    const day = t.date ? new Date(t.date + 'T00:00:00') : new Date()
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">{t.count}</span>
                        <div className="w-full flex justify-center" style={{ height: `${Math.max(height, 4)}%` }}>
                          <div className="w-full max-w-[24px] rounded-t-md bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] transition-colors" style={{ height: '100%' }} />
                        </div>
                        <span className="text-[9px] text-[var(--color-text-muted)]">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })()}
        </div>

        {/* Meeting Status & Source */}
        <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Meeting Status</h2>
          <div className="space-y-2.5 mb-5">
            {[
              { label: 'Scheduled', key: 'scheduled', color: 'bg-[var(--color-primary-400)]' },
              { label: 'Ongoing', key: 'ongoing', color: 'bg-blue-400' },
              { label: 'Completed', key: 'completed', color: 'bg-[var(--color-primary-500)]' },
              { label: 'Cancelled', key: 'cancelled', color: 'bg-[var(--color-text-muted)]' },
            ].map(s => {
              const count = stats.scheduled_status?.[s.key] || 0
              const total = Object.values(stats.scheduled_status || {}).reduce((a, b) => a + b, 0) || 1
              const pct = (count / total) * 100
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                  <span className="text-sm text-[var(--color-text-secondary)] flex-1">{s.label}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{count}</span>
                  <div className="w-16 h-1.5 bg-[var(--color-badge-bg)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 pt-3 border-t border-[var(--color-card-border)]">Task Source</h2>
          <div className="space-y-2.5">
            {[
              { label: 'Fathom', key: 'fathom', color: 'bg-[var(--color-primary-500)]' },
              { label: 'AI Generated', key: 'ai', color: 'bg-[var(--color-primary-300)]' },
              { label: 'Manual', key: 'manual', color: 'bg-[var(--color-text-muted)]' },
            ].map(s => {
              const count = stats.task_by_source?.[s.key] || 0
              const pct = (count / taskTotal) * 100
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} />
                  <span className="text-sm text-[var(--color-text-secondary)] flex-1">{s.label}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{count}</span>
                  <div className="w-16 h-1.5 bg-[var(--color-badge-bg)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: '/schedule', label: 'Schedule Meeting', desc: 'Plan and invite attendees', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { href: '/meetings', label: 'Sync from Fathom', desc: 'Pull latest recordings', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
            { href: '/tasks', label: 'View Tasks', desc: 'Review action items', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
            { href: '/settings', label: 'Settings', desc: 'Configure integrations', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
          ].map(a => (
            <a key={a.href} href={a.href}
              className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-badge-bg)] border border-[var(--color-card-border)] hover:shadow-md hover:border-[var(--color-text-muted)]/30 transition-all duration-200 group">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-600)] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{a.label}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{a.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
