import React, { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import { Sidebar } from './components/Sidebar'
import { GdprConsentModal } from './components/GdprConsentModal'
import { OnboardingModal } from './components/OnboardingModal'
import { LoginPage } from './pages/LoginPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { SchedulePage } from './pages/SchedulePage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { VacationPage } from './pages/VacationPage'

export default function App() {
  const { activePage, authUser, checkBackend, settings } = useAppStore()

  useEffect(() => {
    checkBackend()
    const interval = setInterval(checkBackend, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!authUser) {
    return <LoginPage />
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
    </div>
  )
}
