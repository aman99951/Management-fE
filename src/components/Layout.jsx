import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { api } from '../api'

const navItems = [
  { to: '/', label: 'Analytics', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/schedule', label: 'Scheduled Meetings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/backlog', label: 'Backlog', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { to: '/meetings', label: 'Recordings', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { to: '/tasks', label: 'Task Board', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/employees', label: 'Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
  { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function Layout({ children, session, onLogout }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!session?.authenticated) return
    const fetchNotifications = () => {
      api.getNotifications().then(data => {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }).catch(() => {})
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [session])

  const handleNotifClick = () => {
    setNotifOpen(!notifOpen)
    if (!notifOpen && unreadCount > 0) {
      api.markNotificationsRead([]).then(() => {
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      }).catch(() => {})
    }
  }

  const pageTitle = navItems.find(i => i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to))?.label || ''

  return (
    <div className="min-h-screen flex bg-[var(--color-page-bg)] font-['Segoe_UI',system-ui,sans-serif]">
      <div className={`fixed inset-0 bg-black/40 z-20 lg:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-[var(--color-sidebar)] text-white flex flex-col shrink-0 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-5 gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] flex items-center justify-center shadow-lg shadow-[var(--color-primary-500)]/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="font-semibold text-base tracking-tight">ManagePro</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--color-sidebar-active)] text-white shadow-sm'
                    : 'text-gray-400 hover:bg-[var(--color-sidebar-hover)] hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] flex items-center justify-center text-sm font-semibold shadow-sm">
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm leading-tight truncate">{session?.user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{session?.user?.email || ''}</p>
            </div>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="mt-3 w-full flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors group">
              <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-16 bg-[var(--color-header-bg)] backdrop-blur-md border-b border-[var(--color-header-border)] flex items-center px-4 sm:px-6 gap-4 shrink-0 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--color-card-border)] text-[var(--color-text-secondary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span className="hidden sm:inline">ManagePro</span>
            <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-[var(--color-text-primary)]">{pageTitle}</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 relative" ref={notifRef}>
            <button
              onClick={handleNotifClick}
              className="p-2 rounded-lg hover:bg-[var(--color-card-border)] text-[var(--color-text-secondary)] transition-colors relative"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-danger)] rounded-full ring-2 ring-[var(--color-card-bg)]" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--color-card-bg)] rounded-2xl shadow-xl border border-[var(--color-card-border)] overflow-hidden z-50 animate-scale-in">
                <div className="p-4 border-b border-[var(--color-card-border)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-2 py-0.5 rounded-full font-medium">{unreadCount} new</span>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <svg className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm text-[var(--color-text-muted)]">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div
                        key={n.id}
                        className={`p-4 border-b border-[var(--color-card-border)] hover:bg-[var(--color-badge-bg)] transition-colors ${
                          !n.is_read ? 'bg-[var(--color-primary-50)]/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            !n.is_read ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]' : 'bg-[var(--color-badge-bg)] text-[var(--color-badge-text)]'
                          }`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">{n.title}</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
