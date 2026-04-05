import React from 'react'
import { useAppStore, Theme } from '../store/useAppStore'

const NAV_ITEMS = [
  {
    id: 'employees' as const,
    label: 'Ansatte',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'schedule' as const,
    label: 'Lag plan',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'history' as const,
    label: 'Historikk',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'vacation' as const,
    label: 'Ferieplanlegger',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'settings' as const,
    label: 'Innstillinger',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function Sidebar() {
  const { activePage, setActivePage, settings, employees, theme, setTheme, authUser, backendAvailable } = useAppStore()

  function toggleTheme() {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="w-56 bg-sidebar flex flex-col h-full select-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Stafflo icon mark */}
          <svg className="w-9 h-9 flex-shrink-0" viewBox="-10 -6 120 124" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D4FF"/>
                <stop offset="100%" stopColor="#0088CC"/>
              </linearGradient>
            </defs>
            <path d="M50 6 C62 6 80 14 80 28 C80 37 73 41 64 44 C73 47 80 51 80 62 C80 78 62 94 50 94 C38 94 20 86 20 72 C20 63 27 59 36 56 C27 53 20 49 20 38 C20 22 38 6 50 6Z" fill="url(#sg)"/>
            <path d="M50 38 L54 47 L63 50 L54 53 L50 62 L46 53 L37 50 L46 47Z" fill="white"/>
          </svg>
          <div className="min-w-0">
            <div className="text-white font-bold text-base tracking-wide leading-tight">STAFFLO</div>
            {settings.storeName && (
              <div className="text-white/40 text-xs truncate">{settings.storeName}</div>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activePage === item.id
                ? 'bg-primary text-white'
                : 'text-white/60 hover:text-white hover:bg-sidebar-hover'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-sidebar-hover transition-colors"
        >
          {theme === 'light' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Mørkt tema
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Lyst tema
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${backendAvailable ? 'bg-green-400' : 'bg-amber-400'}`} />
            <span className="text-white/40 text-xs">{employees.length} ansatte</span>
          </div>
          {authUser && (
            <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-white text-xs font-medium">
              {authUser.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
