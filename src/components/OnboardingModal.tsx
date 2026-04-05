import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const STEPS = [
  {
    title: 'Velkommen til Stafflo!',
    description: 'Stafflo gjør arbeidsplanlegging enkelt — med AI som tar seg av det tunge løftet. La oss vise deg de viktigste funksjonene.',
    icon: '👋',
    hint: null,
  },
  {
    title: 'Ansatte',
    description: 'Start med å legge til de ansatte. Sett stillingsprosent, tilgjengelige dager, og om de har ferierettigheter. Du kan også legge inn fravær direkte på hver ansatt.',
    icon: '👤',
    hint: 'Tips: Legg til roller som "Kokk" eller "Servitør" — da kan du sette bemanningskrav per rolle i Innstillinger.',
  },
  {
    title: 'Innstillinger',
    description: 'Konfigurer butikken din: åpningstider, bemanningskrav, og spesialdager. Under "Roller"-fanen kan du sette krav til antall ansatte per rolle per dag.',
    icon: '⚙️',
    hint: 'Tips: Roller med 2 eller flere ansatte oppdages automatisk og foreslås som bemanningskrav.',
  },
  {
    title: 'Lag arbeidsplan',
    description: 'Velg periode og la AI-en generere en komplett arbeidsplan basert på dine ansatte, åpningstider og krav. Du kan gi ekstra instruksjoner og legge til periodenotater per ansatt.',
    icon: '📅',
    hint: 'Tips: Ferieplan-ferie legges automatisk inn som fravær når du genererer fra ferieplanleggeren.',
  },
  {
    title: 'Historikk',
    description: 'Alle genererte arbeidsplaner lagres i Historikk. Du kan se dem, redigere enkeltskift, og slette planer du ikke lenger trenger.',
    icon: '📋',
    hint: null,
  },
  {
    title: 'Ferieplanlegger',
    description: 'Planlegg ferie for alle ansatte for et helt år. Ansatte kan oppgi opptil 3 preferanser, og systemet fordeler ferien rettferdig basert på prioritet.',
    icon: '🏖️',
    hint: 'Tips: Husk å ta skjermbilder av ferieplanene for å vise dem til de ansatte!',
  },
]

export function OnboardingModal() {
  const { updateSettings, settings } = useAppStore()
  const [step, setStep] = useState(0)

  function finish() {
    updateSettings({ onboardingDone: true })
  }

  function skip() {
    updateSettings({ onboardingDone: true })
  }

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/40' : 'w-3 bg-gray-200 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={skip}
            className="text-xs text-text-3 hover:text-text-2 transition-colors px-2 py-1"
          >
            Hopp over
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1">
          {/* Placeholder image box */}
          <div className="w-full h-44 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20 flex flex-col items-center justify-center mb-5">
            <span className="text-5xl mb-2">{current.icon}</span>
            <span className="text-xs text-text-3">Steg {step + 1} av {STEPS.length}</span>
          </div>

          <h2 className="text-xl font-bold text-text-1 mb-2">{current.title}</h2>
          <p className="text-sm text-text-2 leading-relaxed">{current.description}</p>

          {current.hint && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              {current.hint}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl border border-theme-border text-sm font-medium text-text-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Tilbake
            </button>
          )}
          <button
            onClick={() => isLast ? finish() : setStep(step + 1)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            {isLast ? 'Kom i gang!' : 'Neste'}
          </button>
        </div>
      </div>
    </div>
  )
}
