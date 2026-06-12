import React from 'react'
import JsonBlock from './JsonBlock'

export default function OutputPanel(props) {
  const { result, currentStep, targetDuration, playerKey, onSaveToChatHistory, onDownloadResult, onImportToNextStep } = props

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#1e293b' }}>Kết quả</h4>
        {result ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={onSaveToChatHistory} type="button" style={{ padding: '10px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              💾 Lưu lịch sử
            </button>
            <button onClick={onDownloadResult} type="button" style={{ padding: '10px 16px', background: '#64748b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
              ⬇ Tải JSON
            </button>
            {currentStep < 7 && (
              <button onClick={onImportToNextStep} type="button" style={{ padding: '10px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                ▶ Sang bước tiếp
              </button>
            )}
          </div>
        ) : null}
      </div>

      <JsonBlock value={result} playerKey={playerKey} currentStep={currentStep} targetDuration={targetDuration} />
    </div>
  )
}
