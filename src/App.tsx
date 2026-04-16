import React, { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/Sidebar'
import { GdprConsentModal } from './components/GdprConsentModal'
import { OnboardingModal } from './components/OnboardingModal'
import { LoginPage } from './pages/LoginPage'
import { LicensePage } from './pages/LicensePage'
import { EmployeesPage } from './pages/EmployeesPage'
import { SchedulePage } from './pages/SchedulePage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { VacationPage } from './pages/VacationPage'
import { UpdateBanner } from './components/UpdateBanner'

export default function App() {
  const { activePage, authUser, checkBackend, settings, checkLicense, licenseStatus, licenseChecked, syncFromBackend } = useAppStore()

  useEffect(() => {
    checkBackend()
    const interval = setInterval(checkBackend, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (authUser) {
      checkLicense()
      const id = authUser.id
      const email = authUser.email
      if (id !== 'local' && email !== 'dev@arbeidsplan.local') {
        syncFromBackend()
      }
    }
  }, [authUser])

  if (!authUser) {
    return <LoginPage />
  }

  // Wait for license check before deciding which screen to show
  if (!licenseChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <svg className="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!licenseStatus?.active) {
    return <LicensePage />
  }

  const needsGdprConsent = !authUser.gdprConsentAt
  const needsOnboarding = !needsGdprConsent && !settings.onboardingDone

  return (
    <div className="flex h-screen bg-page overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {activePage === 'employees' && <EmployeesPage />}
        {activePage === 'schedule' && <SchedulePage />}
        {activePage === 'history' && <HistoryPage />}
        {activePage === 'vacation' && <VacationPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
      {needsGdprConsent && <GdprConsentModal />}
      {needsOnboarding && <OnboardingModal />}
      <UpdateBanner />
    </div>
  )
}
