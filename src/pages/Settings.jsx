import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [configured, setConfigured] = useState(false)
  const [saved, setSaved] = useState(false)
  const [session, setSession] = useState(null)
  const [gcConnected, setGcConnected] = useState(false)
  const [gcConnecting, setGcConnecting] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)

  useEffect(() => {
    api.getSession().then(data => {
      setSession(data)
      setGcConnected(data.user?.google_calendar_connected ?? false)
    })
    api.getFathomConfig().then(data => {
      setConfigured(data.configured)
      if (data.email_notifications_enabled !== undefined) {
        setEmailEnabled(data.email_notifications_enabled)
      }
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      api.fathomOAuthCallback(code).then(() => {
        window.history.replaceState({}, '', '/settings')
        window.location.reload()
      })
    }
  }, [])

  const save = async (e) => {
    e.preventDefault()
    await api.saveFathomConfig({ api_key: apiKey })
    setConfigured(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setApiKey('')
  }

  const SectionCard = ({ icon, title, desc, children, className = '' }) => (
    <div className={`bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-2xl p-6 hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-badge-bg)] flex items-center justify-center shadow-sm shrink-0">
          <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )

  const ConnectedBadge = ({ label }) => (
    <div className="inline-flex items-center gap-1.5 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-3.5 py-2 rounded-xl text-sm border border-[var(--color-primary-200)]">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
    </div>
  )

  const PrimaryBtn = ({ children, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] disabled:opacity-50 transition-all shadow-sm shadow-black/10"
    >
      {children}
    </button>
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage integrations, account, and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Account */}
        <SectionCard
          icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          title="Account"
          desc="Signed in with Google"
        >
          <div className="flex items-center gap-3 bg-[var(--color-badge-bg)] rounded-xl px-4 py-3 border border-[var(--color-card-border)]">
            <div className="w-9 h-9 rounded-full bg-[var(--color-primary-600)] text-white flex items-center justify-center text-sm font-semibold shadow-sm shrink-0">
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{session?.user?.name || 'User'}</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">{session?.user?.email || ''}</p>
            </div>
            {session?.user?.google_connected && <ConnectedBadge label="Connected" />}
          </div>
        </SectionCard>

        {/* How It Works */}
        <SectionCard
          icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          title="How It Works"
          desc="End-to-end integration flow"
        >
          <ol className="space-y-2.5 text-sm text-[var(--color-text-secondary)]">
            {[
              'Get your API key from Fathom Settings \u2192 API Access (fathom.video/customize)',
              'Enter the key above \u2014 it will be used to authenticate with Fathom\'s API',
              'Option A: Click "Sync from Fathom" on the Meetings page to pull all recorded meetings',
              'Option B: Set up the webhook URL in Fathom for real-time meeting data delivery',
              'When a meeting is processed, its action items become tasks assigned to matching employees',
              'Track and update task status on the Tasks page',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--color-primary-600)] text-white flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 shadow-sm">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        {/* Fathom Connection */}
        <SectionCard
          icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          title="Fathom Connection"
          desc="Connect via OAuth or API key"
        >
          {session?.user?.fathom_connected ? (
            <ConnectedBadge label="Fathom account is connected via OAuth" />
          ) : (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">Authorize with Fathom to automatically sync your meetings.</p>
              <PrimaryBtn onClick={async () => {
                try {
                  const data = await api.getFathomOAuthUrl()
                  if (data.url) window.location.href = data.url
                } catch { alert('Fathom OAuth is not available. Use the API key below to connect.') }
              }}>
                Connect Fathom Account
              </PrimaryBtn>
            </div>
          )}
        </SectionCard>

        {/* Google Calendar */}
        <SectionCard
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          title="Google Calendar"
          desc="Create and sync meetings with Google Calendar"
        >
          {gcConnected ? (
            <div>
              <div className="mb-3"><ConnectedBadge label="Google Calendar is connected" /></div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  const data = await api.getGoogleCalendarAuthUrl()
                  if (data.url) window.location.href = data.url
                }} className="px-4 py-2 bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] border border-[var(--color-card-border)] text-sm font-medium rounded-xl hover:bg-[var(--color-badge-bg)] transition-all">
                  Reconnect
                </button>
                <button onClick={async () => { await api.disconnectGoogleCalendar(); setGcConnected(false) }}
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-xl hover:bg-red-100 transition-all">
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">Authorize with Google Calendar to create Google Meet links and sync your events.</p>
              <PrimaryBtn onClick={async () => {
                setGcConnecting(true)
                try {
                  const data = await api.getGoogleCalendarAuthUrl()
                  if (data.url) window.location.href = data.url
                } catch { alert('Google Calendar OAuth is not available.') }
                setGcConnecting(false)
              }} disabled={gcConnecting}>
                {gcConnecting ? 'Connecting...' : 'Connect Google Calendar'}
              </PrimaryBtn>
            </div>
          )}
        </SectionCard>

        {/* Fathom API Key */}
        <SectionCard
          icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          title="Fathom API Key"
          desc="API key for syncing meetings and action items"
        >
          {configured && (
            <div className="flex items-center gap-2 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-4 py-2.5 rounded-xl mb-4 text-sm border border-[var(--color-primary-200)]">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fathom API is configured and active
            </div>
          )}
          <form onSubmit={save}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">API Key</label>
            <div className="flex gap-2">
              <input
                placeholder={configured ? 'Enter new key to update...' : 'Enter your Fathom API key'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
                className="flex-1 px-3.5 py-2.5 border border-[var(--color-card-border)] rounded-xl text-sm text-[var(--color-text-primary)] bg-[var(--color-badge-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent transition-shadow placeholder:text-[var(--color-text-muted)]"
              />
              <button type="submit" className="px-5 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-sm shadow-black/10">
                {configured ? 'Update' : 'Save'}
              </button>
            </div>
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-primary-600)] font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved successfully
              </p>
            )}
          </form>
        </SectionCard>

        {/* Email Notifications */}
        <SectionCard
          icon="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          title="Email Notifications"
          desc="Master toggle for all email notifications"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {emailEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {emailEnabled
                  ? 'Task assignments, meeting invites, and action items will be sent via email'
                  : 'No emails will be sent for tasks, meetings, or action items'}
              </p>
            </div>
            <button
              onClick={async () => {
                const next = !emailEnabled
                setEmailEnabled(next)
                await api.setEmailNotifications(next)
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:ring-offset-2 ${
                emailEnabled ? 'bg-[var(--color-primary-600)]' : 'bg-[var(--color-badge-bg)]'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  emailEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </SectionCard>

        {/* Webhook URL */}
        <SectionCard
          icon="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          title="Webhook URL"
          desc="Configure this URL in Fathom for real-time updates"
        >
          <div className="bg-[var(--color-badge-bg)] border border-[var(--color-card-border)] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <code className="text-sm text-[var(--color-text-secondary)] break-all font-mono">
              {(import.meta.env.VITE_API_URL || window.location.origin) + '/api/fathom/webhook/'}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_API_URL || window.location.origin}/api/fathom/webhook/`)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg hover:bg-[var(--color-badge-bg)] hover:border-[var(--color-text-muted)]/30 transition-all"
            >
              Copy
            </button>
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
