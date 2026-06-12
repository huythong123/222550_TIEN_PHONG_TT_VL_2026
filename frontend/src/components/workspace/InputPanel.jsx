import React from 'react'

export default function InputPanel(props) {
  const {
    currentStep,
    inputText,
    setInputText,
    targetDuration,
    setTargetDuration,
    estimatedCredits,
    busy,
    stepInfo,
    onRunStep,
    onSaveToChat,
    onPrevStep,
    onNextStep,
    prevStepLabel,
    nextStepLabel,
    showPrefillStep1,
    showPrefillStep2,
    showPrefillStep3,
    showPrefillStep4,
    showPrefillStep5,
    onPrefillStep1,
    onPrefillStep2,
    onPrefillStep3,
    onPrefillStep4,
    onPrefillStep5,
    creditsWarning,
  } = props

  return (
    <div style={{ marginBottom: '28px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#1e293b' }}>Nhập dữ liệu</h4>
          {stepInfo ? (
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>{stepInfo.how_to}</p>
          ) : null}
        </div>
        {estimatedCredits !== null ? (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fff', border: '1px solid #e2e8f0', fontSize: '13px', color: estimatedCredits > 0 ? '#0f766e' : '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Ước tính: {estimatedCredits} credits
          </div>
        ) : null}
      </div>

      {currentStep === 1 ? (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>URL trang web</span>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập đường link trang web mục tiêu..."
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
          />
        </label>
      ) : (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Dữ liệu JSON</span>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Dán dữ liệu JSON từ bước trước..."
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace', minHeight: '200px', outline: 'none', resize: 'vertical' }}
          />
        </label>
      )}

      {currentStep === 2 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontWeight: '600', fontSize: '13px', color: '#475569' }}>Thời lượng video (giây)</span>
          <input
            type="number"
            value={targetDuration ?? ''}
            onChange={(e) => setTargetDuration(e.target.value ? parseInt(e.target.value, 10) : null)}
            placeholder="VD: 30, 60"
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
          />
        </label>
      )}

      {(showPrefillStep1 || showPrefillStep2 || showPrefillStep3 || showPrefillStep4 || showPrefillStep5) && (
        <div style={{ padding: '14px 16px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#eff6ff', color: '#0f766e', marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>💡 Dữ liệu sẵn sàng dùng</div>
          {showPrefillStep1 ? <button onClick={onPrefillStep1} type="button" style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Đổ nhanh kết quả Bước 1 sang Bước 2</button> : null}
          {showPrefillStep2 ? <button onClick={onPrefillStep2} type="button" style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Đổ nhanh kết quả Bước 2 sang Bước 3</button> : null}
          {showPrefillStep3 ? <button onClick={onPrefillStep3} type="button" style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Đổ nhanh kết quả Bước 3 sang Bước 4</button> : null}
          {showPrefillStep4 ? <button onClick={onPrefillStep4} type="button" style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Đổ nhanh kết quả Bước 4 sang Bước 5</button> : null}
          {showPrefillStep5 ? <button onClick={onPrefillStep5} type="button" style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>Đổ nhanh kết quả Bước 5 sang Bước 6</button> : null}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onPrevStep} type="button" disabled={busy} style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>{prevStepLabel}</button>
        <button onClick={onNextStep} type="button" disabled={busy} style={{ padding: '12px 18px', fontSize: '13px', fontWeight: '600', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>{nextStepLabel}</button>
        <button onClick={onRunStep} type="button" disabled={busy} style={{ padding: '12px 24px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', opacity: busy ? 0.6 : 1, transition: 'all 0.2s' }}>{busy ? 'Đang xử lý...' : '⚡ Chạy bước'}</button>
        {/* Save chat button removed from UI per request (functionality kept) */}
      </div>
      {creditsWarning ? <div style={{ marginTop: '12px', color: '#b91c1c', fontSize: '12px' }}>{creditsWarning}</div> : null}
    </div>
  )
}
