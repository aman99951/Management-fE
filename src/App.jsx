import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { api } from './api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Meetings from './pages/Meetings'
import Tasks from './pages/Tasks'
import Employees from './pages/Employees'
import Settings from './pages/Settings'
import Schedule from './pages/Schedule'

function AppRoutes() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ssoToken = params.get('sso')

    if (ssoToken) {
      const API = import.meta.env.VITE_API_URL || ''
      fetch(`${API}/api/auth/verify-sso/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sso: ssoToken }),
        credentials: 'include',
      }).then(res => res.json()).then(data => {
        if (data.authenticated && data.token) {
          localStorage.setItem('sso_token', data.token)
          window.history.replaceState({}, '', window.location.pathname)
          window.location.reload()
        } else {
          setSession({ authenticated: false })
          setLoading(false)
        }
      }).catch(() => {
        setSession({ authenticated: false })
        setLoading(false)
      })
      return
    }

    api.getSession().then(data => {
      setSession(data)
      setLoading(false)
    }).catch(() => {
      setSession({ authenticated: false })
      setLoading(false)
    })
  }, [])

  if (loading) return null

  if (!session.authenticated) {
    return <Login />
  }

  return (
    <Layout session={session} onLogout={() => { api.logout().then(() => setSession({ authenticated: false })).catch(() => setSession({ authenticated: false })) }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
