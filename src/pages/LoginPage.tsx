import React, { useEffect, useState } from 'react'
import { BACKEND_URL, AuthUser } from '../types'
import { useAppStore } from '../store/useAppStore'
import { storage } from '../utils/storage'

// Electron exposes ipcRenderer to open external URLs safely
declare global {
  interface Window {
    electron?: { shell?: { openExternal?: (url: string) => void } }
  }
}

function openExternal(url: string) {
  if (window.electron?.shell?.openExternal) {
    window.electron.shell.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

const LOCAL_GUEST: AuthUser = {
  id: 'local',
  email: 'local@arbeidsplan',
  name: 'Lokal bruker',
  provider: 'google',
  gdprConsentAt: new Date().toISOString(), // skip GDPR modal in local mode
}

export function LoginPage() {
  const { setAuth, backendAvailable, checkBackend } = useAppStore()
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkBackend().then(() => setChecking(false))

    // Listen for the auth token coming back via URL hash or query param
    // In Electron, the main process will forward the arbeidsplan:// deep link
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'STAFFLO_AUTH') {
        const { accessToken, refreshToken } = e.data
        completeLogin(accessToken, refreshToken)
      }
    }
    window.addEventListener('message', handleMessage)

    // Also check if we were redirected with token in URL (web fallback)
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    if (accessToken && refreshToken) {
      completeLogin(accessToken, refreshToken)
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function completeLogin(accessToken: string, refreshToken: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error('Kunne ikke hente brukerinfo')
      const data = await res.json()
      const user: AuthUser = data.user ?? data
      setAuth(user, accessToken, refreshToken)
    } catch (err) {
      setError('Innlogging feilet. Prøv igjen.')
    }
  }

  async function devLogin() {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/dev-login`, { method: 'POST' })
      if (!res.ok) throw new Error('Dev login feilet')
      const data = await res.json() as { accessToken: string; refreshToken: string; user: AuthUser }
      setAuth(data.user, data.accessToken, data.refreshToken)
    } catch {
      setError('Dev login feilet. Er backend kjørende?')
    }
  }

  function loginWith(provider: 'google' | 'microsoft') {
    const url = `${BACKEND_URL}/auth/${provider}`
    openExternal(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg className="w-16 h-16 mx-auto mb-4" viewBox="-10 -6 120 124" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D4FF"/>
                <stop offset="100%" stopColor="#0088CC"/>
              </linearGradient>
            </defs>
            <path d="M50 6 C62 6 80 14 80 28 C80 37 73 41 64 44 C73 47 80 51 80 62 C80 78 62 94 50 94 C38 94 20 86 20 72 C20 63 27 59 36 56 C27 53 20 49 20 38 C20 22 38 6 50 6Z" fill="url(#lg)"/>
            <path d="M50 38 L54 47 L63 50 L54 53 L50 62 L46 53 L37 50 L46 47Z" fill="white"/>
          </svg>
          <h1 className="text-3xl font-bold text-white tracking-wide">STAFFLO</h1>
          <p className="text-blue-300 mt-1 text-sm tracking-widest font-light">Staff. Simplified.</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Logg inn</h2>
          <p className="text-white/50 text-sm mb-6">Bruk din jobb- eller bedriftskonto</p>

          {checking ? (
            <div className="flex items-center justify-center py-6 gap-2 text-white/40">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Kobler til server...</span>
            </div>
          ) : backendAvailable ? (
            <div className="space-y-3">
              {/* Google */}
              <button
                onClick={() => loginWith('google')}
                className="w-full flex items-center gap-3 bg-white text-gray-800 px-4 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Fortsett med Google
              </button>

              {/* Microsoft */}
              <button
                onClick={() => loginWith('microsoft')}
                className="w-full flex items-center gap-3 bg-[#0078d4] text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-[#006cc1] transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 2H2v9.4h9.4V2zM22 2h-9.4v9.4H22V2zM11.4 12.6H2V22h9.4v-9.4zM22 12.6h-9.4V22H22v-9.4z"/>
                </svg>
                Fortsett med Microsoft
              </button>

              {import.meta.env.DEV && (
                <button
                  onClick={devLogin}
                  className="w-full flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-xl font-medium text-sm hover:bg-amber-500/20 transition-colors"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Dev login (test uten OAuth)
                </button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative text-center"><span className="px-2 text-xs text-white/30 bg-transparent">eller</span></div>
              </div>

              <button
                onClick={() => setAuth(LOCAL_GUEST, 'local', 'local')}
                className="w-full flex items-center gap-3 bg-white/5 border border-white/10 text-white/60 px-4 py-3 rounded-xl font-medium text-sm hover:bg-white/10 hover:text-white/80 transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Bruk lokalt (uten konto)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-amber-300 text-sm font-medium mb-1">Backend ikke tilgjengelig</p>
                <p className="text-amber-300/70 text-xs">
                  Google/Microsoft-innlogging krever backend-serveren.<br />
                  <code className="font-mono opacity-70">cd backend && npm run dev</code>
                </p>
                <button
                  onClick={() => { setChecking(true); checkBackend().then(() => setChecking(false)) }}
                  className="mt-2 text-xs text-amber-300 underline"
                >
                  Prøv igjen
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative text-center"><span className="px-2 text-xs text-white/30">eller fortsett uten server</span></div>
              </div>

              <button
                onClick={() => setAuth(LOCAL_GUEST, 'local', 'local')}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Bruk lokalt (uten konto)
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* GDPR note */}
        <p className="text-center text-white/30 text-xs mt-6 leading-relaxed">
          Ved å logge inn godtar du vår{' '}
          <button className="underline text-white/50 hover:text-white/70">
            personvernerklæring
          </button>
          {' '}i henhold til GDPR og norsk personopplysningslov.
        </p>
      </div>
    </div>
  )
}
