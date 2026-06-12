import React, { useState, useEffect } from 'react'

export default function PromptModal({ open, title, message, defaultValue, onConfirm, onCancel }) {
  const [value, setValue] = useState(defaultValue || '')
  useEffect(() => { if (open) setValue(defaultValue || '') }, [open, defaultValue])
  if (!open) return null
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 10000, background: '#fff', borderRadius: 16, padding: 28,
        minWidth: 360, maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0'
      }}>
        {title && <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{title}</h3>}
        {message && <p style={{ margin: '0 0 14px', color: '#475569', fontSize: 14 }}>{message}</p>}
        <input autoFocus value={value} onChange={e => setValue(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>Hủy</button>
          <button onClick={() => onConfirm(value)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#0f766e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>Xác nhận</button>
        </div>
      </div>
    </>
  )
}
