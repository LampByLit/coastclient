import { useState } from 'react'
import QuoteWizard from './QuoteWizard'
import QuoteToolView from './QuoteToolView'

export default function QuoteGenerator() {
  const [phase, setPhase] = useState('wizard')
  const [answers, setAnswers] = useState(null)

  return (
    <>
      {phase === 'wizard' && (
        <QuoteWizard
          onComplete={(payload) => {
            setAnswers(payload)
            setPhase('tool')
          }}
        />
      )}
      {phase === 'tool' && answers != null && (
        <QuoteToolView
          initial={answers}
          onBackToWizard={() => {
            setAnswers(null)
            setPhase('wizard')
          }}
        />
      )}
    </>
  )
}
