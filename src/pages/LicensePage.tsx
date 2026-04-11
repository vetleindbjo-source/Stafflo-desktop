import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const PLAN_LABELS: Record<string, string> = {
  trial: 'Prøveperiode (7 dager)',
  solo: 'Solo butikk',
  small_chain: 'Liten kjede',
}

export function LicensePage() {
  const { activateLicense, licenseStatus, logout } = useAppStore()
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim()) return
    setLoading(true)
    setError('')
    const result = await activateLicense(key.trim())
    setLoading(false)
    if (!result.success) setError(result.error ?? 'Aktivering feilet')
  }

  const isExpired = licenseStatus && !licenseStatus.active && licenseStatus.plan !== null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <svg className="w-16 h-16 mx-auto mb-4" viewBox="-10 -6 120 124" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D4FF"/>
                <stop offset="100%" stopColor="#0088CC"/>
              </linearGradient>
            </defs>
            <path d="M50 6 C62 6 80 14 80 28 C80 37 73 41 64 44 C73 47 80 51 80 62 C80 78 62 94 50 94 C38 94 20 86 20 72 C20 63 27 59 36 56 C27 53 20 49 20 38 C20 22 38 6 50 6Z" fill="url(#lg2)"/>
            <path d="M50 38 L54 47 L63 50 L54 53 L50 62 L46 53 L37 50 L46 47Z" fill="white"/>
          </svg>
          <h1 className="text-3xl font-bold text-white tracking-wide">STAFFLO</h1>
          <p className="text-blue-300 mt-1 text-sm tracking-widest font-light">Staff. Simplified.</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl">
          {isExpired ? (
            <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
              <p className="text-amber-300 text-sm font-medium">Lisensen din er utløpt</p>
              <p className="text-amber-300/70 text-xs mt-1">Kjøp en ny lisens og aktiver nøkkelen under.</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Aktiver Stafflo</h2>
              <p className="text-white/50 text-sm mb-5">
                Skriv inn lisensnøkkelen du mottok etter kjøpet.
              </p>
            </>
          )}

          <form onSubmit={handleActivate} className="space-y-3">
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="STAFFLO-XXXX-XXXX-XXXX-XXXX"
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-colors"
              spellCheck={false}
              autoComplete="off"
            />

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Aktiverer...
                </span>
              ) : 'Aktiver lisens'}
            </button>
          </form>

          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs text-center mb-3">
              Ingen nøkkel?{' '}
              <button
                onClick={() => activateLicense('TRIAL-START')}
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Start 7-dagers prøveperiode
              </button>
            </p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="mt-4 w-full text-center text-white/30 text-xs hover:text-white/50 transition-colors"
        >
          Logg ut
        </button>
      </div>
    </div>
  )
}
