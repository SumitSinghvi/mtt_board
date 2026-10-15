import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: "https://366ca5499d8e8cdae2eb76eca2913cbf@o4508968497381376.ingest.de.sentry.io/4508968500723792",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="p-4 text-rose-600 font-medium">Application error. Please reload.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

