import React from 'react'

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 10000, background: '#fff', borderRadius: 16, padding: 28,
        minWidth: 340, maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        border: '1px solid #e2e8f0'
      }}>
        {title && <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{title}</h3>}
        <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>Hủy</button>
          <button onClick={onConfirm} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#0f766e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>Xác nhận</button>
        </div>
      </div>
    </>
  )
}
