import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [session, setSession] = useState(null)
  const [gcConnected, setGcConnected] = useState(false)
  const [gcConnecting, setGcConnecting] = useState(false)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [apiKeys, setApiKeys] = useState([])
  const [newKey, setNewKey] = useState('')
  const [keyCount, setKeyCount] = useState(0)
  const [webhooks, setWebhooks] = useState([])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [registeringWebhooks, setRegisteringWebhooks] = useState(false)
  const [webhookMsg, setWebhookMsg] = useState(null)

  useEffect(() => {
    api.getSession().then(data => {
      setSession(data)
      setGcConnected(data.user?.google_calendar_connected ?? false)
    })
    api.getFathomConfig().then(data => {
      if (data.email_notifications_enabled !== undefined) {
        setEmailEnabled(data.email_notifications_enabled)
      }
      setApiKeys((data.api_keys || []).map(k => ({ key: k.key, addedBy: k.added_by || '', isNew: false })))
      setKeyCount(data.key_count || (data.api_keys || []).length || 0)
    })
    api.listFathomWebhooks().then(data => {
      const list = data.webhooks || []
      setWebhooks(list)
      if (list.length > 0) setWebhookUrl(list[0].destination_url || '')
    }).catch(() => {})
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
    try {
      const data = await api.saveFathomConfig({
        api_keys: apiKeys.map(k => ({ key: k.key, added_by: k.addedBy || '' })),
      })
      setApiKeys((data.api_keys || []).map(k => ({ key: k.key, addedBy: k.added_by || '', isNew: false })))
      setKeyCount(data.key_count ?? apiKeys.length)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      setNewKey('')
    } catch (err) {
      alert('Failed to save keys: ' + (err.message || err))
    }
  }

  const removeKey = (i) => {
    const target = apiKeys[i]
    const remaining = apiKeys.filter((_, idx) => idx !== i)
    setApiKeys(remaining)
    if (!target || target.isNew) return
    api.saveFathomConfig({ api_keys: remaining.map(k => ({ key: k.key, added_by: k.addedBy || '' })) })
      .then(() => setKeyCount(remaining.length))
      .catch(err => {
        alert('Failed to delete key: ' + (err.message || err))
        api.getFathomConfig().then(d =>
          setApiKeys((d.api_keys || []).map(x => ({ key: x.key, addedBy: x.added_by || '', isNew: false })))
        )
      })
  }

  const addKey = () => {
    const trimmed = newKey.trim()
    if (!trimmed) return
    if (apiKeys.some(k => k.key === trimmed)) {
      setNewKey('')
      return
    }
    setApiKeys(prev => [...prev, { key: trimmed, addedBy: session?.user?.name || '', isNew: true }])
    setNewKey('')
  }

  const registerWebhooks = async () => {
    const url = webhookUrl.trim()
    if (!url) {
      setWebhookMsg({ type: 'error', text: 'Enter the public webhook destination URL first' })
      return
    }
    setRegisteringWebhooks(true)
    setWebhookMsg(null)
    try {
      const data = await api.registerFathomWebhooks(url)
      const results = data.results || []
      setWebhooks(results.map(r => ({
        masked: r.masked,
        webhook_id: r.webhook_id,
        destination_url: url,
        secret_set: Boolean(r.secret),
        status: r.status,
        detail: r.detail,
      })))
      const created = results.filter(r => r.status === 'created').length
      const exists = results.filter(r => r.status === 'exists').length
      const failed = results.filter(r => r.status === 'error').length
      setWebhookMsg({
        type: failed ? 'error' : 'success',
        text: failed
          ? `Registered ${created} new, ${exists} already existed, ${failed} failed`
          : `Webhook registered for ${created + exists} Fathom account${created + exists !== 1 ? 's' : ''}`,
      })
    } catch (err) {
      setWebhookMsg({ type: 'error', text: 'Failed to register webhook: ' + (err.message || err) })
    } finally {
      setRegisteringWebhooks(false)
    }
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
              'Get an API key from each Fathom account \u2014 Fathom Settings \u2192 API Access (fathom.video/customize)',
              'Add every account that joins your meetings below \u2014 sync searches all of them, so anyone who stays till the end gets captured',
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

        {/* Fathom API Keys */}
        <SectionCard
          icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          title="Fathom API Keys"
          desc="Add a key per Fathom account — sync finds whoever stayed in the meeting"
        >
          {keyCount > 0 && (
            <div className="flex items-center gap-2 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-4 py-2.5 rounded-xl mb-4 text-sm border border-[var(--color-primary-200)]">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {keyCount} Fathom account{keyCount > 1 ? 's' : ''} configured and active
            </div>
          )}

          <form onSubmit={save}>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Add Fathom Account API Key</label>
            <div className="flex gap-2">
              <input
                placeholder="Enter a Fathom API key (e.g. from another account)"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                className="flex-1 px-3.5 py-2.5 border border-[var(--color-card-border)] rounded-xl text-sm text-[var(--color-text-primary)] bg-[var(--color-badge-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent transition-shadow placeholder:text-[var(--color-text-muted)]"
              />
              <button type="button" onClick={addKey} className="px-4 py-2.5 bg-[var(--color-badge-bg)] text-[var(--color-text-secondary)] border border-[var(--color-card-border)] text-sm font-medium rounded-xl hover:bg-[var(--color-card-border)] transition-all">
                Add
              </button>
            </div>

            {apiKeys.length > 0 && (
              <div className="mt-3 space-y-2">
                {apiKeys.map((k, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 bg-[var(--color-badge-bg)] border border-[var(--color-card-border)] rounded-xl px-3.5 py-2.5">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <code className="text-sm text-[var(--color-text-secondary)] font-mono break-all">{k.key}</code>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-1 ml-5">
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        {k.addedBy ? `Added by ${k.addedBy}` : (k.isNew ? 'Not saved yet' : 'Added by Unknown')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKey(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all shrink-0"
                      title="Remove key"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-3">
              <button type="submit" className="px-5 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] transition-all shadow-sm shadow-black/10">
                {keyCount > 0 ? 'Save Keys' : 'Save Key'}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-primary-600)] font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved successfully
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-relaxed">
              Add the API key for every Fathom account that joins your meetings. Sync will search all accounts,
              so even if you leave early, the recording taken by whoever stayed to the end is picked up.
            </p>
          </form>
        </SectionCard>

        {/* Fathom Webhook (Auto-Sync) */}
        <SectionCard
          icon="M6.75 7.5l3 2.25a.75.75 0 000 1.5l-3 2.25m0-6a2.25 2.25 0 100 4.5m0-4.5a2.25 2.25 0 012.25 2.25m-2.25 4.5h9m0-9h2.25a2.25 2.25 0 012.25 2.25v.75m-4.5 6a2.25 2.25 0 102.25 3.75m-2.25-3.75h2.25a2.25 2.25 0 002.25-2.25V9m-9 4.5V21m0 0H4.5m4.5 0h4.5M18 12v4.5m0 4.5h-4.5M18 21h3"
          title="Fathom Webhook (Auto-Sync)"
          desc="Register a webhook so new Fathom meetings arrive automatically — no manual sync needed"
        >
          {webhooks.length > 0 && (
            <div className="flex items-center gap-2 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] px-4 py-2.5 rounded-xl mb-4 text-sm border border-[var(--color-primary-200)]">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {webhooks.length} webhook{webhooks.length > 1 ? 's' : ''} registered for {webhooks.length} account{webhooks.length > 1 ? 's' : ''} — auto-sync active
            </div>
          )}

          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Destination URL (must be publicly reachable)</label>
          <div className="flex gap-2">
            <input
              placeholder="https://your-backend.vercel.app/api/fathom/webhook/"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              className="flex-1 px-3.5 py-2.5 border border-[var(--color-card-border)] rounded-xl text-sm text-[var(--color-text-primary)] bg-[var(--color-badge-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)] focus:border-transparent transition-shadow placeholder:text-[var(--color-text-muted)]"
            />
            <button
              type="button"
              onClick={registerWebhooks}
              disabled={registeringWebhooks}
              className="px-4 py-2.5 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-xl hover:bg-[var(--color-primary-700)] disabled:opacity-50 transition-all"
            >
              {registeringWebhooks ? 'Registering...' : 'Register Webhook'}
            </button>
          </div>

          {webhookMsg && (
            <div className={`mt-3 text-sm px-3.5 py-2.5 rounded-xl border ${
              webhookMsg.type === 'error'
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border-[var(--color-primary-200)]'
            }`}>
              {webhookMsg.text}
            </div>
          )}

          {webhooks.length > 0 && (
            <div className="mt-4 space-y-2">
              {webhooks.map((w, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-[var(--color-badge-bg)] border border-[var(--color-card-border)] rounded-xl px-3.5 py-2.5">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${w.status === 'error' ? 'bg-red-500' : 'bg-[var(--color-primary-500)]'}`} />
                      <code className="text-sm text-[var(--color-text-secondary)] font-mono break-all">{w.masked}</code>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 ml-4">
                      {w.webhook_id ? `webhook ${w.webhook_id}` : 'no webhook'} · {w.destination_url}
                      {w.detail ? ` · ${w.detail}` : ''}
                    </span>
                  </div>
                  {w.secret_set && (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--color-primary-600)] shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-relaxed">
            Fathom only sends webhooks if one is registered — this is why meetings never appeared automatically.
            Registering points Fathom at this app so every new recording is pushed to us instantly, then tasks are
            generated in the background. The destination URL must be the public backend URL
            (e.g. <code className="text-[var(--color-text-secondary)]">https://your-backend.vercel.app/api/fathom/webhook/</code>).
          </p>
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
              {window.location.origin + '/api/fathom/webhook/'}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/fathom/webhook/`)}
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
