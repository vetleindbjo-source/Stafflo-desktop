import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export function GdprConsentModal() {
  const { setGdprConsent, authUser } = useAppStore()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    setLoading(true)
    await setGdprConsent()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-1">Personvern og databehandling</h2>
              <p className="text-sm text-text-2">Hei {authUser?.name?.split(' ')[0]}! Les dette før du starter.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          <div className="space-y-4 text-sm text-text-1">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3">
              <p className="font-medium text-amber-800 dark:text-amber-400 mb-1">Viktig informasjon om personopplysninger</p>
              <p className="text-amber-700 dark:text-amber-500 text-xs">
                Denne applikasjonen behandler personopplysninger om dine ansatte. Som dataansvarlig er det ditt ansvar å sikre at behandlingen er i henhold til GDPR og norsk personopplysningslov.
              </p>
            </div>

            <section>
              <h3 className="font-semibold text-text-1 mb-1.5">Hvilke data behandles?</h3>
              <ul className="space-y-1 text-text-2">
                <li className="flex gap-2"><span className="text-blue-500 mt-0.5">•</span>Navn, stilling og kontaktinfo til ansatte</li>
                <li className="flex gap-2"><span className="text-blue-500 mt-0.5">•</span>Fraværsregistreringer (ferie, sykefravær m.m.)</li>
                <li className="flex gap-2"><span className="text-blue-500 mt-0.5">•</span>Tilgjengelighet og arbeidstider</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-text-1 mb-1.5">Bruk av kunstig intelligens</h3>
              <p className="text-text-2">
                Når du genererer arbeidsplan sendes <strong>fornavn og første bokstav i etternavnet</strong> til Anthropic (USA) for å lage planen. Dette er nødvendig for tjenestens funksjon. Anthropic har inngått DPA (databehandleravtale) i henhold til GDPR artikkel 28.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-text-1 mb-1.5">Dine rettigheter</h3>
              <ul className="space-y-1 text-text-2">
                <li className="flex gap-2"><span className="text-green-500 mt-0.5">✓</span>Rett til innsyn i egne data (eksporter under Innstillinger)</li>
                <li className="flex gap-2"><span className="text-green-500 mt-0.5">✓</span>Rett til sletting av alle data (under Innstillinger → GDPR)</li>
                <li className="flex gap-2"><span className="text-green-500 mt-0.5">✓</span>Rett til korrigering av opplysninger</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-text-1 mb-1.5">Ditt ansvar som arbeidsgiver</h3>
              <p className="text-text-2">
                Du er pliktig til å informere dine ansatte om at personopplysningene deres behandles i dette systemet, herunder overføring til Anthropic ved AI-generering av planer. Se <a href="#" className="text-blue-600 dark:text-blue-400 underline">mal for informasjon til ansatte</a>.
              </p>
            </section>

            <p className="text-xs text-text-3">
              Datatilsynet: <span className="font-mono">www.datatilsynet.no</span> | Personopplysningsloven § 1 jf. GDPR
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
            />
            <span className="text-sm text-text-1">
              Jeg bekrefter at jeg har lest og forstått informasjonen over, og at jeg vil behandle personopplysninger i henhold til GDPR og norsk personopplysningslov.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Lagrer...' : 'Jeg godtar – start Arbeidsplan'}
          </button>
        </div>
      </div>
    </div>
  )
}
