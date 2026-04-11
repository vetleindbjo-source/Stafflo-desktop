import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ScheduleView } from '../components/ScheduleView'
import { useT } from '../utils/i18n'

export function HistoryPage() {
  const { schedules, deleteSchedule, updateScheduleDays, settings } = useAppStore()
  const tr = useT(settings.language ?? 'no')
  const [viewing, setViewing] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const viewedSchedule = schedules.find((s) => s.id === viewing)

  async function copySchedule(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (viewing && viewedSchedule) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-8 py-5 border-b border-theme-border bg-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewing(null)}
              className="p-2 text-text-3 hover:text-text-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-text-1">{viewedSchedule.title}</h1>
              <p className="text-xs text-text-3">{formatDate(viewedSchedule.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={() => copySchedule(viewedSchedule.rawText)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied ? 'bg-green-100 text-green-700' : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {copied ? tr('schedule_copied') : tr('schedule_copy')}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          {viewedSchedule.days ? (
            <ScheduleView
              days={viewedSchedule.days}
              onChange={(updatedDays) => updateScheduleDays(viewedSchedule.id, updatedDays)}
            />
          ) : (
            <pre className="bg-surface rounded-xl border border-theme-border shadow-card p-6 text-sm text-text-1 whitespace-pre-wrap font-mono leading-relaxed">
              {viewedSchedule.rawText}
            </pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-theme-border bg-header">
        <h1 className="text-2xl font-bold text-text-1">{tr('history_title')}</h1>
        <p className="text-text-2 text-sm mt-0.5">{tr('history_subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-text-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-2 mb-1">{tr('history_empty_title')}</h3>
            <p className="text-text-3 text-sm">{tr('history_empty_desc')}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {schedules.map((s) => (
              <div key={s.id} className="bg-surface rounded-xl border border-theme-border shadow-card hover:shadow-md transition-shadow p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-1">{s.title}</div>
                  <div className="text-xs text-text-3 mt-0.5">{tr('history_generated')} {formatDate(s.createdAt)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewing(s.id)}
                    className="px-3 py-1.5 text-sm text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors font-medium"
                  >
                    {tr('view')}
                  </button>
                  <button
                    onClick={() => copySchedule(s.rawText)}
                    className="px-3 py-1.5 text-sm text-text-2 bg-slate-100 dark:bg-slate-700/60 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium"
                  >
                    {tr('schedule_copy')}
                  </button>
                  {deleteConfirm === s.id ? (
                    <>
                      <button onClick={() => { deleteSchedule(s.id); setDeleteConfirm(null) }} className="px-3 py-1.5 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium">{tr('delete')}</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-text-2 bg-slate-100 dark:bg-slate-700/60 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">{tr('no_word')}</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-text-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
