import React, { useEffect, useState } from 'react'

type State =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready' }

declare global {
  interface Window {
    electronAPI?: {
      onUpdateAvailable: (cb: (info: { version: string; releaseNotes: string | null }) => void) => void
      onUpdateDownloadProgress: (cb: (percent: number) => void) => void
      onUpdateDownloaded: (cb: () => void) => void
      downloadUpdate: () => void
      installUpdate: () => void
      checkForUpdates: () => void
      onUpdateCheckResult: (cb: (result: 'latest') => void) => void
    }
  }
}

export function UpdateBanner() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onUpdateAvailable(({ version }) => {
      setState({ status: 'available', version })
    })
    api.onUpdateDownloadProgress((percent) => {
      setState({ status: 'downloading', percent })
    })
    api.onUpdateDownloaded(() => {
      setState({ status: 'ready' })
    })
  }, [])

  if (dismissed || state.status === 'idle') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-surface border border-theme-border rounded-2xl shadow-xl p-5">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-text-3 hover:text-text-1 transition-colors p-1"
        aria-label="Lukk"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          {state.status === 'available' && (
            <>
              <p className="font-semibold text-text-1 text-sm">Ny oppdatering tilgjengelig</p>
              <p className="text-xs text-text-3 mt-0.5">Versjon {state.version} er klar til nedlasting.</p>
            </>
          )}
          {state.status === 'downloading' && (
            <>
              <p className="font-semibold text-text-1 text-sm">Laster ned oppdatering...</p>
              <p className="text-xs text-text-3 mt-0.5">{state.percent}% fullført</p>
            </>
          )}
          {state.status === 'ready' && (
            <>
              <p className="font-semibold text-text-1 text-sm">Klar til installasjon</p>
              <p className="text-xs text-text-3 mt-0.5">Start appen på nytt for å fullføre oppdateringen.</p>
            </>
          )}
        </div>
      </div>

      {state.status === 'available' && (
        <div className="flex gap-2">
          <button
            onClick={() => window.electronAPI?.downloadUpdate()}
            className="flex-1 bg-primary text-white text-xs font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Last ned nå
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-1 bg-slate-100 dark:bg-slate-700/60 text-text-2 text-xs font-medium py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Ikke nå
          </button>
        </div>
      )}

      {state.status === 'downloading' && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${state.percent}%` }}
          />
        </div>
      )}

      {state.status === 'ready' && (
        <div className="flex gap-2">
          <button
            onClick={() => window.electronAPI?.installUpdate()}
            className="flex-1 bg-primary text-white text-xs font-medium py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Start på nytt og installer
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-1 bg-slate-100 dark:bg-slate-700/60 text-text-2 text-xs font-medium py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Senere
          </button>
        </div>
      )}
    </div>
  )
}
