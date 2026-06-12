import React from 'react'
import { STEP_INFO } from './stepInfo'

export default function StepTabs(props) {
  const { currentStep, onSetCurrentStep } = props

  return (
    <>
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '28px',
        overflowX: 'auto',
        paddingBottom: '8px',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap'
      }} className="step-tabs-scroll">
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <button
            key={s}
            onClick={() => { onSetCurrentStep(s) }}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: currentStep === s ? 'none' : '1px solid #e2e8f0',
              background: currentStep === s ? '#0f766e' : '#fff',
              color: currentStep === s ? '#fff' : '#475569',
              fontWeight: currentStep === s ? '700' : '500',
              cursor: 'pointer',
              fontSize: '13px',
              flexShrink: 0,
              boxShadow: currentStep === s ? '0 4px 12px rgba(15, 118, 110, 0.15)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Bước {s}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0', color: '#1e293b' }}>
          {STEP_INFO[currentStep]?.title}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
          {STEP_INFO[currentStep]?.how_to}
        </p>
      </div>
    </>
  )
}
